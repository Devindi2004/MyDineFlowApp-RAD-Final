import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute, getRoleRedirect } from "@/lib/auth/roles";
import type { UserRole } from "@/types/auth";

const ROLE_COOKIE_NAME = "dineflow_role";

export function proxy(request: NextRequest) {
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value as
    | UserRole
    | undefined;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  if (!role) {
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessRoute(role, request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL(getRoleRedirect(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/kitchen/:path*",
    "/waiter/:path*",
    "/customer/:path*",
    "/profile",
    "/checkout",
    "/tracking/:path*",
  ],
};
