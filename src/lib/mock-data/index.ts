import type { Database } from "@/types";
import { buildings, floors, spaces } from "./property";
import { tenants, users } from "./people";
import { agreements, invoices, payments } from "./leases";
import {
  activities,
  documents,
  expenses,
  notifications,
  settings,
} from "./operations";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createSeedDatabase(): Database {
  return {
    buildings: clone(buildings),
    floors: clone(floors),
    spaces: clone(spaces),
    tenants: clone(tenants),
    agreements: clone(agreements),
    invoices: clone(invoices),
    payments: clone(payments),
    expenses: clone(expenses),
    users: clone(users),
    activities: clone(activities),
    notifications: clone(notifications),
    documents: clone(documents),
    settings: clone(settings),
  };
}

export { buildings, floors, spaces, tenants, users, agreements, invoices, payments };
export { activities, documents, expenses, notifications, settings };
