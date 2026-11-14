import type {
  Agreement,
  AgreementLine,
  AppDocument,
  AppNotification,
  AppSettings,
  Building,
  Database,
  Expense,
  Floor,
  Invoice,
  InvoiceLine,
  Payment,
  Space,
  SystemUser,
  Tenant,
} from "@/types";
import { createClient } from "@/lib/supabase/client";

function emptySettings(): AppSettings {
  return {
    organization: {
      name: "Genzura",
      legalName: "",
      tin: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      churchName: "",
      logoUrl: "/assets/genzura-logo.png",
    },
    payments: {
      momoEnabled: true,
      airtelEnabled: true,
      bankTransferEnabled: true,
      cashEnabled: true,
      momoMerchantCode: "",
      bankName: "",
      bankAccount: "",
      bankAccountName: "",
      requireVerificationForBank: true,
    },
    ebm: {
      enabled: false,
      ebmClientId: "",
      branchId: "",
      autoAttachReference: false,
      note: "Fiscal invoices are issued externally. Genzura only stores references and attachments.",
    },
    invoices: {
      prefix: "INV",
      gracePeriodDays: 5,
      autoGenerateMonthly: false,
      footerNote: "",
    },
    penalties: {
      enabled: false,
      ratePercent: 0,
      gracePeriodDays: 0,
    },
  };
}

export function emptyDatabase(): Database {
  return {
    buildings: [],
    floors: [],
    spaces: [],
    tenants: [],
    agreements: [],
    invoices: [],
    payments: [],
    expenses: [],
    users: [],
    activities: [],
    notifications: [],
    documents: [],
    settings: emptySettings(),
  };
}

function asArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

export async function fetchDatabaseFromSupabase(): Promise<Database> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return emptyDatabase();
  }

  const supabase = createClient();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [
    orgRes,
    buildingsRes,
    floorsRes,
    spacesRes,
    tenantsRes,
    agreementsRes,
    agreementSpacesRes,
    invoicesRes,
    invoiceItemsRes,
    paymentsRes,
    receiptsRes,
    ebmRes,
    expensesRes,
    profilesRes,
    userRolesRes,
    notificationsRes,
    auditRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from("organizations").select("*").limit(1).maybeSingle(),
    supabase.from("buildings").select("*").order("created_at", { ascending: true }),
    supabase.from("floors").select("*").order("floor_number", { ascending: true }),
    supabase.from("spaces").select("*").order("space_code", { ascending: true }),
    supabase.from("tenants").select("*").order("created_at", { ascending: true }),
    supabase.from("rental_agreements").select("*").order("created_at", { ascending: false }),
    supabase.from("agreement_spaces").select("*"),
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
    supabase.from("invoice_items").select("*"),
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
    supabase.from("receipts").select("*").order("issued_at", { ascending: false }),
    supabase.from("ebm_records").select("*").order("created_at", { ascending: false }),
    supabase.from("expense_categories").select("*"),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("profiles").select("*"),
    supabase.from("user_roles").select("*"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("organization_settings").select("*").limit(1).maybeSingle(),
  ]);

  if (profilesRes.error) console.error("[fetchDatabase] profiles:", profilesRes.error.message);
  if (userRolesRes.error) console.error("[fetchDatabase] user_roles:", userRolesRes.error.message);

  const org = orgRes.data as any;
  const settingsBase = emptySettings();
  if (org) {
    settingsBase.organization = {
      ...settingsBase.organization,
      name: org.name ?? settingsBase.organization.name,
      legalName: org.legal_name ?? "",
      tin: org.tin ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
      city: "",
      churchName: "",
      logoUrl: org.logo_url ?? settingsBase.organization.logoUrl,
    };
  }
  const s = settingsRes.data as any;
  if (s) {
    settingsBase.invoices.prefix = s.invoice_prefix ?? settingsBase.invoices.prefix;
    settingsBase.invoices.gracePeriodDays = s.grace_period_days ?? settingsBase.invoices.gracePeriodDays;
    settingsBase.invoices.autoGenerateMonthly = !!s.auto_generate_monthly;
    settingsBase.penalties.enabled = !!s.penalty_enabled;
    settingsBase.penalties.ratePercent = Number(s.penalty_rate_percent ?? 0);
    settingsBase.penalties.gracePeriodDays = s.penalty_grace_period_days ?? 0;
    settingsBase.payments.momoEnabled = s.momo_enabled ?? true;
    settingsBase.payments.airtelEnabled = s.airtel_enabled ?? true;
    settingsBase.payments.bankTransferEnabled = s.bank_transfer_enabled ?? true;
    settingsBase.payments.cashEnabled = s.cash_enabled ?? true;
    settingsBase.payments.requireVerificationForBank = s.require_verification_for_bank ?? true;
    settingsBase.ebm.enabled = !!s.ebm_enabled;
    settingsBase.ebm.note = s.ebm_note ?? settingsBase.ebm.note;
  }

  const buildings: Building[] = asArray(buildingsRes.data).map((b: any) => ({
    id: b.id,
    name: b.name,
    address: b.address ?? "",
    district: "",
    city: "",
    floorsCount: b.number_of_floors ?? 0,
    description: b.description ?? "",
    yearBuilt: 0,
  }));

  const floors: Floor[] = asArray(floorsRes.data).map((f: any) => ({
    id: f.id,
    buildingId: f.building_id,
    name: f.name ?? `Floor ${f.floor_number}`,
    level: f.floor_number ?? 0,
  }));

  const agreementSpaces = asArray(agreementSpacesRes.data) as any[];
  const agreementsRaw = asArray(agreementsRes.data) as any[];
  const spacesByAgreement = new Map<string, AgreementLine[]>();
  for (const ags of agreementSpaces) {
    const list = spacesByAgreement.get(ags.agreement_id) ?? [];
    list.push({ spaceId: ags.space_id, monthlyRent: Number(ags.monthly_rent_amount ?? 0) });
    spacesByAgreement.set(ags.agreement_id, list);
  }
  const spaceTenant = new Map<string, string>();
  for (const a of agreementsRaw) {
    if (["active", "expiring", "draft"].includes(a.status)) {
      for (const l of spacesByAgreement.get(a.id) ?? []) spaceTenant.set(l.spaceId, a.tenant_id);
    }
  }

  const spaces: Space[] = asArray(spacesRes.data).map((sp: any) => ({
    id: sp.id,
    code: sp.space_code ?? "",
    name: sp.name ?? "",
    buildingId: sp.building_id,
    floorId: sp.floor_id,
    category: sp.category ?? "commercial",
    status: sp.occupancy_status ?? "vacant",
    sizeSqm: Number(sp.area ?? 0),
    monthlyRent: Number(sp.default_rent_amount ?? 0),
    tenantId: spaceTenant.get(sp.id),
    description: sp.description ?? "",
    features: [],
    history: [],
  }));

  const tenants: Tenant[] = asArray(tenantsRes.data).map((t: any) => ({
    id: t.id,
    type: t.tenant_type ?? "individual",
    name: t.full_name ?? t.company_name ?? "",
    contactName: t.company_name ? t.full_name : undefined,
    email: t.email ?? "",
    phone: t.phone ?? "",
    altPhone: t.emergency_contact_phone ?? undefined,
    nationalId: t.national_id ?? undefined,
    tin: t.company_tin ?? undefined,
    companyReg: undefined,
    address: t.address ?? "",
    buildingId: t.building_id ?? undefined,
    floorId: t.floor_id ?? undefined,
    roomNumber: t.room_number ?? undefined,
    since: (t.created_at ?? "").slice(0, 10),
    status: "active",
    notes: undefined,
  }));

  const agreements: Agreement[] = agreementsRaw.map((a: any) => ({
    id: a.id,
    reference: a.agreement_number ?? a.id.slice(0, 8),
    tenantId: a.tenant_id,
    lineItems: spacesByAgreement.get(a.id) ?? [],
    startDate: a.start_date,
    endDate: a.end_date,
    monthlyCycle: "monthly",
    status: (a.status === "cancelled" ? "terminated" : a.status) as any,
    deposit: 0,
    penaltyEnabled: settingsBase.penalties.enabled,
    penaltyRate: settingsBase.penalties.ratePercent,
    notes: a.terms ?? undefined,
    documentName: a.signed_document_path ? a.signed_document_path.split("/").pop() : undefined,
    createdAt: a.created_at,
  }));

  const invoiceItemsRaw = asArray(invoiceItemsRes.data) as any[];
  const itemsByInvoice = new Map<string, InvoiceLine[]>();
  for (const it of invoiceItemsRaw) {
    const list = itemsByInvoice.get(it.invoice_id) ?? [];
    list.push({
      id: it.id,
      spaceId: it.space_id ?? "",
      description: it.description ?? "",
      amount: Number(it.total ?? it.unit_price ?? 0),
    });
    itemsByInvoice.set(it.invoice_id, list);
  }

  const ebmByInvoice = new Map<string, any[]>();
  for (const e of asArray(ebmRes.data) as any[]) {
    const list = ebmByInvoice.get(e.invoice_id) ?? [];
    list.push(e);
    ebmByInvoice.set(e.invoice_id, list);
  }

  const invoices: Invoice[] = asArray(invoicesRes.data).map((inv: any) => {
    const ebms = ebmByInvoice.get(inv.id) ?? [];
    const ebm = ebms[0];
    let status = inv.status as string;
    if (status === "issued") status = "pending";
    if (status === "cancelled") status = "draft";
    return {
      id: inv.id,
      number: inv.invoice_number,
      tenantId: inv.tenant_id,
      agreementId: inv.agreement_id,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      period: (inv.billing_period_start ?? "").slice(0, 7),
      lineItems: itemsByInvoice.get(inv.id) ?? [],
      amount: Number(inv.total_amount ?? 0),
      amountPaid: Number(inv.amount_paid ?? 0),
      status: status as any,
      penaltyAmount: Number(inv.penalty_amount ?? 0),
      ebmReference: ebm?.ebm_reference ?? undefined,
      ebmStatus: ebm ? (ebm.document_path ? "document_attached" : "reference_recorded") : "not_issued",
      notes: inv.notes ?? undefined,
      createdAt: inv.created_at,
    };
  });

  function mapPaymentMethod(m: string): any {
    if (m === "mtn_mobile_money") return "mtn_momo";
    if (m === "bank_transfer") return "bank_transfer";
    if (m === "airtel_money") return "airtel_money";
    if (m === "cash") return "cash";
    return "bank_transfer";
  }
  function mapPaymentStatus(s: string): any {
    if (s === "successful") return "completed";
    if (s === "under_review") return "pending";
    if (s === "cancelled") return "failed";
    return s;
  }
  function mapVerification(p: any): any {
    if (p.verified_at || p.payment_status === "successful") return "verified";
    if (p.payment_status === "pending" || p.payment_status === "under_review") return "pending";
    if (p.payment_status === "failed") return "rejected";
    return "not_required";
  }

  const payments: Payment[] = asArray(paymentsRes.data).map((p: any) => ({
    id: p.id,
    reference: p.transaction_reference ?? p.provider_transaction_id ?? p.id.slice(0, 8),
    invoiceId: p.invoice_id,
    tenantId: p.tenant_id,
    amount: Number(p.amount ?? 0),
    method: mapPaymentMethod(p.payment_method),
    status: mapPaymentStatus(p.payment_status),
    verification: mapVerification(p),
    date: p.payment_date ?? p.created_at,
    phone: p.phone_number ?? undefined,
    bankName: undefined,
    proofName: undefined,
    ebmReference: undefined,
    verifiedBy: p.verified_by ?? undefined,
    verifiedAt: p.verified_at ?? undefined,
    notes: p.notes ?? undefined,
    createdAt: p.created_at,
  }));

  const expenses: Expense[] = asArray(expensesRes.data).map((e: any) => ({
    id: e.id,
    reference: e.id.slice(0, 8).toUpperCase(),
    title: e.description ?? "Expense",
    category: "other" as any,
    buildingId: e.building_id ?? "",
    amount: Number(e.amount ?? 0),
    date: e.expense_date,
    vendor: "",
    status: "paid",
    recordedBy: e.recorded_by ?? "",
    notes: e.description ?? undefined,
    receiptName: e.receipt_document_path ? e.receipt_document_path.split("/").pop() : undefined,
  }));

  const profiles = asArray(profilesRes.data) as any[];
  const roles = asArray(userRolesRes.data) as any[];
  const rolesByUser = new Map<string, string[]>();
  for (const r of roles) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  }
  function roleLabel(rs: string[] = [], managedRole?: string | null): any {
    const allowed = ["Administrator", "Accountant", "Property Manager", "Tenant", "Viewer"];
    if (managedRole && allowed.includes(managedRole)) return managedRole;
    if (rs.includes("admin")) return "Administrator";
    if (rs.includes("accountant")) return "Accountant";
    if (rs.includes("tenant")) return "Tenant";
    return "Viewer";
  }
  function permissionsForRole(role: string): string[] {
    if (role === "Administrator") return ["Manage users and roles", "Manage properties and agreements", "View and manage finances", "Access all reports and settings"];
    if (role === "Accountant") return ["Record and verify payments", "Manage invoices and expenses", "View financial reports"];
    if (role === "Tenant") return ["View own rentals and invoices", "View payment history and receipts"];
    return ["View assigned information"];
  }
  const users: SystemUser[] = profiles.map((p: any) => {
    const rs = rolesByUser.get(p.id) ?? [];
    const role = roleLabel(rs, p.managed_role);
    return {
      id: p.id,
      name: p.full_name ?? p.email ?? "User",
      email: p.email ?? "",
      phone: p.phone ?? "",
      role,
      status: p.is_active === false ? "suspended" : "active",
      lastActive: p.updated_at ?? p.created_at ?? "",
      tenantId: undefined,
      permissions: permissionsForRole(role),
    } as any;
  });

  const notifications: AppNotification[] = asArray(notificationsRes.data).map((n: any) => ({
    id: n.id,
    title: n.title ?? "",
    body: n.message ?? "",
    date: n.created_at,
    read: !!n.is_read,
    type: (n.notification_type ?? "system") as any,
    tenantId: undefined,
  }));

  const activities = asArray(auditRes.data).map((a: any) => ({
    id: a.id,
    type: "system" as const,
    title: a.action ?? "Activity",
    description: a.reason ?? a.entity_type ?? "",
    date: a.created_at,
    actor: a.actor_user_id ?? "System",
  }));

  const documents: AppDocument[] = [
    ...asArray(receiptsRes.data).map((r: any) => ({
      id: r.id,
      name: r.receipt_number ? `Receipt ${r.receipt_number}` : "Receipt",
      type: "payment_receipt" as const,
      relatedId: r.payment_id,
      paymentId: r.payment_id,
      date: (r.issued_at ?? "").slice(0, 10),
      fileSize: "",
      mime: "application/pdf",
    })),
    ...asArray(ebmRes.data).map((e: any) => ({
      id: e.id,
      name: e.ebm_invoice_number ?? e.ebm_reference ?? "EBM document",
      type: "ebm_invoice" as const,
      relatedId: e.invoice_id,
      invoiceId: e.invoice_id,
      tenantId: e.tenant_id,
      date: (e.issued_at ?? e.created_at ?? "").slice(0, 10),
      fileSize: "",
      mime: "application/pdf",
    })),
  ];

  return {
    buildings,
    floors,
    spaces,
    tenants,
    agreements,
    invoices,
    payments,
    expenses,
    users,
    activities,
    notifications,
    documents,
    settings: settingsBase,
  };
}
