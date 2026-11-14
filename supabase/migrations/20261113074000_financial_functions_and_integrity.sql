-- Financial integrity: invoice recalculation, payment application, corrections, and safeguards

-- Recalculate invoice amounts from successful payments and items/penalty
create or replace function public.recalculate_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(14,2);
  v_penalty numeric(14,2);
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_due_date date;
  v_status public.invoice_status;
begin
  select coalesce(sum(total), 0) into v_subtotal
  from public.invoice_items
  where invoice_id = p_invoice_id;

  select penalty_amount, due_date into v_penalty, v_due_date
  from public.invoices
  where id = p_invoice_id;

  v_penalty := coalesce(v_penalty, 0);
  v_total := greatest(v_subtotal + v_penalty, 0);

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where invoice_id = p_invoice_id
    and payment_status = 'successful';

  if v_paid > v_total then
    v_paid := v_total; -- defensive; application logic should prevent overpayment
  end if;

  v_status := case
    when v_paid >= v_total and v_total > 0 then 'paid'::public.invoice_status
    when v_paid > 0 and v_paid < v_total then 'partially_paid'::public.invoice_status
    when v_due_date < current_date and v_paid < v_total then 'overdue'::public.invoice_status
    else 'issued'::public.invoice_status
  end;

  -- preserve draft/cancelled explicitly set states only when no payments and totals unchanged logic not forcing; default to recalculated non-draft
  update public.invoices
  set subtotal = v_subtotal,
      total_amount = v_total,
      amount_paid = v_paid,
      balance_due = greatest(v_total - v_paid, 0),
      status = case when status in ('draft','cancelled') and v_paid = 0 then status else v_status end,
      updated_at = now()
  where id = p_invoice_id;
end;
$$;

-- After payment status/amount changes, recalc related invoice
create or replace function public.trg_payments_recalc_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_invoice(old.invoice_id);
    return old;
  else
    perform public.recalculate_invoice(new.invoice_id);
    if tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id then
      perform public.recalculate_invoice(old.invoice_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists payments_recalc_invoice on public.payments;
create trigger payments_recalc_invoice
after insert or update or delete on public.payments
for each row execute function public.trg_payments_recalc_invoice();

-- Prevent silent modification/deletion of confirmed successful payments (corrections must be explicit/audited)
create or replace function public.prevent_confirmed_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allow text;
begin
  v_allow := current_setting('app.allow_payment_correction', true);

  if tg_op = 'DELETE' then
    if old.payment_status = 'successful' and v_allow <> 'on' then
      raise exception 'Confirmed successful payments cannot be deleted. Record a correction instead.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.payment_status = 'successful' then
      if v_allow = 'on' then
        -- controlled correction path: allow status/verification/note changes, block financial identity changes
        if new.amount is distinct from old.amount
           or new.invoice_id is distinct from old.invoice_id
           or new.tenant_id is distinct from old.tenant_id
           or new.organization_id is distinct from old.organization_id
           or new.payment_method is distinct from old.payment_method
           or new.transaction_reference is distinct from old.transaction_reference
           or new.provider_transaction_id is distinct from old.provider_transaction_id then
          raise exception 'Financial fields of a confirmed payment cannot be changed.';
        end if;
      else
        if new.amount is distinct from old.amount
           or new.invoice_id is distinct from old.invoice_id
           or new.tenant_id is distinct from old.tenant_id
           or new.organization_id is distinct from old.organization_id
           or new.payment_method is distinct from old.payment_method
           or new.transaction_reference is distinct from old.transaction_reference
           or new.provider_transaction_id is distinct from old.provider_transaction_id
           or new.payment_status is distinct from old.payment_status then
          raise exception 'Confirmed successful payments cannot be modified. Record a correction/reversal instead.';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_confirmed_payment_mutation on public.payments;
create trigger trg_prevent_confirmed_payment_mutation
before update or delete on public.payments
for each row execute function public.prevent_confirmed_payment_mutation();

-- Audit helper
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old jsonb default null,
  p_new jsonb default null,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, old_values, new_values, reason)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.log_audit(text,text,uuid,jsonb,jsonb,text) from public;
grant execute on function public.log_audit(text,text,uuid,jsonb,jsonb,text) to authenticated;

-- Controlled correction: mark a successful payment as cancelled with audit trail and invoice recalculation
create or replace function public.correct_payment(
  p_payment_id uuid,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.payments%rowtype;
  v_actor uuid;
  v_allowed boolean;
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for payment corrections.';
  end if;

  v_actor := auth.uid();
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_actor and ur.role in ('admin','accountant')
  ) into v_allowed;
  if not v_allowed then
    raise exception 'Not authorized to correct payments.';
  end if;

  select * into v_src from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;
  if v_src.payment_status <> 'successful' then
    raise exception 'Only successful payments can be corrected.';
  end if;

  perform set_config('app.allow_payment_correction', 'on', true);
  update public.payments
  set payment_status = 'cancelled',
      notes = coalesce(notes, '') || case when notes is null or notes = '' then '' else E'\n' end
              || '[Correction ' || now()::text || '] ' || trim(p_reason),
      updated_at = now()
  where id = p_payment_id;
  perform set_config('app.allow_payment_correction', 'off', true);

  perform public.log_audit(
    'payment_corrected',
    'payment',
    p_payment_id,
    to_jsonb(v_src),
    jsonb_build_object('payment_status', 'cancelled', 'reason', trim(p_reason)),
    trim(p_reason)
  );
  perform public.recalculate_invoice(v_src.invoice_id);
end;
$$;

revoke all on function public.correct_payment(uuid,text) from public;
grant execute on function public.correct_payment(uuid,text) to authenticated;

-- Recalculate when invoice items change
create or replace function public.trg_invoice_items_recalc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_invoice(old.invoice_id);
    return old;
  else
    perform public.recalculate_invoice(new.invoice_id);
    if tg_op = 'UPDATE' and old.invoice_id is distinct from new.invoice_id then
      perform public.recalculate_invoice(old.invoice_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists invoice_items_recalc on public.invoice_items;
create trigger invoice_items_recalc
after insert or update or delete on public.invoice_items
for each row execute function public.trg_invoice_items_recalc();

-- Safe payment verification/application by authorized staff
create or replace function public.verify_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_actor uuid;
  v_allowed boolean;
begin
  v_actor := auth.uid();
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = v_actor and ur.role in ('admin','accountant')
  ) into v_allowed;
  if not v_allowed then
    raise exception 'Not authorized to verify payments.';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;

  if p_approve then
    if v_payment.payment_status not in ('pending','under_review') then
      raise exception 'Only pending or under-review payments can be approved.';
    end if;
    update public.payments
    set payment_status = 'successful',
        verified_by = v_actor,
        verified_at = now(),
        payment_date = coalesce(payment_date, now()),
        notes = case when p_reason is null or trim(p_reason) = '' then notes
                     else coalesce(notes,'') || case when notes is null or notes = '' then '' else E'\n' end || trim(p_reason) end,
        updated_at = now()
    where id = p_payment_id;
    perform public.log_audit('payment_verified', 'payment', p_payment_id, to_jsonb(v_payment),
      jsonb_build_object('payment_status','successful','verified_by',v_actor), p_reason);
  else
    if v_payment.payment_status = 'successful' then
      raise exception 'Successful payments must be corrected, not rejected.';
    end if;
    update public.payments
    set payment_status = 'failed',
        verified_by = v_actor,
        verified_at = now(),
        notes = case when p_reason is null or trim(p_reason) = '' then notes
                     else coalesce(notes,'') || case when notes is null or notes = '' then '' else E'\n' end || 'Rejected: ' || trim(p_reason) end,
        updated_at = now()
    where id = p_payment_id;
    perform public.log_audit('payment_rejected', 'payment', p_payment_id, to_jsonb(v_payment),
      jsonb_build_object('payment_status','failed','verified_by',v_actor), p_reason);
  end if;

  perform public.recalculate_invoice(v_payment.invoice_id);
end;
$$;

revoke all on function public.verify_payment(uuid,boolean,text) from public;
grant execute on function public.verify_payment(uuid,boolean,text) to authenticated;

-- Idempotent monthly invoice generation for active agreements in an organization
create or replace function public.generate_monthly_invoices(
  p_organization_id uuid,
  p_period_start date,
  p_period_end date,
  p_issue_date date default current_date,
  p_due_day integer default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agreement record;
  v_invoice_id uuid;
  v_count integer := 0;
  v_subtotal numeric(14,2);
  v_due date;
  v_number text;
  v_seq integer;
  v_billing_day integer;
begin
  if p_period_end < p_period_start then
    raise exception 'Billing period end must be on or after start.';
  end if;

  for v_agreement in
    select ra.*
    from public.rental_agreements ra
    where ra.organization_id = p_organization_id
      and ra.status in ('active','expiring')
      and ra.start_date <= p_period_end
      and ra.end_date >= p_period_start
  loop
    -- skip if invoice already exists for this agreement and period
    if exists (
      select 1 from public.invoices i
      where i.tenant_id = v_agreement.tenant_id
        and i.agreement_id = v_agreement.id
        and i.billing_period_start = p_period_start
        and i.billing_period_end = p_period_end
    ) then
      continue;
    end if;

    select coalesce(sum(ags.monthly_rent_amount), 0) into v_subtotal
    from public.agreement_spaces ags
    where ags.agreement_id = v_agreement.id
      and ags.start_date <= p_period_end
      and coalesce(ags.end_date, v_agreement.end_date) >= p_period_start;

    if v_subtotal <= 0 then
      continue;
    end if;

    v_billing_day := coalesce(p_due_day, v_agreement.payment_due_day, v_agreement.billing_day, 5);
    v_billing_day := least(greatest(v_billing_day, 1), 28);
    v_due := make_date(extract(year from p_period_start)::int, extract(month from p_period_start)::int, v_billing_day);
    if v_due < p_issue_date then
      v_due := p_issue_date;
    end if;

    -- generate invoice number per org/period sequence
    select count(*) + 1 into v_seq
    from public.invoices
    where organization_id = p_organization_id
      and billing_period_start = p_period_start
      and billing_period_end = p_period_end;
    v_number := 'INV-' || to_char(p_period_start, 'YYYYMM') || '-' || lpad(v_seq::text, 4, '0');

    insert into public.invoices (
      organization_id, tenant_id, agreement_id, invoice_number, issue_date, due_date,
      billing_period_start, billing_period_end, subtotal, penalty_amount, total_amount,
      amount_paid, balance_due, status, created_by
    ) values (
      p_organization_id, v_agreement.tenant_id, v_agreement.id, v_number, p_issue_date, v_due,
      p_period_start, p_period_end, v_subtotal, 0, v_subtotal,
      0, v_subtotal, 'issued', auth.uid()
    ) returning id into v_invoice_id;

    insert into public.invoice_items (invoice_id, space_id, description, quantity, unit_price, total)
    select v_invoice_id, ags.space_id,
           case when sp.space_code is not null or sp.name is not null
             then 'Monthly rent - ' || coalesce(sp.space_code, '') || ' ' || coalesce(sp.name, '')
             else 'Monthly rent'
           end,
           1, ags.monthly_rent_amount, ags.monthly_rent_amount
    from public.agreement_spaces ags
    left join public.spaces sp on sp.id = ags.space_id
    where ags.agreement_id = v_agreement.id
      and ags.start_date <= p_period_end
      and coalesce(ags.end_date, v_agreement.end_date) >= p_period_start;

    perform public.recalculate_invoice(v_invoice_id);
    perform public.log_audit('invoice_generated', 'invoice', v_invoice_id, null,
      jsonb_build_object('agreement_id', v_agreement.id, 'period_start', p_period_start, 'period_end', p_period_end),
      'Monthly invoice generation');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.generate_monthly_invoices(uuid,date,date,date,integer) from public;
grant execute on function public.generate_monthly_invoices(uuid,date,date,date,integer) to authenticated;
