import type {
  Agreement,
  AgreementStatus,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
} from "@/types";
import { spaces } from "./property";
import { tenants } from "./people";

type AgreementSeed = {
  id: string;
  tenantId: string;
  lineItems: { spaceId: string; monthlyRent: number }[];
  startDate: string;
  endDate: string;
  dueDay: number;
  status: AgreementStatus;
  documentName: string;
  createdAt: string;
  notes?: string;
};

const agreementSeeds: AgreementSeed[] = [
  { id: "agr-1", tenantId: "t1", lineItems: [{ spaceId: "s1", monthlyRent: 450_000 }], startDate: "2025-02-01", endDate: "2027-01-31", dueDay: 5, status: "active", documentName: "Agreement-Kigali-Fresh-Mart-2025.pdf", createdAt: "2025-01-24" },
  { id: "agr-2", tenantId: "t2", lineItems: [{ spaceId: "s2", monthlyRent: 380_000 }], startDate: "2025-04-01", endDate: "2027-03-31", dueDay: 5, status: "active", documentName: "Agreement-Ubuntu-Coffee-House-2025.pdf", createdAt: "2025-03-20" },
  { id: "agr-3", tenantId: "t3", lineItems: [{ spaceId: "s4", monthlyRent: 360_000 }], startDate: "2025-08-01", endDate: "2027-07-31", dueDay: 5, status: "active", documentName: "Agreement-Mamas-Kitchen-2025.pdf", createdAt: "2025-07-19", notes: "Late payments to be monitored monthly." },
  { id: "agr-4", tenantId: "t4", lineItems: [{ spaceId: "s6", monthlyRent: 550_000 }, { spaceId: "s7", monthlyRent: 500_000 }], startDate: "2024-06-01", endDate: "2026-12-31", dueDay: 5, status: "expiring", documentName: "Agreement-Kigali-Digital-Hub-2024.pdf", createdAt: "2024-05-16", notes: "Renewal meeting scheduled for 25 November." },
  { id: "agr-5", tenantId: "t5", lineItems: [{ spaceId: "s9", monthlyRent: 600_000 }], startDate: "2025-01-15", endDate: "2028-01-14", dueDay: 10, status: "active", documentName: "Agreement-Rwanda-Legal-Chambers-2025.pdf", createdAt: "2025-01-08" },
  { id: "agr-6", tenantId: "t6", lineItems: [{ spaceId: "s10", monthlyRent: 650_000 }], startDate: "2025-03-01", endDate: "2027-02-28", dueDay: 5, status: "active", documentName: "Agreement-Gorilla-Tech-2025.pdf", createdAt: "2025-02-12" },
  { id: "agr-7", tenantId: "t7", lineItems: [{ spaceId: "s11", monthlyRent: 580_000 }], startDate: "2025-11-01", endDate: "2027-10-31", dueDay: 10, status: "active", documentName: "Agreement-Umurava-Consulting-2025.pdf", createdAt: "2025-10-18" },
  { id: "agr-8", tenantId: "t8", lineItems: [{ spaceId: "s13", monthlyRent: 620_000 }], startDate: "2025-05-01", endDate: "2027-04-30", dueDay: 5, status: "active", documentName: "Agreement-Kigali-Media-House-2025.pdf", createdAt: "2025-04-22" },
  { id: "agr-9", tenantId: "t9", lineItems: [{ spaceId: "s3", monthlyRent: 400_000 }, { spaceId: "s14", monthlyRent: 350_000 }], startDate: "2026-09-01", endDate: "2027-08-31", dueDay: 5, status: "active", documentName: "Agreement-Aline-Uwase-2026.pdf", createdAt: "2026-08-18", notes: "Two spaces under one agreement: retail shop G-03 and apartment 3-01." },
  { id: "agr-10", tenantId: "t10", lineItems: [{ spaceId: "s15", monthlyRent: 380_000 }], startDate: "2025-07-01", endDate: "2027-06-30", dueDay: 5, status: "active", documentName: "Agreement-Eric-Niyonzima-2025.pdf", createdAt: "2025-06-21" },
  { id: "agr-11", tenantId: "t11", lineItems: [{ spaceId: "s17", monthlyRent: 360_000 }], startDate: "2026-01-01", endDate: "2027-12-31", dueDay: 5, status: "active", documentName: "Agreement-Patrick-Habimana-2026.pdf", createdAt: "2025-12-12" },
  { id: "agr-12", tenantId: "t12", lineItems: [{ spaceId: "s18", monthlyRent: 400_000 }], startDate: "2025-10-01", endDate: "2027-09-30", dueDay: 5, status: "active", documentName: "Agreement-Claudine-Mukamana-2025.pdf", createdAt: "2025-09-18" },
  { id: "agr-13", tenantId: "t14", lineItems: [{ spaceId: "s21", monthlyRent: 410_000 }], startDate: "2025-02-01", endDate: "2027-01-31", dueDay: 5, status: "expiring", documentName: "Agreement-Grace-Iradukunda-2025.pdf", createdAt: "2025-01-15" },
  { id: "agr-14", tenantId: "t13", lineItems: [{ spaceId: "s20", monthlyRent: 390_000 }], startDate: "2026-02-01", endDate: "2028-01-31", dueDay: 5, status: "active", documentName: "Agreement-Samuel-Ndayisaba-2026.pdf", createdAt: "2026-01-14" },
  { id: "agr-15", tenantId: "t15", lineItems: [{ spaceId: "s22", monthlyRent: 300_000 }], startDate: "2025-06-01", endDate: "2027-05-31", dueDay: 5, status: "active", documentName: "Agreement-Igihe-Pharmacy-2025.pdf", createdAt: "2025-05-20" },
  { id: "agr-16", tenantId: "t16", lineItems: [{ spaceId: "s24", monthlyRent: 450_000 }], startDate: "2026-01-01", endDate: "2027-12-31", dueDay: 5, status: "active", documentName: "Agreement-Bright-Future-Academy-2026.pdf", createdAt: "2025-12-10" },
  { id: "agr-17", tenantId: "t17", lineItems: [{ spaceId: "s26", monthlyRent: 300_000 }], startDate: "2025-12-01", endDate: "2027-11-30", dueDay: 5, status: "active", documentName: "Agreement-Emmanuel-Nsengimana-2025.pdf", createdAt: "2025-11-19" },
  { id: "agr-18", tenantId: "t18", lineItems: [{ spaceId: "s19", monthlyRent: 420_000 }], startDate: "2025-12-15", endDate: "2026-12-15", dueDay: 5, status: "expiring", documentName: "Agreement-Jean-Claude-Nkurunziza-2025.pdf", createdAt: "2025-12-02" },
];

export const agreements: Agreement[] = agreementSeeds.map((seed) => ({
  ...seed,
  reference: `AGR-${seed.startDate.slice(0, 4)}-${String(agreementSeeds.indexOf(seed) + 1).padStart(3, "0")}`,
  monthlyCycle: "monthly",
  deposit: seed.lineItems.reduce((sum, item) => sum + item.monthlyRent, 0) * 2,
  penaltyEnabled: true,
  penaltyRate: 5,
}));

const spaceById = new Map(spaces.map((space) => [space.id, space]));

const PERIODS = ["2026-09", "2026-10", "2026-11"] as const;

const NOV_FULLY_PAID = new Set(["agr-1", "agr-6", "agr-15"]);
const NOV_PARTIAL: Record<string, number> = { "agr-2": 200_000, "agr-4": 500_000 };
const OCT_PARTIAL: Record<string, number> = { "agr-8": 300_000, "agr-12": 200_000 };
const OCT_UNPAID = new Set(["agr-3"]);
const PENALTIES: Record<string, number> = { "agr-3-2026-10": 18_000 };

function invoiceStatusFor(
  agreementId: string,
  period: string,
  amount: number,
  amountPaid: number,
): InvoiceStatus {
  if (amountPaid >= amount) return "paid";
  if (period === "2026-10") return "overdue";
  if (amountPaid > 0) return "partial";
  return period === "2026-09" ? "paid" : "pending";
}

function amountPaidFor(agreementId: string, period: string, amount: number) {
  if (period === "2026-09") return amount;
  if (period === "2026-10") {
    if (OCT_UNPAID.has(agreementId)) return 0;
    return OCT_PARTIAL[agreementId] ?? amount;
  }
  if (NOV_FULLY_PAID.has(agreementId)) return amount;
  return NOV_PARTIAL[agreementId] ?? 0;
}

export const invoices: Invoice[] = agreements.flatMap((agreement, agreementIndex) =>
  PERIODS.map((period, periodIndex) => {
    const lineItems = agreement.lineItems.map((line, lineIndex) => {
      const space = spaceById.get(line.spaceId);
      return {
        id: `inv-${agreement.id}-${period}-li-${lineIndex + 1}`,
        spaceId: line.spaceId,
        description: `Monthly rent — ${space?.code ?? line.spaceId} ${space?.name ?? ""}`.trim(),
        amount: line.monthlyRent,
      };
    });
    const subtotal = lineItems.reduce((sum, line) => sum + line.amount, 0);
    const penaltyAmount = PENALTIES[`${agreement.id}-${period}`] ?? 0;
    const amount = subtotal + penaltyAmount;
    const amountPaid = Math.min(amountPaidFor(agreement.id, period, amount), amount);
    const status = invoiceStatusFor(agreement.id, period, amount, amountPaid);
    const dueDate = `${period}-${String(agreement.dueDay).padStart(2, "0")}`;
    const sequence = agreementIndex + 1 + periodIndex * 0;
    return {
      id: `inv-${agreement.id}-${period}`,
      number: `INV-${period.replace("-", "")}-${String(sequence).padStart(3, "0")}`,
      tenantId: agreement.tenantId,
      agreementId: agreement.id,
      issueDate: `${period}-01`,
      dueDate,
      period,
      lineItems,
      amount,
      amountPaid,
      status,
      penaltyAmount: penaltyAmount || undefined,
      ebmStatus: "not_issued" as const,
      createdAt: `${period}-01T08:00:00`,
    };
  }),
);

const METHOD_CYCLE: PaymentMethod[] = [
  "mtn_momo",
  "bank_transfer",
  "mtn_momo",
  "airtel_money",
  "cash",
  "bank_transfer",
  "airtel_money",
  "mtn_momo",
];

const BANK_NAMES = ["Bank of Kigali", "I&M Bank Rwanda", "Equity Bank Rwanda"];

function isoDateTime(period: string, day: number, hour = 9) {
  return `${period}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(
    (day * 7) % 60,
  ).padStart(2, "0")}:00`;
}

function paymentRef(index: number, method: PaymentMethod) {
  const suffix = String(810000 + index * 137).padStart(6, "0");
  if (method === "mtn_momo") return `MOMO-${suffix}`;
  if (method === "airtel_money") return `AIRTEL-${suffix}`;
  if (method === "bank_transfer") return `BNK-${String(4100000 + index * 71)}`;
  if (method === "cheque") return `CHQ-${suffix}`;
  return `CASH-${String(1000 + index)}`;
}

const generatedPayments: Payment[] = [];

invoices.forEach((invoice, index) => {
  const agreement = agreements.find((item) => item.id === invoice.agreementId);
  if (!agreement) return;
  const tenant = tenants.find((item) => item.id === invoice.tenantId);
  if (!tenant) return;

  // A two-instalment example: one invoice, multiple payments.
  if (invoice.agreementId === "agr-8" && invoice.period === "2026-10") {
    const partials = [
      { amount: 250_000, day: 12, method: "mtn_momo" as PaymentMethod },
      { amount: 50_000, day: 27, method: "bank_transfer" as PaymentMethod },
    ];
    partials.forEach((partial, partIndex) => {
      generatedPayments.push({
        id: `p${generatedPayments.length + 1}`,
        reference: paymentRef(generatedPayments.length + 1, partial.method),
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        amount: partial.amount,
        method: partial.method,
        status: "completed",
        verification: "verified",
        date: isoDateTime(invoice.period, partial.day, 10 + partIndex),
        phone: partial.method === "mtn_momo" ? tenant.phone : undefined,
        bankName: partial.method === "bank_transfer" ? BANK_NAMES[partIndex % 3] : undefined,
        verifiedBy: partial.method === "bank_transfer" ? "Eric Mugisha" : undefined,
        verifiedAt: partial.method === "bank_transfer" ? isoDateTime(invoice.period, partial.day + 1, 9) : undefined,
        createdAt: isoDateTime(invoice.period, partial.day, 10 + partIndex),
      });
    });
    return;
  }

  if (invoice.amountPaid <= 0) return;

  const method = METHOD_CYCLE[index % METHOD_CYCLE.length];
  const day = invoice.period === "2026-11" ? 2 + (index % 7) : 3 + (index % 9);
  generatedPayments.push({
    id: `p${generatedPayments.length + 1}`,
    reference: paymentRef(generatedPayments.length + 1, method),
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    amount: invoice.amountPaid,
    method,
    status: "completed",
    verification: method === "cash" ? "not_required" : "verified",
    date: isoDateTime(invoice.period, day, 8 + (index % 6)),
    phone: method === "mtn_momo" || method === "airtel_money" ? tenant.phone : undefined,
    bankName: method === "bank_transfer" ? BANK_NAMES[index % BANK_NAMES.length] : undefined,
    verifiedBy: method === "bank_transfer" ? "Eric Mugisha" : undefined,
    verifiedAt: method === "bank_transfer" ? isoDateTime(invoice.period, day + 1, 9) : undefined,
    createdAt: isoDateTime(invoice.period, day, 8 + (index % 6)),
  });
});

// Bank transfers waiting for accountant verification do not change invoice balances.
const pendingTransfers = [
  { invoiceId: "inv-agr-7-2026-11", amount: 580_000, day: 9, bank: "Bank of Kigali" },
  { invoiceId: "inv-agr-14-2026-11", amount: 390_000, day: 11, bank: "I&M Bank Rwanda" },
];

pendingTransfers.forEach((transfer, transferIndex) => {
  const invoice = invoices.find((item) => item.id === transfer.invoiceId);
  if (!invoice) return;
  generatedPayments.push({
    id: `p${generatedPayments.length + 1}`,
    reference: `BNK-${String(5120040 + transferIndex * 913)}`,
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    amount: transfer.amount,
    method: "bank_transfer",
    status: "pending",
    verification: "pending",
    date: isoDateTime("2026-11", transfer.day, 11),
    bankName: transfer.bank,
    proofName: `bank-transfer-proof-${transferIndex + 1}.jpg`,
    notes: "Transfer submitted by tenant through the portal.",
    createdAt: isoDateTime("2026-11", transfer.day, 11),
  });
});

// A declined Mobile Money attempt keeps its history without touching the invoice.
const failedInvoice = invoices.find((item) => item.id === "inv-agr-9-2026-11");
if (failedInvoice) {
  generatedPayments.push({
    id: `p${generatedPayments.length + 1}`,
    reference: "MOMO-771209",
    invoiceId: failedInvoice.id,
    tenantId: failedInvoice.tenantId,
    amount: 350_000,
    method: "mtn_momo",
    status: "failed",
    verification: "not_required",
    date: "2026-11-10T07:42:00",
    phone: "+250 788 456 210",
    notes: "Simulated transaction declined — insufficient funds on the Mobile Money wallet.",
    createdAt: "2026-11-10T07:42:00",
  });
}

export const payments: Payment[] = generatedPayments;

// Record official EBM references on a handful of paid invoices. These are
// references from the church's existing EBM solution, not generated fiscal invoices.
const ebmTargets = ["p3", "p10", "p18", "p26", "p33", "p39"];
const ebmReferences = [
  "EBM-2026-001204",
  "EBM-2026-001388",
  "EBM-2026-001542",
  "EBM-2026-001701",
  "EBM-2026-001846",
  "EBM-2026-001990",
];
ebmTargets.forEach((paymentId, index) => {
  const payment = payments.find((item) => item.id === paymentId);
  if (!payment) return;
  const reference = ebmReferences[index];
  payment.ebmReference = reference;
  const invoice = invoices.find((item) => item.id === payment.invoiceId);
  if (invoice) {
    invoice.ebmReference = reference;
    invoice.ebmStatus = "document_attached";
  }
});

// Recompute invoice totals from the payment history so mock balances always agree.
invoices.forEach((invoice) => {
  const paid = payments
    .filter(
      (payment) =>
        payment.invoiceId === invoice.id &&
        (payment.status === "completed" || payment.verification === "verified"),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  invoice.amountPaid = Math.min(paid, invoice.amount);
  invoice.status = invoiceStatusFor(invoice.agreementId, invoice.period, invoice.amount, invoice.amountPaid);
});
