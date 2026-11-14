import type { Database, Invoice, InvoiceStatus, Payment, Space } from "@/types";

export const HISTORY_MONTHS: string[] = [];

export const APP_TODAY = new Date();

export function todayISO() {
  return APP_TODAY.toISOString().slice(0, 10);
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

export function invoiceBalance(invoice: Invoice) {
  return Math.max(invoice.amount - invoice.amountPaid, 0);
}

export function invoiceIsPastDue(invoice: Invoice) {
  return invoiceBalance(invoice) > 0 && invoice.dueDate < todayISO();
}

export function getDashboardMetrics(db: Database) {
  const totalSpaces = db.spaces.length;
  const occupiedSpaces = db.spaces.filter((space) => space.status === "occupied").length;
  const vacantSpaces = db.spaces.filter((space) => space.status === "vacant").length;
  const maintenanceSpaces = db.spaces.filter((space) => space.status === "maintenance").length;
  const activeAgreements = db.agreements.filter(
    (agreement) => agreement.status === "active" || agreement.status === "expiring",
  );
  const expectedMonthly = activeAgreements.reduce(
    (sum, agreement) =>
      sum + agreement.lineItems.reduce((lineSum, line) => lineSum + line.monthlyRent, 0),
    0,
  );
  const month = currentMonthKey();
  const collectedThisMonth = db.payments
    .filter((payment) => payment.status === "completed" && payment.date.startsWith(month))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const unpaidInvoices = db.invoices.filter(
    (invoice) => invoice.status !== "draft" && invoiceBalance(invoice) > 0,
  );
  const overdueInvoices = unpaidInvoices.filter(
    (invoice) => invoice.status === "overdue" || invoiceIsPastDue(invoice),
  );
  const outstanding = unpaidInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);

  return {
    totalSpaces,
    occupiedSpaces,
    vacantSpaces,
    maintenanceSpaces,
    totalTenants: db.tenants.filter((tenant) => tenant.status === "active").length,
    expectedMonthly,
    collectedThisMonth,
    outstanding,
    overdueInvoices: overdueInvoices.length,
    overdueAmount,
    occupancyRate: totalSpaces ? (occupiedSpaces / totalSpaces) * 100 : 0,
    collectionRate: expectedMonthly ? Math.min((collectedThisMonth / expectedMonthly) * 100, 100) : 0,
  };
}

export function getMonthlyFinancials(db: Database) {
  const months = Array.from(
    new Set([
      ...db.invoices.map((invoice) => invoice.period),
      ...db.payments.map((payment) => payment.date.slice(0, 7)),
      ...db.expenses.map((expense) => expense.date.slice(0, 7)),
    ]),
  )
    .filter(Boolean)
    .sort();
  return months.map((month) => {
    const expected = db.invoices
      .filter((invoice) => invoice.period === month)
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const collected = db.payments
      .filter((payment) => payment.status === "completed" && payment.date.startsWith(month))
      .reduce((sum, payment) => sum + payment.amount, 0);
    const expenses = db.expenses
      .filter((expense) => expense.date.startsWith(month))
      .reduce((sum, expense) => sum + expense.amount, 0);
    const label = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
      new Date(`${month}-01T00:00:00`),
    );
    return { month, label, expected, collected, expenses };
  });
}

export function getTenantSummary(db: Database, tenantId: string) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const agreement = db.agreements.find(
    (item) =>
      item.tenantId === tenantId && (item.status === "active" || item.status === "expiring"),
  );
  const tenantAgreements = db.agreements.filter((item) => item.tenantId === tenantId);
  const spaceIds = new Set(
    tenantAgreements.flatMap((item) => item.lineItems.map((line) => line.spaceId)),
  );
  const spaces = db.spaces.filter((space) => spaceIds.has(space.id) || space.tenantId === tenantId);

  // Tenants may have a room assigned directly without a pre-created space. Expose
  // that rented unit so the portal shows the correct occupied-space count.
  if (spaces.length === 0 && tenant) {
    const roomNumbers = tenant.roomNumbers?.length ? tenant.roomNumbers : tenant.roomNumber ? [tenant.roomNumber] : [];
    const roomCount = Math.max(tenant.roomsNeeded ?? roomNumbers.length ?? 1, roomNumbers.length, 1);
    const rentPerRoom = (tenant.monthlyRent ?? 0) / roomCount;
    for (let index = 0; index < roomCount; index += 1) {
      const roomNumber = roomNumbers[index];
      spaces.push({
        id: `${tenant.id}-room-${index + 1}`,
        code: roomNumber || `Room ${index + 1}`,
        name: roomNumber ? `Room ${roomNumber}` : "Rented room",
        buildingId: tenant.buildingId ?? "",
        floorId: tenant.floorId ?? "",
        category: "commercial",
        status: "occupied",
        sizeSqm: 0,
        monthlyRent: rentPerRoom,
        tenantId: tenant.id,
        description: "",
        features: [],
        history: [],
      });
    }
  }

  const invoices = db.invoices
    .filter((invoice) => invoice.tenantId === tenantId)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const pendingInvoices = invoices.filter((invoice) => invoiceBalance(invoice) > 0);
  const balance = pendingInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const payments = db.payments
    .filter((payment) => payment.tenantId === tenantId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const nextInvoice = [...pendingInvoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const monthlyRent = agreement
    ? agreement.lineItems.reduce((sum, line) => sum + line.monthlyRent, 0)
    : tenant?.monthlyRent ?? spaces.reduce((sum, space) => sum + space.monthlyRent, 0);

  return {
    tenant,
    agreement,
    spaces,
    monthlyRent,
    balance,
    currentInvoice: nextInvoice,
    nextDueDate: nextInvoice?.dueDate,
    pendingInvoices,
    invoices,
    recentPayments: payments.slice(0, 5),
    payments,
  };
}

export function getOccupancyBreakdown(db: Database) {
  const categories = ["shop", "office", "apartment", "commercial"] as const;
  return categories.map((category) => {
    const all = db.spaces.filter((space) => space.category === category);
    const occupied = all.filter((space) => space.status === "occupied").length;
    return {
      category,
      total: all.length,
      occupied,
      vacant: all.length - occupied,
      rate: all.length ? (occupied / all.length) * 100 : 0,
    };
  });
}

export function getPaymentMethodBreakdown(db: Database) {
  const methods = ["mtn_momo", "airtel_money", "bank_transfer", "cash"] as const;
  const month = currentMonthKey();
  return methods.map((method) => {
    const total = db.payments
      .filter(
        (payment) =>
          payment.status === "completed" &&
          payment.method === method &&
          payment.date.startsWith(month),
      )
      .reduce((sum, payment) => sum + payment.amount, 0);
    return { method, total };
  });
}

export function getExpenseBreakdown(db: Database) {
  const categories = ["maintenance", "repairs", "cleaning", "security", "utilities", "insurance", "other"] as const;
  return categories
    .map((category) => ({
      category,
      total: db.expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.total > 0);
}

export function getBuildingPerformance(db: Database) {
  return db.buildings.map((building) => {
    const spaces = db.spaces.filter((space) => space.buildingId === building.id);
    const spaceIds = new Set(spaces.map((space) => space.id));
    const occupied = spaces.filter((space) => space.status === "occupied");
    const expected = occupied.reduce((sum, space) => sum + space.monthlyRent, 0);
    const collected = db.payments
      .filter((payment) => payment.status === "completed")
      .filter((payment) => {
        const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
        if (!invoice) return false;
        return invoice.lineItems.some((line) => spaceIds.has(line.spaceId));
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
    return {
      building,
      spaces: spaces.length,
      occupied: occupied.length,
      expected,
      collected,
      occupancyRate: spaces.length ? (occupied.length / spaces.length) * 100 : 0,
    };
  });
}

export function getTenantStatement(db: Database, tenantId: string) {
  const invoices = db.invoices.filter((invoice) => invoice.tenantId === tenantId);
  const payments = db.payments.filter((payment) => payment.tenantId === tenantId);
  const billed = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paid = payments
    .filter((payment) => payment.status === "completed")
    .reduce((sum, payment) => sum + payment.amount, 0);
  return { billed, paid, balance: billed - paid };
}

export function deriveInvoiceStatus(invoice: Invoice): InvoiceStatus {
  const balance = invoiceBalance(invoice);
  if (balance <= 0) return "paid";
  if (invoice.dueDate < todayISO()) return "overdue";
  if (invoice.amountPaid > 0) return "partial";
  return "pending";
}

export function recalculateInvoice(db: Database, invoiceId: string) {
  const invoice = db.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return;
  const paid = db.payments
    .filter(
      (payment) =>
        payment.invoiceId === invoiceId &&
        (payment.status === "completed" || payment.verification === "verified"),
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  invoice.amountPaid = Math.max(0, Math.min(paid, invoice.amount));
  invoice.status = deriveInvoiceStatus(invoice);
}

export function formatInvoiceBalance(invoice: Invoice) {
  return Math.max(invoice.amount - invoice.amountPaid, 0);
}

export function summarizePayments(payments: Payment[]) {
  return payments.reduce(
    (acc, payment) => {
      if (payment.status === "completed") acc.completed += payment.amount;
      if (payment.status === "pending") acc.pending += payment.amount;
      if (payment.status === "failed") acc.failed += payment.amount;
      return acc;
    },
    { completed: 0, pending: 0, failed: 0 },
  );
}
