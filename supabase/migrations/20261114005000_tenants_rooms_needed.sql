-- Track how many rooms/units a tenant needs

alter table public.tenants
  add column if not exists rooms_needed integer not null default 1 check (rooms_needed >= 1);
