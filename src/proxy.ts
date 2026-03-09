import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 Proxy for auth protection.
 * Uses cookie-based checks for fast, optimistic redirects.
 *
 * Note: This only checks for cookie existence, not validity.
 * Full session validation should be done in each protected page/route.
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  // Allow guest access to the main dashboard preview page
  const isGuestAllowed = pathname === "/dashboard";

  const response =
    sessionCookie || isGuestAllowed
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));

  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/chat", "/chat/:path*", "/profile", "/profile/:path*", "/dashboard", "/dashboard/:path*"],
};
