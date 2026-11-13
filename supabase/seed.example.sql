-- Genzura: minimal setup / seed example (run manually in Supabase SQL editor)
-- Do NOT run automatically in production. Replace placeholder values.

-- 1) Create organization
insert into public.organizations (id, name, legal_name, tin, address, email, phone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Genzura',
  'ADEPR Kigali Central',
  null,
  null,
  null,
  null
)
on conflict (id) do nothing;

insert into public.organization_settings (organization_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (organization_id) do nothing;

-- 2) After creating an auth user in Supabase Auth (Dashboard or Admin API),
--    copy their auth.users.id (UUID) below and assign admin role.
--    The profiles row is auto-created by trigger on auth.users insert.

-- Example:
-- insert into public.user_roles (user_id, organization_id, role)
-- values ('<AUTH_USER_UUID>', '00000000-0000-0000-0000-000000000001', 'admin')
-- on conflict (user_id, organization_id, role) do nothing;

-- 3) (Optional) Link a tenant record to a tenant auth user:
-- insert into public.tenants (organization_id, tenant_type, full_name, email, phone, linked_user_id)
-- values ('00000000-0000-0000-0000-000000000001', 'individual', 'Tenant Name', 'tenant@example.com', null, '<TENANT_AUTH_USER_UUID>');

-- Notes:
-- - For production, prefer a secure server-side provisioning workflow (admin service role) to create/invite users and assign roles.
-- - Never expose SUPABASE_SERVICE_ROLE_KEY to clients.
-- - RLS policies require correct role assignments in public.user_roles.
