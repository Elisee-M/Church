"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { SystemUser, SystemUserRole } from "@/types";
import { updateUser } from "@/lib/services";
import { managedUserEditSchema, type ManagedUserEditFormValues } from "@/lib/validations/schemas";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES: SystemUserRole[] = [
  "Administrator",
  "Accountant",
  "Property Manager",
  "Tenant",
  "Viewer",
];

export function EditUserDialog({ user, onClose }: { user: SystemUser; onClose: () => void }) {
  const form = useForm<ManagedUserEditFormValues>({
    resolver: zodResolver(managedUserEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      status: user.status === "suspended" ? "suspended" : "active",
    },
  });
  const role = useWatch({ control: form.control, name: "role" });
  const status = useWatch({ control: form.control, name: "status" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateUser(user.id, values);
      toast.success("User updated", { description: `${values.name}'s account has been updated.` });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
              <Pencil className="size-4" />
            </span>
            <div>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>Update account details, role, and access status.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="edit-name" error={form.formState.errors.name?.message}>
            <Input id="edit-name" {...form.register("name")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="edit-email" error={form.formState.errors.email?.message}>
              <Input id="edit-email" type="email" {...form.register("email")} />
            </Field>
            <Field label="Phone" htmlFor="edit-phone" error={form.formState.errors.phone?.message}>
              <Input id="edit-phone" {...form.register("phone")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" error={form.formState.errors.role?.message}>
              <Select value={role} onValueChange={(v) => form.setValue("role", v as ManagedUserEditFormValues["role"], { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status" error={form.formState.errors.status?.message}>
              <Select value={status} onValueChange={(v) => form.setValue("status", v as "active" | "suspended", { shouldValidate: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
