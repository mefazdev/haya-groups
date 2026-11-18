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
  "inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs uppercase tracking-wider border border-[#333] px-3 py-2 hover:border-primary hover:text-primary transition-colors";

const summaryOf = (q: Estimate) => {
  if (q.parties.length > 1) return [q.number, q.parties.map(partyLabel).join(" + ")];
  const { nature, date, pax } = q.parties[0].event;
  return [q.number, nature, date && formatDate(date), pax && `${pax} pax`];
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
    <div className="min-h-screen bg-[#1a1346] text-gray-100 font-inter">
      <header className="border-b border-white/5 py-4">
        <div className="max-w-275 mx-auto px-3 md:px-8 flex items-center justify-between gap-4">
          <div className="relative h-12 w-16">
            <Image src="/images/adco-logo.png" alt="Adco Caterers" className="object-contain" fill />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">Estimates</span>
            <form action={logout}>
              <button type="submit" className={btnCls}>Log out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-275 mx-auto px-3 md:px-8 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 md:gap-6 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-playfair text-primary mb-2">Event & Catering Estimates</h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Create a menu and estimate for each party, starting from your default item list. Edit anything, then download it as a PDF or images.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs uppercase tracking-wider bg-primary text-[#050505] border border-primary px-4 py-2 font-medium hover:bg-primary-hover transition-colors"
          >
            + New estimate
          </button>
        </div>

        <input
          type="search"
          className="w-full bg-[#141414] border border-[#333] px-4 py-3 text-base md:text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary mb-4"
          placeholder="Search by client, number, venue…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div className="border border-dashed border-[#333] px-6 py-12 text-center text-gray-500">
            {list.length === 0 ? "No estimates yet. Click “New estimate” to create the first one." : "No estimates match your search."}
          </div>
        ) : (
          <ul className="divide-y divide-[#222] border border-[#333] bg-[#141414]">
            {filtered.map((q) => (
              <li key={q.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <button className="flex-1 min-w-0 text-left group" onClick={() => setView({ kind: "edit", estimate: q })}>
                  <p className="font-playfair text-lg group-hover:text-primary transition-colors truncate">{q.client.name || "Untitled client"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {summaryOf(q).filter(Boolean).join("  ·  ")}
                  </p>
                </button>
                <span className="text-primary font-medium sm:w-36 sm:text-right shrink-0">₹ {formatINR(grandTotalOf(q))}</span>
                <div className="grid grid-cols-3 sm:flex gap-2">
                  <button className={btnCls} onClick={() => setView({ kind: "edit", estimate: q })}>Open</button>
                  <button
                    className={btnCls}
                    onClick={() => {
                      const copy = duplicateEstimate(q);
                      saveEstimate(copy);
                      setView({ kind: "edit", estimate: copy });
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className={`${btnCls} hover:border-red-500! hover:text-red-400!`}
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
