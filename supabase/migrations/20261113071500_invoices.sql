-- Invoices and invoice items

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled');
  end if;
end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  agreement_id uuid not null references public.rental_agreements(id) on delete restrict,
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  billing_period_start date not null,
  billing_period_end date not null,
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  penalty_amount numeric(14,2) not null default 0 check (penalty_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(14,2) not null default 0 check (balance_due >= 0),
  status public.invoice_status not null default 'draft',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (billing_period_end >= billing_period_start),
  check (amount_paid <= total_amount),
  check (balance_due = greatest(total_amount - amount_paid, 0)),
  unique (organization_id, invoice_number),
  unique (tenant_id, agreement_id, billing_period_start, billing_period_end)
);

create index if not exists invoices_org_idx on public.invoices(organization_id);
create index if not exists invoices_tenant_idx on public.invoices(tenant_id);
create index if not exists invoices_agreement_idx on public.invoices(agreement_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_due_date_idx on public.invoices(due_date);

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete restrict,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total numeric(14,2) not null check (total >= 0)
);

create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);
create index if not exists invoice_items_space_idx on public.invoice_items(space_id);
