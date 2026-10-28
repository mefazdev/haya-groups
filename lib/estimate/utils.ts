import type { Estimate } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const subtotalOf = (q: Estimate) =>
  q.costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

export const taxOf = (q: Estimate) =>
  Math.round(subtotalOf(q) * (Number(q.taxPercent) || 0)) / 100;

export const grandTotalOf = (q: Estimate) =>
  subtotalOf(q) + (q.addTaxToTotal ? taxOf(q) : 0);

export const formatINR = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "2026-10-31" -> "31/10/2026"
export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowHundred = (n: number) =>
  n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");

const belowThousand = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? ONES[h] + " Hundred" : "", r ? belowHundred(r) : ""].filter(Boolean).join(" ");
};

// Indian numbering system: crore, lakh, thousand
export function amountInWords(amount: number): string {
  let rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7);
  rupees %= 1e7;
  const lakh = Math.floor(rupees / 1e5);
  rupees %= 1e5;
  const thousand = Math.floor(rupees / 1e3);
  rupees %= 1e3;

  if (crore) parts.push(`${crore > 999 ? amountInWords(crore).replace(" Rupees Only", "") : belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} ${lakh === 1 ? "Lakh" : "Lakhs"}`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rupees) parts.push(belowThousand(rupees));

  let words = parts.join(" ");
  words = words ? `${words} ${words === "One" ? "Rupee" : "Rupees"}` : "";
  if (paise) words += `${words ? " and " : ""}${belowHundred(paise)} Paise`;
  return `${words} Only`;
}
