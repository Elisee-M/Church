"use client";

import type { SystemUserRole } from "@/types";
import { refreshDatabase } from "./store";
import {
  createUserAction,
  deleteUserAction,
  inviteUserAction,
  setUserPasswordAction,
  updateManagedUserAction,
} from "@/lib/actions/admin-users";

export type UserInput = {
  name: string;
  email: string;
  phone: string;
  role: SystemUserRole;
};

export type CreateUserInput = UserInput & { password: string };

export type UpdateManagedUserInput = {
  name?: string;
  email?: string;
  phone?: string;
  role?: SystemUserRole;
  status?: "active" | "suspended";
};

export async function inviteUser(input: UserInput) {
  await inviteUserAction(input);
  await refreshDatabase();
}

export async function createUser(input: CreateUserInput) {
  await createUserAction(input);
  await refreshDatabase();
}

export async function updateUser(id: string, patch: UpdateManagedUserInput) {
  await updateManagedUserAction({ userId: id, ...patch });
  await refreshDatabase();
}

export async function deleteUser(id: string) {
  await deleteUserAction(id);
  await refreshDatabase();
}

export async function setUserPassword(id: string, password: string) {
  await setUserPasswordAction(id, password);
}
