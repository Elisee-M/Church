import type { Metadata } from "next";
import { TenantRentals } from "@/features/tenant/tenant-rentals";

export const metadata: Metadata = {
  title: "My rentals",
  description: "Your rented spaces and agreement terms.",
};

export default function TenantRentalsPage() {
  return <TenantRentals />;
}
