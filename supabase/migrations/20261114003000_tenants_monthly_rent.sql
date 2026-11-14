-- Add default monthly rent amount for tenants (used for agreements/invoicing defaults)
alter table public.tenants
  add column if not exists monthly_rent numeric(14,2) check (monthly_rent is null or monthly_rent >= 0);
