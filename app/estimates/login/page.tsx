import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";
import EstimatePwaInstall from "@/components/estimate/EstimatePwaInstall";
import { ESTIMATE_PWA_METADATA, ESTIMATE_PWA_VIEWPORT } from "@/lib/estimate/pwa";

export const viewport = ESTIMATE_PWA_VIEWPORT;

export const metadata: Metadata = {
  title: "Sign in | Adco Caterers",
  robots: { index: false, follow: false },
  ...ESTIMATE_PWA_METADATA,
};

export default function EstimatesLoginPage() {
  return (
    <main className="min-h-screen bg-[#f8f3ea] text-[#26221c] font-inter flex items-center justify-center px-4 py-10">
      <EstimatePwaInstall showButton={false} />
      <div className="w-full max-w-sm overflow-hidden rounded-lg bg-white border border-[#e4d9c3]">
        <div className="bg-[#14120f] py-4">
          <div className="relative h-20 w-28 mx-auto">
            <Image src="/images/adco-logo.png" alt="Adco Caterers" className="object-contain" fill />
          </div>
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-playfair text-[#5c4726] text-center mb-5">Estimates</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
