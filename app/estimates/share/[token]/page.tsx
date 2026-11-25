import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SharedEstimateView from "@/components/estimate/SharedEstimateView";
import { getEstimateByShareToken } from "@/lib/estimate/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const estimate = await getEstimateByShareToken(token);
  return {
    title: estimate ? `${estimate.documentTitle} ${estimate.number} | ${estimate.company.name}` : "Estimate Not Found",
    robots: { index: false, follow: false },
  };
}

export default async function SharedEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const estimate = await getEstimateByShareToken(token);
  if (!estimate) notFound();

  return <SharedEstimateView q={estimate} />;
}
