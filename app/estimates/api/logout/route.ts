import { NextResponse } from "next/server";
import { clearSessionCookieHeaders } from "@/lib/estimate/auth";

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/estimates/login", request.url), { status: 303 });
  for (const header of clearSessionCookieHeaders()) {
    res.headers.append("Set-Cookie", header);
  }
  return res;
}
