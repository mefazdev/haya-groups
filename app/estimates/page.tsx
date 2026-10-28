import type { Metadata } from "next";
import EstimatesApp from "@/components/estimate/EstimatesClient";

export const metadata: Metadata = {
  title: "Estimates | Haya Convention Center",
  robots: { index: false, follow: false },
};

export default function EstimatesPage() {
  return <EstimatesApp />;
}
