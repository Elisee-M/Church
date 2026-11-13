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
