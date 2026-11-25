"use client";

import dynamic from "next/dynamic";
import type { Estimate, MenuCategoryRecord } from "@/lib/estimate/types";

const EstimatesApp = dynamic(() => import("./EstimatesApp"), {
  loading: () => <div className="min-h-screen bg-[#f8f3ea]" />,
});

export default function EstimatesClient({
  initialEstimates,
  initialMenuCatalog,
}: {
  initialEstimates: Estimate[];
  initialMenuCatalog: MenuCategoryRecord[];
}) {
  return (
    <EstimatesApp
      initialEstimates={initialEstimates}
      initialMenuCatalog={initialMenuCatalog}
    />
  );
}
