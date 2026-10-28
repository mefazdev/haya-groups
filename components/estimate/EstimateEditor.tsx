"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import type { LineItem, Estimate, Section } from "@/lib/estimate/types";
import { amountInWords, formatINR, grandTotalOf, subtotalOf, taxOf, uid } from "@/lib/estimate/utils";
import { resetTemplate, saveEstimate, saveTemplate } from "@/lib/estimate/storage";
import { buildDefaultTemplate } from "@/lib/estimate/defaults";

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

// "Chicken Fry – 120 Kg" / "Chicken Fry - 120 Kg" / "Chicken Fry, 120 Kg" / "Chicken Fry"
const parseBulk = (text: string): LineItem[] =>
  text
    .split("\n")
    .map((l) => l.replace(/^\s*[•\-*·]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.*?)\s+[–—-]\s+([^–—-]+)$/) ?? line.match(/^(.*?)\s*\t\s*(.+)$/);
      return { id: uid(), name: (m ? m[1] : line).trim(), qty: m ? m[2].trim() : "" };
    });

interface Props {
  initial: Estimate;
  mode: "estimate" | "template";
  onBack: () => void;
}

export default function EstimateEditor({ initial, mode, onBack }: Props) {
  const [q, setQ] = useState<Estimate>(initial);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState<"" | "preview" | "download">("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [bulkFor, setBulkFor] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [flash, setFlash] = useState("");
  // Sections start collapsed on phones to keep the page short, expanded on desktop.
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(isDesktop() ? initial.sections.map((s) => s.id) : []),
  );
  const firstRender = useRef(true);

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
      if (mode === "template") saveTemplate(q);
      else saveEstimate(q);
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
  }, [q, mode]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  const buildPdf = async () => {
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

  const download = async () => {
    setBusy("download");
    try {
      const url = URL.createObjectURL(await buildPdf());
      const a = document.createElement("a");
      const who = q.client.name.trim().replace(/[^\w]+/g, "-") || "client";
      a.href = url;
      a.download = `${q.number || "Template"}-${who}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      notify("Could not generate PDF");
    } finally {
      setBusy("");
    }
  };

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOpen = q.sections.length > 0 && q.sections.every((s) => openSections.has(s.id));

  const setSection = (si: number, fn: (s: Section) => void) => update((d) => fn(d.sections[si]));

  const addSection = () => {
    const id = uid();
    update((d) => { d.sections.push({ id, title: "New section", columns: 1, items: [{ id: uid(), name: "", qty: "" }] }); });
    setOpenSections((prev) => new Set(prev).add(id));
  };

  const addItem = (si: number, at?: number) =>
    setSection(si, (s) => s.items.splice(at ?? s.items.length, 0, { id: uid(), name: "", qty: "" }));

  const applyBulk = (si: number) => {
    const items = parseBulk(bulkText);
    if (items.length) setSection(si, (s) => s.items.push(...items));
    setBulkFor(null);
    setBulkText("");
  };

  const subtotal = subtotalOf(q);
  const tax = taxOf(q);
  const total = grandTotalOf(q);

  const previewLabel = busy === "preview" ? "Generating…" : "Preview";
  const downloadLabel = busy === "download" ? "Generating…" : "Download PDF";

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
              {mode === "template" ? "Default template" : `${q.number}${q.client.name ? " · " + q.client.name : ""}`}
            </p>
            <p className="text-[11px] text-gray-500 truncate">{saved ? "All changes saved on this device" : "Saving…"}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* {mode === "estimate" && (
              <button
                className={btnCls}
                onClick={() => {
                  saveTemplate(q);
                  notify("Saved as default template for new estimates");
                }}
              >
                Save as template
              </button>
            )} */}
            {mode === "template" && (
              <button
                className={btnCls}
                onClick={() => {
                  if (!confirm("Reset the template to the original items? Your template edits will be lost.")) return;
                  resetTemplate();
                  setQ(buildDefaultTemplate());
                }}
              >
                Reset
              </button>
            )}
            {/* Phones use the bottom action bar instead. */}
            <div className="hidden md:flex gap-2">
              <button className={btnCls} onClick={preview} disabled={!!busy}>
                {previewLabel}
              </button>
              <button className={primaryBtnCls} onClick={download} disabled={!!busy}>
                {downloadLabel}
              </button>
            </div>
          </div>
        </div>
      </header>

      {flash && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-[#050505] text-sm px-4 py-2 shadow-lg">{flash}</div>
      )}

      <main className="max-w-275 mx-auto px-3 md:px-8 pt-4 md:pt-8 pb-32 md:pb-12 space-y-4 md:space-y-6">
        <Card title="Document">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Document title">
              <input className={inputCls} value={q.documentTitle} onChange={(e) => update((d) => { d.documentTitle = e.target.value; })} placeholder="Estimate / Quotation" />
            </Field>
            {mode === "estimate" && (
              <>
                <Field label="Number">
                  <input className={inputCls} value={q.number} onChange={(e) => update((d) => { d.number = e.target.value; })} />
                </Field>
                <Field label="Date">
                  <input type="date" className={inputCls} value={q.date} onChange={(e) => update((d) => { d.date = e.target.value; })} />
                </Field>
              </>
            )}
            <label className={`${checkboxLabel} sm:self-end`}>
              <input type="checkbox" className="accent-primary w-5 h-5" checked={q.showCover} onChange={(e) => update((d) => { d.showCover = e.target.checked; })} />
              Include cover page
            </label>
          </div>
        </Card>

        {mode === "estimate" && (
          <Card title="Client">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">
                <input className={inputCls} value={q.client.name} autoComplete="off" onChange={(e) => update((d) => { d.client.name = e.target.value; })} placeholder="Mr. Faisal" />
              </Field>
              <Field label="Phone">
                <input type="tel" inputMode="tel" className={inputCls} value={q.client.phone} onChange={(e) => update((d) => { d.client.phone = e.target.value; })} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea rows={2} className={inputCls} value={q.client.address} onChange={(e) => update((d) => { d.client.address = e.target.value; })} />
              </Field>
            </div>
          </Card>
        )}

        <Card title="Event details">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Field label="Date">
              <input type="date" className={inputCls} value={q.event.date} onChange={(e) => update((d) => { d.event.date = e.target.value; })} />
            </Field>
            <Field label="No. of pax">
              <input inputMode="numeric" className={inputCls} value={q.event.pax} onChange={(e) => update((d) => { d.event.pax = e.target.value; })} placeholder="1000" />
            </Field>
            <Field label="Venue" className="col-span-2 lg:col-span-1 lg:order-first">
              <input className={inputCls} value={q.event.venue} onChange={(e) => update((d) => { d.event.venue = e.target.value; })} />
            </Field>
            <Field label="Time">
              <input className={inputCls} value={q.event.time} onChange={(e) => update((d) => { d.event.time = e.target.value; })} placeholder="Lunch / Dinner" />
            </Field>
            <Field label="Nature">
              <input className={inputCls} value={q.event.nature} onChange={(e) => update((d) => { d.event.nature = e.target.value; })} placeholder="Nikah / Reception" />
            </Field>
          </div>
        </Card>

        <Card
          title="Menu & items"
          actions={
            <>
              {q.sections.length > 0 && (
                <button
                  className={btnCls}
                  onClick={() => setOpenSections(allOpen ? new Set() : new Set(q.sections.map((s) => s.id)))}
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              )}
              <button className={btnCls} onClick={addSection}>+ Section</button>
            </>
          }
        >
          <Field label="Menu page heading" className="mb-4 md:mb-6">
            <input className={inputCls} value={q.menuTitle} onChange={(e) => update((d) => { d.menuTitle = e.target.value; })} />
          </Field>

          <div className="space-y-3 md:space-y-4">
            {q.sections.map((sec, si) => {
              const isOpen = openSections.has(sec.id);
              const count = sec.items.filter((i) => i.name.trim()).length;
              return (
                <div key={sec.id} className="border border-[#2a2a2a] bg-[#101010]">
                  <div className="flex items-center gap-1 pr-1.5">
                    <button
                      className="flex-1 min-w-0 flex items-center gap-3 px-3 min-h-14 text-left"
                      onClick={() => toggleSection(sec.id)}
                      aria-expanded={isOpen}
                    >
                      <span className={`text-primary text-lg leading-none transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                      <span className="flex-1 min-w-0 truncate font-playfair text-base text-primary">{sec.title || "Untitled section"}</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {count} item{count === 1 ? "" : "s"}
                      </span>
                    </button>
                    <RowMenu
                      label={sec.title || "Section"}
                      actions={[
                        { label: "Move section up", disabled: si === 0, onClick: () => update((d) => move(d.sections, si, si - 1)) },
                        { label: "Move section down", disabled: si === q.sections.length - 1, onClick: () => update((d) => move(d.sections, si, si + 1)) },
                        {
                          label: "Delete section",
                          danger: true,
                          onClick: () => {
                            if (confirm(`Delete section "${sec.title}"?`)) update((d) => { d.sections.splice(si, 1); });
                          },
                        },
                      ]}
                    />
                  </div>

                  {isOpen && (
                    <div className="border-t border-[#2a2a2a] p-3 space-y-3">
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Field label="Section title">
                          <input
                            className={`${inputCls} font-playfair text-primary`}
                            value={sec.title}
                            onChange={(e) => setSection(si, (s) => { s.title = e.target.value; })}
                          />
                        </Field>
                        <Field label="PDF layout">
                          <select
                            className={`${inputCls} w-auto`}
                            value={sec.columns}
                            onChange={(e) => setSection(si, (s) => { s.columns = Number(e.target.value) as 1 | 2; })}
                          >
                            <option value={1}>1 column</option>
                            <option value={2}>2 columns</option>
                          </select>
                        </Field>
                      </div>

                      {sec.items.length > 0 && (
                        <div className="hidden md:grid grid-cols-[1fr_8rem_2rem] gap-2 text-[11px] uppercase tracking-wider text-gray-500 px-1 pt-1">
                          <span>Item</span>
                          <span>Quantity</span>
                          <span />
                        </div>
                      )}
                      <div className="divide-y divide-[#1f1f1f] md:divide-y-0 md:space-y-2">
                        {sec.items.map((it, ii) => (
                          <div key={it.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_8rem_2rem] gap-2 py-3 first:pt-0 md:py-0">
                            <input
                              className={`${inputCls} col-span-2 md:col-span-1`}
                              value={it.name}
                              placeholder="Item name"
                              aria-label="Item name"
                              onChange={(e) => setSection(si, (s) => { s.items[ii].name = e.target.value; })}
                            />
                            <input
                              className={inputCls}
                              value={it.qty}
                              placeholder="Qty, e.g. 25 Kg"
                              aria-label="Quantity"
                              enterKeyHint="next"
                              onChange={(e) => setSection(si, (s) => { s.items[ii].qty = e.target.value; })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addItem(si, ii + 1);
                                }
                              }}
                            />
                            <RowMenu
                              label={it.name || "Item"}
                              actions={[
                                { label: "Move up", disabled: ii === 0, onClick: () => setSection(si, (s) => move(s.items, ii, ii - 1)) },
                                { label: "Move down", disabled: ii === sec.items.length - 1, onClick: () => setSection(si, (s) => move(s.items, ii, ii + 1)) },
                                { label: "Duplicate", onClick: () => setSection(si, (s) => { s.items.splice(ii + 1, 0, { ...it, id: uid() }); }) },
                                { label: "Delete", danger: true, onClick: () => setSection(si, (s) => { s.items.splice(ii, 1); }) },
                              ]}
                            />
                          </div>
                        ))}
                      </div>

                      {bulkFor === sec.id ? (
                        <div className="pt-1 space-y-2">
                          <textarea
                            rows={6}
                            autoFocus
                            className={inputCls}
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={"One item per line, quantity after a dash:\nChicken Nuggets – 25 Kg\nGreek Salad"}
                          />
                          <div className="grid grid-cols-2 md:flex gap-2">
                            <button className={btnCls} onClick={() => applyBulk(si)}>Add items</button>
                            <button className={btnCls} onClick={() => { setBulkFor(null); setBulkText(""); }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid md:flex gap-2 pt-1">
                          <button className={btnCls} onClick={() => addItem(si)}>+ Item</button>
                          {/* Paste list hidden for now
                          <button className={btnCls} onClick={() => { setBulkFor(sec.id); setBulkText(""); }}>Paste list</button> */}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Pricing"
          actions={
            <button className={btnCls} onClick={() => update((d) => { d.costs.push({ id: uid(), description: "", remarks: "", amount: 0 }); })}>
              + Row
            </button>
          }
        >
          <div className="hidden md:grid grid-cols-[1fr_1fr_9rem_2rem] gap-2 text-[11px] uppercase tracking-wider text-gray-500 px-1 mb-2">
            <span>Description</span>
            <span>Remarks</span>
            <span className="text-right">Amount (₹)</span>
            <span />
          </div>
          <div className="divide-y divide-[#222] md:divide-y-0 md:space-y-2">
            {q.costs.map((c, ci) => (
              <div key={c.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_1fr_9rem_2rem] gap-2 py-3 first:pt-0 md:py-0">
                <input
                  className={`${inputCls} col-span-2 md:col-span-1`}
                  value={c.description}
                  placeholder="Description"
                  aria-label="Description"
                  onChange={(e) => update((d) => { d.costs[ci].description = e.target.value; })}
                />
                <input
                  className={`${inputCls} col-span-2 md:col-span-1`}
                  value={c.remarks}
                  placeholder="Remarks (optional)"
                  aria-label="Remarks"
                  onChange={(e) => update((d) => { d.costs[ci].remarks = e.target.value; })}
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
                  label={c.description || "Row"}
                  actions={[
                    { label: "Move up", disabled: ci === 0, onClick: () => update((d) => move(d.costs, ci, ci - 1)) },
                    { label: "Move down", disabled: ci === q.costs.length - 1, onClick: () => update((d) => move(d.costs, ci, ci + 1)) },
                    { label: "Delete", danger: true, onClick: () => update((d) => { d.costs.splice(ci, 1); }) },
                  ]}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 md:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <Field label="GST %">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className={`${inputCls} w-24`}
                  value={q.taxPercent}
                  onChange={(e) => update((d) => { d.taxPercent = Number(e.target.value) || 0; })}
                />
              </Field>
              <label className={checkboxLabel}>
                <input type="checkbox" className="accent-primary w-5 h-5 shrink-0" checked={q.addTaxToTotal} onChange={(e) => update((d) => { d.addTaxToTotal = e.target.checked; })} />
                Add GST to total (otherwise shown as a note)
              </label>
            </div>
            <div className="bg-[#0a0a0a] border border-[#333] p-4 text-sm space-y-1.5">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>₹ {formatINR(subtotal)}</span></div>
              {q.addTaxToTotal && q.taxPercent > 0 && (
                <div className="flex justify-between text-gray-400"><span>GST ({q.taxPercent}%)</span><span>₹ {formatINR(tax)}</span></div>
              )}
              <div className="flex justify-between text-lg font-playfair text-primary pt-2 border-t border-[#333]"><span>Total</span><span>₹ {formatINR(total)}</span></div>
              <p className="text-xs text-gray-500 text-right">{amountInWords(total)}</p>
            </div>
          </div>
        </Card>

        <Card title="Notes & terms">
          <div className="space-y-4">
            <Field label="Quantity note">
              <textarea rows={3} className={inputCls} value={q.quantityNote} onChange={(e) => update((d) => { d.quantityNote = e.target.value; })} />
            </Field>
            <Field label="Payment terms">
              <textarea rows={5} className={inputCls} value={q.paymentTerms} onChange={(e) => update((d) => { d.paymentTerms = e.target.value; })} />
            </Field>
            <Field label="Rate revision note">
              <textarea rows={4} className={inputCls} value={q.terms} onChange={(e) => update((d) => { d.terms = e.target.value; })} />
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
      </main>

      {/* Phone action bar: total and PDF actions always within thumb reach. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/10 px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Total</p>
            <p className="font-playfair text-primary text-lg leading-tight truncate">₹ {formatINR(total)}</p>
          </div>
          <button className={btnCls} onClick={preview} disabled={!!busy}>
            {previewLabel}
          </button>
          <button className={primaryBtnCls} onClick={download} disabled={!!busy}>
            {busy === "download" ? "Generating…" : "Download"}
          </button>
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
