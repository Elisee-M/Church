-- Add tenant location (building, floor, room number) support

alter table public.tenants
  add column if not exists building_id uuid references public.buildings(id) on delete set null,
  add column if not exists floor_id uuid references public.floors(id) on delete set null,
  add column if not exists room_number text;

create index if not exists tenants_building_id_idx on public.tenants(building_id);
create index if not exists tenants_floor_id_idx on public.tenants(floor_id);