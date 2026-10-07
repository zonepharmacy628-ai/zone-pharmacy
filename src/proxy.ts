import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Fast first gate: visitors without a session cookie are sent to the login page
 * before any admin/account page renders. This is a convenience only — every
 * page, server action and API route re-verifies the session, role and
 * permissions on the server (see lib/auth.ts).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("mz_session")) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname.startsWith("/admin") ? "/admin" : pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
