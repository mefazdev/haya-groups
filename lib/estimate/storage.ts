import type { Estimate, EventDetails, Party, Section } from "./types";
import { buildDefaultTemplate } from "./defaults";
import { copySections, uid } from "./utils";

// Estimates are kept in the browser's localStorage, so they stay on this device only.
const LIST_KEY = "haya.quotations.v1";
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

type StoredEstimate = Omit<Estimate, "parties" | "wasteTerms"> & {
  parties?: Party[];
  wasteTerms?: string;
  event?: EventDetails;
  sections?: Section[];
};

// Older estimates hold one event and menu directly, which becomes their only party.
const upgradeEstimate = ({ event, sections, parties, wasteTerms = "", ...stored }: StoredEstimate): Estimate => {
  const rest = { ...stored, wasteTerms };
  if (parties) return { ...rest, parties };
  const party: Party = {
    id: uid(),
    name: "",
    event: event ?? { date: "", venue: "", pax: "", time: "", nature: "" },
    sections: sections ?? [],
  };
  const foodCost = rest.costs.find((c) => /food/i.test(c.description));
  return { ...rest, parties: [party], costs: rest.costs.map((c) => (c === foodCost ? { ...c, partyId: party.id } : c)) };
};

export const loadEstimates = (): Estimate[] =>
  read<StoredEstimate[]>(LIST_KEY, []).map(upgradeEstimate).sort((a, b) => b.updatedAt - a.updatedAt);

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

const nextNumber = () => {
  const n = read<number>(COUNTER_KEY, 0) + 1;
  write(COUNTER_KEY, n);
  return `ADCO-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
};

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Fresh ids so edits to the copy never collide with the source.
const reId = (q: Estimate): Estimate => {
  const partyIds = new Map(q.parties.map((p) => [p.id, uid()]));
  return {
    ...q,
    parties: q.parties.map((p) => ({ ...p, id: partyIds.get(p.id) ?? uid(), sections: copySections(p.sections) })),
    costs: q.costs.map((c) => ({ ...c, id: uid(), partyId: c.partyId && partyIds.get(c.partyId) })),
  };
};

export const createFromTemplate = (): Estimate => ({
  ...buildDefaultTemplate(),
  id: uid(),
  number: nextNumber(),
  date: today(),
  updatedAt: Date.now(),
});

export const duplicateEstimate = (q: Estimate): Estimate => ({
  ...reId(structuredClone(q)),
  id: uid(),
  number: nextNumber(),
  date: today(),
  updatedAt: Date.now(),
});
