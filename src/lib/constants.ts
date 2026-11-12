import type {
  AgreementStatus,
  DocumentType,
  ExpenseCategory,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  SpaceCategory,
  SpaceStatus,
  TenantType,
  VerificationStatus,
} from "@/types";

export const SPACE_CATEGORY_LABELS: Record<SpaceCategory, string> = {
  shop: "Shop",
  office: "Office",
  apartment: "Apartment",
  commercial: "Commercial",
};

export const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
  reserved: "Reserved",
};

export const TENANT_TYPE_LABELS: Record<TenantType, string> = {
  individual: "Individual",
  company: "Company",
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  draft: "Draft",
  terminated: "Terminated",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: "Paid",
  partial: "Partially paid",
  pending: "Pending",
  overdue: "Overdue",
  draft: "Draft",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo: "MTN Mobile Money",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
};

export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: "Verified",
  pending: "Pending verification",
  rejected: "Rejected",
  not_required: "Not required",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  maintenance: "Maintenance",
  repairs: "Repairs",
  cleaning: "Cleaning",
  security: "Security",
  utilities: "Utilities",
  insurance: "Insurance",
  other: "Other",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  rental_invoice: "Rental invoice",
  payment_receipt: "Payment receipt",
  ebm_invoice: "EBM fiscal invoice",
  agreement: "Rental agreement",
};

export const STATUS_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral" | "info" | "navy"
> = {
  paid: "success",
  completed: "success",
  verified: "success",
  active: "success",
  occupied: "success",
  partial: "warning",
  pending: "warning",
  expiring: "warning",
  reserved: "info",
  draft: "neutral",
  inactive: "neutral",
  terminated: "neutral",
  vacant: "info",
  maintenance: "warning",
  overdue: "danger",
  failed: "danger",
  rejected: "danger",
  expired: "danger",
  suspended: "danger",
  reversed: "danger",
  not_issued: "neutral",
  reference_recorded: "info",
  document_attached: "success",
};

export const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  accountant: "/accountant/dashboard",
  tenant: "/tenant/dashboard",
};

export const DEMO_TENANT_ID = "t9";
export const DEMO_USER = {
  admin: { name: "Claudine Uwimana", email: "claudine@genzura.rw", title: "Church Administrator" },
  accountant: { name: "Eric Mugisha", email: "eric@genzura.rw", title: "Accountant" },
  tenant: { name: "Aline Uwase", email: "aline.uwase@gmail.com", title: "Tenant · Genzura Plaza" },
} as const;
