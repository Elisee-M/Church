"use client";

import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Tenant } from "@/types";
import { createTenant, createTenantWithAccount, updateTenant } from "@/lib/services";
import { tenantSchema, type TenantFormValues } from "@/lib/validations/schemas";
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

export function TenantFormDialog({ tenant, onClose }: { tenant?: Tenant; onClose: () => void }) {
  const db = useDatabase();
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      type: tenant?.type ?? "individual",
      name: tenant?.name ?? "",
      contactName: tenant?.contactName ?? "",
      email: tenant?.email ?? "",
      phone: tenant?.phone ?? "",
      altPhone: tenant?.altPhone ?? "",
      nationalId: tenant?.nationalId ?? "",
      tin: tenant?.tin ?? "",
      companyReg: tenant?.companyReg ?? "",
      address: tenant?.address ?? "",
      buildingId: tenant?.buildingId ?? "",
      floorId: tenant?.floorId ?? "",
      roomNumber: tenant?.roomNumber ?? "",
      monthlyRent: tenant?.monthlyRent ?? 0,
      roomsNeeded: tenant?.roomsNeeded ?? 1,
      createLoginAccount: false,
      loginPassword: "",
      notes: tenant?.notes ?? "",
    },
  });
  const type = useWatch({ control: form.control, name: "type" });
  const createLoginAccount = useWatch({ control: form.control, name: "createLoginAccount" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (tenant) {
        await updateTenant(tenant.id, values);
        toast.success("Tenant updated", { description: `${values.name} was saved.` });
      } else {
        if (values.createLoginAccount) {
          await createTenantWithAccount({
            type: values.type,
            name: values.name,
            contactName: values.contactName,
            email: values.email,
            phone: values.phone,
            altPhone: values.altPhone,
            nationalId: values.nationalId,
            tin: values.tin,
            companyReg: values.companyReg,
            address: values.address,
            buildingId: values.buildingId,
            floorId: values.floorId,
            roomNumber: values.roomNumber,
            monthlyRent: values.monthlyRent,
            notes: values.notes,
            loginPassword: values.loginPassword || "",
          });
          toast.success("Tenant and login account created", {
            description: `${values.name} can now sign in and submit payment proof.`,
          });
        } else {
          await createTenant(values);
          toast.success("Tenant added", { description: `${values.name} is now in the tenant directory.` });
        }
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the tenant.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tenant ? "Edit tenant" : "Add tenant"}</DialogTitle>
          <DialogDescription>
            Add tenant details, assigned room/location, and monthly rent. Optionally create a tenant login account so they can sign in and submit payment proof.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant type">
              <Select
                value={type}
                onValueChange={(value) =>
                  form.setValue("type", value as TenantFormValues["type"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label={type === "company" ? "Company name" : "Full name"}
              htmlFor="tenant-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="tenant-name" placeholder="e.g. Tenant name" {...form.register("name")} />
            </Field>
          </div>

          {type === "company" && (
            <Field
              label="Contact person"
              htmlFor="tenant-contact"
              optional
              error={form.formState.errors.contactName?.message}
            >
              <Input id="tenant-contact" placeholder="Primary contact at the company" {...form.register("contactName")} />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="tenant-email" error={form.formState.errors.email?.message}>
              <Input id="tenant-email" type="email" placeholder="tenant@example.com" {...form.register("email")} />
            </Field>
            <Field label="Phone" htmlFor="tenant-phone" error={form.formState.errors.phone?.message}>
              <Input id="tenant-phone" placeholder="078 000 0000" {...form.register("phone")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alternative phone" htmlFor="tenant-alt-phone" optional>
              <Input id="tenant-alt-phone" placeholder="078 000 0000" {...form.register("altPhone")} />
            </Field>
            <Field label="Address" htmlFor="tenant-address" error={form.formState.errors.address?.message}>
              <Input id="tenant-address" placeholder="Kigali, Nyarugenge" {...form.register("address")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="National ID" htmlFor="tenant-nid" optional>
              <Input id="tenant-nid" placeholder="1 1990 8…" {...form.register("nationalId")} />
            </Field>
            <Field label="TIN" htmlFor="tenant-tin" optional>
              <Input id="tenant-tin" placeholder="123456789" {...form.register("tin")} />
            </Field>
            <Field label="Company reg." htmlFor="tenant-reg" optional>
              <Input id="tenant-reg" placeholder="RCCM…" {...form.register("companyReg")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Building" htmlFor="tenant-building" optional>
              <Select
                value={form.watch("buildingId") || ""}
                onValueChange={(value) => {
                  form.setValue("buildingId", value, { shouldValidate: true });
                  form.setValue("floorId", "", { shouldValidate: true });
                }}
              >
                <SelectTrigger id="tenant-building">
                  <SelectValue placeholder="Select building" />
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
            <Field label="Floor" htmlFor="tenant-floor" optional>
              <Select
                value={form.watch("floorId") || ""}
                onValueChange={(value) => form.setValue("floorId", value, { shouldValidate: true })}
                disabled={!form.watch("buildingId")}
              >
                <SelectTrigger id="tenant-floor">
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {db.floors
                    .filter((floor) => floor.buildingId === form.watch("buildingId"))
                    .map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>
                        {floor.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Room no." htmlFor="tenant-room" optional hint="e.g. 02-A">
              <Input id="tenant-room" placeholder="02-A" {...form.register("roomNumber")} />
            </Field>
          </div>

          <Field
            label="Monthly rent (RWF)"
            htmlFor="tenant-rent"
            error={form.formState.errors.monthlyRent?.message}
            hint="Default monthly rent for this tenant's agreement/invoices"
          >
            <Input
              id="tenant-rent"
              type="number"
              min={0}
              step={1000}
              {...form.register("monthlyRent", { valueAsNumber: true })}
            />
          </Field>

          <Field
            label="Rooms needed"
            htmlFor="tenant-rooms"
            error={form.formState.errors.roomsNeeded?.message}
            hint="Number of rooms/units this tenant rents"
          >
            <Input
              id="tenant-rooms"
              type="number"
              min={1}
              step={1}
              {...form.register("roomsNeeded", { valueAsNumber: true })}
            />
          </Field>

          {!tenant && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium">Create tenant login account</p>
                  <p className="text-[10px] text-muted-foreground">
                    Tenant can sign in to view invoices and submit payment proof.
                  </p>
                </div>
                <Switch
                  checked={!!createLoginAccount}
                  onCheckedChange={(checked) => form.setValue("createLoginAccount", checked, { shouldValidate: true })}
                />
              </div>
              {createLoginAccount && (
                <Field
                  label="Initial password"
                  htmlFor="tenant-login-password"
                  error={form.formState.errors.loginPassword?.message}
                  hint="Set an initial password (min. 8 characters). The tenant account will be auto-confirmed."
                >
                  <Input
                    id="tenant-login-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter initial password"
                    {...form.register("loginPassword")}
                  />
                </Field>
              )}
            </div>
          )}

          <Field label="Notes" htmlFor="tenant-notes" optional>
            <Textarea
              id="tenant-notes"
              placeholder="Anything the property team should know…"
              {...form.register("notes")}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {tenant ? "Save changes" : "Add tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
