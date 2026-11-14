import type { Role } from "@/types";

export function currentRole(pathname: string): Role {
  if (pathname.startsWith("/accountant")) return "accountant";
  if (pathname.startsWith("/tenant")) return "tenant";
  return "admin";
}
