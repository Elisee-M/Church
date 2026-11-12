"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailPlus } from "lucide-react";
import { toast } from "sonner";
import type { SystemUserRole } from "@/types";
import { inviteUser } from "@/lib/services";
import { inviteUserSchema, type InviteUserFormValues } from "@/lib/validations/schemas";
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
  "Viewer",
];

export function InviteUserDialog({ onClose }: { onClose: () => void }) {
  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Property Manager",
    },
  });
  const role = useWatch({ control: form.control, name: "role" });

  const onSubmit = form.handleSubmit((values) => {
    inviteUser(values);
    toast.success("Invitation sent", {
      description: `${values.name} was invited as ${values.role}. Email delivery is simulated in this prototype.`,
    });
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
              <MailPlus className="size-4" />
            </span>
            <div>
              <DialogTitle>Invite a team member</DialogTitle>
              <DialogDescription>
                Grant access to Genzura with a role-based permission set.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="invite-name" error={form.formState.errors.name?.message}>
            <Input id="invite-name" placeholder="e.g. Diane Mukamana" {...form.register("name")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="invite-email" error={form.formState.errors.email?.message}>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@genzura.rw"
                {...form.register("email")}
              />
            </Field>
            <Field label="Phone" htmlFor="invite-phone" error={form.formState.errors.phone?.message}>
              <Input id="invite-phone" placeholder="078 000 0000" {...form.register("phone")} />
            </Field>
          </div>

          <Field label="Role" error={form.formState.errors.role?.message}>
            <Select
              value={role}
              onValueChange={(value) =>
                form.setValue("role", value as InviteUserFormValues["role"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Permissions preview
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
              {role === "Administrator"
                ? "Full system access, financial approvals and user management."
                : role === "Accountant"
                  ? "Payments, verification, expenses, invoices and reports."
                  : role === "Property Manager"
                    ? "Buildings, spaces, agreements and tenant records."
                    : "Read-only access to reports and dashboards."}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
