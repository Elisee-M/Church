# Initial Setup and Provisioning

## 1. Environment variables
Copy `.env.example` to `.env.local` and set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; required for admin provisioning/invites)

Optional:
- `NEXT_PUBLIC_APP_URL` (used for auth invite redirect URLs)

## 2. Apply database migrations
Run all migrations in Supabase SQL editor:
- Recommended: execute `supabase/all migration.sql` (single script, all migrations in order)
- Or apply files in `supabase/migrations/` sequentially

## 3. Create organization and initial admin
Use `supabase/seed.example.sql` as a template (run manually, do not auto-seed production):
1. Insert an `organizations` row and `organization_settings`.
2. Create the first administrator in Supabase Auth (Dashboard or trusted Admin API).
3. Assign role in `public.user_roles` for that user: `role = 'admin'` and the organization id.
4. Sign in at `/login` — middleware will redirect to `/admin/dashboard`.

## 4. User provisioning (secure)
- Administrators can invite users from the Users workspace (server action using Supabase Admin API / service role).
- Supported app roles: `admin`, `accountant`, `tenant` (mapped from Administrator/Accountant/Tenant). Property Manager/Viewer are not yet modeled in DB enum.
- Tenant portal access requires a `tenants` record linked via `linked_user_id` to the auth user (and tenant role/membership as applicable).

## 5. Storage
Private buckets (configured by migration): `tenant-documents`, `agreement-documents`, `payment-proofs`, `receipts`, `ebm-documents`, `expense-documents`.
- Access is controlled by storage policies and RLS-aligned path conventions.
- Use signed URLs for private document access.

## 6. Testing roles and RLS
- Test with separate admin/accountant/tenant users.
- Verify tenants cannot access other tenants' records or documents.
- Verify accountants cannot manage roles/admin accounts and cannot silently modify confirmed payments.
