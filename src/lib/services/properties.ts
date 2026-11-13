"use client";

import { createClient } from "@/lib/supabase/client";
import { refreshDatabase } from "./store";

export async function createBuilding(input: {
  name: string;
  address: string;
  district?: string;
  city?: string;
  floorsCount: number;
  yearBuilt?: number;
  description?: string;
}) {
  const supabase = createClient();
  const { data: org } = await supabase.from("organizations").select("id").limit(1).maybeSingle();
  if (!org?.id) throw new Error("No organization found. Create an organization first.");
  const { data, error } = await supabase
    .from("buildings")
    .insert({
      organization_id: org.id,
      name: input.name,
      address: input.address || null,
      description: input.description || null,
      number_of_floors: input.floorsCount ?? 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await refreshDatabase();
  return data.id as string;
}

export async function updateBuilding(
  id: string,
  input: Partial<{ name: string; address: string; description: string; floorsCount: number }>,
) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.description !== undefined) patch.description = input.description;
  if (input.floorsCount !== undefined) patch.number_of_floors = input.floorsCount;
  const { error } = await supabase.from("buildings").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function createSpace(input: {
  buildingId: string;
  floorId: string;
  code: string;
  name: string;
  category: string;
  sizeSqm: number;
  monthlyRent: number;
  description?: string;
}) {
  const supabase = createClient();
  const { data: building } = await supabase
    .from("buildings")
    .select("organization_id")
    .eq("id", input.buildingId)
    .single();
  if (!building?.organization_id) throw new Error("Building not found.");
  const { error } = await supabase.from("spaces").insert({
    organization_id: building.organization_id,
    building_id: input.buildingId,
    floor_id: input.floorId,
    space_code: input.code,
    name: input.name,
    category: input.category,
    description: input.description || null,
    area: input.sizeSqm ?? null,
    default_rent_amount: input.monthlyRent ?? 0,
    occupancy_status: "vacant",
  });
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function updateSpace(
  id: string,
  input: Partial<{
    code: string;
    name: string;
    category: string;
    sizeSqm: number;
    monthlyRent: number;
    description: string;
  }>,
) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.code !== undefined) patch.space_code = input.code;
  if (input.name !== undefined) patch.name = input.name;
  if (input.category !== undefined) patch.category = input.category;
  if (input.sizeSqm !== undefined) patch.area = input.sizeSqm;
  if (input.monthlyRent !== undefined) patch.default_rent_amount = input.monthlyRent;
  if (input.description !== undefined) patch.description = input.description;
  const { error } = await supabase.from("spaces").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}

export async function updateSpaceStatus(id: string, status: "occupied" | "vacant" | "maintenance" | "reserved") {
  const supabase = createClient();
  const { error } = await supabase.from("spaces").update({ occupancy_status: status }).eq("id", id);
  if (error) throw new Error(error.message);
  await refreshDatabase();
}
