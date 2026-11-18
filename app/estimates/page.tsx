import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EstimatesApp from "@/components/estimate/EstimatesClient";
import { SESSION_COOKIE, isValidSession } from "@/lib/estimate/auth";

export const metadata: Metadata = {
  title: "Estimates | Adco Caterers",
  robots: { index: false, follow: false },
};

export default async function EstimatesPage() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(session)) redirect("/estimates/login");
  return <EstimatesApp />;
}
