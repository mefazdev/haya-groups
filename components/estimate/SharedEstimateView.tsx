"use client";

import Image from "next/image";
import { useState } from "react";
import type { Estimate } from "@/lib/estimate/types";
import { amountInWords, costLabel, formatDate, formatINR, grandTotalOf, partyLabel } from "@/lib/estimate/utils";

export default function SharedEstimateView({ q }: { q: Estimate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasManyParties = q.parties.length > 1;
  const total = grandTotalOf(q);

  const downloadPdf = async () => {
    setBusy(true);
    setError("");
    try {
      const { renderEstimatePdf } = await import("./EstimatePDF");
      const blob = await renderEstimatePdf(q);
      const name = `${q.number || "Estimate"}-${q.client.name.trim().replace(/[^\w]+/g, "-") || "client"}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error(e);
      setError("Could not generate PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#26221c] font-inter pb-16">
      <header className="bg-[#14120f] text-[#f8f3ea] py-4 print:hidden">
        <div className="max-w-3xl mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-12 w-16 shrink-0">
              <Image src="/images/adco-logo.png" alt={q.company.name} className="object-contain" fill />
            </div>
            <div className="min-w-0">
              <p className="font-playfair text-lg text-[#e0c48a] truncate">{q.company.name}</p>
              <p className="text-xs text-[#cbbf9f] truncate">{q.documentTitle} {q.number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={busy}
              className="inline-flex items-center justify-center min-h-11 rounded-lg bg-[#e0c48a] px-4 py-2 text-sm sm:text-base font-semibold text-[#14120f] hover:bg-[#d1b16f] transition-colors disabled:opacity-50"
            >
              {busy ? "Generating PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {error && (
          <div role="alert" className="rounded-lg border border-[#a32a1c] bg-[#fbeae7] px-4 py-3 text-base text-[#a32a1c]">
            {error}
          </div>
        )}

        <section className="rounded-xl border border-[#d9ccb4] bg-white p-5 sm:p-7 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#e4d9c3] pb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#6f5629] font-semibold">{q.documentTitle}</p>
              <h1 className="font-playfair text-2xl sm:text-3xl text-[#26221c] mt-1">
                {q.client.name || "Valued Client"}
              </h1>
              {q.client.phone && <p className="text-sm text-[#5f574b] mt-1">{q.client.phone}</p>}
              {q.client.address && <p className="text-sm text-[#5f574b] whitespace-pre-line">{q.client.address}</p>}
            </div>
            <div className="sm:text-right text-sm">
              <p className="text-[#5f574b]">{q.documentTitle} No.</p>
              <p className="font-semibold text-[#5c4726] text-base">{q.number}</p>
              {q.date && (
                <>
                  <p className="text-[#5f574b] mt-2">Date</p>
                  <p className="font-semibold text-[#5c4726]">{formatDate(q.date)}</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#6f5629] font-semibold">Event Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.parties.map((p, idx) => (
                <div key={p.id} className="rounded-lg bg-[#f8f3ea] border border-[#e4d9c3] p-3.5 text-sm space-y-1">
                  {hasManyParties && (
                    <p className="font-playfair text-base font-semibold text-[#5c4726]">{partyLabel(p, idx)}</p>
                  )}
                  {p.event.nature && <p><span className="text-[#5f574b]">Function:</span> {p.event.nature}</p>}
                  {p.event.date && <p><span className="text-[#5f574b]">Date:</span> {formatDate(p.event.date)}</p>}
                  {p.event.time && <p><span className="text-[#5f574b]">Time:</span> {p.event.time}</p>}
                  {p.event.venue && <p><span className="text-[#5f574b]">Venue:</span> {p.event.venue}</p>}
                  {p.event.pax && <p><span className="text-[#5f574b]">Guests:</span> {p.event.pax} Pax</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {q.parties.map((party, partyIndex) => {
          const sections = party.sections
            .map((sec) => ({ ...sec, items: sec.items.filter((i) => i.name.trim()) }))
            .filter((sec) => sec.items.length > 0);
          if (sections.length === 0) return null;
          return (
            <section key={party.id} className="rounded-xl border border-[#d9ccb4] bg-white p-5 sm:p-7 space-y-5 shadow-xs">
              <div className="border-b border-[#e4d9c3] pb-3">
                <h2 className="font-playfair text-2xl text-[#5c4726]">
                  {q.menuTitle || "Menu"}{hasManyParties ? ` — ${partyLabel(party, partyIndex)}` : ""}
                </h2>
              </div>
              <div className="space-y-5">
                {sections.map((sec) => (
                  <div key={sec.id}>
                    <h3 className="font-playfair text-lg text-[#5c4726] border-b border-[#efe5d3] pb-1 mb-2.5">
                      {sec.title}
                    </h3>
                    <ul className={`grid gap-1.5 ${sec.columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                      {sec.items.map((item) => (
                        <li key={item.id} className="flex items-baseline justify-between gap-2 text-base">
                          <span className="flex items-baseline gap-2">
                            <span className="text-[#a88a55]">&bull;</span>
                            <span>{item.name}</span>
                          </span>
                          {item.qty && <span className="text-sm font-medium text-[#5c4726] shrink-0">{item.qty}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-xl border border-[#d9ccb4] bg-white p-5 sm:p-7 space-y-4 shadow-xs">
          <h2 className="font-playfair text-2xl text-[#5c4726]">Pricing Summary</h2>
          <div className="divide-y divide-[#efe5d3] border border-[#d9ccb4] rounded-lg overflow-hidden">
            {q.costs.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-base">
                <span className="font-medium">{costLabel(q, c)}</span>
                <span className="font-semibold shrink-0">₹ {formatINR(Number(c.amount) || 0)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 bg-[#14120f] text-[#f8f3ea]">
              <span className="font-semibold text-lg">{q.documentTitle} Total</span>
              <span className="font-playfair text-2xl text-[#e0c48a] shrink-0">₹ {formatINR(total)}</span>
            </div>
          </div>
          <p className="text-sm font-medium text-[#5c4726] text-right">{amountInWords(total)}</p>
          {q.quantityNote && <p className="text-sm text-[#5f574b] pt-2">** {q.quantityNote} **</p>}
        </section>

        {(q.paymentTerms || q.terms || q.wasteTerms) && (
          <section className="rounded-xl border border-[#d9ccb4] bg-white p-5 sm:p-7 space-y-4 shadow-xs text-sm text-[#3d362c]">
            {q.paymentTerms && (
              <div>
                <h3 className="font-semibold text-[#5c4726] mb-1">Payment Terms</h3>
                <p className="whitespace-pre-line leading-relaxed">{q.paymentTerms}</p>
              </div>
            )}
            {q.terms && (
              <div>
                <h3 className="font-semibold text-[#5c4726] mb-1">Terms &amp; Conditions</h3>
                <p className="whitespace-pre-line leading-relaxed">{q.terms}</p>
              </div>
            )}
            {q.wasteTerms && (
              <div>
                <h3 className="font-semibold text-[#5c4726] mb-1">Waste Management</h3>
                <p className="whitespace-pre-line leading-relaxed">{q.wasteTerms}</p>
              </div>
            )}
            <div className="pt-4 border-t border-[#efe5d3] text-xs text-[#5f574b]">
              <p className="font-semibold text-[#26221c]">{q.company.name}</p>
              <p>{q.company.address}</p>
              <p>{[q.company.phone, q.company.email].filter(Boolean).join(" · ")}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
