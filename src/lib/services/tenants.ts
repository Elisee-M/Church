"use client";

import type { Tenant } from "@/types";
import { mutateDatabase, newId } from "./store";
import { addActivity } from "./activity";

export type TenantInput = {
  type: Tenant["type"];
  name: string;
  contactName?: string;
  email: string;
  phone: string;
  altPhone?: string;
  nationalId?: string;
  tin?: string;
  companyReg?: string;
  address: string;
  notes?: string;
};

export function createTenant(input: TenantInput) {
  const id = newId("t");
  mutateDatabase((db) => {
    db.tenants.unshift({
      id,
      ...input,
      since: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    addActivity(db, {
      type: "tenant",
      title: "Tenant added",
      description: `${input.name} was added to the tenant directory.`,
      actor: "Administrator",
    });
  });
  return id;
}

export function updateTenant(id: string, patch: Partial<TenantInput>) {
  mutateDatabase((db) => {
    const tenant = db.tenants.find((item) => item.id === id);
    if (!tenant) return;
    Object.assign(tenant, patch);
    addActivity(db, {
      type: "tenant",
      title: "Tenant profile updated",
      description: `${tenant.name}'s details were updated.`,
      actor: "Administrator",
    });
  });
}

export function setTenantStatus(id: string, status: Tenant["status"]) {
  mutateDatabase((db) => {
    const tenant = db.tenants.find((item) => item.id === id);
    if (tenant) tenant.status = status;
  });
}
