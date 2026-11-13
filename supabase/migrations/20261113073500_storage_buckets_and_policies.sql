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
