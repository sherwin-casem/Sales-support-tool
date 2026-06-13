import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { edgeAuth } from "@/lib/auth/edge-auth";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export default edgeAuth((request) => {
  const pathname = request.nextUrl.pathname;
  const isLoggedIn = Boolean(request.auth);
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicApi =
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/v1/webhooks/");
  const protectedPrefixes = ["/search", "/campaigns", "/admin", "/analytics", "/companies"];
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isApiRoute || isPublicApi) {
    if (needsAuth && !isLoggedIn) {
      const loginUrl = new URL("/login", request.nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/login" && isLoggedIn) {
      return NextResponse.redirect(new URL("/search", request.nextUrl));
    }
  }

  return applySecurityHeaders(NextResponse.next(), request);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
