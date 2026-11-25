"use client";

import { FormEvent, useCallback, useEffect, useRef, useState, ReactNode } from "react";
import type { Estimate, MenuCategoryRecord, Section } from "@/lib/estimate/types";
import { amountInWords, costLabel, formatINR, grandTotalOf, partyLabel, uid } from "@/lib/estimate/utils";
import {
  createMenuCategoryApi,
  createMenuItemApi,
  createShareLink,
  revokeShareLink,
  saveEstimate,
} from "@/lib/estimate/storage";
import { choicesFor, createParty, moreChoicesFor, searchChoices } from "@/lib/estimate/defaults";

// Mobile first: 16px text so iOS doesn't zoom on focus, 48px tap targets; denser from md up.
const inputCls =
  "w-full min-h-12 md:min-h-10 rounded-lg bg-white border border-[#a08f70] px-3 py-2.5 md:py-2 text-base text-[#26221c] placeholder:text-[#7a7163] focus:outline-none focus:border-[#6f5629] focus:ring-2 focus:ring-[#a88a55]/40 transition-colors";
const btnBase =
  "inline-flex items-center justify-center min-h-12 md:min-h-10 rounded-lg border border-[#6f5629] px-4 py-2 text-base font-medium transition-colors disabled:opacity-50";
const btnCls = `${btnBase} bg-white text-[#5c4726] hover:bg-[#f3e6c9]`;
const primaryBtnCls = `${btnBase} bg-[#6f5629] text-white hover:bg-[#5c4726]`;
const quietBtnCls = "min-h-11 px-1 text-base text-[#5c4726] underline underline-offset-4";
const dangerBtnCls = "min-h-11 px-1 text-base text-[#a32a1c] underline underline-offset-4";
const chipBase =
  "shrink-0 inline-flex items-center gap-1.5 max-w-56 min-h-11 md:min-h-9 px-3.5 rounded-full border text-[15px] whitespace-nowrap transition-colors";
const chipOn = "bg-[#6f5629] border-[#6f5629] text-white font-medium";
const chipFilled = "bg-[#f3e6c9] border-[#a88a55] text-[#5c4726] font-medium";
const chipOff = "bg-white border-[#d9ccb4] text-[#26221c]";
const chipRow = "flex md:flex-wrap gap-2 overflow-x-auto [scrollbar-width:none]";
const headingCls = "text-xl font-playfair text-[#5c4726]";
const summaryCls = "cursor-pointer list-none [&::-webkit-details-marker]:hidden";

const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

// iPhones and in-app browsers (such as links opened inside WhatsApp) often ignore
// web downloads, so saving goes through the share sheet there.
const savesThroughShare = () => {
  const agent = navigator.userAgent;
  const isApple = /iPad|iPhone|iPod/.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isApple || /; wv\)|FBAN|FBAV|Instagram|WhatsApp/.test(agent);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className={`${headingCls} mb-3`}>{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-[#3d362c] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// The whole row is the tap target, and a ticked row fills with gold.
function DishRow({ name, hint, checked, onToggle }: { name: string; hint?: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-3 min-h-12 px-3 py-2 rounded-lg border border-[#e4d9c3] bg-white text-base text-[#26221c] cursor-pointer has-checked:bg-[#f3e6c9] has-checked:border-[#a88a55] has-checked:font-medium transition-colors">
      <input type="checkbox" className="accent-[#6f5629] w-6 h-6 shrink-0" checked={checked} onChange={onToggle} />
      <span className="flex-1 min-w-0">
        {name}
        {hint && <span className="block text-sm font-normal text-[#5f574b]">{hint}</span>}
      </span>
    </label>
  );
}

const move = <T,>(arr: T[], from: number, to: number) => {
  if (to < 0 || to >= arr.length) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
};

const STEPS = ["Details", "Menu", "Price", "Send"];

// Computer share menus usually leave out WhatsApp, so sending is for touch devices.
const canSendFiles = () =>
  isTouchDevice() &&
  !!navigator.canShare?.({ files: [new File(["x"], "estimate.pdf", { type: "application/pdf" })] });

const sameDish = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const toggleItem = (section: Section, name: string) => {
  const remaining = section.items.filter((it) => !sameDish(it.name, name));
  if (remaining.length === section.items.length) section.items.push({ id: uid(), name, qty: "" });
  else section.items = remaining;
};

const namedItemCount = (section: Section) => section.items.filter((it) => it.name.trim()).length;

function AddDish({ onAdd }: { onAdd: (name: string, saveToMaster: boolean) => void }) {
  const [name, setName] = useState("");
  const [saveToMaster, setSaveToMaster] = useState(true);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), saveToMaster);
    setName("");
  };
  return (
    <form className="space-y-2" onSubmit={submit}>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={name}
          placeholder="Add a dish not in the list"
          aria-label="Add a new dish"
          enterKeyHint="done"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className={`${btnCls} shrink-0`}>Add</button>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-[#5f574b] cursor-pointer">
        <input
          type="checkbox"
          className="accent-[#6f5629] w-4 h-4"
          checked={saveToMaster}
          onChange={(e) => setSaveToMaster(e.target.checked)}
        />
        Also save to master menu for future estimates
      </label>
    </form>
  );
}

interface Props {
  initial: Estimate;
  menuCatalog: MenuCategoryRecord[];
  onMenuCatalogChange: (catalog: MenuCategoryRecord[]) => void;
  onBack: () => void;
}

export default function EstimateEditor({ initial, menuCatalog, onMenuCatalogChange, onBack }: Props) {
  const [q, setQ] = useState<Estimate>(initial);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [shareToken, setShareToken] = useState<string | null>(initial.shareToken ?? null);
  const [shareBusy, setShareBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [busy, setBusy] = useState<"" | "preview" | "download" | "images">("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [flash, setFlash] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const [newPartyId, setNewPartyId] = useState("");
  const [newCostId, setNewCostId] = useState("");
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const [activePartyId, setActivePartyId] = useState(initial.parties[0].id);
  const [step, setStep] = useState(0);
  const [dishSearch, setDishSearch] = useState("");
  const [nameMissing, setNameMissing] = useState(false);
  const [canSend] = useState(canSendFiles);
  const [isTouch] = useState(isTouchDevice);
  const [saveByShare] = useState(() => canSendFiles() && savesThroughShare());
  // Files are prepared ahead because browsers only allow sharing right after a tap.
  const [preparedPdf, setPreparedPdf] = useState<{ source: Estimate; blob: Blob | null } | null>(null);
  const [preparedImages, setPreparedImages] = useState<{ source: Estimate; images: Blob[] | null } | null>(null);
  const clientNameRef = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
  const dirtyRef = useRef(false);
  const latestRef = useRef(q);
  latestRef.current = q;
  const partyIndex = Math.max(0, q.parties.findIndex((p) => p.id === activePartyId));
  const party = q.parties[partyIndex];
  const hasManyParties = q.parties.length > 1;

  const update = (fn: (d: Estimate) => void) => {
    setQ((prev) => {
      const d = structuredClone(prev);
      fn(d);
      d.updatedAt = Date.now();
      return d;
    });
  };

  const persistNow = useCallback(async (estimate: Estimate, keepalive = false) => {
    setSaveState("saving");
    try {
      await saveEstimate(estimate, keepalive);
      if (latestRef.current === estimate) dirtyRef.current = false;
      setSaveState("saved");
    } catch (e) {
      console.error(e);
      setSaveState("error");
    }
  }, []);

  // Autosave shortly after the last edit.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState("saving");
    const t = setTimeout(() => {
      void persistNow(q);
    }, 900);
    return () => clearTimeout(t);
  }, [q, persistNow]);

  useEffect(() => {
    const flushOnHide = () => {
      if (dirtyRef.current) void saveEstimate(latestRef.current, true);
    };
    window.addEventListener("pagehide", flushOnHide);
    return () => window.removeEventListener("pagehide", flushOnHide);
  }, []);

  const handleBack = async () => {
    if (dirtyRef.current) await persistNow(latestRef.current);
    onBack();
  };

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => previewPages.forEach((url) => URL.revokeObjectURL(url)), [previewPages]);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  useEffect(() => {
    if (step !== STEPS.length - 1) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      let blob: Blob | null = null;
      try {
        const { renderEstimatePdf } = await import("./EstimatePDF");
        blob = await renderEstimatePdf(q);
      } catch (e) {
        console.error(e);
      }
      if (cancelled) return;
      setPreparedPdf({ source: q, blob });
      if (!canSend) return;

      let images: Blob[] | null = null;
      try {
        const { renderEstimateImages } = await import("./EstimatePDF");
        images = await renderEstimateImages(q, blob ?? undefined);
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) setPreparedImages({ source: q, images });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, q, canSend]);

  const readyPdf = preparedPdf?.source === q ? preparedPdf.blob : null;
  const preparingPdf = step === STEPS.length - 1 && preparedPdf?.source !== q;
  const readyImages = preparedImages?.source === q ? preparedImages.images : null;
  const preparingImages = canSend && step === STEPS.length - 1 && preparedImages?.source !== q;
  const actionsDisabled = !!busy || preparingPdf;
  const showNameError = nameMissing && !q.client.name.trim();

  const goToStep = (target: number) => {
    if (target > 0 && !q.client.name.trim()) {
      setNameMissing(true);
      setStep(0);
      // The field only exists yet when already on this step.
      if (clientNameRef.current) clientNameRef.current.focus();
      else setTimeout(() => clientNameRef.current?.focus(), 0);
      return;
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const buildPdf = async () => {
    if (readyPdf) return readyPdf;
    const { renderEstimatePdf } = await import("./EstimatePDF");
    return renderEstimatePdf(q);
  };

  const renderImages = async () => {
    if (readyImages) return readyImages;
    const { renderEstimateImages } = await import("./EstimatePDF");
    return renderEstimateImages(q, readyPdf ?? undefined);
  };

  const preview = async () => {
    setBusy("preview");
    try {
      // Phone browsers rarely show a PDF inside a page, so phones get the page images.
      if (isTouch) setPreviewPages((await renderImages()).map((image) => URL.createObjectURL(image)));
      else setPreviewUrl(URL.createObjectURL(await buildPdf()));
    } catch (e) {
      console.error(e);
      notify("Could not open preview");
    } finally {
      setBusy("");
    }
  };

  const fileBase = () => `${q.number || "Estimate"}-${q.client.name.trim().replace(/[^\w]+/g, "-") || "client"}`;

  const saveFile = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    // Some phone browsers ignore clicks on links that are not in the page.
    document.body.append(a);
    a.click();
    a.remove();
    // Phones can take a while to start saving, so the file stays available.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const download = async () => {
    if (saveByShare) return sendPdf();
    setBusy("download");
    try {
      saveFile(await buildPdf(), `${fileBase()}.pdf`);
      if (isTouch) notify("Saved to Downloads");
    } catch (e) {
      console.error(e);
      notify("Could not generate PDF");
    } finally {
      setBusy("");
    }
  };

  const sendFiles = async (files: File[]) => {
    try {
      await navigator.share({ files, title: `${q.documentTitle} ${q.number}` });
    } catch (e) {
      if ((e as Error).name !== "AbortError") notify("Could not open sharing");
    }
  };

  const sendPdf = () => {
    if (!readyPdf) return notify("Could not generate PDF");
    return sendFiles([new File([readyPdf], `${fileBase()}.pdf`, { type: "application/pdf" })]);
  };

  const sendImages = () => {
    if (!readyImages) return notify("Could not generate images");
    return sendFiles(readyImages.map((image, i) => new File([image], `${fileBase()}-page-${i + 1}.png`, { type: "image/png" })));
  };

  const downloadImages = async () => {
    if (saveByShare) return sendImages();
    setBusy("images");
    try {
      const images = await renderImages();
      if (isTouch) {
        // Separate files can be opened from the phone's gallery, unlike an archive.
        for (const [i, image] of images.entries()) {
          if (i > 0) await wait(400);
          saveFile(image, `${fileBase()}-page-${i + 1}.png`);
        }
        notify("Saved to Downloads");
      } else if (images.length === 1) {
        saveFile(images[0], `${fileBase()}.png`);
      } else {
        // One archive means one click and one save prompt, however many pages there are.
        const { zipSync } = await import("fflate");
        const entries = await Promise.all(
          images.map(async (image, i) => [`${fileBase()}-page-${i + 1}.png`, new Uint8Array(await image.arrayBuffer())] as const),
        );
        // PNGs are already compressed, so store them as they are.
        const zip = zipSync(Object.fromEntries(entries), { level: 0 });
        saveFile(new Blob([zip.slice()], { type: "application/zip" }), `${fileBase()}-images.zip`);
      }
    } catch (e) {
      console.error(e);
      notify("Could not generate images");
    } finally {
      setBusy("");
    }
  };

  const addParty = () => {
    // A second sitting is usually on the same day at the same venue.
    const next = createParty({ date: party.event.date, venue: party.event.venue }, menuCatalog);
    update((d) => {
      d.parties.push(next);
      for (const p of d.parties) {
        if (d.costs.some((c) => c.partyId === p.id)) continue;
        const at = d.costs.map((c) => !!c.partyId).lastIndexOf(true) + 1;
        d.costs.splice(at, 0, { id: uid(), description: "Total Food Cost", amount: 0, partyId: p.id });
      }
    });
    setActivePartyId(next.id);
    setNewPartyId(next.id);
  };

  const removeParty = () => {
    const label = partyLabel(party, partyIndex);
    if (!confirm(`Remove "${label}" with its menu and food cost?`)) return;
    update((d) => {
      d.parties.splice(partyIndex, 1);
      d.costs = d.costs.filter((c) => c.partyId !== party.id);
    });
    setActivePartyId(q.parties[partyIndex === 0 ? 1 : partyIndex - 1].id);
  };

  const setSection = (si: number, fn: (s: Section) => void) => update((d) => fn(d.parties[partyIndex].sections[si]));

  const addSection = () => {
    const id = uid();
    update((d) => { d.parties[partyIndex].sections.push({ id, title: "New category", columns: 1, items: [] }); });
    setActiveSectionId(id);
    setNewSectionId(id);
    setDishSearch("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const addCost = () => {
    const id = uid();
    update((d) => { d.costs.push({ id, description: "", amount: 0 }); });
    setNewCostId(id);
  };

  const saveDishToMaster = async (categoryTitle: string, name: string) => {
    try {
      const normalized = categoryTitle.trim().toLowerCase();
      let targetCat = menuCatalog.find((c) => c.title.trim().toLowerCase() === normalized);
      let latestCatalog = menuCatalog;
      if (!targetCat) {
        const created = await createMenuCategoryApi({ title: categoryTitle.trim() || "Custom" });
        targetCat = created.category;
        latestCatalog = created.menuCatalog;
      }
      const res = await createMenuItemApi({ categoryId: targetCat.id, name });
      onMenuCatalogChange(res.menuCatalog.length ? res.menuCatalog : latestCatalog);
    } catch (e) {
      console.error(e);
      notify("Added to estimate (menu sync failed)");
    }
  };

  const addDish = (si: number, name: string, saveToMaster = false) => {
    const categoryTitle = party.sections[si]?.title ?? "";
    setSection(si, (s) => {
      if (!s.items.some((it) => sameDish(it.name, name))) s.items.push({ id: uid(), name, qty: "" });
    });
    if (saveToMaster && categoryTitle.trim()) {
      void saveDishToMaster(categoryTitle, name);
    }
  };

  const toggleDish = (si: number, name: string) =>
    setSection(si, (s) => toggleItem(s, name));

  // Older estimates may not have this section yet, so it is created on first use.
  const toggleSearchResult = (sectionTitle: string, name: string) =>
    update((d) => {
      const sections = d.parties[partyIndex].sections;
      let section = sections.find((s) => sameDish(s.title, sectionTitle));
      if (!section) {
        section = { id: uid(), title: sectionTitle, columns: 1, items: [] };
        sections.push(section);
      }
      toggleItem(section, name);
    });

  const total = grandTotalOf(q);

  const selectedCount = party.sections.reduce((sum, s) => sum + namedItemCount(s), 0);
  const menuSummary = `${hasManyParties ? `${partyLabel(party, partyIndex)}: ` : ""}${selectedCount} item${selectedCount === 1 ? "" : "s"} selected`;

  const activeSection = party.sections.find((s) => s.id === activeSectionId) ?? party.sections[0];
  const activeSectionKey = activeSection?.id;
  const activeIndex = party.sections.findIndex((s) => s.id === activeSectionKey);
  const nextSection = party.sections[activeIndex + 1];

  const isSearching = !!dishSearch.trim();
  const searchResults = searchChoices(dishSearch, menuCatalog);

  // Keeps the open category visible in the row, so staff always see where they are.
  useEffect(() => {
    if (step !== 1) return;
    const row = categoryRowRef.current;
    const button = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !button) return;
    const rowBox = row.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    row.scrollTo({ left: row.scrollLeft + buttonBox.left - rowBox.left - (rowBox.width - buttonBox.width) / 2, behavior: "instant" });
  }, [step, activeSectionKey, isSearching, activePartyId]);

  const openCategory = (id: string) => {
    setActiveSectionId(id);
    setDishSearch("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const addSearchedDish = () => {
    if (activeIndex < 0) return;
    const name = dishSearch.trim();
    addDish(activeIndex, name);
    setDishSearch("");
    notify(`Added to ${activeSection.title}`);
  };

  const partiesWithoutMenu = q.parties.filter((p) => !p.sections.some((s) => namedItemCount(s) > 0));

  const functionTabs = (withAdd: boolean) => (
    <div className={`${chipRow} mb-4`} role="group" aria-label="Functions">
      {q.parties.map((p, i) => (
        <button
          key={p.id}
          className={`${chipBase} ${p.id === party.id ? chipOn : chipOff}`}
          aria-pressed={p.id === party.id}
          onClick={() => setActivePartyId(p.id)}
        >
          <span className="truncate">{partyLabel(p, i)}</span>
        </button>
      ))}
      {withAdd && (
        <button className={`${chipBase} border-dashed border-[#6f5629] bg-transparent text-[#5c4726]`} onClick={addParty}>
          + Add
        </button>
      )}
    </div>
  );

  const previewLabel = busy === "preview" ? "Generating…" : "Preview";
  const downloadLabel = busy === "download" ? "Generating…" : preparingPdf ? "Preparing…" : "Download PDF";
  const imagesLabel = busy === "images" ? "Generating…" : preparingPdf || preparingImages ? "Preparing…" : "Download Images";

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#26221c] font-inter">
      <header className="sticky top-0 z-30 shadow-sm">
        <div className="bg-[#14120f] text-[#f8f3ea]">
          <div className="max-w-275 mx-auto px-1 md:px-8 pt-1 flex items-center gap-1">
            <button
              onClick={handleBack}
              aria-label="All estimates"
              className="min-h-11 min-w-11 px-2 flex items-center justify-center gap-2 text-[#f8f3ea] hover:text-[#e0c48a] transition-colors shrink-0"
            >
              <span className="text-xl leading-none">&larr;</span>
              <span className="hidden sm:inline text-sm">All estimates</span>
            </button>
            <p className="flex-1 min-w-0 truncate font-playfair text-lg">{q.client.name.trim() || "New estimate"}</p>
            {saveState === "error" ? (
              <button
                type="button"
                onClick={() => void persistNow(latestRef.current)}
                className="shrink-0 px-2 text-sm text-[#ffb4a9] underline underline-offset-4"
              >
                Save failed · Retry
              </button>
            ) : (
              <p className="shrink-0 px-2 text-sm text-[#cbbf9f]">
                {saveState === "saving" ? "Saving…" : "Saved"}
              </p>
            )}
          </div>
          <nav aria-label="Steps" className="max-w-275 mx-auto px-2 md:px-8 pb-2 pt-1 grid grid-cols-4 gap-1">
            {STEPS.map((label, i) => (
              <button
                key={label}
                aria-current={i === step ? "step" : undefined}
                onClick={() => goToStep(i)}
                className={`min-h-11 rounded-lg text-sm transition-colors ${i === step ? "bg-[#e0c48a] text-[#14120f] font-semibold" : i < step ? "text-[#f8f3ea]" : "text-[#cbbf9f]"}`}
              >
                {i < step ? "✓" : i + 1} {label}
              </button>
            ))}
          </nav>
        </div>
        {step === 1 && (
          <div className="bg-[#f8f3ea] border-b border-[#d9ccb4]">
            <div
              ref={categoryRowRef}
              role="group"
              aria-label="Menu categories"
              className={`${chipRow} max-w-275 mx-auto px-3 md:px-8 py-2`}
            >
              {party.sections.map((sec) => {
                const active = sec.id === activeSectionKey && !isSearching;
                const count = namedItemCount(sec);
                return (
                  <button
                    key={sec.id}
                    aria-pressed={active}
                    onClick={() => openCategory(sec.id)}
                    className={`${chipBase} ${active ? chipOn : count > 0 ? chipFilled : chipOff}`}
                  >
                    <span className="truncate">{sec.title || "Untitled category"}</span>
                    {count > 0 && <span className="font-bold">{count}</span>}
                  </button>
                );
              })}
              <button onClick={addSection} className={`${chipBase} border-dashed border-[#6f5629] bg-transparent text-[#5c4726]`}>
                + Category
              </button>
            </div>
          </div>
        )}
      </header>

      {flash && (
        <div role="status" className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-[#14120f] text-[#f8f3ea] text-base px-4 py-2 shadow-lg">{flash}</div>
      )}

      <main className="max-w-275 mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-40 space-y-7">
        {step === 0 && (
          <>
            <Group title="Client">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Field label="Client name">
                    <input
                      ref={clientNameRef}
                      className={inputCls}
                      value={q.client.name}
                      autoComplete="off"
                      autoCapitalize="words"
                      enterKeyHint="next"
                      aria-invalid={showNameError}
                      onChange={(e) => update((d) => { d.client.name = e.target.value; })}
                      placeholder="Mr. Faisal"
                    />
                  </Field>
                  {showNameError && <p role="alert" className="mt-1.5 text-base text-[#a32a1c]">Enter the client name to continue.</p>}
                </div>
                <Field label="Phone">
                  <input type="tel" inputMode="tel" className={inputCls} value={q.client.phone} onChange={(e) => update((d) => { d.client.phone = e.target.value; })} />
                </Field>
                <Field label="Address" className="sm:col-span-2">
                  <textarea rows={2} className={inputCls} value={q.client.address} onChange={(e) => update((d) => { d.client.address = e.target.value; })} />
                </Field>
              </div>
            </Group>

            <Group title="Event">
              {hasManyParties && functionTabs(true)}
              {hasManyParties && (
                <Field label="Function name" className="mb-4">
                  <input
                    key={party.id}
                    className={inputCls}
                    value={party.name}
                    autoFocus={party.id === newPartyId}
                    onBlur={() => setNewPartyId("")}
                    onChange={(e) => update((d) => { d.parties[partyIndex].name = e.target.value; })}
                    placeholder="Night / Convention"
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Field label="Date">
                  <input type="date" className={inputCls} value={party.event.date} onChange={(e) => update((d) => { d.parties[partyIndex].event.date = e.target.value; })} />
                </Field>
                <Field label="Number of guests">
                  <input inputMode="numeric" className={inputCls} value={party.event.pax} onChange={(e) => update((d) => { d.parties[partyIndex].event.pax = e.target.value; })} placeholder="1000" />
                </Field>
                <Field label="Venue" className="col-span-2 lg:col-span-1 lg:order-first">
                  <input className={inputCls} value={party.event.venue} onChange={(e) => update((d) => { d.parties[partyIndex].event.venue = e.target.value; })} />
                </Field>
                <Field label="Time">
                  <input className={inputCls} value={party.event.time} onChange={(e) => update((d) => { d.parties[partyIndex].event.time = e.target.value; })} />
                </Field>
                <Field label="Type of function">
                  <input className={inputCls} value={party.event.nature} onChange={(e) => update((d) => { d.parties[partyIndex].event.nature = e.target.value; })} placeholder="Nikah" />
                </Field>
              </div>
              <div className="mt-4">
                {hasManyParties ? (
                  <button className={dangerBtnCls} onClick={removeParty}>Remove {partyLabel(party, partyIndex)}</button>
                ) : (
                  <button className={`${btnCls} w-full sm:w-auto border-dashed`} onClick={addParty}>+ Add another function</button>
                )}
              </div>
            </Group>
          </>
        )}

        {step === 1 && (
          <div>
            {hasManyParties && functionTabs(false)}
            <div className="relative mb-5">
              <input
                type="search"
                className={`${inputCls} pr-20 [&::-webkit-search-cancel-button]:hidden`}
                value={dishSearch}
                placeholder="Search all dishes"
                aria-label="Search dishes"
                enterKeyHint="search"
                onChange={(e) => setDishSearch(e.target.value)}
              />
              {isSearching && (
                <button className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 px-3 text-base text-[#5c4726] underline underline-offset-4" onClick={() => setDishSearch("")}>
                  Clear
                </button>
              )}
            </div>

            {isSearching ? (
              searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {searchResults.map(({ section, name }) => (
                    <DishRow
                      key={`${section}-${name}`}
                      name={name}
                      hint={section}
                      checked={!!party.sections.find((s) => sameDish(s.title, section))?.items.some((it) => sameDish(it.name, name))}
                      onToggle={() => toggleSearchResult(section, name)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-base text-[#5f574b]">No dish found with that name.</p>
                  {activeSection && (
                    <button className={`${btnCls} w-full sm:w-auto`} onClick={addSearchedDish}>
                      Add “{dishSearch.trim()}” to {activeSection.title || "this category"}
                    </button>
                  )}
                </div>
              )
            ) : (
              activeSection && (() => {
                const sec = activeSection;
                const si = activeIndex;
                const choices = choicesFor(sec.title, menuCatalog);
                const moreChoices = moreChoicesFor(sec.title, menuCatalog);
                const inMasterCatalog = menuCatalog.some(
                  (c) => c.title.trim().toLowerCase() === sec.title.trim().toLowerCase(),
                );
                const isTicked = (name: string) => sec.items.some((it) => sameDish(it.name, name));
                // Anything ticked that is not in the main list stays visible at the top.
                const extras = sec.items.filter((it) => it.name.trim() && !choices.some((name) => sameDish(name, it.name)));
                const rows = (names: string[]) => names.map((name) => (
                  <DishRow key={name} name={name} checked={isTicked(name)} onToggle={() => toggleDish(si, name)} />
                ));
                const listCls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2";
                return (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className={`${headingCls} min-w-0`}>{sec.title || "Untitled category"}</h2>
                      {namedItemCount(sec) > 0 && <span className="shrink-0 text-base text-[#5f574b]">{namedItemCount(sec)} selected</span>}
                    </div>

                    {/* Choice lists are tied to the title, so only custom sections can rename. */}
                    {!inMasterCatalog && (
                      <div className="space-y-2">
                        <Field label="Category name">
                          <input
                            className={inputCls}
                            value={sec.title}
                            autoFocus={sec.id === newSectionId}
                            onFocus={(e) => { if (sec.id === newSectionId) e.target.select(); }}
                            onChange={(e) => setSection(si, (s) => { s.title = e.target.value; })}
                          />
                        </Field>
                        {sec.title.trim() && (
                          <button
                            type="button"
                            className={quietBtnCls}
                            onClick={async () => {
                              try {
                                const res = await createMenuCategoryApi({ title: sec.title.trim() });
                                onMenuCatalogChange(res.menuCatalog);
                                notify(`Saved "${res.category.title}" to master menu`);
                              } catch (e) {
                                console.error(e);
                                notify("Could not save category");
                              }
                            }}
                          >
                            + Save category to master menu
                          </button>
                        )}
                      </div>
                    )}

                    <div className={listCls}>
                      {extras.map((it) => (
                        <DishRow key={it.id} name={it.name} checked onToggle={() => toggleDish(si, it.name)} />
                      ))}
                      {rows(choices)}
                    </div>

                    {moreChoices.length > 0 && (
                      <details className="group">
                        <summary className={`${btnCls} w-full sm:w-auto ${summaryCls}`}>
                          <span className="group-open:hidden">List all ({moreChoices.length})</span>
                          <span className="hidden group-open:inline">Hide list</span>
                        </summary>
                        <div className={`${listCls} mt-3`}>{rows(moreChoices)}</div>
                      </details>
                    )}

                    <AddDish onAdd={(name, saveToMaster) => addDish(si, name, saveToMaster)} />

                    {nextSection && (
                      <button className={`${btnCls} w-full`} onClick={() => openCategory(nextSection.id)}>
                        <span className="truncate">Next category: {nextSection.title || "Untitled category"} &rarr;</span>
                      </button>
                    )}

                    <details className="group border-t border-[#d9ccb4] pt-2">
                      <summary className={`${quietBtnCls} inline-flex items-center ${summaryCls}`}>
                        <span className="group-open:hidden">Edit names, quantity or category</span>
                        <span className="hidden group-open:inline">Close editing</span>
                      </summary>
                      <div className="mt-3 space-y-4">
                        {sec.items.length > 0 && (
                          <div className="space-y-2">
                            {sec.items.map((it, ii) => (
                              <div key={it.id} className="grid grid-cols-[1fr_4.5rem_2.75rem] md:grid-cols-[1fr_8rem_2.75rem] items-center gap-2">
                                <input
                                  className={inputCls}
                                  value={it.name}
                                  aria-label="Dish name"
                                  onChange={(e) => setSection(si, (s) => { s.items[ii].name = e.target.value; })}
                                />
                                <input
                                  className={`${inputCls} px-2!`}
                                  value={it.qty}
                                  placeholder="Qty"
                                  aria-label="Quantity"
                                  onChange={(e) => setSection(si, (s) => { s.items[ii].qty = e.target.value; })}
                                />
                                <button
                                  className="min-h-11 text-xl text-[#5f574b] hover:text-[#a32a1c]"
                                  aria-label={`Remove ${it.name || "dish"}`}
                                  onClick={() => setSection(si, (s) => { s.items.splice(ii, 1); })}
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-5">
                          <button className={`${quietBtnCls} disabled:opacity-40`} disabled={si === 0} onClick={() => update((d) => move(d.parties[partyIndex].sections, si, si - 1))}>Move earlier</button>
                          <button className={`${quietBtnCls} disabled:opacity-40`} disabled={si === party.sections.length - 1} onClick={() => update((d) => move(d.parties[partyIndex].sections, si, si + 1))}>Move later</button>
                          <button
                            className={dangerBtnCls}
                            onClick={() => {
                              if (confirm(`Delete category "${sec.title}"?`)) update((d) => { d.parties[partyIndex].sections.splice(si, 1); });
                            }}
                          >
                            Delete category
                          </button>
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {step === 2 && (
          <Group title="Price">
            <div className="space-y-2.5">
              {q.costs.map((c, ci) => {
                // A function's food cost row follows the function, so it is named and removed with it.
                const isPartyRow = hasManyParties && !!c.partyId;
                const label = costLabel(q, c);
                return (
                  <div key={c.id} className="grid grid-cols-[1fr_7.5rem_2.75rem] md:grid-cols-[1fr_10rem_2.75rem] items-center gap-2">
                    {isPartyRow ? (
                      <p className="text-base font-medium">{label}</p>
                    ) : (
                      <input
                        className={`${inputCls} font-medium px-2! ${label ? "border-transparent! bg-transparent! focus:border-[#6f5629]! focus:bg-white!" : ""}`}
                        value={label}
                        autoFocus={c.id === newCostId}
                        placeholder="Charge name"
                        aria-label="Description"
                        onChange={(e) => update((d) => { d.costs[ci].description = e.target.value; })}
                      />
                    )}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-[#5f574b]" aria-hidden>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className={`${inputCls} pl-6! pr-2! text-right`}
                        value={c.amount || ""}
                        placeholder="0"
                        aria-label={`Amount in rupees for ${label || "this charge"}`}
                        onChange={(e) => update((d) => { d.costs[ci].amount = Number(e.target.value) || 0; })}
                      />
                    </div>
                    {isPartyRow ? <span /> : (
                      <button
                        className="min-h-11 text-xl text-[#5f574b] hover:text-[#a32a1c]"
                        aria-label={`Delete ${label || "this charge"}`}
                        onClick={() => {
                          if (c.amount && !confirm(`Delete "${label}"?`)) return;
                          update((d) => { d.costs.splice(ci, 1); });
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button className={`${btnCls} w-full sm:w-auto border-dashed mt-4`} onClick={addCost}>+ Add another charge</button>

            <div className="mt-6 rounded-lg bg-[#14120f] text-[#f8f3ea] p-4 md:ml-auto md:w-1/2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-lg">Total</span>
                <span className="font-playfair text-2xl text-[#e0c48a]">₹ {formatINR(total)}</span>
              </div>
              <p className="mt-1 text-sm text-[#cbbf9f]">{amountInWords(total)}</p>
            </div>
          </Group>
        )}

        {step === 3 && (
          <>
            <section className="rounded-lg bg-[#14120f] text-[#f8f3ea] p-4">
              <p className="font-playfair text-xl">{q.client.name}</p>
              {hasManyParties && <p className="mt-0.5 text-base text-[#cbbf9f]">{q.parties.map(partyLabel).join(" + ")}</p>}
              <p className="mt-2 font-playfair text-3xl text-[#e0c48a]">₹ {formatINR(total)}</p>
            </section>

            {(partiesWithoutMenu.length > 0 || total === 0) && (
              <div className="rounded-lg border border-[#c9822b] bg-[#fdf1dc] p-3 space-y-1">
                {partiesWithoutMenu.length > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base">
                      {hasManyParties ? `No menu for ${partiesWithoutMenu.map((p) => partyLabel(p, q.parties.indexOf(p))).join(", ")}` : "No menu selected yet"}
                    </p>
                    <button
                      className={`${quietBtnCls} shrink-0`}
                      onClick={() => {
                        setActivePartyId(partiesWithoutMenu[0].id);
                        goToStep(1);
                      }}
                    >
                      Add menu
                    </button>
                  </div>
                )}
                {total === 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base">No price entered yet</p>
                    <button className={`${quietBtnCls} shrink-0`} onClick={() => goToStep(2)}>Add price</button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canSend ? (
                <>
                  <button className={`${primaryBtnCls} min-h-14!`} onClick={sendPdf} disabled={actionsDisabled}>
                    {preparingPdf ? "Preparing…" : "Send PDF"}
                  </button>
                  <button className={`${primaryBtnCls} min-h-14!`} onClick={sendImages} disabled={actionsDisabled || preparingImages}>
                    {preparingImages ? "Preparing…" : "Send Images"}
                  </button>
                </>
              ) : (
                <>
                  <button className={`${primaryBtnCls} min-h-14!`} onClick={download} disabled={actionsDisabled}>{downloadLabel}</button>
                  <button className={`${primaryBtnCls} min-h-14!`} onClick={downloadImages} disabled={actionsDisabled}>{imagesLabel}</button>
                </>
              )}
              <button className={`${btnCls} sm:col-span-2`} onClick={preview} disabled={actionsDisabled}>{previewLabel}</button>
              {canSend && (
                <>
                  <button className={btnCls} onClick={download} disabled={actionsDisabled}>{downloadLabel}</button>
                  <button className={btnCls} onClick={downloadImages} disabled={actionsDisabled || preparingImages}>{imagesLabel}</button>
                </>
              )}
            </div>

            <div className="rounded-lg border border-[#d9ccb4] bg-white p-4 space-y-3">
              <div>
                <h3 className="font-playfair text-lg text-[#5c4726]">Client Web Link</h3>
                <p className="text-sm text-[#5f574b]">
                  Let your client view and download this estimate from any phone or browser without logging in.
                </p>
              </div>
              {shareToken ? (() => {
                const shareUrl =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/estimates/share/${shareToken}`
                    : `/estimates/share/${shareToken}`;
                const copyShareUrl = async () => {
                  let copied = false;
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(shareUrl);
                      copied = true;
                    }
                  } catch {
                    copied = false;
                  }
                  if (!copied) {
                    try {
                      const el = document.createElement("textarea");
                      el.value = shareUrl;
                      el.setAttribute("readonly", "");
                      el.style.position = "fixed";
                      el.style.opacity = "0";
                      document.body.append(el);
                      el.select();
                      copied = document.execCommand("copy");
                      el.remove();
                    } catch {
                      copied = false;
                    }
                  }
                  if (copied) {
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                    notify("Share link copied");
                  } else {
                    notify("Tap the link box to copy");
                  }
                };
                return (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        readOnly
                        aria-label="Client share link"
                        value={shareUrl}
                        onClick={(e) => e.currentTarget.select()}
                        className={`${inputCls} bg-[#f8f3ea]! text-sm!`}
                      />
                      <button
                        type="button"
                        className={`${primaryBtnCls} shrink-0`}
                        onClick={copyShareUrl}
                      >
                        {linkCopied ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                          type="button"
                          className={btnCls}
                          onClick={async () => {
                            try {
                              await navigator.share({
                                title: `${q.documentTitle} ${q.number} - ${q.client.name}`,
                                url: shareUrl,
                              });
                            } catch (e) {
                              if ((e as Error).name !== "AbortError") notify("Could not open sharing");
                            }
                          }}
                        >
                          Share Link
                        </button>
                      )}
                      <a
                        href={`/estimates/share/${shareToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnCls}
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        disabled={shareBusy}
                        className={`${btnCls} border-[#a32a1c]! text-[#a32a1c]! hover:bg-[#fbeae7]!`}
                        onClick={async () => {
                          if (!confirm("Disable this share link? Clients with the old link will no longer be able to open it.")) return;
                          setShareBusy(true);
                          try {
                            await revokeShareLink(q.id);
                            setShareToken(null);
                            setLinkCopied(false);
                            notify("Share link disabled");
                          } catch {
                            notify("Could not disable link");
                          } finally {
                            setShareBusy(false);
                          }
                        }}
                      >
                        Disable Link
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <button
                  type="button"
                  disabled={shareBusy}
                  className={btnCls}
                  onClick={async () => {
                    setShareBusy(true);
                    try {
                      if (dirtyRef.current) await persistNow(latestRef.current);
                      const token = await createShareLink(q.id);
                      setShareToken(token);
                      const url = `${window.location.origin}/estimates/share/${token}`;
                      let copied = false;
                      try {
                        if (navigator.clipboard?.writeText) {
                          await navigator.clipboard.writeText(url);
                          copied = true;
                        }
                      } catch {
                        copied = false;
                      }
                      if (copied) {
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                        notify("Share link created & copied");
                      } else {
                        notify("Share link created — tap Copy");
                      }
                    } catch {
                      notify("Could not create share link");
                    } finally {
                      setShareBusy(false);
                    }
                  }}
                >
                  {shareBusy ? "Creating link…" : "Create & Copy Share Link"}
                </button>
              )}
            </div>

            <details className="group border-t border-[#d9ccb4] pt-2">
              <summary className={`${quietBtnCls} inline-flex items-center ${summaryCls}`}>
                <span className="group-open:hidden">Edit terms and company details</span>
                <span className="hidden group-open:inline">Close editing</span>
              </summary>
              <div className="mt-4 space-y-7">
                <Group title="Document">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Field label="Document title">
                      <input className={inputCls} value={q.documentTitle} onChange={(e) => update((d) => { d.documentTitle = e.target.value; })} placeholder="Estimate / Quotation" />
                    </Field>
                    <Field label="Number">
                      <input className={inputCls} value={q.number} onChange={(e) => update((d) => { d.number = e.target.value; })} />
                    </Field>
                    <Field label="Date">
                      <input type="date" className={inputCls} value={q.date} onChange={(e) => update((d) => { d.date = e.target.value; })} />
                    </Field>
                    <label className="flex items-center gap-3 min-h-12 text-base cursor-pointer sm:self-end">
                      <input type="checkbox" className="accent-[#6f5629] w-6 h-6" checked={q.showCover} onChange={(e) => update((d) => { d.showCover = e.target.checked; })} />
                      Include cover page
                    </label>
                  </div>
                  <Field label="Menu page heading" className="mt-4">
                    <input className={inputCls} value={q.menuTitle} onChange={(e) => update((d) => { d.menuTitle = e.target.value; })} />
                  </Field>
                </Group>

                <Group title="Notes & terms">
                  <div className="space-y-4">
                    <Field label="Quantity note">
                      <textarea rows={3} className={inputCls} value={q.quantityNote} onChange={(e) => update((d) => { d.quantityNote = e.target.value; })} />
                    </Field>
                    <Field label="Payment terms">
                      <textarea rows={5} className={inputCls} value={q.paymentTerms} onChange={(e) => update((d) => { d.paymentTerms = e.target.value; })} />
                    </Field>
                    <Field label="Terms & conditions">
                      <textarea rows={4} className={inputCls} value={q.terms} onChange={(e) => update((d) => { d.terms = e.target.value; })} />
                    </Field>
                    <Field label="Waste management terms">
                      <textarea rows={2} className={inputCls} value={q.wasteTerms} onChange={(e) => update((d) => { d.wasteTerms = e.target.value; })} />
                    </Field>
                  </div>
                </Group>

                <Group title="Company & signatory">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Company name">
                      <input className={inputCls} value={q.company.name} onChange={(e) => update((d) => { d.company.name = e.target.value; })} />
                    </Field>
                    <Field label="Tagline">
                      <input className={inputCls} value={q.company.tagline} onChange={(e) => update((d) => { d.company.tagline = e.target.value; })} />
                    </Field>
                    <Field label="Company address" className="sm:col-span-2">
                      <textarea rows={2} className={inputCls} value={q.company.address} onChange={(e) => update((d) => { d.company.address = e.target.value; })} />
                    </Field>
                    <Field label="Company phone">
                      <input type="tel" inputMode="tel" className={inputCls} value={q.company.phone} onChange={(e) => update((d) => { d.company.phone = e.target.value; })} />
                    </Field>
                    <Field label="Email">
                      <input type="email" inputMode="email" className={inputCls} value={q.company.email} onChange={(e) => update((d) => { d.company.email = e.target.value; })} />
                    </Field>
                    <Field label="Website">
                      <input inputMode="url" className={inputCls} value={q.company.website} onChange={(e) => update((d) => { d.company.website = e.target.value; })} />
                    </Field>
                    <div className="hidden sm:block" />
                    <Field label="Signatory name">
                      <input className={inputCls} value={q.signatory.name} onChange={(e) => update((d) => { d.signatory.name = e.target.value; })} />
                    </Field>
                    <Field label="Signatory title">
                      <input className={inputCls} value={q.signatory.title} onChange={(e) => update((d) => { d.signatory.title = e.target.value; })} />
                    </Field>
                    <Field label="Signatory contact" className="sm:col-span-2">
                      <input className={inputCls} value={q.signatory.contact} onChange={(e) => update((d) => { d.signatory.contact = e.target.value; })} />
                    </Field>
                  </div>
                </Group>
              </div>
            </details>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-[#d9ccb4] px-4 md:px-8 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)]">
        <div className="max-w-275 mx-auto">
          {step === 1 && <p className="mb-2 truncate text-center text-base font-medium text-[#5c4726]">{menuSummary}</p>}
          <div className="flex items-center gap-2">
            {step > 0 && <button className={`${btnCls} w-24 shrink-0`} onClick={() => goToStep(step - 1)}>Back</button>}
            {step < STEPS.length - 1 ? (
              <button className={`${primaryBtnCls} flex-1`} onClick={() => goToStep(step + 1)}>Next: {STEPS[step + 1]}</button>
            ) : (
              <button className={`${primaryBtnCls} flex-1`} onClick={handleBack}>Done</button>
            )}
          </div>
        </div>
      </div>

      {previewPages.length > 0 && (
        <div role="dialog" aria-label="Estimate preview" className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#14120f]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-[#14120f] px-4 py-2 text-[#f8f3ea]">
            <p className="text-base">{previewPages.length} page{previewPages.length === 1 ? "" : "s"}</p>
            <button className={btnCls} onClick={() => setPreviewPages([])}>Close</button>
          </div>
          <div className="space-y-3 px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {previewPages.map((url, i) => (
              // These are temporary files made on this device, which next/image cannot load.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={`Page ${i + 1}`} className="block w-full bg-white" />
            ))}
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col p-6" onClick={() => setPreviewUrl("")}>
          <div className="flex justify-end gap-2 mb-2">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={btnCls} onClick={(e) => e.stopPropagation()}>Open in new tab</a>
            <button className={btnCls} onClick={() => setPreviewUrl("")}>Close</button>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Estimate preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
