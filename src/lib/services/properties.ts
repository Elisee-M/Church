"use client";

import type { Building, Space, SpaceCategory, SpaceStatus } from "@/types";
import { mutateDatabase, newId } from "./store";
import { addActivity } from "./activity";

export type SpaceInput = {
  code: string;
  name: string;
  buildingId: string;
  floorId: string;
  category: SpaceCategory;
  sizeSqm: number;
  monthlyRent: number;
  description: string;
  features?: string[];
};

export function addSpace(input: SpaceInput) {
  const id = newId("s");
  mutateDatabase((db) => {
    db.spaces.push({
      id,
      ...input,
      status: "vacant",
      features: input.features?.length
        ? input.features
        : ["Water & electricity", "Security"],
      history: [
        {
          id: `${id}-h1`,
          date: new Date().toISOString().slice(0, 10),
          event: "Space created",
          description: "Added to the portfolio and listed as vacant.",
        },
      ],
    });
    addActivity(db, {
      type: "system",
      title: "New space added",
      description: `${input.code} ${input.name} was added to the property portfolio.`,
      actor: "Claudine Uwimana",
    });
  });
  return id;
}

export function updateSpaceStatus(
  id: string,
  status: SpaceStatus,
  note = "Status changed from the property workspace.",
) {
  mutateDatabase((db) => {
    const space = db.spaces.find((item) => item.id === id);
    if (!space) return;
    space.status = status;
    space.history.unshift({
      id: `${id}-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      event: "Status updated",
      description: note,
    });
    addActivity(db, {
      type: "system",
      title: "Space status updated",
      description: `${space.code} is now ${status}.`,
      actor: "Claudine Uwimana",
    });
  });
}

export function updateSpace(id: string, patch: Partial<Space>) {
  mutateDatabase((db) => {
    const space = db.spaces.find((item) => item.id === id);
    if (!space) return;
    Object.assign(space, patch);
  });
}

export type BuildingInput = Omit<Building, "id">;

export function updateBuilding(id: string, patch: Partial<BuildingInput>) {
  mutateDatabase((db) => {
    const building = db.buildings.find((item) => item.id === id);
    if (!building) return;
    Object.assign(building, patch);
    addActivity(db, {
      type: "system",
      title: "Building updated",
      description: `${building.name} details were updated.`,
      actor: "Claudine Uwimana",
    });
  });
}

export function addFloor(buildingId: string, name: string) {
  mutateDatabase((db) => {
    const building = db.buildings.find((item) => item.id === buildingId);
    if (!building) return;
    const levels = db.floors.filter((floor) => floor.buildingId === buildingId).length;
    db.floors.push({
      id: newId(`${buildingId}-f`),
      buildingId,
      name,
      level: levels,
    });
    building.floorsCount = levels + 1;
    addActivity(db, {
      type: "system",
      title: "Floor added",
      description: `${name} was added to ${building.name}.`,
      actor: "Claudine Uwimana",
    });
  });
}

export function addBuilding(input: BuildingInput) {
  const id = newId("b");
  mutateDatabase((db) => {
    db.buildings.push({ id, ...input });
    for (let level = 0; level < input.floorsCount; level += 1) {
      db.floors.push({
        id: `${id}-f${level}`,
        buildingId: id,
        name:
          level === 0
            ? "Ground floor"
            : level === 1
              ? "First floor"
              : level === 2
                ? "Second floor"
                : level === 3
                  ? "Third floor"
                  : `Floor ${level}`,
        level,
      });
    }
    addActivity(db, {
      type: "system",
      title: "Building added",
      description: `${input.name} was added with ${input.floorsCount} floors.`,
      actor: "Claudine Uwimana",
    });
  });
  return id;
}

export function getSpaceLabel(space?: Space) {
  return space ? `${space.code} · ${space.name}` : "Unknown space";
}
