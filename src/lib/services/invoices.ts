"use client";

import type { Invoice } from "@/types";
import { mutateDatabase, newId } from "./store";
import { addActivity } from "./activity";
import { deriveInvoiceStatus } from "@/lib/mock-data/analytics";

export function generateMonthlyInvoices(period: string) {
  let generated = 0;
  mutateDatabase((db) => {
    const activeAgreements = db.agreements.filter(
      (agreement) => agreement.status === "active" || agreement.status === "expiring",
    );
    let sequence =
      db.invoices.filter((invoice) => invoice.period === period).length + 1;

    activeAgreements.forEach((agreement) => {
      const exists = db.invoices.some(
        (invoice) => invoice.agreementId === agreement.id && invoice.period === period,
      );
      if (exists) return;

      const lineItems = agreement.lineItems.map((line) => {
        const space = db.spaces.find((item) => item.id === line.spaceId);
        return {
          id: newId("li"),
          spaceId: line.spaceId,
          description: `Monthly rent — ${space?.code ?? line.spaceId} ${space?.name ?? ""}`.trim(),
          amount: line.monthlyRent,
        };
      });
      const amount = lineItems.reduce((sum, line) => sum + line.amount, 0);
      const invoice: Invoice = {
        id: newId("inv"),
        number: `${db.settings.invoices.prefix}-${period.replace("-", "")}-${String(sequence).padStart(3, "0")}`,
        tenantId: agreement.tenantId,
        agreementId: agreement.id,
        issueDate: `${period}-01`,
        dueDate: `${period}-${String(agreement.dueDay).padStart(2, "0")}`,
        period,
        lineItems,
        amount,
        amountPaid: 0,
        status: deriveInvoiceStatus({
          id: "",
          number: "",
          tenantId: agreement.tenantId,
          agreementId: agreement.id,
          issueDate: `${period}-01`,
          dueDate: `${period}-${String(agreement.dueDay).padStart(2, "0")}`,
          period,
          lineItems,
          amount,
          amountPaid: 0,
          status: "pending",
          ebmStatus: "not_issued",
          createdAt: new Date().toISOString(),
        }),
        ebmStatus: "not_issued",
        createdAt: new Date().toISOString(),
      };
      db.invoices.unshift(invoice);
      sequence += 1;
      generated += 1;
    });

    if (generated > 0) {
      addActivity(db, {
        type: "invoice",
        title: "Monthly invoices generated",
        description: `${generated} invoices were generated for ${period}.`,
        actor: "Administrator",
      });
    }
  });
  return generated;
}

export function recordEbmReference(
  invoiceId: string,
  reference: string,
  attachDocument: boolean,
  documentName?: string,
) {
  mutateDatabase((db) => {
    const invoice = db.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    invoice.ebmReference = reference.trim();
    invoice.ebmStatus = attachDocument ? "document_attached" : "reference_recorded";
    if (attachDocument) {
      db.documents.unshift({
        id: newId("doc"),
        name: documentName?.trim() || `EBM-fiscal-invoice-${reference}.pdf`,
        type: "ebm_invoice",
        relatedId: invoice.id,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        date: new Date().toISOString().slice(0, 10),
        fileSize: "148 KB",
        mime: "application/pdf",
      });
    }
    addActivity(db, {
      type: "invoice",
      title: "EBM reference recorded",
      description: `${reference} was recorded against ${invoice.number}. This is a reference to the church's EBM solution, not a generated fiscal document.`,
      actor: "Accountant",
    });
  });
}

export function updateInvoiceNotes(invoiceId: string, notes: string) {
  mutateDatabase((db) => {
    const invoice = db.invoices.find((item) => item.id === invoiceId);
    if (invoice) invoice.notes = notes;
  });
}
