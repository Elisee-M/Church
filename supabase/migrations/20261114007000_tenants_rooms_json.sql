-- Store per-room floor and room number details for tenants

alter table public.tenants
  add column if not exists rooms jsonb;
