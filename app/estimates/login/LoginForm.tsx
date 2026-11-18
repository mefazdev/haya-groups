"use client";

import { useActionState } from "react";
import type { LoginState } from "@/lib/estimate/auth";
import { login } from "../actions";

const inputCls =
  "w-full min-h-12 rounded-lg bg-white border border-[#a08f70] px-3 py-2.5 text-base text-[#26221c] focus:outline-none focus:border-[#6f5629] focus:ring-2 focus:ring-[#a88a55]/40 transition-colors";
const labelCls = "block text-sm font-medium text-[#3d362c] mb-1.5";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className={labelCls}>Username</span>
        <input name="username" defaultValue={state.username} className={inputCls} autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
      </label>
      <label className="block">
        <span className={labelCls}>Password</span>
        <input name="password" type="password" className={inputCls} autoComplete="current-password" required />
      </label>
      {state.error && <p role="alert" className="text-base text-[#a32a1c]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-12 rounded-lg bg-[#6f5629] px-4 py-2 text-base font-medium text-white hover:bg-[#5c4726] transition-colors disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
