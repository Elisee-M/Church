import type {
  Activity,
  AppDocument,
  AppNotification,
  AppSettings,
  Expense,
} from "@/types";

export const expenses: Expense[] = [];
export const activities: Activity[] = [];
export const notifications: AppNotification[] = [];
export const documents: AppDocument[] = [];

export const settings: AppSettings = {
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
    dueDay: 5,
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
