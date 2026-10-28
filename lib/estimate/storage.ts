import type { Estimate } from "./types";
import { buildDefaultTemplate } from "./defaults";
import { uid } from "./utils";

// Estimates are kept in the browser's localStorage, so they stay on this device only.
const LIST_KEY = "haya.quotations.v1";
const TEMPLATE_KEY = "haya.quotationTemplate.v1";
const COUNTER_KEY = "haya.quotationCounter.v1";

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadEstimates = (): Estimate[] =>
  read<Estimate[]>(LIST_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);

export const saveEstimate = (q: Estimate) => {
  const list = read<Estimate[]>(LIST_KEY, []);
  const i = list.findIndex((x) => x.id === q.id);
  if (i >= 0) list[i] = q;
  else list.push(q);
  write(LIST_KEY, list);
};

export const deleteEstimate = (id: string) => {
  write(LIST_KEY, read<Estimate[]>(LIST_KEY, []).filter((q) => q.id !== id));
};

export const loadTemplate = (): Estimate => read<Estimate | null>(TEMPLATE_KEY, null) ?? buildDefaultTemplate();

export const saveTemplate = (q: Estimate) => write(TEMPLATE_KEY, { ...q, id: "template" });

export const resetTemplate = () => localStorage.removeItem(TEMPLATE_KEY);

const nextNumber = () => {
  const n = read<number>(COUNTER_KEY, 0) + 1;
  write(COUNTER_KEY, n);
  return `HAYA-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
};

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Fresh ids so edits to the copy never collide with the source.
const reId = (q: Estimate): Estimate => ({
  ...q,
  sections: q.sections.map((s) => ({ ...s, id: uid(), items: s.items.map((it) => ({ ...it, id: uid() })) })),
  costs: q.costs.map((c) => ({ ...c, id: uid() })),
});

export const createFromTemplate = (): Estimate => {
  const t = structuredClone(loadTemplate());
  return {
    ...reId(t),
    id: uid(),
    number: nextNumber(),
    date: today(),
    client: { name: "", phone: "", address: "" },
    updatedAt: Date.now(),
  };
};

export const duplicateEstimate = (q: Estimate): Estimate => ({
  ...reId(structuredClone(q)),
  id: uid(),
  number: nextNumber(),
  date: today(),
  updatedAt: Date.now(),
});
