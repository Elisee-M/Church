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
