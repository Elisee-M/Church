"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { SystemUser } from "@/types";
import { setUserPassword } from "@/lib/services";
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

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export function SetUserPasswordDialog({ user, onClose }: { user: SystemUser; onClose: () => void }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await setUserPassword(user.id, values.password);
      toast.success("Password updated", { description: `A new password was set for ${user.name}.` });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not set password.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
              <KeyRound className="size-4" />
            </span>
            <div>
              <DialogTitle>Set user password</DialogTitle>
              <DialogDescription>Set a new password for {user.name}. The user can sign in with this password immediately.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="New password" htmlFor="admin-set-password" error={form.formState.errors.password?.message}>
            <Input id="admin-set-password" type="password" autoComplete="new-password" placeholder="Enter new password" {...form.register("password")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Set password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
