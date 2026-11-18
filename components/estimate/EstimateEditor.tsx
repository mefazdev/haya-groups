"use client";

import { FormEvent, useEffect, useRef, useState, ReactNode } from "react";
import type { Estimate, Section } from "@/lib/estimate/types";
import { amountInWords, costLabel, formatINR, grandTotalOf, partyLabel, uid } from "@/lib/estimate/utils";
import { saveEstimate } from "@/lib/estimate/storage";
import { choicesFor, createParty, moreChoicesFor, searchChoices } from "@/lib/estimate/defaults";

// Mobile first: 16px text so iOS doesn't zoom on focus, 44px tap targets; denser from md up.
const inputCls =
  "w-full min-h-11 md:min-h-0 bg-[#0a0a0a] border border-[#333] px-3 py-2.5 md:py-2 text-base md:text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-primary transition-colors";
const btnCls =
  "inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs uppercase tracking-wider border border-[#333] px-3 py-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-40";
const primaryBtnCls =
  "inline-flex items-center justify-center min-h-11 md:min-h-0 text-xs uppercase tracking-wider bg-primary text-[#050505] border border-primary px-4 py-2 font-medium hover:bg-primary-hover transition-colors disabled:opacity-50";
const iconBtn =
  "w-11 h-11 md:w-8 md:h-8 shrink-0 flex items-center justify-center border border-[#333] text-gray-400 hover:border-primary hover:text-primary transition-colors";
const checkboxLabel = "flex items-center gap-3 min-h-11 text-sm text-gray-300 cursor-pointer";

const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="bg-[#141414] border border-[#333] p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-5">
        <h2 className="text-xl font-playfair text-primary">{title}</h2>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

interface MenuAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

// One "⋯" button per row: a bottom sheet on phones, a dropdown on desktop.
function RowMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className={iconBtn} aria-label={`Actions for ${label}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(true)}>
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 md:bg-transparent" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="fixed inset-x-0 bottom-0 z-50 bg-[#141414] border-t border-[#333] p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-full md:mt-1 md:w-44 md:border md:p-1 md:shadow-xl"
          >
            <p className="md:hidden px-3 py-2 text-xs uppercase tracking-wider text-gray-500 truncate">{label}</p>
            {actions.map((a) => (
              <button
                key={a.label}
                role="menuitem"
                disabled={a.disabled}
                className={`w-full text-left px-3 min-h-12 md:min-h-9 text-base md:text-sm hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent ${a.danger ? "text-red-400" : "text-gray-200"}`}
                onClick={() => {
                  setOpen(false);
                  a.onClick();
                }}
              >
                {a.label}
              </button>
            ))}
            <button className="md:hidden w-full min-h-12 mt-1 border border-[#333] text-gray-400" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
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
  window.matchMedia("(pointer: coarse)").matches &&
  !!navigator.canShare?.({ files: [new File(["x"], "estimate.pdf", { type: "application/pdf" })] });

const sameDish = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const toggleItem = (section: Section, name: string) => {
  const remaining = section.items.filter((it) => !sameDish(it.name, name));
  if (remaining.length === section.items.length) section.items.push({ id: uid(), name, qty: "" });
  else section.items = remaining;
};

function AddDish({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
  };
  return (
    <form className="flex gap-2" onSubmit={submit}>
      <input
        className={inputCls}
        value={name}
        placeholder="Add a new dish for this client"
        aria-label="Add a new dish"
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className={`${btnCls} shrink-0`}>Add</button>
    </form>
  );
}

interface Props {
  initial: Estimate;
  onBack: () => void;
}

export default function EstimateEditor({ initial, onBack }: Props) {
  const [q, setQ] = useState<Estimate>(initial);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState<"" | "preview" | "download" | "images">("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [flash, setFlash] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [newSectionId, setNewSectionId] = useState("");
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const [activePartyId, setActivePartyId] = useState(initial.parties[0].id);
  const [step, setStep] = useState(0);
  const [dishSearch, setDishSearch] = useState("");
  const [nameMissing, setNameMissing] = useState(false);
  const [canSend] = useState(canSendFiles);
  // Files are prepared ahead because browsers only allow sharing right after a tap.
  const [preparedPdf, setPreparedPdf] = useState<{ source: Estimate; blob: Blob | null } | null>(null);
  const [preparedImages, setPreparedImages] = useState<{ source: Estimate; images: Blob[] | null } | null>(null);
  const clientNameRef = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
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

  // Autosave shortly after the last edit.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaved(false);
    const t = setTimeout(() => {
      saveEstimate(q);
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

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

  const preview = async () => {
    // Phone browsers rarely render a PDF inside a page, so open it in its own tab there.
    // The tab is opened before the async work so popup blockers still see a user tap.
    const inline = isDesktop();
    const tab = inline ? null : window.open("", "_blank");
    setBusy("preview");
    try {
      const url = URL.createObjectURL(await buildPdf());
      if (inline) setPreviewUrl(url);
      else if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (e) {
      console.error(e);
      tab?.close();
      notify("Could not generate PDF");
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
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const download = async () => {
    setBusy("download");
    try {
      saveFile(await buildPdf(), `${fileBase()}.pdf`);
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
    setBusy("images");
    try {
      const { renderEstimateImages } = await import("./EstimatePDF");
      const images = readyImages ?? (await renderEstimateImages(q, readyPdf ?? undefined));
      if (images.length === 1) {
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
    const next = createParty({ date: party.event.date, venue: party.event.venue });
    update((d) => {
      d.parties.push(next);
      for (const p of d.parties) {
        if (d.costs.some((c) => c.partyId === p.id)) continue;
        const at = d.costs.map((c) => !!c.partyId).lastIndexOf(true) + 1;
        d.costs.splice(at, 0, { id: uid(), description: "Total Food Cost", amount: 0, partyId: p.id });
      }
    });
    setActivePartyId(next.id);
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
    // Wait for the new button to exist so the row can reveal it.
    setTimeout(() => categoryRowRef.current?.scrollTo({ left: categoryRowRef.current.scrollWidth }), 0);
  };

  const addDish = (si: number, name: string) =>
    setSection(si, (s) => {
      if (!s.items.some((it) => sameDish(it.name, name))) s.items.push({ id: uid(), name, qty: "" });
    });

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

  const partyTabs = hasManyParties && (
    <div className="flex flex-wrap gap-2 mb-4" aria-label="Functions">
      {q.parties.map((p, i) => (
        <button
          key={p.id}
          className={p.id === party.id ? primaryBtnCls : btnCls}
          aria-pressed={p.id === party.id}
          onClick={() => setActivePartyId(p.id)}
        >
          {partyLabel(p, i)}
        </button>
      ))}
    </div>
  );

  const selectedCount = party.sections.flatMap((s) => s.items).filter((it) => it.name.trim()).length;
  const stepSummary =
    step === 0 ? "" : step === 1 ? `${selectedCount} item${selectedCount === 1 ? "" : "s"} selected` : `₹ ${formatINR(total)}`;

  const activeSection = party.sections.find((s) => s.id === activeSectionId) ?? party.sections[0];
  const namedItemCount = (section: Section) => section.items.filter((it) => it.name.trim()).length;

  const openCategory = (id: string, button: HTMLElement) => {
    setActiveSectionId(id);
    setDishSearch("");
    button.scrollIntoView({ inline: "center", block: "nearest" });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const isSearching = !!dishSearch.trim();
  const searchResults = searchChoices(dishSearch);

  const previewLabel = busy === "preview" ? "Generating…" : "Preview";
  const downloadLabel = busy === "download" ? "Generating…" : "Download PDF";
  const imagesLabel = busy === "images" ? "Generating…" : "Download Images";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-inter">
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-275 mx-auto px-2 md:px-8 py-2 md:py-3 flex items-center gap-2 md:gap-3">
          <button
            onClick={onBack}
            aria-label="All estimates"
            className="min-h-11 px-2 flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors shrink-0"
          >
            <span className="text-lg leading-none">&larr;</span>
            <span className="hidden sm:inline">All estimates</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-playfair text-base md:text-lg text-primary truncate">
              {`${q.number}${q.client.name ? " · " + q.client.name : ""}`}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{saved ? "All changes saved on this device" : "Saving…"}</p>
          </div>
        </div>
        <nav aria-label="Steps" className="max-w-275 mx-auto px-2 md:px-8 pb-2 grid grid-cols-4 gap-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              aria-current={i === step ? "step" : undefined}
              onClick={() => goToStep(i)}
              className={`min-h-11 border-b-2 text-xs uppercase tracking-wider transition-colors ${i === step ? "border-primary text-primary" : i < step ? "border-primary/40 text-gray-300" : "border-[#333] text-gray-500"}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </nav>
        {step === 1 && (
          <div
            ref={categoryRowRef}
            role="group"
            aria-label="Menu categories"
            className="max-w-275 mx-auto px-2 md:px-8 pb-2 flex md:flex-wrap gap-2 overflow-x-auto [scrollbar-width:none]"
          >
            {party.sections.map((sec) => {
              const active = sec.id === activeSection?.id && !isSearching;
              const count = namedItemCount(sec);
              return (
                <button
                  key={sec.id}
                  aria-pressed={active}
                  onClick={(e) => openCategory(sec.id, e.currentTarget)}
                  className={`shrink-0 min-h-11 md:min-h-9 px-3 border text-sm whitespace-nowrap transition-colors ${active ? "bg-primary border-primary text-[#050505] font-medium" : count > 0 ? "border-primary text-primary" : "border-[#333] text-gray-300"}`}
                >
                  {sec.title || "Untitled category"}
                  {count > 0 && <span className="ml-1.5 font-semibold">{count}</span>}
                </button>
              );
            })}
            <button
              onClick={addSection}
              className="shrink-0 min-h-11 md:min-h-9 px-3 border border-dashed border-primary text-sm text-primary whitespace-nowrap hover:bg-primary/10 transition-colors"
            >
              + Category
            </button>
          </div>
        )}
      </header>

      {flash && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-primary text-[#050505] text-sm px-4 py-2 shadow-lg">{flash}</div>
      )}

      <main className="max-w-275 mx-auto px-3 md:px-8 pt-4 md:pt-8 pb-32 space-y-4 md:space-y-6">
        {step === 0 && (
          <>
        <Card title="Client">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Field label="Name">
                <input
                  ref={clientNameRef}
                  className={inputCls}
                  value={q.client.name}
                  autoComplete="off"
                  aria-invalid={showNameError}
                  onChange={(e) => update((d) => { d.client.name = e.target.value; })}
                  placeholder="Mr. Faisal"
                />
              </Field>
              {showNameError && <p role="alert" className="mt-1.5 text-sm text-red-300">Enter the client name to continue.</p>}
            </div>
            <Field label="Phone">
              <input type="tel" inputMode="tel" className={inputCls} value={q.client.phone} onChange={(e) => update((d) => { d.client.phone = e.target.value; })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea rows={2} className={inputCls} value={q.client.address} onChange={(e) => update((d) => { d.client.address = e.target.value; })} />
            </Field>
          </div>
        </Card>

        <Card title="Event details" actions={<button className={btnCls} onClick={addParty}>+ Add function</button>}>
          {partyTabs}
          {hasManyParties && (
            <div className="flex items-end gap-2 mb-4">
              <Field label="Function name" className="flex-1 min-w-0">
                <input className={inputCls} value={party.name} onChange={(e) => update((d) => { d.parties[partyIndex].name = e.target.value; })} placeholder="Night / Convention" />
              </Field>
              <button className={`${btnCls} shrink-0 hover:border-red-500! hover:text-red-400!`} onClick={removeParty}>Remove function</button>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Field label="Date">
              <input type="date" className={inputCls} value={party.event.date} onChange={(e) => update((d) => { d.parties[partyIndex].event.date = e.target.value; })} />
            </Field>
            <Field label="No. of pax">
              <input inputMode="numeric" className={inputCls} value={party.event.pax} onChange={(e) => update((d) => { d.parties[partyIndex].event.pax = e.target.value; })} placeholder="1000" />
            </Field>
            <Field label="Venue" className="col-span-2 lg:col-span-1 lg:order-first">
              <input className={inputCls} value={party.event.venue} onChange={(e) => update((d) => { d.parties[partyIndex].event.venue = e.target.value; })} />
            </Field>
            <Field label="Time">
              <input className={inputCls} value={party.event.time} onChange={(e) => update((d) => { d.parties[partyIndex].event.time = e.target.value; })} />
            </Field>
            <Field label="Nature">
              <input className={inputCls} value={party.event.nature} onChange={(e) => update((d) => { d.parties[partyIndex].event.nature = e.target.value; })} placeholder="Nikah / Reception" />
            </Field>
          </div>
        </Card>
          </>
        )}

        {step === 1 && (
          <>
        <Card
          title={hasManyParties ? `Menu: ${partyLabel(party, partyIndex)}` : "Menu & items"}
        >
          {partyTabs}
          <div className="flex gap-2 mb-4">
            <input
              type="search"
              className={inputCls}
              value={dishSearch}
              placeholder="Search dishes, e.g. biriyani"
              aria-label="Search dishes"
              enterKeyHint="search"
              onChange={(e) => setDishSearch(e.target.value)}
            />
            {isSearching && <button className={`${btnCls} shrink-0`} onClick={() => setDishSearch("")}>Clear</button>}
          </div>

          {isSearching && (
            searchResults.length > 0 ? (
              <div className="divide-y divide-[#1f1f1f]">
                {searchResults.map(({ section, name }) => {
                  const checked = !!party.sections.find((s) => sameDish(s.title, section))?.items.some((it) => sameDish(it.name, name));
                  return (
                    <label key={`${section}-${name}`} className={`${checkboxLabel} py-1 has-checked:text-primary`}>
                      <input
                        type="checkbox"
                        className="accent-primary w-5 h-5 shrink-0"
                        checked={checked}
                        onChange={() => toggleSearchResult(section, name)}
                      />
                      <span className="flex-1 min-w-0">{name}</span>
                      <span className="text-xs text-gray-500 text-right shrink-0 max-w-[40%]">{section}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-3">No match. Open a category below and use Add a new dish.</p>
            )
          )}

          {(!isSearching || searchResults.length === 0) && (
            <>

          <div className="space-y-3 md:space-y-4">
            {party.sections.map((sec, si) => {
              if (sec.id !== activeSection?.id) return null;
              const choices = choicesFor(sec.title);
              const moreChoices = moreChoicesFor(sec.title);
              const choiceBoxes = (names: string[]) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
                  {names.map((name) => (
                    <label key={name} className={`${checkboxLabel} has-checked:text-primary`}>
                      <input
                        type="checkbox"
                        className="accent-primary w-5 h-5 shrink-0"
                        checked={sec.items.some((it) => sameDish(it.name, name))}
                        onChange={() => toggleDish(si, name)}
                      />
                      {name}
                    </label>
                  ))}
                </div>
              );
              return (
                <div key={sec.id} className="border border-[#2a2a2a] bg-[#101010]">
                  <div className="flex items-center gap-1 pr-1.5">
                    <div className="flex-1 min-w-0 flex items-center gap-3 px-3 min-h-14">
                      <h3 className="flex-1 min-w-0 truncate font-playfair text-base text-primary">{sec.title || "Untitled category"}</h3>
                      <span className="text-xs text-gray-500 shrink-0">{namedItemCount(sec)} selected</span>
                    </div>
                    <RowMenu
                      label={sec.title || "Category"}
                      actions={[
                        { label: "Move left", disabled: si === 0, onClick: () => update((d) => move(d.parties[partyIndex].sections, si, si - 1)) },
                        { label: "Move right", disabled: si === party.sections.length - 1, onClick: () => update((d) => move(d.parties[partyIndex].sections, si, si + 1)) },
                        {
                          label: "Delete category",
                          danger: true,
                          onClick: () => {
                            if (confirm(`Delete category "${sec.title}"?`)) update((d) => { d.parties[partyIndex].sections.splice(si, 1); });
                          },
                        },
                      ]}
                    />
                  </div>

                  <div className="border-t border-[#2a2a2a] p-3 space-y-4">
                    {/* Choice lists are tied to the title, so only custom sections can rename. */}
                    {choices.length === 0 && (
                      <Field label="Category name">
                        <input
                          className={`${inputCls} font-playfair text-primary`}
                          value={sec.title}
                          autoFocus={sec.id === newSectionId}
                          onFocus={(e) => { if (sec.id === newSectionId) e.target.select(); }}
                          onChange={(e) => setSection(si, (s) => { s.title = e.target.value; })}
                        />
                      </Field>
                    )}

                    {choices.length > 0 && choiceBoxes(choices)}

                    {moreChoices.length > 0 && (
                      <details className="group">
                        <summary className={`${btnCls} w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                          <span className="group-open:hidden">List all ({moreChoices.length})</span>
                          <span className="hidden group-open:inline">Hide list</span>
                        </summary>
                        <div className="mt-3 border-t border-[#2a2a2a] pt-3">
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">More items</p>
                          {choiceBoxes(moreChoices)}
                        </div>
                      </details>
                    )}

                    <AddDish onAdd={(name) => addDish(si, name)} />

                    {sec.items.length > 0 && (
                      <div className="border-t border-[#2a2a2a] pt-3">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Selected ({sec.items.length})</p>
                        <div className="space-y-2">
                          {sec.items.map((it, ii) => (
                            <div key={it.id} className="grid grid-cols-[auto_1fr_5.5rem] md:grid-cols-[auto_1fr_8rem] items-center gap-2">
                              <input
                                type="checkbox"
                                className="accent-primary w-5 h-5"
                                checked
                                aria-label={`Remove ${it.name || "dish"}`}
                                onChange={() => setSection(si, (s) => { s.items.splice(ii, 1); })}
                              />
                              <input
                                className={inputCls}
                                value={it.name}
                                aria-label="Dish name"
                                onChange={(e) => setSection(si, (s) => { s.items[ii].name = e.target.value; })}
                              />
                              <input
                                className={inputCls}
                                value={it.qty}
                                placeholder="Qty"
                                aria-label="Quantity"
                                onChange={(e) => setSection(si, (s) => { s.items[ii].qty = e.target.value; })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}
        </Card>
          </>
        )}

        {step === 2 && (
          <>
        <Card
          title="Pricing"
          actions={
            <button className={btnCls} onClick={() => update((d) => { d.costs.push({ id: uid(), description: "", amount: 0 }); })}>
              + Row
            </button>
          }
        >
          <div className="hidden md:grid grid-cols-[1fr_9rem_2rem] gap-2 text-[11px] uppercase tracking-wider text-gray-500 px-1 mb-2">
            <span>Description</span>
            <span className="text-right">Amount (₹)</span>
            <span />
          </div>
          <div className="divide-y divide-[#222] md:divide-y-0 md:space-y-2">
            {q.costs.map((c, ci) => {
              // A party's food cost row follows the party, so it is named and removed with it.
              const isPartyRow = hasManyParties && !!c.partyId;
              return (
              <div key={c.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_9rem_2rem] gap-2 py-3 first:pt-0 md:py-0">
                <input
                  className={`${inputCls} col-span-2 md:col-span-1 read-only:text-gray-400`}
                  value={costLabel(q, c)}
                  readOnly={isPartyRow}
                  placeholder="Description"
                  aria-label="Description"
                  onChange={(e) => update((d) => { d.costs[ci].description = e.target.value; })}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className={`${inputCls} text-right`}
                  value={c.amount || ""}
                  placeholder="Amount ₹"
                  aria-label="Amount in rupees"
                  onChange={(e) => update((d) => { d.costs[ci].amount = Number(e.target.value) || 0; })}
                />
                <RowMenu
                  label={costLabel(q, c) || "Row"}
                  actions={[
                    { label: "Move up", disabled: ci === 0, onClick: () => update((d) => move(d.costs, ci, ci - 1)) },
                    { label: "Move down", disabled: ci === q.costs.length - 1, onClick: () => update((d) => move(d.costs, ci, ci + 1)) },
                    { label: "Delete", danger: true, disabled: isPartyRow, onClick: () => update((d) => { d.costs.splice(ci, 1); }) },
                  ]}
                />
              </div>
              );
            })}
          </div>

          <div className="mt-5 md:mt-6 md:ml-auto md:w-1/2 bg-[#0a0a0a] border border-[#333] p-4 text-sm space-y-1.5">
            <div className="flex justify-between text-lg font-playfair text-primary"><span>Total</span><span>₹ {formatINR(total)}</span></div>
            <p className="text-xs text-gray-500 text-right">{amountInWords(total)}</p>
          </div>
        </Card>
          </>
        )}

        {step === 3 && (
          <>
        <Card title="Send estimate">
          <div className="border border-[#333] bg-[#0a0a0a] p-4 mb-4 text-sm space-y-1">
            <p className="font-playfair text-lg text-gray-100">{q.client.name}</p>
            <p className="text-gray-400">{q.number}</p>
            <p className="font-playfair text-xl text-primary pt-1">₹ {formatINR(total)}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {canSend && (
              <>
                <button className={`${primaryBtnCls} min-h-12!`} onClick={sendPdf} disabled={actionsDisabled}>
                  {preparingPdf ? "Preparing…" : "Send PDF"}
                </button>
                <button className={`${primaryBtnCls} min-h-12!`} onClick={sendImages} disabled={actionsDisabled || preparingImages}>
                  {preparingImages ? "Preparing…" : "Send Images"}
                </button>
              </>
            )}
            <button className={btnCls} onClick={preview} disabled={actionsDisabled}>{previewLabel}</button>
            <button className={btnCls} onClick={download} disabled={actionsDisabled}>{downloadLabel}</button>
            <button className={`${btnCls} sm:col-span-2`} onClick={downloadImages} disabled={actionsDisabled}>{imagesLabel}</button>
          </div>
        </Card>

        <details className="group">
          <summary className={`${btnCls} w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            <span className="group-open:hidden">More options</span>
            <span className="hidden group-open:inline">Hide options</span>
          </summary>
          <div className="mt-4 space-y-4 md:space-y-6">
        <Card title="Document">
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
            <label className={`${checkboxLabel} sm:self-end`}>
              <input type="checkbox" className="accent-primary w-5 h-5" checked={q.showCover} onChange={(e) => update((d) => { d.showCover = e.target.checked; })} />
              Include cover page
            </label>
          </div>
          <Field label="Menu page heading" className="mt-4">
            <input className={inputCls} value={q.menuTitle} onChange={(e) => update((d) => { d.menuTitle = e.target.value; })} />
          </Field>
        </Card>

        <Card title="Notes & terms">
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
        </Card>

        <Card title="Company & signatory">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company name">
              <input className={inputCls} value={q.company.name} onChange={(e) => update((d) => { d.company.name = e.target.value; })} />
            </Field>
            <Field label="Tagline">
              <input className={inputCls} value={q.company.tagline} onChange={(e) => update((d) => { d.company.tagline = e.target.value; })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea rows={2} className={inputCls} value={q.company.address} onChange={(e) => update((d) => { d.company.address = e.target.value; })} />
            </Field>
            <Field label="Phone">
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
        </Card>
          </div>
        </details>
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 px-3 md:px-8 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)]">
        <div className="max-w-275 mx-auto flex items-center gap-2">
          {step > 0 && <button className={btnCls} onClick={() => goToStep(step - 1)}>Back</button>}
          <p className="flex-1 min-w-0 truncate text-center font-playfair text-primary">{stepSummary}</p>
          {step < STEPS.length - 1 ? (
            <button className={primaryBtnCls} onClick={() => goToStep(step + 1)}>Next: {STEPS[step + 1]}</button>
          ) : (
            <button className={primaryBtnCls} onClick={onBack}>Done</button>
          )}
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col p-6" onClick={() => setPreviewUrl("")}>
          <div className="flex justify-end gap-2 mb-2">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={`${btnCls} bg-[#0a0a0a]`} onClick={(e) => e.stopPropagation()}>Open in new tab</a>
            <button className={`${btnCls} bg-[#0a0a0a]`} onClick={() => setPreviewUrl("")}>Close</button>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Estimate preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
