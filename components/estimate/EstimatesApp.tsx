"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Estimate, MenuCategoryRecord } from "@/lib/estimate/types";
import { formatDate, formatINR, grandTotalOf, partyLabel } from "@/lib/estimate/utils";
import {
  clearLocalEstimates,
  createEstimate,
  deleteEstimate,
  duplicateEstimate,
  fetchEstimatesState,
  importLocalEstimates,
  readLocalEstimates,
} from "@/lib/estimate/storage";
import EstimateEditor from "./EstimateEditor";
import EstimatePwaInstall from "./EstimatePwaInstall";
import MenuManager from "./MenuManager";

type View =
  | { kind: "list" }
  | { kind: "edit"; estimate: Estimate }
  | { kind: "menu" };

interface Props {
  initialEstimates: Estimate[];
  initialMenuCatalog: MenuCategoryRecord[];
}

const btnCls =
  "inline-flex items-center justify-center min-h-12 md:min-h-10 rounded-lg border border-[#6f5629] bg-white px-4 py-2 text-base font-medium text-[#5c4726] hover:bg-[#f3e6c9] transition-colors disabled:opacity-50";

const summaryOf = (q: Estimate) => {
  if (q.parties.length > 1) return [q.number, q.parties.map(partyLabel).join(" + ")];
  const { nature, date, pax } = q.parties[0].event;
  return [q.number, nature, date && formatDate(date), pax && `${pax} guests`];
};

export default function EstimatesApp({ initialEstimates, initialMenuCatalog }: Props) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [list, setList] = useState<Estimate[]>(initialEstimates);
  const [menuCatalog, setMenuCatalog] = useState<MenuCategoryRecord[]>(initialMenuCatalog);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string>("");
  const [error, setError] = useState("");
  const [localDrafts, setLocalDrafts] = useState<Estimate[]>([]);

  useEffect(() => {
    const locals = readLocalEstimates();
    const existingIds = new Set(initialEstimates.map((e) => e.id));
    setLocalDrafts(locals.filter((e) => !existingIds.has(e.id)));
  }, [initialEstimates]);

  const refresh = async () => {
    try {
      const state = await fetchEstimatesState();
      setList(state.estimates);
      setMenuCatalog(state.menuCatalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load estimates");
    }
  };

  const backToList = () => {
    setView({ kind: "list" });
    void refresh();
  };

  if (view.kind === "edit") {
    return (
      <EstimateEditor
        key={view.estimate.id}
        initial={view.estimate}
        menuCatalog={menuCatalog}
        onMenuCatalogChange={setMenuCatalog}
        onBack={backToList}
      />
    );
  }

  if (view.kind === "menu") {
    return (
      <MenuManager
        catalog={menuCatalog}
        onChange={setMenuCatalog}
        onBack={backToList}
      />
    );
  }

  const startNew = async () => {
    setBusyId("new");
    setError("");
    try {
      const q = await createEstimate();
      setView({ kind: "edit", estimate: q });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create estimate");
    } finally {
      setBusyId("");
    }
  };

  const handleDuplicate = async (q: Estimate) => {
    setBusyId(q.id);
    setError("");
    try {
      const copy = await duplicateEstimate(q.id);
      setView({ kind: "edit", estimate: copy });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate estimate");
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (q: Estimate) => {
    if (!confirm(`Delete ${q.number} for ${q.client.name || "this client"}?`)) return;
    setBusyId(q.id);
    setError("");
    try {
      await deleteEstimate(q.id);
      setList((prev) => prev.filter((item) => item.id !== q.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete estimate");
    } finally {
      setBusyId("");
    }
  };

  const handleImportLocal = async () => {
    if (localDrafts.length === 0) return;
    setBusyId("import");
    setError("");
    try {
      const res = await importLocalEstimates(localDrafts);
      setList(res.estimates);
      clearLocalEstimates();
      setLocalDrafts([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import local estimates");
    } finally {
      setBusyId("");
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (q) =>
      !term ||
      [q.number, q.client.name, q.client.phone, ...q.parties.flatMap((p) => [p.name, p.event.venue, p.event.nature])]
        .join(" ")
        .toLowerCase()
        .includes(term),
  );

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#26221c] font-inter">
      <header className="bg-[#14120f] py-3">
        <div className="max-w-275 mx-auto px-4 md:px-8 flex items-center justify-between gap-3">
          <div className="relative h-12 w-16 shrink-0">
            <Image src="/images/adco-logo.png" alt="Adco Caterers" className="object-contain" fill />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <EstimatePwaInstall />
            <button
              type="button"
              onClick={() => setView({ kind: "menu" })}
              className="min-h-11 px-3 rounded-lg border border-[#a88a55]/60 text-sm sm:text-base text-[#e0c48a] hover:bg-[#26221c] transition-colors"
            >
              Dishes &amp; Categories
            </button>
            <form action="/estimates/api/logout" method="POST">
              <button type="submit" className="min-h-11 px-2 text-base text-[#f8f3ea] underline underline-offset-4">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-275 mx-auto px-4 md:px-8 py-5 md:py-10">
        {localDrafts.length > 0 && (
          <div className="mb-5 rounded-lg border border-[#a88a55] bg-[#f3e6c9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-base text-[#26221c]">
              Found <strong>{localDrafts.length}</strong> estimate{localDrafts.length === 1 ? "" : "s"} saved only on this browser. Import to cloud so all devices can open them.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={busyId === "import"}
                onClick={handleImportLocal}
                className="inline-flex items-center justify-center min-h-11 rounded-lg bg-[#6f5629] px-4 py-2 text-base font-medium text-white hover:bg-[#5c4726] disabled:opacity-50"
              >
                {busyId === "import" ? "Importing…" : "Import to Cloud"}
              </button>
              <button
                type="button"
                onClick={() => setLocalDrafts([])}
                className="min-h-11 px-2 text-sm text-[#5c4726] underline underline-offset-4"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-[#a32a1c] bg-[#fbeae7] px-4 py-3 text-base text-[#a32a1c]">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h1 className="text-3xl font-playfair text-[#5c4726]">Estimates</h1>
          <button
            onClick={startNew}
            disabled={busyId === "new"}
            className="inline-flex items-center justify-center min-h-14 md:min-h-11 rounded-lg bg-[#6f5629] px-5 py-2 text-lg md:text-base font-medium text-white hover:bg-[#5c4726] transition-colors disabled:opacity-50"
          >
            {busyId === "new" ? "Creating…" : "+ New estimate"}
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
                    <span className="font-playfair text-xl truncate">
                      {q.client.name || "Untitled client"}
                      {q.shareToken && (
                        <span className="ml-2 align-middle font-inter text-xs font-medium bg-[#f3e6c9] text-[#5c4726] px-2 py-0.5 rounded-full">
                          Shared link
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-base font-semibold text-[#5c4726]">₹ {formatINR(grandTotalOf(q))}</span>
                  </span>
                  <span className="block text-sm text-[#5f574b] mt-1">
                    {summaryOf(q).filter(Boolean).join("  ·  ")}
                  </span>
                </button>
                <div className="grid grid-cols-2 sm:flex gap-2 mt-3 sm:mt-0 shrink-0">
                  <button
                    className={btnCls}
                    disabled={busyId === q.id}
                    aria-label={`Duplicate estimate for ${q.client.name || "untitled client"}`}
                    onClick={() => handleDuplicate(q)}
                  >
                    Duplicate
                  </button>
                  <button
                    className={`${btnCls} border-[#a32a1c]! text-[#a32a1c]! hover:bg-[#fbeae7]!`}
                    disabled={busyId === q.id}
                    aria-label={`Delete estimate for ${q.client.name || "untitled client"}`}
                    onClick={() => handleDelete(q)}
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
