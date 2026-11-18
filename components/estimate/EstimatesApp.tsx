"use client";

import Image from "next/image";
import { useState } from "react";
import type { Estimate } from "@/lib/estimate/types";
import { formatDate, formatINR, grandTotalOf, partyLabel } from "@/lib/estimate/utils";
import {
  createFromTemplate,
  deleteEstimate,
  duplicateEstimate,
  loadEstimates,
  saveEstimate,
} from "@/lib/estimate/storage";
import { logout } from "@/app/estimates/actions";
import EstimateEditor from "./EstimateEditor";

type View = { kind: "list" } | { kind: "edit"; estimate: Estimate };

const btnCls =
  "inline-flex items-center justify-center min-h-12 md:min-h-10 rounded-lg border border-[#6f5629] bg-white px-4 py-2 text-base font-medium text-[#5c4726] hover:bg-[#f3e6c9] transition-colors";

const summaryOf = (q: Estimate) => {
  if (q.parties.length > 1) return [q.number, q.parties.map(partyLabel).join(" + ")];
  const { nature, date, pax } = q.parties[0].event;
  return [q.number, nature, date && formatDate(date), pax && `${pax} guests`];
};

export default function EstimatesApp() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [list, setList] = useState<Estimate[]>(loadEstimates);
  const [search, setSearch] = useState("");

  const refresh = () => setList(loadEstimates());
  const backToList = () => {
    refresh();
    setView({ kind: "list" });
  };

  if (view.kind === "edit")
    return <EstimateEditor key={view.estimate.id} initial={view.estimate} onBack={backToList} />;

  const startNew = () => {
    const q = createFromTemplate();
    saveEstimate(q);
    setView({ kind: "edit", estimate: q });
  };

  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (q) => !term || [q.number, q.client.name, q.client.phone, ...q.parties.flatMap((p) => [p.name, p.event.venue, p.event.nature])].join(" ").toLowerCase().includes(term),
  );

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#26221c] font-inter">
      <header className="bg-[#14120f] py-3">
        <div className="max-w-275 mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="relative h-12 w-16">
            <Image src="/images/adco-logo.png" alt="Adco Caterers" className="object-contain" fill />
          </div>
          <form action={logout}>
            <button type="submit" className="min-h-11 px-2 text-base text-[#f8f3ea] underline underline-offset-4">Log out</button>
          </form>
        </div>
      </header>

      <main className="max-w-275 mx-auto px-4 md:px-8 py-5 md:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h1 className="text-3xl font-playfair text-[#5c4726]">Estimates</h1>
          <button
            onClick={startNew}
            className="inline-flex items-center justify-center min-h-14 md:min-h-11 rounded-lg bg-[#6f5629] px-5 py-2 text-lg md:text-base font-medium text-white hover:bg-[#5c4726] transition-colors"
          >
            + New estimate
          </button>
        </div>

        <input
          type="search"
          aria-label="Search estimates"
          className="w-full min-h-12 rounded-lg bg-white border border-[#a08f70] px-3 py-2.5 text-base placeholder:text-[#7a7163] focus:outline-none focus:border-[#6f5629] focus:ring-2 focus:ring-[#a88a55]/40 mb-4"
          placeholder="Search by client, number or venue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#a08f70] px-6 py-12 text-center text-base text-[#5f574b]">
            {list.length === 0 ? "No estimates yet. Tap “New estimate” to start." : "No estimates match your search."}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((q) => (
              <li key={q.id} className="rounded-lg border border-[#e4d9c3] bg-white p-4 sm:flex sm:items-center sm:gap-4">
                <button className="w-full sm:flex-1 min-w-0 text-left" onClick={() => setView({ kind: "edit", estimate: q })}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-playfair text-xl truncate">{q.client.name || "Untitled client"}</span>
                    <span className="shrink-0 text-base font-semibold text-[#5c4726]">₹ {formatINR(grandTotalOf(q))}</span>
                  </span>
                  <span className="block text-sm text-[#5f574b] mt-1">
                    {summaryOf(q).filter(Boolean).join("  ·  ")}
                  </span>
                </button>
                <div className="grid grid-cols-2 sm:flex gap-2 mt-3 sm:mt-0 shrink-0">
                  <button
                    className={btnCls}
                    aria-label={`Duplicate estimate for ${q.client.name || "untitled client"}`}
                    onClick={() => {
                      const copy = duplicateEstimate(q);
                      saveEstimate(copy);
                      setView({ kind: "edit", estimate: copy });
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className={`${btnCls} border-[#a32a1c]! text-[#a32a1c]! hover:bg-[#fbeae7]!`}
                    aria-label={`Delete estimate for ${q.client.name || "untitled client"}`}
                    onClick={() => {
                      if (!confirm(`Delete ${q.number} for ${q.client.name || "this client"}?`)) return;
                      deleteEstimate(q.id);
                      refresh();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
