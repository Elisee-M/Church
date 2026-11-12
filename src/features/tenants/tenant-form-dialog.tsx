"use client";

import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Tenant } from "@/types";
import { createTenant, updateTenant } from "@/lib/services";
import { tenantSchema, type TenantFormValues } from "@/lib/validations/schemas";
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

export function TenantFormDialog({ tenant, onClose }: { tenant?: Tenant; onClose: () => void }) {
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
      notes: tenant?.notes ?? "",
    },
  });
  const type = useWatch({ control: form.control, name: "type" });

  const onSubmit = form.handleSubmit((values) => {
    if (tenant) {
      updateTenant(tenant.id, values);
      toast.success("Tenant updated", { description: `${values.name} was saved.` });
    } else {
      createTenant(values);
      toast.success("Tenant added", { description: `${values.name} is now in the tenant directory.` });
    }
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tenant ? "Edit tenant" : "Add tenant"}</DialogTitle>
          <DialogDescription>
            Tenant records hold contact and identification details. Rent is assigned through agreements.
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
              <Input id="tenant-name" placeholder="e.g. Aline Uwase" {...form.register("name")} />
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
