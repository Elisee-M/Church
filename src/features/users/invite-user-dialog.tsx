"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailPlus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { SystemUserRole } from "@/types";
import { createUser, inviteUser } from "@/lib/services";
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
      mode: "create",
      name: "",
      email: "",
      phone: "",
      role: "Property Manager",
      password: "",
    },
  });
  const role = useWatch({ control: form.control, name: "role" });
  const mode = useWatch({ control: form.control, name: "mode" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (values.mode === "create") {
        await createUser({
          name: values.name,
          email: values.email,
          phone: values.phone,
          role: values.role as SystemUserRole,
          password: values.password || "",
        });
        toast.success("User created", {
          description: `${values.name} can sign in immediately with the password you set.`,
        });
      } else {
        await inviteUser({
          name: values.name,
          email: values.email,
          phone: values.phone,
          role: values.role as SystemUserRole,
        });
        toast.success("Invitation sent", { description: `${values.name} was invited as ${values.role}.` });
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : values.mode === "create"
            ? "Could not create user."
            : "Could not invite user.",
      );
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
              {mode === "create" ? <UserPlus className="size-4" /> : <MailPlus className="size-4" />}
            </span>
            <div>
              <DialogTitle>Add a team member</DialogTitle>
              <DialogDescription>
                Create a confirmed account immediately, or send an email invitation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Account setup" error={form.formState.errors.mode?.message}>
            <Select
              value={mode}
              onValueChange={(value) =>
                form.setValue("mode", value as InviteUserFormValues["mode"], { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create">Create user (auto-confirm)</SelectItem>
                <SelectItem value="invite">Invite by email</SelectItem>
              </SelectContent>
            </Select>
          </Field>

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

          {mode === "create" && (
            <Field
              label="Temporary password"
              htmlFor="invite-password"
              error={form.formState.errors.password?.message}
              hint="Set an initial password (min. 8 characters). The user can sign in immediately."
            >
              <Input
                id="invite-password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter initial password"
                {...form.register("password")}
              />
            </Field>
          )}

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
            {mode === "create" ? (
              <p className="mt-2 text-[10px] text-muted-foreground">
                The account will be email-confirmed and ready to use right away.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Create user" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
