"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/types";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { createExpense, updateExpense } from "@/lib/services";
import { expenseSchema, type ExpenseFormValues } from "@/lib/validations/schemas";
import { useDatabase } from "@/hooks/use-database";
import { Field } from "@/components/shared/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExpenseFormDialog({
  expense,
  onClose,
}: {
  expense?: Expense;
  onClose: () => void;
}) {
  const db = useDatabase();
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: expense?.title ?? "",
      category: expense?.category ?? "maintenance",
      buildingId: expense?.buildingId ?? db.buildings[0]?.id ?? "",
      amount: expense?.amount ?? 0,
      date: expense ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      vendor: expense?.vendor ?? "",
      status: expense?.status ?? "paid",
      notes: expense?.notes ?? "",
    },
  });
  const category = useWatch({ control: form.control, name: "category" });
  const buildingId = useWatch({ control: form.control, name: "buildingId" });
  const status = useWatch({ control: form.control, name: "status" });

  const onSubmit = form.handleSubmit((values) => {
    if (expense) {
      updateExpense(expense.id, { ...values, notes: values.notes ?? "" });
      toast.success("Expense updated", { description: `${values.title} was saved.` });
    } else {
      createExpense({ ...values, notes: values.notes ?? "", receiptName: "Receipt attached (simulated)" });
      toast.success("Expense recorded", {
        description: `${values.title} is tracked separately from rental income.`,
      });
    }
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit expense" : "Record expense"}</DialogTitle>
          <DialogDescription>
            Operating costs are kept in a separate ledger and never netted against rent automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Expense title" htmlFor="expense-title" error={form.formState.errors.title?.message}>
            <Input id="expense-title" placeholder="e.g. Generator servicing" {...form.register("title")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={form.formState.errors.category?.message}>
              <Select
                value={category}
                onValueChange={(value) =>
                  form.setValue("category", value as ExpenseFormValues["category"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Building" error={form.formState.errors.buildingId?.message}>
              <Select
                value={buildingId}
                onValueChange={(value) =>
                  form.setValue("buildingId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {db.buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount" htmlFor="expense-amount" error={form.formState.errors.amount?.message}>
              <Input
                id="expense-amount"
                type="number"
                min={1}
                step={1000}
                {...form.register("amount", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Date" htmlFor="expense-date" error={form.formState.errors.date?.message}>
              <Input id="expense-date" type="date" {...form.register("date")} />
            </Field>
            <Field label="Status" error={form.formState.errors.status?.message}>
              <Select
                value={status}
                onValueChange={(value) =>
                  form.setValue("status", value as ExpenseFormValues["status"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Vendor / supplier" htmlFor="expense-vendor" error={form.formState.errors.vendor?.message}>
            <Input id="expense-vendor" placeholder="e.g. Kigali Power Services" {...form.register("vendor")} />
          </Field>

          <Field label="Notes" htmlFor="expense-notes" optional>
            <Textarea
              id="expense-notes"
              placeholder="What was purchased or repaired, and for which space…"
              {...form.register("notes")}
            />
          </Field>

          <div className="rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
            Receipt attachments are simulated in this prototype. Expense records are independent of
            tenant invoices and payments.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {expense ? "Save changes" : "Record expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
