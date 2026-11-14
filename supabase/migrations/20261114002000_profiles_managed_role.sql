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
