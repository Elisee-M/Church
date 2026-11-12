import type { Metadata } from "next";
import { UsersWorkspace } from "@/features/users/users-workspace";

export const metadata: Metadata = {
  title: "Users",
  description: "Team accounts, roles and access management.",
};

export default function AdminUsersPage() {
  return <UsersWorkspace />;
}
