import type { Estimate, EventDetails, Party, Section } from "./types";
import { DISH_CATEGORIES } from "./dishes";
import { uid } from "./utils";

const section = (title: string, items: string[], columns: 1 | 2 = 1): Section => ({
  id: uid(),
  title,
  columns,
  items: items.map((name) => ({ id: uid(), name, qty: "" })),
});

const SERVICE_UTENSILS_TITLE = "Service Utensils";

// Shown first in the section. Nothing is ticked until staff choose it.
const MAIN_SERVICE_UTENSILS = [
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
const OPTIONAL_SERVICE_UTENSILS = [
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

// The tick-box choices offered for a section, matched by its title.
export const choicesFor = (sectionTitle: string): string[] => {
  const title = normalize(sectionTitle);
  if (title === normalize(SERVICE_UTENSILS_TITLE)) return alphabetical(MAIN_SERVICE_UTENSILS);
  return alphabetical(DISH_CATEGORIES.find((c) => normalize(c.title) === title)?.dishes ?? []);
};

// Less common choices, kept out of sight until staff ask for the full list.
export const moreChoicesFor = (sectionTitle: string): string[] => {
  if (normalize(sectionTitle) !== normalize(SERVICE_UTENSILS_TITLE)) return [];
  const main = new Set(MAIN_SERVICE_UTENSILS.map(normalize));
  return alphabetical(OPTIONAL_SERVICE_UTENSILS.filter((name) => !main.has(normalize(name))));
};

// Everything starts unticked so staff only pick what this client ordered.
const buildDefaultSections = (): Section[] => [
  ...DISH_CATEGORIES.map((c) => section(c.title, [])),
  section(SERVICE_UTENSILS_TITLE, [], 2),
];

export interface MenuChoice {
  section: string;
  name: string;
}

// Finds choices across every section. Each typed word can match anywhere in the name.
export const searchChoices = (query: string): MenuChoice[] => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return [...DISH_CATEGORIES.map((c) => c.title), SERVICE_UTENSILS_TITLE]
    .flatMap((section) => [...choicesFor(section), ...moreChoicesFor(section)].map((name) => ({ section, name })))
    .filter(({ name }) => words.every((word) => name.toLowerCase().includes(word)))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }));
};

export const createParty = (event: Partial<EventDetails> = {}): Party => ({
  id: uid(),
  name: "",
  event: { date: "", venue: "", pax: "", time: "", nature: "", ...event },
  sections: buildDefaultSections(),
});

const templateFor = (party: Party): Estimate => ({
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
    { id: uid(), description: "Total Food Cost", remarks: "", amount: 0, partyId: party.id },
    { id: uid(), description: "Disposables", remarks: "", amount: 0 },
    { id: uid(), description: "Service Cost", remarks: "", amount: 0 },
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
export const buildDefaultTemplate = (): Estimate => templateFor(createParty());
