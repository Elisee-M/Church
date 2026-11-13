"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Space } from "@/types";
import { createSpace, updateSpace } from "@/lib/services";
import { spaceSchema, type SpaceFormValues } from "@/lib/validations/schemas";
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

export function SpaceFormDialog({
  space,
  defaultBuildingId,
  onClose,
}: {
  space?: Space;
  defaultBuildingId?: string;
  onClose: () => void;
}) {
  const db = useDatabase();
  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      buildingId: space?.buildingId ?? defaultBuildingId ?? db.buildings[0]?.id ?? "",
      floorId: space?.floorId ?? "",
      code: space?.code ?? "",
      name: space?.name ?? "",
      category: space?.category ?? "shop",
      sizeSqm: space?.sizeSqm ?? 24,
      monthlyRent: space?.monthlyRent ?? 150_000,
      description: space?.description ?? "",
    },
  });

  const buildingId = useWatch({ control: form.control, name: "buildingId" });
  const floorId = useWatch({ control: form.control, name: "floorId" });
  const category = useWatch({ control: form.control, name: "category" });
  const floors = db.floors.filter((floor) => floor.buildingId === buildingId);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = { ...values, description: values.description ?? "" };
    try {
      if (space) {
        await updateSpace(space.id, payload);
        toast.success("Space updated", { description: `${values.code} ${values.name} was saved.` });
      } else {
        await createSpace(payload);
        toast.success("Space added", {
          description: `${values.code} ${values.name} was added.`,
        });
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save space.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{space ? "Edit rental space" : "Add rental space"}</DialogTitle>
          <DialogDescription>
            {space
              ? "Update the space details. Tenant assignment is managed through agreements."
              : "New spaces start as vacant. Create an agreement to assign a tenant."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Building" error={form.formState.errors.buildingId?.message}>
              <Select
                value={buildingId}
                onValueChange={(value) => {
                  form.setValue("buildingId", value, { shouldValidate: true });
                  form.setValue("floorId", "");
                }}
                disabled={Boolean(space)}
              >
                <SelectTrigger>
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
            <Field label="Floor" error={form.formState.errors.floorId?.message}>
              <Select
                value={floorId}
                onValueChange={(value) => form.setValue("floorId", value, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {floors.map((floor) => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {floor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Space code" htmlFor="space-code" error={form.formState.errors.code?.message}>
              <Input id="space-code" placeholder="e.g. GP-104" {...form.register("code")} />
            </Field>
            <Field label="Space name" htmlFor="space-name" error={form.formState.errors.name?.message}>
              <Input id="space-name" placeholder="e.g. Corner shop" {...form.register("name")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category" error={form.formState.errors.category?.message}>
              <Select
                value={category}
                onValueChange={(value) =>
                  form.setValue("category", value as SpaceFormValues["category"], { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop">Shop</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Size (m²)" htmlFor="space-size" error={form.formState.errors.sizeSqm?.message}>
              <Input
                id="space-size"
                type="number"
                min={1}
                {...form.register("sizeSqm", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Monthly rent"
              htmlFor="space-rent"
              error={form.formState.errors.monthlyRent?.message}
              hint="RWF per month"
            >
              <Input
                id="space-rent"
                type="number"
                min={1}
                step={1000}
                {...form.register("monthlyRent", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="space-description"
            optional
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="space-description"
              placeholder="Location notes, condition or special features…"
              {...form.register("description")}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {space ? "Save changes" : "Add space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
