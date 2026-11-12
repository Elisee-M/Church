import type { Metadata } from "next";
import { PropertiesWorkspace } from "@/features/properties/properties-workspace";

export const metadata: Metadata = {
  title: "Properties",
  description: "Buildings, floors and rentable spaces.",
};

export default function PropertiesPage() {
  return <PropertiesWorkspace />;
}
