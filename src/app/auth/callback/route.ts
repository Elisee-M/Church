import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, ROLE_HOME } from "@/lib/auth/roles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery" || next === "/auth/reset-password") {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const role = await getUserRole(supabase, user.id);
        const dest = role ? ROLE_HOME[role] : "/login?error=no_role";
        return NextResponse.redirect(`${origin}${next && next.startsWith("/") && !role ? next : dest}`);
      }
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
