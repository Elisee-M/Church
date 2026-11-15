"use client";

import * as React from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Agreement, AgreementLine, Tenant } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function tenantRoomLines(tenant?: Tenant): AgreementLine[] {
  if (!tenant) return [];
  const rooms = tenant.rooms?.length
    ? tenant.rooms
    : Array.from({ length: tenant.roomsNeeded ?? 1 }, (_, index) => ({
        roomNumber: (tenant.roomNumbers?.length ? tenant.roomNumbers : tenant.roomNumber ? [tenant.roomNumber] : [])[index],
        monthlyRent: undefined as number | undefined,
      }));
  const count = Math.max(rooms.length, 1);
  const fallbackRent = (tenant.monthlyRent ?? 0) / count;
  return rooms.map((room, index) => ({
    label: room.roomNumber ? `Room ${room.roomNumber}` : `Room ${index + 1}`,
    monthlyRent: room.monthlyRent ?? fallbackRent,
  }));
}

function linesTotal(lines: AgreementLine[] | undefined) {
  return (lines ?? []).reduce((sum, line) => sum + (Number(line.monthlyRent) || 0), 0);
}

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
      monthlyRent:
        linesTotal(agreement?.lineItems) ||
        db.tenants.find((tenant) => tenant.id === (agreement?.tenantId ?? defaultTenantId))?.monthlyRent ||
        0,
      lineItems: agreement?.lineItems ?? [],
      startDate: agreement?.startDate ?? today.toISOString().slice(0, 10),
      endDate: agreement?.endDate ?? yearFromNow.toISOString().slice(0, 10),
      deposit: agreement?.deposit ?? 0,
      penaltyEnabled: agreement?.penaltyEnabled ?? db.settings.penalties.enabled,
      penaltyRate: agreement?.penaltyRate ?? db.settings.penalties.ratePercent,
      notes: agreement?.notes ?? "",
    },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "lineItems" });
  const watchedLineItems = useWatch({ control: form.control, name: "lineItems" });
  const lineItems = React.useMemo(() => watchedLineItems ?? [], [watchedLineItems]);
  const tenantId = useWatch({ control: form.control, name: "tenantId" });
  const penaltyEnabled = useWatch({ control: form.control, name: "penaltyEnabled" });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const endDate = useWatch({ control: form.control, name: "endDate" });
  const totalRent = linesTotal(lineItems);

  const selectedTenant = db.tenants.find((t) => t.id === tenantId);

  React.useEffect(() => {
    const roomLines = tenantRoomLines(selectedTenant);
    if (agreement) {
      const existing = form.getValues("lineItems") ?? [];
      if (!existing.length) {
        replace(roomLines);
      } else if (roomLines.length === existing.length) {
        replace(
          existing.map((line, index) => ({ ...line, label: line.label ?? roomLines[index]?.label })),
        );
      }
      return;
    }
    replace(roomLines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, agreement?.id, form]);

  React.useEffect(() => {
    form.setValue("monthlyRent", linesTotal(lineItems));
  }, [lineItems, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const lines = values.lineItems?.length ? values.lineItems : [{ monthlyRent: values.monthlyRent }];
    const payload = {
      tenantId: values.tenantId,
      lineItems: lines.map((line) => ({ ...line, monthlyRent: Number(line.monthlyRent) || 0 })),
      startDate: values.startDate,
      endDate: values.endDate,
      deposit: values.deposit,
      penaltyEnabled: values.penaltyEnabled,
      penaltyRate: values.penaltyRate,
      notes: values.notes ?? "",
    };
    try {
      if (agreement) {
        await updateAgreement(agreement.id, payload);
        toast.success("Agreement updated", { description: `${agreement.reference} was saved.` });
      } else {
        await createAgreement(payload);
        toast.success("Agreement created", {
          description: "The selected spaces are now marked as occupied.",
        });
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the agreement.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agreement ? "Edit agreement" : "New rental agreement"}</DialogTitle>
          <DialogDescription>
            Create an agreement for the selected tenant. You can assign spaces/rooms and set monthly rent (defaults to the tenant&apos;s rent when available).
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

          <div className="rounded-lg border border-border bg-muted/25 p-3 text-[11.5px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Rental location</p>
            <p className="mt-1">
              {db.buildings.find((building) => building.id === selectedTenant?.buildingId)?.name ?? "Building"}
              {selectedTenant?.floorId ? " - " + (db.floors.find((floor) => floor.id === selectedTenant.floorId)?.name ?? "Floor") : ""}
              {selectedTenant?.rooms?.length ? " - Room " + selectedTenant.rooms.map((room) => room.roomNumber).filter(Boolean).join(", ") : (selectedTenant?.roomNumbers?.length || selectedTenant?.roomNumber) ? " - Room " + (selectedTenant.roomNumbers?.length ? selectedTenant.roomNumbers.join(", ") : selectedTenant.roomNumber) : ""}
            </p>
          </div>

          {fields.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Rent per room
                </p>
                <p className="text-[9.5px] text-muted-foreground">
                  Each room becomes its own invoice line
                </p>
              </div>
              {fields.map((field, index) => {
                const floorId = selectedTenant?.rooms?.[index]?.floorId ?? selectedTenant?.floorId;
                const floorName = db.floors.find((floor) => floor.id === floorId)?.name;
                return (
                  <div key={field.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">
                        {field.label ?? `Room ${index + 1}`}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground">
                        {floorName ?? "Room rent"}
                        {form.formState.errors.lineItems?.[index]?.monthlyRent?.message
                          ? ` · ${form.formState.errors.lineItems[index]?.monthlyRent?.message}`
                          : ""}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      className="h-8 w-[140px] bg-background text-[11px]"
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
          ) : (
            <Field
              label="Monthly rent"
              htmlFor="agreement-rent"
              error={form.formState.errors.monthlyRent?.message}
              hint="RWF per month"
            >
              <Input
                id="agreement-rent"
                type="number"
                min={1}
                step={1000}
                {...form.register("monthlyRent", { valueAsNumber: true })}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="agreement-start" error={form.formState.errors.startDate?.message}>
              <Input id="agreement-start" type="date" {...form.register("startDate")} />
            </Field>
            <Field label="End date" htmlFor="agreement-end" error={form.formState.errors.endDate?.message}>
              <Input id="agreement-end" type="date" {...form.register("endDate")} />
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
            Rent period · Starts {formatDate(startDate)} · Ends {formatDate(endDate)}. A monthly invoice
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
