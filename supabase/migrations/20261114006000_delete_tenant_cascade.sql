create or replace function public.delete_tenant_cascade(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.receipts
  where payment_id in (select id from public.payments where tenant_id = p_tenant_id);

  delete from public.ebm_records where tenant_id = p_tenant_id;
  delete from public.payments where tenant_id = p_tenant_id;

  delete from public.invoice_items
  where invoice_id in (select id from public.invoices where tenant_id = p_tenant_id);
  delete from public.invoices where tenant_id = p_tenant_id;

  update public.spaces
  set occupancy_status = 'vacant'
  where id in (
    select asp.space_id
    from public.agreement_spaces asp
    join public.rental_agreements ra on ra.id = asp.agreement_id
    where ra.tenant_id = p_tenant_id and asp.space_id is not null
  );

  delete from public.agreement_spaces
  where agreement_id in (select id from public.rental_agreements where tenant_id = p_tenant_id);

  delete from public.rental_agreements where tenant_id = p_tenant_id;
  delete from public.tenants where id = p_tenant_id;
end;
$$;

grant execute on function public.delete_tenant_cascade(uuid) to authenticated;
