"use client";

import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Building } from "@/types";
import { addBuilding, updateBuilding } from "@/lib/services";
import { buildingSchema, type BuildingFormValues } from "@/lib/validations/schemas";
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

export function BuildingFormDialog({
  building,
  onClose,
}: {
  building?: Building;
  onClose: () => void;
}) {
  const form = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: building?.name ?? "",
      address: building?.address ?? "",
      district: building?.district ?? "Gasabo",
      city: building?.city ?? "",
      floorsCount: building?.floorsCount ?? 3,
      yearBuilt: building?.yearBuilt ?? 2018,
      description: building?.description ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, description: values.description ?? "" };
    if (building) {
      updateBuilding(building.id, payload);
      toast.success("Building updated", { description: `${values.name} was saved.` });
    } else {
      addBuilding(payload);
      toast.success("Building added", {
        description: `${values.name} was added with ${values.floorsCount} floors.`,
      });
    }
    onClose();
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{building ? "Edit building" : "Add building"}</DialogTitle>
          <DialogDescription>
            Buildings group floors and rentable spaces. Floors are created automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Building name" htmlFor="building-name" error={form.formState.errors.name?.message}>
            <Input id="building-name" placeholder="e.g. Building name" {...form.register("name")} />
          </Field>
          <Field label="Address" htmlFor="building-address" error={form.formState.errors.address?.message}>
            <Input id="building-address" placeholder="e.g. KN 3 Rd, Nyarugenge" {...form.register("address")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="District" htmlFor="building-district" error={form.formState.errors.district?.message}>
              <Input id="building-district" {...form.register("district")} />
            </Field>
            <Field label="City" htmlFor="building-city" error={form.formState.errors.city?.message}>
              <Input id="building-city" {...form.register("city")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Floors" htmlFor="building-floors" error={form.formState.errors.floorsCount?.message}>
              <Input
                id="building-floors"
                type="number"
                min={1}
                max={30}
                {...form.register("floorsCount", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Year built" htmlFor="building-year" error={form.formState.errors.yearBuilt?.message}>
              <Input
                id="building-year"
                type="number"
                min={1900}
                max={2100}
                {...form.register("yearBuilt", { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="building-description" optional>
            <Textarea
              id="building-description"
              placeholder="Short description of the building and its location…"
              {...form.register("description")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {building ? "Save changes" : "Add building"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
