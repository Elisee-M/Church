-- Security helper functions and Row Level Security policies

-- Helper: check if current user has a role in an organization
create or replace function public.has_org_role(p_org_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.organization_id = p_org_id
      and ur.user_id = auth.uid()
      and ur.role = p_role
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, 'admin'::public.app_role);
$$;

create or replace function public.is_org_accountant(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, 'accountant'::public.app_role);
$$;

create or replace function public.is_org_staff(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, 'admin'::public.app_role)
      or public.has_org_role(p_org_id, 'accountant'::public.app_role);
$$;

-- Tenant record linked to current auth user (within any org; callers should scope by org)
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.tenants t
  where t.linked_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_tenant_owner(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = p_tenant_id
      and t.linked_user_id = auth.uid()
  );
$$;

-- Restrict helper execution to authenticated/anon as appropriate
revoke all on function public.has_org_role(uuid, public.app_role) from public;
revoke all on function public.is_org_admin(uuid) from public;
revoke all on function public.is_org_accountant(uuid) from public;
revoke all on function public.is_org_staff(uuid) from public;
revoke all on function public.current_tenant_id() from public;
revoke all on function public.is_tenant_owner(uuid) from public;

grant execute on function public.has_org_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_accountant(uuid) to authenticated;
grant execute on function public.is_org_staff(uuid) to authenticated;
grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.is_tenant_owner(uuid) to authenticated;

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.spaces enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.tenants enable row level security;
alter table public.rental_agreements enable row level security;
alter table public.agreement_spaces enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.ebm_records enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy "profiles_select_self_or_staff"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);

create policy "profiles_update_self"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Organizations
create policy "organizations_select_members"
on public.organizations for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.organization_id = organizations.id and ur.user_id = auth.uid()
  )
);

create policy "organizations_admin_manage"
on public.organizations for all to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

-- User roles: admins manage, users can read their own memberships
create policy "user_roles_select_own_or_admin"
on public.user_roles for select to authenticated
using (
  user_id = auth.uid() or public.is_org_admin(organization_id)
);

create policy "user_roles_insert_admin"
on public.user_roles for insert to authenticated
with check (public.is_org_admin(organization_id));

create policy "user_roles_update_admin"
on public.user_roles for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "user_roles_delete_admin"
on public.user_roles for delete to authenticated
using (public.is_org_admin(organization_id));

-- Buildings
create policy "buildings_select_staff_or_tenant_related"
on public.buildings for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (
    select 1
    from public.tenants t
    join public.rental_agreements ra on ra.tenant_id = t.id
    join public.agreement_spaces ags on ags.agreement_id = ra.id
    join public.spaces sp on sp.id = ags.space_id
    where t.linked_user_id = auth.uid()
      and sp.building_id = buildings.id
  )
);

create policy "buildings_admin_manage"
on public.buildings for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "buildings_admin_update"
on public.buildings for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "buildings_admin_delete"
on public.buildings for delete to authenticated
using (public.is_org_admin(organization_id));

-- Floors
create policy "floors_select"
on public.floors for select to authenticated
using (
  exists (
    select 1 from public.buildings b
    where b.id = floors.building_id
      and (
        public.is_org_staff(b.organization_id)
        or exists (
          select 1
          from public.tenants t
          join public.rental_agreements ra on ra.tenant_id = t.id
          join public.agreement_spaces ags on ags.agreement_id = ra.id
          join public.spaces sp on sp.id = ags.space_id
          where t.linked_user_id = auth.uid() and sp.floor_id = floors.id
        )
      )
  )
);

create policy "floors_admin_insert" on public.floors for insert to authenticated
with check (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)));
create policy "floors_admin_update" on public.floors for update to authenticated
using (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)))
with check (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)));
create policy "floors_admin_delete" on public.floors for delete to authenticated
using (exists (select 1 from public.buildings b where b.id = building_id and public.is_org_admin(b.organization_id)));

-- Spaces
create policy "spaces_select"
on public.spaces for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (
    select 1
    from public.tenants t
    join public.rental_agreements ra on ra.tenant_id = t.id
    join public.agreement_spaces ags on ags.agreement_id = ra.id
    where t.linked_user_id = auth.uid() and ags.space_id = spaces.id
  )
);

create policy "spaces_admin_insert" on public.spaces for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "spaces_admin_update" on public.spaces for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "spaces_admin_delete" on public.spaces for delete to authenticated
using (public.is_org_admin(organization_id));

-- Tenants
create policy "tenants_select"
on public.tenants for select to authenticated
using (
  public.is_org_staff(organization_id)
  or linked_user_id = auth.uid()
);

create policy "tenants_admin_insert" on public.tenants for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "tenants_admin_update" on public.tenants for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "tenants_admin_delete" on public.tenants for delete to authenticated
using (public.is_org_admin(organization_id));

-- Rental agreements
create policy "rental_agreements_select"
on public.rental_agreements for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = rental_agreements.tenant_id and t.linked_user_id = auth.uid())
);

create policy "rental_agreements_admin_insert" on public.rental_agreements for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "rental_agreements_admin_update" on public.rental_agreements for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "rental_agreements_admin_delete" on public.rental_agreements for delete to authenticated
using (public.is_org_admin(organization_id));

-- Agreement spaces
create policy "agreement_spaces_select"
on public.agreement_spaces for select to authenticated
using (
  exists (
    select 1 from public.rental_agreements ra
    where ra.id = agreement_spaces.agreement_id
      and (
        public.is_org_staff(ra.organization_id)
        or exists (select 1 from public.tenants t where t.id = ra.tenant_id and t.linked_user_id = auth.uid())
      )
  )
);

create policy "agreement_spaces_admin_insert" on public.agreement_spaces for insert to authenticated
with check (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)));
create policy "agreement_spaces_admin_update" on public.agreement_spaces for update to authenticated
using (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)))
with check (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)));
create policy "agreement_spaces_admin_delete" on public.agreement_spaces for delete to authenticated
using (exists (select 1 from public.rental_agreements ra where ra.id = agreement_id and public.is_org_admin(ra.organization_id)));

-- Invoices
create policy "invoices_select"
on public.invoices for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = invoices.tenant_id and t.linked_user_id = auth.uid())
);

create policy "invoices_admin_insert" on public.invoices for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "invoices_admin_update" on public.invoices for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "invoices_admin_delete" on public.invoices for delete to authenticated
using (public.is_org_admin(organization_id));

-- Invoice items
create policy "invoice_items_select"
on public.invoice_items for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and (
        public.is_org_staff(i.organization_id)
        or exists (select 1 from public.tenants t where t.id = i.tenant_id and t.linked_user_id = auth.uid())
      )
  )
);

create policy "invoice_items_admin_insert" on public.invoice_items for insert to authenticated
with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));
create policy "invoice_items_admin_update" on public.invoice_items for update to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)))
with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));
create policy "invoice_items_admin_delete" on public.invoice_items for delete to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));

-- Payments (staff can view/manage per role rules; tenants can view own and create limited submissions via server flows)
create policy "payments_select"
on public.payments for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = payments.tenant_id and t.linked_user_id = auth.uid())
);

-- Allow tenants to insert pending/under_review payment intents for their own invoices (amount/status validated server-side in app/RPC for safety)
create policy "payments_tenant_insert"
on public.payments for insert to authenticated
with check (
  exists (select 1 from public.tenants t where t.id = tenant_id and t.linked_user_id = auth.uid())
  and exists (select 1 from public.invoices i where i.id = invoice_id and i.tenant_id = tenant_id)
  and payment_status in ('pending', 'under_review', 'failed')
  and verified_by is null
  and verified_at is null
);

create policy "payments_staff_insert" on public.payments for insert to authenticated
with check (public.is_org_staff(organization_id));
create policy "payments_staff_update" on public.payments for update to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));

-- Receipts
create policy "receipts_select"
on public.receipts for select to authenticated
using (
  exists (
    select 1 from public.payments p
    where p.id = receipts.payment_id
      and (
        public.is_org_staff(p.organization_id)
        or exists (select 1 from public.tenants t where t.id = p.tenant_id and t.linked_user_id = auth.uid())
      )
  )
);
create policy "receipts_staff_insert" on public.receipts for insert to authenticated
with check (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_staff(p.organization_id)));
create policy "receipts_staff_update" on public.receipts for update to authenticated
using (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_staff(p.organization_id)))
with check (exists (select 1 from public.payments p where p.id = payment_id and public.is_org_staff(p.organization_id)));

-- EBM records
create policy "ebm_records_select"
on public.ebm_records for select to authenticated
using (
  public.is_org_staff(organization_id)
  or exists (select 1 from public.tenants t where t.id = ebm_records.tenant_id and t.linked_user_id = auth.uid())
);
create policy "ebm_records_staff_insert" on public.ebm_records for insert to authenticated
with check (public.is_org_staff(organization_id));
create policy "ebm_records_staff_update" on public.ebm_records for update to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));
create policy "ebm_records_admin_delete" on public.ebm_records for delete to authenticated
using (public.is_org_admin(organization_id));

-- Expense categories
create policy "expense_categories_select" on public.expense_categories for select to authenticated
using (public.is_org_staff(organization_id));
create policy "expense_categories_admin_insert" on public.expense_categories for insert to authenticated
with check (public.is_org_admin(organization_id));
create policy "expense_categories_admin_update" on public.expense_categories for update to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));
create policy "expense_categories_admin_delete" on public.expense_categories for delete to authenticated
using (public.is_org_admin(organization_id));

-- Expenses
create policy "expenses_select" on public.expenses for select to authenticated
using (public.is_org_staff(organization_id));
create policy "expenses_staff_insert" on public.expenses for insert to authenticated
with check (public.is_org_staff(organization_id));
create policy "expenses_staff_update" on public.expenses for update to authenticated
using (public.is_org_staff(organization_id))
with check (public.is_org_staff(organization_id));
create policy "expenses_admin_delete" on public.expenses for delete to authenticated
using (public.is_org_admin(organization_id));

-- Notifications (own only)
create policy "notifications_select_own" on public.notifications for select to authenticated
using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
-- Inserts typically performed by trusted server/service role; allow admin/staff to create for users in same org context is app-specific.
create policy "notifications_insert_staff" on public.notifications for insert to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);

-- Audit logs: readable by staff, append-only; no user updates/deletes
create policy "audit_logs_select_staff" on public.audit_logs for select to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);
create policy "audit_logs_insert_staff" on public.audit_logs for insert to authenticated
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('admin', 'accountant')
  )
);
-- no update/delete policies (denied by default with RLS enabled)
