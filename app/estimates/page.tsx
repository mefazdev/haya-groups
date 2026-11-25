import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EstimatesClient from "@/components/estimate/EstimatesClient";
import { SESSION_COOKIE, isValidSession } from "@/lib/estimate/auth";
import { getMenuCatalog, listEstimates } from "@/lib/estimate/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estimates | Adco Caterers",
  robots: { index: false, follow: false },
};

export default async function EstimatesPage() {
  const session = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(session)) redirect("/estimates/login");

  const [initialEstimates, initialMenuCatalog] = await Promise.all([
    listEstimates(),
    getMenuCatalog(),
  ]);

  return (
    <EstimatesClient
      initialEstimates={initialEstimates}
      initialMenuCatalog={initialMenuCatalog}
    />
  );
}
