export type Role = "admin" | "accountant" | "tenant";

export type Building = {
  id: string;
  name: string;
  address: string;
  district: string;
  city: string;
  floorsCount: number;
  description: string;
  yearBuilt: number;
};

export type Floor = {
  id: string;
  buildingId: string;
  name: string;
  level: number;
};

export type SpaceCategory = "shop" | "office" | "apartment" | "commercial";

export type SpaceStatus = "occupied" | "vacant" | "maintenance" | "reserved";

export type SpaceHistoryEntry = {
  id: string;
  date: string;
  event: string;
  description: string;
};

export type Space = {
  id: string;
  code: string;
  name: string;
  buildingId: string;
  floorId: string;
  category: SpaceCategory;
  status: SpaceStatus;
  sizeSqm: number;
  monthlyRent: number;
  tenantId?: string;
  description: string;
  features: string[];
  history: SpaceHistoryEntry[];
};

export type TenantType = "individual" | "company";

export type Tenant = {
  id: string;
  type: TenantType;
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  altPhone?: string;
  nationalId?: string;
  tin?: string;
  companyReg?: string;
  address: string;
  buildingId?: string;
  floorId?: string;
  roomNumber?: string;
  monthlyRent?: number;
  since: string;
  status: "active" | "inactive";
  notes?: string;
};

export type AgreementStatus = "active" | "expiring" | "expired" | "draft" | "terminated";

export type AgreementLine = {
  spaceId?: string;
  monthlyRent: number;
};

export type Agreement = {
  id: string;
  reference: string;
  tenantId: string;
  lineItems: AgreementLine[];
  startDate: string;
  endDate: string;
  monthlyCycle: "monthly";
  status: AgreementStatus;
  deposit: number;
  penaltyEnabled: boolean;
  penaltyRate: number;
  notes?: string;
  documentName?: string;
  createdAt: string;
};

export type InvoiceStatus = "paid" | "partial" | "pending" | "overdue" | "draft";

export type InvoiceLine = {
  id: string;
  spaceId: string;
  description: string;
  amount: number;
};

export type EbmStatus = "not_issued" | "reference_recorded" | "document_attached";

export type Invoice = {
  id: string;
  number: string;
  tenantId: string;
  agreementId: string;
  issueDate: string;
  dueDate: string;
  period: string;
  lineItems: InvoiceLine[];
  amount: number;
  amountPaid: number;
  status: InvoiceStatus;
  penaltyAmount?: number;
  ebmReference?: string;
  ebmStatus: EbmStatus;
  notes?: string;
  createdAt: string;
};

export type PaymentMethod = "mtn_momo" | "airtel_money" | "bank_transfer" | "cash" | "cheque";

export type PaymentStatus = "completed" | "pending" | "failed" | "reversed";

export type VerificationStatus = "verified" | "pending" | "rejected" | "not_required";

export type Payment = {
  id: string;
  reference: string;
  invoiceId: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  verification: VerificationStatus;
  date: string;
  phone?: string;
  bankName?: string;
  proofName?: string;
  ebmReference?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
};

export type ExpenseCategory =
  | "maintenance"
  | "repairs"
  | "cleaning"
  | "security"
  | "utilities"
  | "insurance"
  | "other";

export type Expense = {
  id: string;
  reference: string;
  title: string;
  category: ExpenseCategory;
  buildingId: string;
  amount: number;
  date: string;
  vendor: string;
  status: "paid" | "pending";
  recordedBy: string;
  notes?: string;
  receiptName?: string;
};

export type SystemUserRole = "Administrator" | "Accountant" | "Tenant" | "Property Manager" | "Viewer";

export type SystemUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: SystemUserRole;
  status: "active" | "invited" | "suspended";
  lastActive: string;
  tenantId?: string;
  permissions: string[];
};

export type ActivityType = "payment" | "invoice" | "tenant" | "agreement" | "expense" | "system";

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  date: string;
  actor: string;
};

export type NotificationType = "payment" | "invoice" | "agreement" | "system";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  type: NotificationType;
  tenantId?: string;
};

export type DocumentType = "rental_invoice" | "payment_receipt" | "ebm_invoice" | "agreement";

export type AppDocument = {
  id: string;
  name: string;
  type: DocumentType;
  relatedId: string;
  invoiceId?: string;
  paymentId?: string;
  tenantId?: string;
  date: string;
  fileSize: string;
  mime: string;
};

export type OrganizationSettings = {
  name: string;
  legalName: string;
  tin: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  churchName: string;
  logoUrl: string;
};

export type PaymentSettings = {
  momoEnabled: boolean;
  airtelEnabled: boolean;
  bankTransferEnabled: boolean;
  cashEnabled: boolean;
  momoMerchantCode: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  requireVerificationForBank: boolean;
};

export type EbmSettings = {
  enabled: boolean;
  ebmClientId: string;
  branchId: string;
  autoAttachReference: boolean;
  note: string;
};

export type InvoiceSettings = {
  prefix: string;
  gracePeriodDays: number;
  autoGenerateMonthly: boolean;
  footerNote: string;
};

export type PenaltySettings = {
  enabled: boolean;
  ratePercent: number;
  gracePeriodDays: number;
};

export type AppSettings = {
  organization: OrganizationSettings;
  payments: PaymentSettings;
  ebm: EbmSettings;
  invoices: InvoiceSettings;
  penalties: PenaltySettings;
};

export type Database = {
  buildings: Building[];
  floors: Floor[];
  spaces: Space[];
  tenants: Tenant[];
  agreements: Agreement[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  users: SystemUser[];
  activities: Activity[];
  notifications: AppNotification[];
  documents: AppDocument[];
  settings: AppSettings;
};

export type DashboardMetrics = {
  totalSpaces: number;
  occupiedSpaces: number;
  vacantSpaces: number;
  maintenanceSpaces: number;
  totalTenants: number;
  expectedMonthly: number;
  collectedThisMonth: number;
  outstanding: number;
  overdueInvoices: number;
  overdueAmount: number;
  occupancyRate: number;
  collectionRate: number;
};

export type MonthlyFinancialPoint = {
  month: string;
  label: string;
  expected: number;
  collected: number;
  expenses: number;
};

export type TenantPortalSummary = {
  tenant: Tenant;
  agreement?: Agreement;
  spaces: Space[];
  monthlyRent: number;
  balance: number;
  currentInvoice?: Invoice;
  nextDueDate?: string;
  pendingInvoices: Invoice[];
  recentPayments: Payment[];
};
