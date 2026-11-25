import type {
  Estimate,
  EventDetails,
  MenuCategoryRecord,
  Party,
  Section,
} from "./types";
import { DISH_CATEGORIES } from "./dishes";
import { copySections, uid } from "./utils";

const section = (title: string, items: string[], columns: 1 | 2 = 1): Section => ({
  id: uid(),
  title,
  columns,
  items: items.map((name) => ({ id: uid(), name, qty: "" })),
});

export const SERVICE_UTENSILS_TITLE = "Service Utensils";

// Shown first in the section. Nothing is ticked until staff choose it.
export const MAIN_SERVICE_UTENSILS = [
  "Live Juice Counter",
  "Quality Juice Glass",
  "Live Tea Counter",
  "Islamic Buffet",
  "Dessert Settings",
  "Dishes",
  "Salad Bowl",
  "Ceramic Plates",
  "Service Boys",
  "Hosting Boys",
  "Hosting Girls",
  "All Accessories for Serving",
];

// Less common items, listed separately.
export const OPTIONAL_SERVICE_UTENSILS = [
  "Metal Counter LaCasa",
  "Back Drop Antique",
  "Metal Counter Neon",
  "Metal Counter Neon Break",
  "Metal Plate Ladder Square",
  "Bicycle Tea Counter Full Set",
  "Salad Bar Elements",
  "Gold Flower Stand",
  "Table Flower Large",
  "Table Set",
  "Extra Chair Cushion",
  "Normal Clothing",
  "Napkin",
  "High Glass",
  "Juice Glass",
  "Polymer Jug",
  "Glass Jug",
  "Service Tray",
  "Wood Service Tray",
  "Starter Tray Steel Crown",
  "Coffee Cup",
  "Premium Ceramic Plate",
  "Print Plate Small",
  "Ceramic Plate",
  "Premium Arch Dish",
  "Steel Basin",
  "Steel Bucket + Kayil",
  "Bread Basket Gold",
  "Variety Glass Bowl",
  "Round Tray Steel",
  "Oval Plate + Cutter",
  "Curry Bowl + Cutter",
  "Half Plate",
  "Salad Bowl",
  "Dessert Plate + Spoon",
  "Steel Spoon Dessert",
  "Steel Spoon Small",
  "Steel Spoon Medium",
  "Steel Spoon Long",
  "Steel Spoon Large",
  "Gold Spoon",
  "Gold Fork",
  "Steel Spoon Stand",
  "CD Cutter",
  "Plucker",
  "Scooper",
  "Ice Cream Dispenser",
  "Waste Bucket",
  "Wax",
  "Juice Machine",
  "Juice Maker",
  "Glass Wash Basin",
  "Tea Maker",
];

const normalize = (text: string) => text.trim().toLowerCase();

const alphabetical = (items: string[]) =>
  [...new Set(items)].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true }));

/** Default catalog derived from the static dish & utensil lists, used as DB seed and fallback. */
export const buildDefaultCatalog = (): MenuCategoryRecord[] => {
  const dishCats: MenuCategoryRecord[] = DISH_CATEGORIES.map((c, idx) => {
    const categoryId = `cat_dish_${idx + 1}`;
    return {
      id: categoryId,
      title: c.title,
      kind: "dish",
      columns: 1,
      sortOrder: idx,
      items: alphabetical(c.dishes).map((name, i) => ({
        id: `${categoryId}_item_${i + 1}`,
        categoryId,
        name,
        isOptional: false,
        sortOrder: i,
      })),
    };
  });

  const mainSet = new Set(MAIN_SERVICE_UTENSILS.map(normalize));
  const optionalClean = alphabetical(OPTIONAL_SERVICE_UTENSILS.filter((n) => !mainSet.has(normalize(n))));
  const utensilId = "cat_utensils";
  const utensilCat: MenuCategoryRecord = {
    id: utensilId,
    title: SERVICE_UTENSILS_TITLE,
    kind: "utensil",
    columns: 2,
    sortOrder: dishCats.length,
    items: [
      ...alphabetical(MAIN_SERVICE_UTENSILS).map((name, i) => ({
        id: `${utensilId}_main_${i + 1}`,
        categoryId: utensilId,
        name,
        isOptional: false,
        sortOrder: i,
      })),
      ...optionalClean.map((name, i) => ({
        id: `${utensilId}_opt_${i + 1}`,
        categoryId: utensilId,
        name,
        isOptional: true,
        sortOrder: MAIN_SERVICE_UTENSILS.length + i,
      })),
    ],
  };

  return [...dishCats, utensilCat];
};

const findCategory = (catalog: MenuCategoryRecord[], sectionTitle: string) => {
  const title = normalize(sectionTitle);
  return catalog.find((c) => normalize(c.title) === title);
};

// The tick-box choices offered for a section, matched by its title.
export const choicesFor = (sectionTitle: string, catalog?: MenuCategoryRecord[]): string[] => {
  if (catalog && catalog.length > 0) {
    const cat = findCategory(catalog, sectionTitle);
    return alphabetical((cat?.items ?? []).filter((it) => !it.isOptional).map((it) => it.name));
  }
  const title = normalize(sectionTitle);
  if (title === normalize(SERVICE_UTENSILS_TITLE)) return alphabetical(MAIN_SERVICE_UTENSILS);
  return alphabetical(DISH_CATEGORIES.find((c) => normalize(c.title) === title)?.dishes ?? []);
};

// Less common choices, kept out of sight until staff ask for the full list.
export const moreChoicesFor = (sectionTitle: string, catalog?: MenuCategoryRecord[]): string[] => {
  if (catalog && catalog.length > 0) {
    const cat = findCategory(catalog, sectionTitle);
    const main = new Set((cat?.items ?? []).filter((it) => !it.isOptional).map((it) => normalize(it.name)));
    return alphabetical((cat?.items ?? []).filter((it) => it.isOptional && !main.has(normalize(it.name))).map((it) => it.name));
  }
  if (normalize(sectionTitle) !== normalize(SERVICE_UTENSILS_TITLE)) return [];
  const main = new Set(MAIN_SERVICE_UTENSILS.map(normalize));
  return alphabetical(OPTIONAL_SERVICE_UTENSILS.filter((name) => !main.has(normalize(name))));
};

// Everything starts unticked so staff only pick what this client ordered.
const buildDefaultSections = (catalog?: MenuCategoryRecord[]): Section[] => {
  if (catalog && catalog.length > 0) {
    return catalog.map((c) => section(c.title, [], c.columns));
  }
  return [
    ...DISH_CATEGORIES.map((c) => section(c.title, [])),
    section(SERVICE_UTENSILS_TITLE, [], 2),
  ];
};

export interface MenuChoice {
  section: string;
  name: string;
}

// Finds choices across every section. Each typed word can match anywhere in the name.
export const searchChoices = (query: string, catalog?: MenuCategoryRecord[]): MenuChoice[] => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const sectionTitles =
    catalog && catalog.length > 0
      ? catalog.map((c) => c.title)
      : [...DISH_CATEGORIES.map((c) => c.title), SERVICE_UTENSILS_TITLE];

  return sectionTitles
    .flatMap((sec) => [...choicesFor(sec, catalog), ...moreChoicesFor(sec, catalog)].map((name) => ({ section: sec, name })))
    .filter(({ name }) => words.every((word) => name.toLowerCase().includes(word)))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }));
};

export const createParty = (event: Partial<EventDetails> = {}, catalog?: MenuCategoryRecord[]): Party => ({
  id: uid(),
  name: "",
  event: { date: "", venue: "", pax: "", time: "", nature: "", ...event },
  sections: buildDefaultSections(catalog),
});

export const templateFor = (party: Party): Estimate => ({
  id: "template",
  number: "",
  date: "",
  documentTitle: "Estimate",
  company: {
    name: "Adco Caterers",
    tagline: "",
    address: "Parappanangadi, Malappuram, Kerala",
    phone: "+91 9061100440, +91 8281806614",
    email: "adcocaterers@gmail.com",
    website: "",
  },
  client: { name: "", phone: "", address: "" },
  parties: [party],
  showCover: true,
  menuTitle: "Menu Prospectus",
  costs: [
    { id: uid(), description: "Total Food Cost", amount: 0, partyId: party.id },
    { id: uid(), description: "Disposables", amount: 0 },
    { id: uid(), description: "Service Cost", amount: 0 },
  ],
  quantityNote:
    "Please note that the food quantity is based on standard serving sizes and trends. The quantity is calculated for the total number of persons mentioned, considering all food items together.",
  paymentTerms:
    "First Stage: A prepayment of 20% of the quoted amount will be required upon confirming the contract.\nSecond Stage: 70% of the quoted amount will be paid five days prior to the event.\nThird Stage: The balance of 10% of the quoted amount will be paid after the event.",
  terms:
    "The above rates are based on the current prevailing market rates at the time of preparing this proposal. In the event of any significant or drastic increase in the cost of raw materials, fuel, labour, transportation, or other operational expenses, the quoted rates may be subject to revision accordingly.\nThe client is responsible for arranging tables, chairs, water, electricity and the venue before catering activities begin.\nAny extra food or add-on items for additional guests, at the client's request, will be charged extra accordingly.",
  wasteTerms:
    "Disposal of leftover food, other waste and auditorium waste is the client's responsibility.",
  signatory: {
    name: "",
    title: "Sales & Events",
    contact: "+91 9061100440, +91 8281806614",
  },
  updatedAt: 0,
});

// Starting point for every new estimate.
export const buildDefaultTemplate = (catalog?: MenuCategoryRecord[]): Estimate =>
  templateFor(createParty({}, catalog));

export type StoredEstimate = Omit<Estimate, "parties" | "wasteTerms"> & {
  parties?: Party[];
  wasteTerms?: string;
  event?: EventDetails;
  sections?: Section[];
};

// Older estimates hold one event and menu directly, which becomes their only party.
export const upgradeEstimate = ({ event, sections, parties, wasteTerms = "", ...stored }: StoredEstimate): Estimate => {
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

// Fresh ids so edits to the copy never collide with the source.
export const reIdEstimate = (q: Estimate): Estimate => {
  const partyIds = new Map(q.parties.map((p) => [p.id, uid()]));
  return {
    ...q,
    parties: q.parties.map((p) => ({ ...p, id: partyIds.get(p.id) ?? uid(), sections: copySections(p.sections) })),
    costs: q.costs.map((c) => ({ ...c, id: uid(), partyId: c.partyId && partyIds.get(c.partyId) })),
  };
};

export const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
