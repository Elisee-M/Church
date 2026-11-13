import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getUserRole, ROLE_HOME, roleFromPath } from "@/lib/auth/roles";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/callback", "/auth/reset-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static/assets/api internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // If env vars are missing, let request through so app can show setup errors in UI where appropriate.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, supabase } = await updateSession(request);

  const requiredRole = roleFromPath(pathname);
  const _isPublic = isPublicPath(pathname);
  void _isPublic;

  if (!user) {
    if (requiredRole || pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      if (pathname !== "/") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const role = await getUserRole(supabase, user.id);
  const home = role ? ROLE_HOME[role] : "/login";

  if (pathname === "/" || pathname === "/login" || pathname === "/forgot-password") {
    if (role) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (requiredRole) {
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "no_role");
      return NextResponse.redirect(url);
    }
    if (role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = ROLE_HOME[role];
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
