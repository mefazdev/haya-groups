import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, clearSessionCookieHeaders, isValidSession } from "@/lib/estimate/auth";

const LOGIN_PATH = "/estimates/login";
const SHARE_PREFIX = "/estimates/share";
const API_PREFIX = "/estimates/api";
const PUBLIC_PWA_ASSETS = new Set([
  "/estimates/manifest.webmanifest",
  "/estimates/sw.js",
  "/estimates/icon-192.png",
  "/estimates/icon-512.png",
  "/estimates/icon-maskable-512.png",
  "/estimates/apple-touch-icon.png",
]);

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname === SHARE_PREFIX ||
    pathname.startsWith(`${SHARE_PREFIX}/`) ||
    pathname.startsWith(`${API_PREFIX}/`) ||
    PUBLIC_PWA_ASSETS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const onLoginPage = pathname === LOGIN_PATH;
  if (onLoginPage && searchParams.get("logged_out") === "1") {
    const res = NextResponse.next();
    for (const header of clearSessionCookieHeaders()) {
      res.headers.append("Set-Cookie", header);
    }
    return res;
  }

  const sessionCookies = request.cookies.getAll(SESSION_COOKIE);
  const signedIn = sessionCookies.some((c) => isValidSession(c.value));

  if (signedIn && onLoginPage) return NextResponse.redirect(new URL("/estimates", request.url));
  if (!signedIn && !onLoginPage) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));

  const res = NextResponse.next();
  // Clean up any legacy path=/estimates cookie if a second path=/ cookie is present.
  if (signedIn && sessionCookies.length > 1) {
    res.headers.append("Set-Cookie", clearSessionCookieHeaders()[0]);
  }
  return res;
}

export const config = {
  matcher: ["/estimates", "/estimates/:path*"],
};
