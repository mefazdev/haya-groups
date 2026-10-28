export interface LineItem {
  id: string;
  name: string;
  qty: string;
}

export interface Section {
  id: string;
  title: string;
  columns: 1 | 2;
  items: LineItem[];
}

export interface CostRow {
  id: string;
  description: string;
  remarks: string;
  amount: number;
}

export interface Estimate {
  id: string;
  number: string;
  date: string;
  documentTitle: string;
  company: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  client: {
    name: string;
    phone: string;
    address: string;
  };
  event: {
    date: string;
    venue: string;
    pax: string;
    time: string;
    nature: string;
  };
  showCover: boolean;
  menuTitle: string;
  sections: Section[];
  costs: CostRow[];
  taxPercent: number;
  addTaxToTotal: boolean;
  quantityNote: string;
  paymentTerms: string;
  terms: string;
  signatory: {
    name: string;
    title: string;
    contact: string;
  };
  updatedAt: number;
}
