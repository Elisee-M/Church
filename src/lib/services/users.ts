"use client";

import type { SystemUser, SystemUserRole } from "@/types";
import { mutateDatabase, newId } from "./store";
import { addActivity } from "./activity";

export type UserInput = {
  name: string;
  email: string;
  phone: string;
  role: SystemUserRole;
};

const ROLE_PERMISSIONS: Record<SystemUserRole, string[]> = {
  Administrator: ["Full system access", "Financial approvals", "User management"],
  Accountant: ["Payments", "Expenses", "Invoices", "Reports"],
  Tenant: ["Own rentals", "Own invoices", "Pay rent"],
  "Property Manager": ["Buildings", "Spaces", "Agreements", "Tenants"],
  Viewer: ["Read-only reports"],
};

export function inviteUser(input: UserInput) {
  mutateDatabase((db) => {
    db.users.unshift({
      id: newId("u"),
      ...input,
      status: "invited",
      lastActive: "—",
      permissions: ROLE_PERMISSIONS[input.role],
    });
    addActivity(db, {
      type: "system",
      title: "User invited",
      description: `${input.name} was invited as ${input.role}.`,
      actor: "Claudine Uwimana",
    });
  });
}

export function updateUser(id: string, patch: Partial<Pick<SystemUser, "role" | "status">>) {
  mutateDatabase((db) => {
    const user = db.users.find((item) => item.id === id);
    if (!user) return;
    Object.assign(user, patch);
    if (patch.role) user.permissions = ROLE_PERMISSIONS[patch.role];
    addActivity(db, {
      type: "system",
      title: "User access updated",
      description: `${user.name}'s account was updated.`,
      actor: "Claudine Uwimana",
    });
  });
}
