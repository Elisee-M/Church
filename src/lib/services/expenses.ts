"use client";

import type { Expense, ExpenseCategory } from "@/types";
import { mutateDatabase, newId } from "./store";
import { addActivity } from "./activity";

export type ExpenseInput = {
  title: string;
  category: ExpenseCategory;
  buildingId: string;
  amount: number;
  date: string;
  vendor: string;
  status: Expense["status"];
  notes?: string;
  receiptName?: string;
};

export function createExpense(input: ExpenseInput) {
  mutateDatabase((db) => {
    const sequence = db.expenses.length + 1;
    db.expenses.unshift({
      id: newId("e"),
      reference: `EXP-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`,
      ...input,
      recordedBy: "Accountant",
    });
    addActivity(db, {
      type: "expense",
      title: "Expense recorded",
      description: `${input.title} · RWF ${input.amount.toLocaleString("en-RW")} for ${db.buildings.find((building) => building.id === input.buildingId)?.name ?? "building"}.`,
      actor: "Accountant",
    });
  });
}

export function updateExpense(id: string, patch: Partial<ExpenseInput>) {
  mutateDatabase((db) => {
    const expense = db.expenses.find((item) => item.id === id);
    if (!expense) return;
    Object.assign(expense, patch);
    addActivity(db, {
      type: "expense",
      title: "Expense updated",
      description: `${expense.title} was updated by the accountant.`,
      actor: "Accountant",
    });
  });
}

export function deleteExpense(id: string) {
  mutateDatabase((db) => {
    const index = db.expenses.findIndex((item) => item.id === id);
    if (index === -1) return;
    const [expense] = db.expenses.splice(index, 1);
    addActivity(db, {
      type: "expense",
      title: "Expense removed",
      description: `${expense.title} (${expense.reference}) was removed from the expense ledger.`,
      actor: "Administrator",
    });
  });
}
