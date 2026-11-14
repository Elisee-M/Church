-- ============================================================
-- GENZURA - Consolidated Supabase/PostgreSQL migration
-- Generated for single-run execution in SQL editor
-- Includes all versioned migrations in order
-- ============================================================


-- ============================================================
-- SOURCE: 20261113070000_core_organization_and_property.sql
-- ============================================================


-- Core extensions, organization, and property schema

create extension if not exists pgcrypto;

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tin text,
  address text,
  email text,
  phone text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Buildings
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  description text,
  number_of_floors integer not null default 0 check (number_of_floors >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buildings_organization_id_idx on public.buildings(organization_id);

-- Floors
create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  floor_number integer not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, floor_number)
);

create index if not exists floors_building_id_idx on public.floors(building_id);

-- Spaces
do $$
begin
  if not exists (select 1 from pg_type where typname = 'space_category') then
    create type public.space_category as enum ('shop', 'office', 'apartment', 'commercial');
  end if;
  if not exists (select 1 from pg_type where typname = 'space_occupancy_status') then
    create type public.space_occupancy_status as enum ('vacant', 'occupied', 'maintenance', 'reserved');
  end if;
end $$;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  space_code text not null,
  category public.space_category not null,
  description text,
  area numeric(12,2) check (area is null or area >= 0),
  default_rent_amount numeric(14,2) not null check (default_rent_amount >= 0),
  occupancy_status public.space_occupancy_status not null default 'vacant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, space_code)
);

create index if not exists spaces_floor_id_idx on public.spaces(floor_id);
create index if not exists spaces_building_id_idx on public.spaces(building_id);
create index if not exists spaces_organization_id_idx on public.spaces(organization_id);
create index if not exists spaces_occupancy_status_idx on public.spaces(occupancy_status);

-- Generic updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_buildings_updated_at on public.buildings;
create trigger set_buildings_updated_at before update on public.buildings
for each row execute function public.set_updated_at();

drop trigger if exists set_floors_updated_at on public.floors;
create trigger set_floors_updated_at before update on public.floors
for each row execute function public.set_updated_at();

drop trigger if exists set_spaces_updated_at on public.spaces;
create trigger set_spaces_updated_at before update on public.spaces
for each row execute function public.set_updated_at();




-- ============================================================
-- SOURCE: 20261113070500_profiles_roles_and_tenants.sql
-- ============================================================


-- Profiles, roles, and tenants

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'accountant', 'tenant');
  end if;
  if not exists (select 1 from pg_type where typname = 'tenant_type') then
    create type public.tenant_type as enum ('individual', 'company');
  end if;
end $$;

-- Profiles linked to Supabase auth users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  preferred_language text default 'en',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles(email);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on auth user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.phone
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Organization memberships / role assignments
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (user_id, organization_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_organization_id_idx on public.user_roles(organization_id);
create index if not exists user_roles_role_idx on public.user_roles(role);

-- Tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_type public.tenant_type not null,
  full_name text not null,
  company_name text,
  phone text,
  email text,
  national_id text,
  company_tin text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  linked_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (linked_user_id)
);

create index if not exists tenants_organization_id_idx on public.tenants(organization_id);
create index if not exists tenants_linked_user_id_idx on public.tenants(linked_user_id);

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at before update on public.tenants
for each row execute function public.set_updated_at();




-- ============================================================
-- SOURCE: 20261113071000_rental_agreements.sql
-- ============================================================


-- Rental agreements and agreement spaces

create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'agreement_status') then
    create type public.agreement_status as enum ('draft', 'active', 'expiring', 'expired', 'terminated', 'cancelled');
  end if;
end $$;

create table if not exists public.rental_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  agreement_number text not null,
  start_date date not null,
  end_date date not null,
  billing_day integer not null check (billing_day between 1 and 28),
  payment_due_day integer not null check (payment_due_day between 1 and 28),
  status public.agreement_status not null default 'draft',
  terms text,
  signed_document_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  unique (organization_id, agreement_number)
);

create index if not exists rental_agreements_org_idx on public.rental_agreements(organization_id);
create index if not exists rental_agreements_tenant_idx on public.rental_agreements(tenant_id);
create index if not exists rental_agreements_status_idx on public.rental_agreements(status);

drop trigger if exists set_rental_agreements_updated_at on public.rental_agreements;
create trigger set_rental_agreements_updated_at before update on public.rental_agreements
for each row execute function public.set_updated_at();

create table if not exists public.agreement_spaces (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.rental_agreements(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete restrict,
  monthly_rent_amount numeric(14,2) not null check (monthly_rent_amount >= 0),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (agreement_id, space_id)
);

create index if not exists agreement_spaces_agreement_idx on public.agreement_spaces(agreement_id);
create index if not exists agreement_spaces_space_idx on public.agreement_spaces(space_id);

-- Prevent overlapping active rentals for the same space.
-- Overlap is considered for active/expiring agreements where agreement_spaces periods intersect.
-- Using a trigger-based check for clarity and compatibility.
create or replace function public.check_agreement_space_overlap()
returns trigger
language plpgsql
as $$
declare
  v_new_agreement public.rental_agreements%rowtype;
  v_new_start date;
  v_new_end date;
  v_conflict boolean;
begin
  select * into v_new_agreement from public.rental_agreements where id = new.agreement_id;
  if v_new_agreement.status in ('terminated', 'cancelled', 'expired') then
    return new;
  end if;

  v_new_start := greatest(coalesce(new.start_date, v_new_agreement.start_date), v_new_agreement.start_date);
  v_new_end := least(coalesce(new.end_date, v_new_agreement.end_date), v_new_agreement.end_date);

  select exists (
    select 1
    from public.agreement_spaces s
    join public.rental_agreements a on a.id = s.agreement_id
    where s.space_id = new.space_id
      and s.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and a.status in ('draft', 'active', 'expiring')
      and daterange(greatest(coalesce(s.start_date, a.start_date), a.start_date), least(coalesce(s.end_date, a.end_date), a.end_date), '[]')
          && daterange(v_new_start, v_new_end, '[]')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Conflicting active agreement exists for space % in the given period', new.space_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_check_agreement_space_overlap on public.agreement_spaces;
create trigger trg_check_agreement_space_overlap
before insert or update on public.agreement_spaces
for each row execute function public.check_agreement_space_overlap();




-- ============================================================
-- SOURCE: 20261113071500_invoices.sql
-- ============================================================


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




-- ============================================================
-- SOURCE: 20261113072000_payments_receipts_ebm.sql
-- ============================================================


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




-- ============================================================
-- SOURCE: 20261113072500_expenses_notifications_audit.sql
-- ============================================================


-- Expense categories, expenses, notifications, and audit logs

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index if not exists expense_categories_org_idx on public.expense_categories(organization_id);

drop trigger if exists set_expense_categories_updated_at on public.expense_categories;
create trigger set_expense_categories_updated_at before update on public.expense_categories
for each row execute function public.set_updated_at();

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete set null,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  expense_date date not null,
  receipt_document_path text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_org_idx on public.expenses(organization_id);
create index if not exists expenses_building_idx on public.expenses(building_id);
create index if not exists expenses_category_idx on public.expenses(category_id);
create index if not exists expenses_date_idx on public.expenses(expense_date);

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

-- Notifications (in-app)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  notification_type text not null,
  is_read boolean not null default false,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id, is_read);

-- Audit logs (append-only, managed by trusted logic)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);




-- ============================================================
-- SOURCE: 20261113073000_security_helpers_and_rls.sql
-- ============================================================


-- Security helper functions and Row Level Security policies

-- Helper: check if current user has a role in an organization
create or replace function public.has_org_role(p_org_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.organization_id = p_org_id
      and ur.user_id = auth.uid()
      and ur.role = p_role
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, 'admin'::public.app_role);
$$;

create or replace function public.is_org_accountant(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, 'accountant'::public.app_role);
$$;

create or replace function public.is_org_staff(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, 'admin'::public.app_role)
      or public.has_org_role(p_org_id, 'accountant'::public.app_role);
$$;

-- Tenant record linked to current auth user (within any org; callers should scope by org)
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.tenants t
  where t.linked_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.linked_user_id = auth.uid()
  );
$$;

-- Restrict helper execution to authenticated/anon as appropriate
revoke all on function public.has_org_role(uuid, public.app_role) from public;
revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.is_org_accountant(uuid) from public;
revoke all on function public.is_org_staff(uuid) from public;
revoke all on function public.current_tenant_id() from public;
revoke all on function public.is_tenant_owner(uuid) from public;

grant execute on function public.has_org_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_accountant(uuid) to authenticated;
grant execute on function public.is_org_staff(uuid) to authenticated;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.is_tenant_owner(uuid) to authenticated;

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.spaces enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.tenants enable row level security;
alter table public.rental_agreements enable row level security;
alter table public.agreement_spaces enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.ebm_records enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy "profiles_select_self_or_staff"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Organizations
create policy "organizations_select_members"
on public.organizations for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.organization_id = organizations.id and ur.user_id = auth.uid()
  )
);

create policy "organizations_admin_manage"
on public.organizations for all to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

-- User roles: admins manage, users can read their own memberships
create policy "user_roles_select_own_or_admin"
on public.user_roles for select to authenticated
using (
  user_id = auth.uid() or public.is_org_admin(organization_id)
);

create policy "user_roles_insert_admin"
on public.user_roles for insert to authenticated
with check (public.is_org_admin(organization_id));

create policy "user_roles_update_admin"
on public.user_roles for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "user_roles_delete_admin"
on public.user_roles for delete to authenticated
using (public.is_org_admin(organization_id));

-- Buildings
create policy "buildings_select_staff_or_tenant_related"
on public.buildings for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (
    select 1
    from public.tenants t
    join public.rental_agreements ra on ra.tenant_id = t.id
    join public.agreement_spaces ags on ags.agreement_id = ra.id
    join public.spaces sp on sp.id = ags.space_id
    where t.linked_user_id = auth.uid()
      and sp.building_id = buildings.id
  )
);

create policy "buildings_admin_manage"
on public.buildings for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "buildings_admin_update"
on public.buildings for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "buildings_admin_delete"
on public.buildings for delete to authenticated
using (public.is_org_admin(organization_id));

-- Floors
create policy "floors_select"
on public.floors for select to authenticated
using (
  exists (
    select 1 from public.buildings b
    where b.id = floors.building_id
      and (
        public.is_org_staff(b.organization_id)
        or exists (
          select 1
          from public.tenants t
          join public.rental_agreements ra on ra.tenant_id = t.id
          join public.agreement_spaces ags on ags.agreement_id = ra.id
          join public.spaces sp on sp.id = ags.space_id
          where t.linked_user_id = auth.uid() and sp.floor_id = floors.id
        )
      )
  )
);

create policy "floors_admin_insert" on public.floors for insert to authenticated
with check (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)));
create policy "floors_admin_update" on public.floors for update to authenticated
using (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)))
with check (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)));
create policy "floors_admin_delete" on public.floors for delete to authenticated
using (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)));

-- Spaces
create policy "spaces_select"
on public.spaces for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (
    select 1
    from public.tenants t
    join public.rental_agreements ra on ra.tenant_id = t.id
    join public.agreement_spaces ags on ags.agreement_id = ra.id
    where t.linked_user_id = auth.uid() and ags.space_id = spaces.id
  )
);

create policy "spaces_admin_insert" on public.spaces for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "spaces_admin_update" on public.spaces for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "spaces_admin_delete" on public.spaces for delete to authenticated
using (public.is_org_admin(organization_id));

-- Tenants
create policy "tenants_select"
on public.tenants for select to authenticated
using (
  public.is_org_staff(organization_id)
  or linked_user_id = auth.uid()
);

create policy "tenants_admin_insert" on public.tenants for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "tenants_admin_update" on public.tenants for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "tenants_admin_delete" on public.tenants for delete to authenticated
using (public.is_org_admin(organization_id));

-- Rental agreements
create policy "rental_agreements_select"
on public.rental_agreements for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = rental_agreements.tenant_id and t.linked_user_id = auth.uid())
);

create policy "rental_agreements_admin_insert" on public.rental_agreements for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "rental_agreements_admin_update" on public.rental_agreements for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "rental_agreements_admin_delete" on public.rental_agreements for delete to authenticated
using (public.is_org_admin(organization_id));

-- Agreement spaces
create policy "agreement_spaces_select"
on public.agreement_spaces for select to authenticated
using (
  exists (
    select 1 from public.rental_agreements ra
    where ra.id = agreement_spaces.agreement_id
      and (
        public.is_org_staff(ra.organization_id)
        or exists (select 1 from public.tenants t where t.id = ra.tenant_id and t.linked_user_id = auth.uid())
      )
  )
);

create policy "agreement_spaces_admin_insert" on public.agreement_spaces for insert to authenticated
with check (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)));
create policy "agreement_spaces_admin_update" on public.agreement_spaces for update to authenticated
using (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)))
with check (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)));
create policy "agreement_spaces_admin_delete" on public.agreement_spaces for delete to authenticated
using (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)));

-- Invoices
create policy "invoices_select"
on public.invoices for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = invoices.tenant_id and t.linked_user_id = auth.uid())
);

create policy "invoices_admin_insert" on public.invoices for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "invoices_admin_update" on public.invoices for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "invoices_admin_delete" on public.invoices for delete to authenticated
using (public.is_org_admin(organization_id));

-- Invoice items
create policy "invoice_items_select"
on public.invoice_items for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (
        public.is_org_staff(i.organization_id)
        or exists (select 1 from public.tenants t where t.id = i.tenant_id and t.linked_user_id = auth.uid())
      )
  )
);

create policy "invoice_items_admin_insert" on public.invoice_items for insert to authenticated
with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));
create policy "invoice_items_admin_update" on public.invoice_items for update to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)))
with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));
create policy "invoice_items_admin_delete" on public.invoice_items for delete to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));

-- Payments (staff can view/manage per role rules; tenants can view own and create limited submissions via server flows)
create policy "payments_select"
on public.payments for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = payments.tenant_id and t.linked_user_id = auth.uid())
);

-- Allow tenants to insert pending/under_review payment intents for their own invoices (amount/status validated server-side in app/RPC for safety)
create policy "payments_tenant_insert"
on public.payments for insert to authenticated
with check (
  exists (select 1 from public.tenants t where t.id = tenant_id and t.linked_user_id = auth.uid())
  and exists (select 1 from public.invoices i where i.id = invoice_id and i.tenant_id = tenant_id)
  and payment_status in ('pending', 'under_review', 'failed')
  and verified_by is null
  and verified_at is null
);

create policy "payments_staff_insert" on public.payments for insert to authenticated
with check (public.is_org_staff(organization_id));
create policy "payments_staff_update" on public.payments for update to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));

-- Receipts
create policy "receipts_select"
on public.receipts for select to authenticated
using (
  exists (
    select 1 from public.payments p
    where p.id = receipts.payment_id
      and (
        public.is_org_staff(p.organization_id)
        or exists (select 1 from public.tenants t where t.id = p.tenant_id and t.linked_user_id = auth.uid())
      )
  )
);
create policy "receipts_staff_insert" on public.receipts for insert to authenticated
with check (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_staff(p.organization_id)));
create policy "receipts_staff_update" on public.receipts for update to authenticated
using (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_staff(p.organization_id)))
with check (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_staff(p.organization_id)));

-- EBM records
create policy "ebm_records_select"
on public.ebm_records for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = ebm_records.tenant_id and t.linked_user_id = auth.uid())
);
create policy "ebm_records_staff_insert" on public.ebm_records for insert to authenticated
with check (public.is_org_staff(organization_id));
create policy "ebm_records_staff_update" on public.ebm_records for update to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));
create policy "ebm_records_admin_delete" on public.ebm_records for delete to authenticated
using (public.is_org_admin(organization_id));

-- Expense categories
create policy "expense_categories_select" on public.expense_categories for select to authenticated
using (public.is_org_staff(organization_id));
create policy "expense_categories_admin_insert" on public.expense_categories for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "expense_categories_admin_update" on public.expense_categories for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "expense_categories_admin_delete" on public.expense_categories for delete to authenticated
using (public.is_org_admin(organization_id));

-- Expenses
create policy "expenses_select" on public.expenses for select to authenticated
using (public.is_org_staff(organization_id));
create policy "expenses_staff_insert" on public.expenses for insert to authenticated
with check (public.is_org_staff(organization_id));
create policy "expenses_staff_update" on public.expenses for update to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));
create policy "expenses_admin_delete" on public.expenses for delete to authenticated
using (public.is_org_admin(organization_id));

-- Notifications (own only)
create policy "notifications_select_own" on public.notifications for select to authenticated
using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
-- Inserts typically performed by trusted server/service role; allow admin/staff to create for users in same org context is app-specific.
create policy "notifications_insert_staff" on public.notifications for insert to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);

-- Audit logs: readable by staff, append-only; no user updates/deletes
create policy "audit_logs_select_staff" on public.audit_logs for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);
create policy "audit_logs_insert_staff" on public.audit_logs for insert to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);
-- no update/delete policies (denied by default with RLS enabled)




-- ============================================================
-- SOURCE: 20261113073500_storage_buckets_and_policies.sql
-- ============================================================


-- Private storage buckets and access policies

-- Create buckets (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tenant-documents', 'tenant-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('agreement-documents', 'agreement-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('receipts', 'receipts', false, 10485760, array['application/pdf']),
  ('ebm-documents', 'ebm-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp']),
  ('expense-documents', 'expense-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Helper: staff member (admin/accountant) in any org
create or replace function public.is_staff_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin','accountant')
  );
$$;

revoke all on function public.is_staff_user() from public;
grant execute on function public.is_staff_user() to authenticated;

-- Storage object policies
-- Convention:
--   tenant-related buckets may include paths like "{organization_id}/{tenant_id}/..."
--   staff buckets may include "{organization_id}/..."
-- Policies are intentionally conservative: staff (admin/accountant) can manage org documents;
-- tenants can read/write objects under their own tenant_id path segment where applicable.

-- Drop existing policies if re-run in dev (namespaced)
drop policy if exists "staff_read_documents" on storage.objects;
drop policy if exists "staff_write_documents" on storage.objects;
drop policy if exists "staff_update_documents" on storage.objects;
drop policy if exists "staff_delete_documents" on storage.objects;
drop policy if exists "tenant_read_own_documents" on storage.objects;
drop policy if exists "tenant_upload_own_documents" on storage.objects;

-- Staff read across private app buckets
create policy "staff_read_documents"
on storage.objects for select to authenticated
using (
  bucket_id in ('tenant-documents','agreement-documents','payment-proofs','receipts','ebm-documents','expense-documents')
  and public.is_staff_user()
);

-- Staff manage (insert/update/delete) across private app buckets
create policy "staff_write_documents"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('tenant-documents','agreement-documents','payment-proofs','receipts','ebm-documents','expense-documents')
  and public.is_staff_user()
);

create policy "staff_update_documents"
on storage.objects for update to authenticated
using (
  bucket_id in ('tenant-documents','agreement-documents','payment-proofs','receipts','ebm-documents','expense-documents')
  and public.is_staff_user()
)
with check (
  bucket_id in ('tenant-documents','agreement-documents','payment-proofs','receipts','ebm-documents','expense-documents')
  and public.is_staff_user()
);

create policy "staff_delete_documents"
on storage.objects for delete to authenticated
using (
  bucket_id in ('tenant-documents','agreement-documents','payment-proofs','receipts','ebm-documents','expense-documents')
  and public.is_staff_user()
);

-- Tenants: read their own tenant/agreement/payment-proof/receipt/ebm documents when path contains their tenant_id
create policy "tenant_read_own_documents"
on storage.objects for select to authenticated
using (
  bucket_id in ('tenant-documents','agreement-documents','payment-proofs','receipts','ebm-documents')
  and exists (
    select 1 from public.tenants t
    where t.linked_user_id = auth.uid()
      and position('/' || t.id::text || '/' in '/' || name || '/') > 0
  )
);

-- Tenants: upload permitted proofs/documents into their own tenant path
create policy "tenant_upload_own_documents"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('tenant-documents','payment-proofs')
  and exists (
    select 1 from public.tenants t
    where t.linked_user_id = auth.uid()
      and position('/' || t.id::text || '/' in '/' || name || '/') > 0
  )
);




-- ============================================================
-- SOURCE: 20261113074000_financial_functions_and_integrity.sql
-- ============================================================


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
           'Monthly rent - ' || coalesce(sp.space_code, '') || ' ' || coalesce(sp.name, ''),
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




-- ============================================================
-- SOURCE: 20261113074500_organization_settings.sql
-- ============================================================


-- Organization-level application settings

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_prefix text not null default 'INV',
  default_due_day integer not null default 5 check (default_due_day between 1 and 28),
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  auto_generate_monthly boolean not null default false,
  penalty_enabled boolean not null default false,
  penalty_rate_percent numeric(5,2) not null default 0 check (penalty_rate_percent >= 0),
  penalty_grace_period_days integer not null default 0 check (penalty_grace_period_days >= 0),
  momo_enabled boolean not null default true,
  airtel_enabled boolean not null default true,
  bank_transfer_enabled boolean not null default true,
  cash_enabled boolean not null default true,
  require_verification_for_bank boolean not null default true,
  ebm_enabled boolean not null default false,
  ebm_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists organization_settings_org_idx on public.organization_settings(organization_id);

drop trigger if exists set_organization_settings_updated_at on public.organization_settings;
create trigger set_organization_settings_updated_at before update on public.organization_settings
for each row execute function public.set_updated_at();

alter table public.organization_settings enable row level security;

create policy "organization_settings_select"
on public.organization_settings for select to authenticated
using (public.is_org_staff(organization_id) or public.has_org_role(organization_id, 'tenant'::public.app_role));

create policy "organization_settings_admin_insert" on public.organization_settings for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "organization_settings_admin_update" on public.organization_settings for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "organization_settings_admin_delete" on public.organization_settings for delete to authenticated
using (public.is_org_admin(organization_id));





-- ============================================================
-- SOURCE: 20261114002000_profiles_managed_role.sql
-- ============================================================

-- Store the UI/managed role assigned by administrators (supports roles not in app_role enum)
alter table public.profiles
  add column if not exists managed_role text;

-- Backfill managed_role from existing app_role assignments where possible
update public.profiles p
set managed_role = case ur.role::text
  when 'admin' then 'Administrator'
  when 'accountant' then 'Accountant'
  when 'tenant' then 'Tenant'
  else p.managed_role
end
from public.user_roles ur
where ur.user_id = p.id
  and p.managed_role is null;

