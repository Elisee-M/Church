-- Track a human-readable label for each agreement rent line (room/unit).
-- This lets a single invoice contain multiple line items, one per room,
-- each with its own price.

alter table public.agreement_spaces
  add column if not exists label text;

create or replace function public.generate_monthly_invoices(
  p_organization_id uuid,
  p_period_start date,
  p_period_end date,
  p_issue_date date default current_date,
  p_due_day integer default null,
  p_tenant_id uuid default null
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
      and (p_tenant_id is null or ra.tenant_id = p_tenant_id)
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

    -- generate invoice number per org/period sequence from the highest existing number
    select coalesce(max(cast(right(invoice_number, 4) as integer)), 0) + 1 into v_seq
    from public.invoices
    where organization_id = p_organization_id
      and billing_period_start = p_period_start
      and billing_period_end = p_period_end
      and invoice_number ~ '-[0-9]{4}$';
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
           case
             when ags.label is not null and btrim(ags.label) <> ''
               then 'Monthly rent - ' || ags.label
             when sp.space_code is not null or sp.name is not null
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

grant execute on function public.generate_monthly_invoices(uuid, date, date, date, integer, uuid) to authenticated;
