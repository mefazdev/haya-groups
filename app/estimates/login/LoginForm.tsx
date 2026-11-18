"use client";

import { useActionState } from "react";
import type { LoginState } from "@/lib/estimate/auth";
import { login } from "../actions";

const inputCls =
  "w-full min-h-11 bg-[#0a0a0a] border border-[#333] px-3 py-2.5 text-base text-gray-100 focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5";

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
      {state.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full min-h-11 text-xs uppercase tracking-wider bg-primary text-[#050505] border border-primary px-4 py-2 font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
