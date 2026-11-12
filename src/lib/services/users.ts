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

export function inviteUser(input: UserInput) {
  mutateDatabase((db) => {
    const permissions: Record<SystemUserRole, string[]> = {
      Administrator: ["Full system access", "Financial approvals", "User management"],
      Accountant: ["Payments", "Expenses", "Invoices", "Reports"],
      Tenant: ["Own rentals", "Own invoices", "Pay rent"],
      "Property Manager": ["Buildings", "Spaces", "Agreements", "Tenants"],
      Viewer: ["Read-only reports"],
    };
    db.users.unshift({
      id: newId("u"),
      ...input,
      status: "invited",
      lastActive: "—",
      permissions: permissions[input.role],
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
    addActivity(db, {
      type: "system",
      title: "User access updated",
      description: `${user.name}'s account was updated.`,
      actor: "Claudine Uwimana",
    });
  });
}
