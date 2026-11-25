import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EstimatesClient from "@/components/estimate/EstimatesClient";
import { SESSION_COOKIE, isValidSession } from "@/lib/estimate/auth";
import { getMenuCatalog, listEstimates } from "@/lib/estimate/repo";
import { ESTIMATE_PWA_METADATA, ESTIMATE_PWA_VIEWPORT } from "@/lib/estimate/pwa";

export const dynamic = "force-dynamic";

export const viewport = ESTIMATE_PWA_VIEWPORT;

export const metadata: Metadata = {
  title: "Estimates | Adco Caterers",
  robots: { index: false, follow: false },
  ...ESTIMATE_PWA_METADATA,
};

export default async function EstimatesPage() {
  const sessionCookies = (await cookies()).getAll(SESSION_COOKIE);
  if (!sessionCookies.some((c) => isValidSession(c.value))) redirect("/estimates/login");

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
