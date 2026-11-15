"use client";

import type { Database, Invoice, Payment } from "@/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

async function getJsPdf() {
  // Import the browser build explicitly. The package's `node` export condition
  // resolves to dist/jspdf.node.min.js, which pulls in canvg/core-js and breaks
  // Turbopack's client-component SSR bundling.
  const mod = (await import("jspdf/dist/jspdf.es.min.js")) as unknown as typeof import("jspdf");
  return mod.jsPDF;
}

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export async function downloadReceiptPdf(payment: Payment, db: Database) {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 46;

  const tenant = db.tenants.find((t) => t.id === payment.tenantId);
  const invoice = db.invoices.find((i) => i.id === payment.invoiceId);
  const org = db.settings.organization;
  const reversed = payment.amount < 0;

  // Header bar
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pageW, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 43, 74);
  doc.text(org.name || "Genzura", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  y += 18;
  doc.text("Payment Receipt (not a fiscal invoice)", margin, y);

  // Amount box
  y += 24;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, pageW - margin * 2, 64, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(21, 128, 61);
  doc.text(`Amount ${reversed ? "reversed" : "paid"}`, margin + 14, y + 22);
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(Math.abs(payment.amount)), margin + 14, y + 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Receipt reference", pageW - margin - 14, y + 22, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(payment.reference || payment.id, pageW - margin - 14, y + 40, { align: "right" });

  y += 88;

  const rows: Array<[string, string]> = [
    ["Paid by", tenant?.name ?? "Tenant"],
    ["For invoice", invoice?.number ?? "—"],
    ["Payment method", PAYMENT_METHOD_LABELS[payment.method] ?? String(payment.method)],
    ["Payment date", formatDate(payment.date)],
    ["Status", String(payment.status)],
    [
      "Verified by",
      payment.verifiedBy
        ? `${payment.verifiedBy}${payment.verifiedAt ? ` (${formatDateTime(payment.verifiedAt)})` : ""}`
        : "Pending verification",
    ],
  ];
  if (payment.phone) rows.push(["Mobile number", payment.phone]);
  if (payment.bankName) rows.push(["Bank", payment.bankName]);

  const colW = (pageW - margin * 2 - 20) / 2;
  doc.setFontSize(9);
  rows.forEach((row, idx) => {
    const col = idx % 2;
    const r = Math.floor(idx / 2);
    const x = margin + col * (colW + 20);
    const yy = y + r * 36;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(row[0], x, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(row[1] || "—", colW);
    doc.text(lines.slice(0, 2), x, yy + 14);
  });
  y += Math.ceil(rows.length / 2) * 36 + 10;

  if (payment.notes) {
    doc.setDrawColor(226);
    doc.roundedRect(margin, y, pageW - margin * 2, 40, 4, 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);
    const noteLines = doc.splitTextToSize(payment.notes, pageW - margin * 2 - 20);
    doc.text(noteLines.slice(0, 2), margin + 10, y + 16);
    y += 52;
  }

  doc.setDrawColor(226);
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120);
  doc.text("This receipt confirms a payment received by Genzura. It is not an EBM fiscal invoice.", margin, y, {
    maxWidth: pageW - margin * 2 - 80,
  });
  if (payment.verification === "verified") {
    doc.setTextColor(21, 128, 61);
    doc.text("Verified", pageW - margin, y, { align: "right" });
  }

  const filename = `receipt-${safeName(payment.reference || payment.id)}.pdf`;
  doc.save(filename);
}

export async function downloadInvoicePdf(invoice: Invoice, db: Database) {
  const jsPDF = await getJsPdf();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 46;

  const tenant = db.tenants.find((t) => t.id === invoice.tenantId);
  const org = db.settings.organization;
  const balance = Math.max(invoice.amount - invoice.amountPaid, 0);

  doc.setFillColor(20, 43, 74);
  doc.rect(0, 0, pageW, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 43, 74);
  doc.text(org.name || "Genzura", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  y += 18;
  doc.text("Rental Invoice (not an EBM fiscal invoice)", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Invoice", pageW - margin, 40, { align: "right" });
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.number, pageW - margin, 58, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Issued: ${formatDate(invoice.issueDate)}`, pageW - margin, 74, { align: "right" });
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, pageW - margin, 88, { align: "right" });

  y = 110;
  doc.setDrawColor(226);
  doc.line(margin, y, pageW - margin, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("FROM", margin, y);
  doc.text("BILLED TO", pageW / 2 + 10, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(org.legalName || org.name || "Genzura", margin, y);
  doc.text(tenant?.name ?? "Tenant", pageW / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  y += 14;
  const fromLines = [org.address, org.tin ? `TIN: ${org.tin}` : ""].filter(Boolean).join("\n");
  const toLines = [tenant?.email, tenant?.phone, tenant?.tin ? `TIN: ${tenant.tin}` : ""].filter(Boolean).join("\n");
  doc.text(doc.splitTextToSize(fromLines || "—", pageW / 2 - margin - 10), margin, y);
  doc.text(doc.splitTextToSize(toLines || "—", pageW / 2 - margin - 10), pageW / 2 + 10, y);
  y += 46;
  doc.line(margin, y, pageW - margin, y);
  y += 20;

  // Table header
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100);
  doc.text("Description", margin, y);
  doc.text("Amount", pageW - margin, y, { align: "right" });
  y += 8;
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  for (const line of invoice.lineItems ?? []) {
    if (y > 720) { doc.addPage(); y = 50; }
    const desc = doc.splitTextToSize(line.description || "Item", pageW - margin * 2 - 120);
    doc.text(desc, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(line.amount), pageW - margin, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += Math.max(16, desc.length * 12);
  }

  y += 8;
  doc.line(margin, y, pageW - margin, y);
  y += 18;
  const totalsX = pageW - margin - 180;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(bold ? 15 : 100, bold ? 23 : 100, bold ? 42 : 100);
    doc.text(label, totalsX, y);
    doc.text(value, pageW - margin, y, { align: "right" });
    y += 16;
  };
  row("Subtotal", formatCurrency(invoice.amount));
  row("Paid to date", formatCurrency(invoice.amountPaid));
  row("Balance due", formatCurrency(balance), true);

  y += 10;
  doc.setDrawColor(226);
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(120);
  const footer = db.settings.invoices.footerNote || "";
  if (footer) doc.text(doc.splitTextToSize(footer, pageW - margin * 2), margin, y);

  doc.save(`invoice-${safeName(invoice.number)}.pdf`);
}
