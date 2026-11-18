import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/estimate/auth";

const LOGIN_PATH = "/estimates/login";

export function proxy(request: NextRequest) {
  const signedIn = isValidSession(request.cookies.get(SESSION_COOKIE)?.value);
  const onLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  if (signedIn && onLoginPage) return NextResponse.redirect(new URL("/estimates", request.url));
  if (!signedIn && !onLoginPage) return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/estimates", "/estimates/:path*"],
};
