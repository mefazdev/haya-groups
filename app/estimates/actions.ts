"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  credentialsMatch,
  isAuthConfigured,
  type LoginState,
} from "@/lib/estimate/auth";

export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!isAuthConfigured()) return { error: "Login is not set up yet." };

  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!credentialsMatch(username, password)) {
    // Slows down repeated password guessing.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: "Incorrect username or password.", username };
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/estimates",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/estimates");
}

export async function logout() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/estimates" });
  redirect("/estimates/login");
}
