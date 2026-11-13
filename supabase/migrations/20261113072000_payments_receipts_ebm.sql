-- Payments, receipts, and EBM records

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('mtn_mobile_money', 'airtel_money', 'bank_transfer', 'cash', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'successful', 'failed', 'cancelled', 'under_review');
  end if;
end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  provider text,
  transaction_reference text,
  provider_transaction_id text,
  phone_number text,
  payment_status public.payment_status not null default 'pending',
  payment_date timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (payment_status <> 'successful')
    or (verified_at is not null)
  )
);

create index if not exists payments_org_idx on public.payments(organization_id);
create index if not exists payments_tenant_idx on public.payments(tenant_id);
create index if not exists payments_invoice_idx on public.payments(invoice_id);
create index if not exists payments_status_idx on public.payments(payment_status);

-- Idempotency / duplicate prevention where identifiers are provided
create unique index if not exists payments_provider_txn_uidx
  on public.payments(provider, provider_transaction_id)
  where provider is not null and provider_transaction_id is not null;

create unique index if not exists payments_txn_reference_uidx
  on public.payments(organization_id, transaction_reference)
  where transaction_reference is not null;

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  receipt_number text not null unique,
  issued_at timestamptz not null default now(),
  document_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (payment_id)
);

create index if not exists receipts_payment_idx on public.receipts(payment_id);

create table if not exists public.ebm_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  ebm_invoice_number text,
  ebm_reference text,
  issued_at timestamptz,
  document_path text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ebm_records_org_idx on public.ebm_records(organization_id);
create index if not exists ebm_records_invoice_idx on public.ebm_records(invoice_id);
create index if not exists ebm_records_tenant_idx on public.ebm_records(tenant_id);

drop trigger if exists set_ebm_records_updated_at on public.ebm_records;
create trigger set_ebm_records_updated_at before update on public.ebm_records
for each row execute function public.set_updated_at();
