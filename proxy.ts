import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/estimate/auth";

const LOGIN_PATH = "/estimates/login";
const SHARE_PREFIX = "/estimates/share";
const API_PREFIX = "/estimates/api";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === SHARE_PREFIX ||
    pathname.startsWith(`${SHARE_PREFIX}/`) ||
    pathname.startsWith(`${API_PREFIX}/`)
  ) {
    return NextResponse.next();
  }

  const signedIn = isValidSession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLoginPage = pathname === LOGIN_PATH;

  if (signedIn && onLoginPage) return NextResponse.redirect(new URL("/estimates", request.url));
  if (!signedIn && !onLoginPage) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/estimates", "/estimates/:path*"],
};
