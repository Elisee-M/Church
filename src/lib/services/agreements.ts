"use client";

import type { Agreement, AgreementLine, AgreementStatus } from "@/types";
import { mutateDatabase, newId } from "./store";
import { addActivity } from "./activity";

export type AgreementInput = {
  tenantId: string;
  lineItems: AgreementLine[];
  startDate: string;
  endDate: string;
  dueDay: number;
  deposit: number;
  notes?: string;
  penaltyEnabled?: boolean;
  penaltyRate?: number;
};

export function statusForEndDate(endDate: string): AgreementStatus {
  const today = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return "active";
  if (end < today) return "expired";
  const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  return days <= 90 ? "expiring" : "active";
}

export function createAgreement(input: AgreementInput) {
  const id = newId("agr");
  mutateDatabase((db) => {
    const tenant = db.tenants.find((item) => item.id === input.tenantId);
    const sequence = db.agreements.length + 1;
    const year = input.startDate.slice(0, 4);
    const agreement: Agreement = {
      id,
      reference: `AGR-${year}-${String(sequence).padStart(3, "0")}`,
      tenantId: input.tenantId,
      lineItems: input.lineItems,
      startDate: input.startDate,
      endDate: input.endDate,
      dueDay: input.dueDay,
      monthlyCycle: "monthly",
      status: statusForEndDate(input.endDate),
      deposit: input.deposit,
      penaltyEnabled: input.penaltyEnabled ?? true,
      penaltyRate: input.penaltyRate ?? db.settings.penalties.ratePercent,
      notes: input.notes,
      documentName: `Agreement-${(tenant?.name ?? "Tenant").replaceAll(" ", "-")}-${year}.pdf`,
      createdAt: new Date().toISOString(),
    };
    db.agreements.unshift(agreement);
    agreement.lineItems.forEach((line) => {
      const space = db.spaces.find((item) => item.id === line.spaceId);
      if (space) {
        space.status = "occupied";
        space.tenantId = input.tenantId;
        space.history.unshift({
          id: `${space.id}-${Date.now()}`,
          date: input.startDate,
          event: "New agreement signed",
          description: `${tenant?.name ?? "Tenant"} signed ${agreement.reference}.`,
        });
      }
    });
    db.documents.unshift({
      id: newId("doc"),
      name: agreement.documentName ?? "Agreement.pdf",
      type: "agreement",
      relatedId: agreement.id,
      tenantId: agreement.tenantId,
      date: agreement.startDate,
      fileSize: "248 KB",
      mime: "application/pdf",
    });
    addActivity(db, {
      type: "agreement",
      title: "Agreement created",
      description: `${agreement.reference} created for ${tenant?.name ?? "tenant"}.`,
      actor: "Claudine Uwimana",
    });
  });
  return id;
}

export function updateAgreement(id: string, patch: Partial<AgreementInput>) {
  mutateDatabase((db) => {
    const agreement = db.agreements.find((item) => item.id === id);
    if (!agreement) return;
    const previousLines = [...agreement.lineItems];
    Object.assign(agreement, patch);
    if (patch.endDate) agreement.status = statusForEndDate(patch.endDate);

    previousLines.forEach((line) => {
      if (!agreement.lineItems.some((item) => item.spaceId === line.spaceId)) {
        const space = db.spaces.find((item) => item.id === line.spaceId);
        if (space) {
          space.tenantId = undefined;
          space.status = "vacant";
          space.history.unshift({
            id: `${space.id}-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            event: "Removed from agreement",
            description: `${agreement.reference} was updated and this space was released.`,
          });
        }
      }
    });

    agreement.lineItems.forEach((line) => {
      const space = db.spaces.find((item) => item.id === line.spaceId);
      if (space) {
        space.status = "occupied";
        space.tenantId = agreement.tenantId;
      }
    });

    addActivity(db, {
      type: "agreement",
      title: "Agreement updated",
      description: `${agreement.reference} was updated.`,
      actor: "Claudine Uwimana",
    });
  });
}

export function terminateAgreement(id: string, reason: string) {
  mutateDatabase((db) => {
    const agreement = db.agreements.find((item) => item.id === id);
    if (!agreement) return;
    agreement.status = "terminated";
    agreement.endDate = new Date().toISOString().slice(0, 10);
    agreement.lineItems.forEach((line) => {
      const space = db.spaces.find((item) => item.id === line.spaceId);
      if (space) {
        space.tenantId = undefined;
        space.status = "vacant";
        space.history.unshift({
          id: `${space.id}-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          event: "Agreement terminated",
          description: `${agreement.reference} was terminated. Reason: ${reason}. The space is now vacant.`,
        });
      }
    });
    addActivity(db, {
      type: "agreement",
      title: "Agreement terminated",
      description: `${agreement.reference} was terminated. Reason: ${reason}`,
      actor: "Claudine Uwimana",
    });
  });
}

export function renewAgreement(id: string, newEndDate: string) {
  updateAgreement(id, { endDate: newEndDate });
  mutateDatabase((db) => {
    const agreement = db.agreements.find((item) => item.id === id);
    if (!agreement) return;
    addActivity(db, {
      type: "agreement",
      title: "Agreement renewed",
      description: `${agreement.reference} now runs until ${newEndDate}.`,
      actor: "Claudine Uwimana",
    });
  });
}
