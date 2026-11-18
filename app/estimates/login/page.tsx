import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Adco Caterers",
  robots: { index: false, follow: false },
};

export default function EstimatesLoginPage() {
  return (
    <main className="min-h-screen bg-[#1a1346] text-gray-100 font-inter flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-[#141414] border border-[#333] p-6">
        <div className="relative h-20 w-28 mx-auto mb-4">
          <Image src="/images/adco-logo.png" alt="Adco Caterers" className="object-contain" fill />
        </div>
        <h1 className="text-2xl font-playfair text-primary text-center mb-6">Estimates</h1>
        <LoginForm />
      </div>
    </main>
  );
}
