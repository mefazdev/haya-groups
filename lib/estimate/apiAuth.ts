import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "./auth";

/** Verifies the staff session cookie inside Route Handlers. Returns a 401 response if invalid. */
export async function requireEstimateAuth(): Promise<NextResponse | null> {
  const sessionCookies = (await cookies()).getAll(SESSION_COOKIE);
  if (!sessionCookies.some((c) => isValidSession(c.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function jsonError(err: unknown, status = 400) {
  const message = err instanceof Error ? err.message : "Request failed";
  return NextResponse.json({ error: message }, { status });
}
