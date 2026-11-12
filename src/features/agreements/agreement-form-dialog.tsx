"use client";

import * as React from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Agreement } from "@/types";
import { SPACE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createAgreement, updateAgreement } from "@/lib/services";
import { agreementSchema, type AgreementFormValues } from "@/lib/validations/schemas";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AgreementFormDialog({
  agreement,
  defaultTenantId,
  onClose,
}: {
  agreement?: Agreement;
  defaultTenantId?: string;
  onClose: () => void;
}) {
  const db = useDatabase();
  const today = new Date();
  const yearFromNow = new Date(today);
  yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      tenantId: agreement?.tenantId ?? defaultTenantId ?? "",
      lineItems:
        agreement?.lineItems ??
        (defaultTenantId
          ? db.spaces
              .filter((space) => space.tenantId === defaultTenantId)
              .map((space) => ({ spaceId: space.id, monthlyRent: space.monthlyRent }))
          : []),
      startDate: agreement?.startDate ?? today.toISOString().slice(0, 10),
      endDate: agreement?.endDate ?? yearFromNow.toISOString().slice(0, 10),
      dueDay: agreement?.dueDay ?? db.settings.invoices.dueDay,
      deposit: agreement?.deposit ?? 0,
      penaltyEnabled: agreement?.penaltyEnabled ?? db.settings.penalties.enabled,
      penaltyRate: agreement?.penaltyRate ?? db.settings.penalties.ratePercent,
      notes: agreement?.notes ?? "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });
  const lineItems = useWatch({ control: form.control, name: "lineItems" }) ?? [];
  const tenantId = useWatch({ control: form.control, name: "tenantId" });
  const penaltyEnabled = useWatch({ control: form.control, name: "penaltyEnabled" });
  const dueDay = useWatch({ control: form.control, name: "dueDay" });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const endDate = useWatch({ control: form.control, name: "endDate" });
  const totalRent = lineItems.reduce((sum, line) => sum + (Number(line.monthlyRent) || 0), 0);

  const selectableSpaces = db.spaces.filter(
    (space) =>
      lineItems.some((line) => line.spaceId === space.id) ||
      (space.status === "vacant" && !space.tenantId) ||
      (agreement && space.tenantId === agreement.tenantId),
  );
  const grouped = db.buildings
    .map((building) => ({
      building,
      spaces: selectableSpaces.filter((space) => space.buildingId === building.id),
    }))
    .filter((group) => group.spaces.length > 0);

  const toggleSpace = (spaceId: string, monthlyRent: number) => {
    const index = lineItems.findIndex((line) => line.spaceId === spaceId);
    if (index >= 0) remove(index);
    else append({ spaceId, monthlyRent });
  };

  const onSubmit = form.handleSubmit((values) => {
    if (values.lineItems.length === 0) {
      toast.error("Select at least one rental space.");
      return;
    }
    const payload = {
      tenantId: values.tenantId,
      lineItems: values.lineItems,
      startDate: values.startDate,
      endDate: values.endDate,
      dueDay: values.dueDay,
      deposit: values.deposit,
      penaltyEnabled: values.penaltyEnabled,
      penaltyRate: values.penaltyRate,
      notes: values.notes ?? "",
    };
    if (agreement) {
      updateAgreement(agreement.id, payload);
      toast.success("Agreement updated", { description: `${agreement.reference} was saved.` });
    } else {
      createAgreement(payload);
      toast.success("Agreement created", {
        description: "The selected spaces are now marked as occupied.",
      });
    }
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agreement ? "Edit agreement" : "New rental agreement"}</DialogTitle>
          <DialogDescription>
            One agreement can cover multiple spaces, each with its own monthly rent. Rent is invoiced
            together on a single monthly invoice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Tenant" error={form.formState.errors.tenantId?.message}>
            <Select
              value={tenantId}
              onValueChange={(value) => form.setValue("tenantId", value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {db.tenants.map((tenant) => (
                  <SelectItem
                    key={tenant.id}
                    value={tenant.id}
                    disabled={tenant.status === "inactive" && tenant.id !== agreement?.tenantId}
                  >
                    {tenant.name}
                    {tenant.status === "inactive" ? " (inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11.5px] font-medium">Rental spaces</p>
              <span className="text-[10px] text-muted-foreground">
                {lineItems.length} selected · {formatCurrency(totalRent)} / month
              </span>
            </div>
            {form.formState.errors.lineItems && (
              <p className="mb-2 text-[11px] text-destructive">
                {form.formState.errors.lineItems.message ??
                  "Select at least one rental space."}
              </p>
            )}
            <div className="max-h-[240px] space-y-3 overflow-y-auto rounded-lg border border-border p-3 thin-scrollbar">
              {grouped.length === 0 && (
                <p className="py-4 text-center text-[11px] text-muted-foreground">
                  No vacant spaces available. Add or release a space first.
                </p>
              )}
              {grouped.map(({ building, spaces }) => (
                <div key={building.id}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {building.name}
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {spaces.map((space) => {
                      const selected = lineItems.some((line) => line.spaceId === space.id);
                      return (
                        <label
                          key={space.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 transition ${
                            selected ? "border-primary/40 bg-accent/50 dark:border-foreground/30" : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleSpace(space.id, space.monthlyRent)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium">
                              {space.code} · {space.name}
                            </span>
                            <span className="block text-[9.5px] text-muted-foreground">
                              {SPACE_CATEGORY_LABELS[space.category]} · {formatCurrency(space.monthlyRent, true)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {fields.length > 0 && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/25 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Rent per space
              </p>
              {fields.map((field, index) => {
                const space = db.spaces.find((item) => item.id === field.spaceId);
                return (
                  <div key={field.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{space?.name ?? "Space"}</p>
                      <p className="text-[9.5px] text-muted-foreground">{space?.code}</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      step={1000}
                      className="h-8 w-[130px] bg-background text-[11px]"
                      {...form.register(`lineItems.${index}.monthlyRent`, { valueAsNumber: true })}
                    />
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t border-border pt-2 text-[11.5px] font-semibold">
                <span>Total monthly rent</span>
                <span>{formatCurrency(totalRent)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Start date" htmlFor="agreement-start" error={form.formState.errors.startDate?.message}>
              <Input id="agreement-start" type="date" {...form.register("startDate")} />
            </Field>
            <Field label="End date" htmlFor="agreement-end" error={form.formState.errors.endDate?.message}>
              <Input id="agreement-end" type="date" {...form.register("endDate")} />
            </Field>
            <Field label="Rent due day" error={form.formState.errors.dueDay?.message}>
              <Select
                value={String(dueDay)}
                onValueChange={(value) => form.setValue("dueDay", Number(value), { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }).map((_, index) => (
                    <SelectItem key={index + 1} value={String(index + 1)}>
                      Day {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Deposit"
              htmlFor="agreement-deposit"
              error={form.formState.errors.deposit?.message}
              hint={`Typically ${formatCurrency(totalRent)} (one month)`}
            >
              <Input
                id="agreement-deposit"
                type="number"
                min={0}
                step={1000}
                {...form.register("deposit", { valueAsNumber: true })}
              />
            </Field>
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium">Late payment penalty</p>
                  <p className="text-[9.5px] text-muted-foreground">Applied after the grace period</p>
                </div>
                <Switch
                  checked={penaltyEnabled}
                  onCheckedChange={(checked) => form.setValue("penaltyEnabled", checked)}
                />
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                disabled={!penaltyEnabled}
                className="h-8"
                {...form.register("penaltyRate", { valueAsNumber: true })}
              />
              <p className="text-[9.5px] text-muted-foreground">Percent of unpaid rent</p>
            </div>
          </div>

          <Field label="Notes" htmlFor="agreement-notes" optional>
            <Textarea
              id="agreement-notes"
              placeholder="Special terms, renewal notes or anything the finance team should know…"
              {...form.register("notes")}
            />
          </Field>

          <div className="rounded-lg bg-accent/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-muted-foreground dark:bg-white/[0.04]">
            Due day {dueDay} · Starts {formatDate(startDate)} · Ends {formatDate(endDate)}. A monthly invoice
            will be generated for each active agreement.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {agreement ? "Save changes" : "Create agreement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
