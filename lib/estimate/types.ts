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
  // Set on a party's food cost row. Rows without it are shared by the whole estimate.
  partyId?: string;
}

export interface EventDetails {
  date: string;
  venue: string;
  pax: string;
  time: string;
  nature: string;
}

// One sitting of the event, such as "Night" or "Convention", with its own menu.
export interface Party {
  id: string;
  name: string;
  event: EventDetails;
  sections: Section[];
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
  parties: Party[];
  showCover: boolean;
  menuTitle: string;
  costs: CostRow[];
  quantityNote: string;
  paymentTerms: string;
  terms: string;
  wasteTerms: string;
  signatory: {
    name: string;
    title: string;
    contact: string;
  };
  updatedAt: number;
}
