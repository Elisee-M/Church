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
