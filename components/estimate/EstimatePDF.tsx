import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Estimate, Party, Section } from "@/lib/estimate/types";
import { amountInWords, costLabel, formatDate, formatINR, grandTotalOf, partyLabel } from "@/lib/estimate/utils";

// Noto includes the ₹ glyph, which the built-in PDF fonts lack.
export function registerFonts(origin: string) {
  Font.register({
    family: "Sans",
    fonts: [
      { src: `${origin}/fonts/NotoSans-Regular.ttf` },
      { src: `${origin}/fonts/NotoSans-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  Font.register({
    family: "Serif",
    fonts: [
      { src: `${origin}/fonts/NotoSerif-Regular.ttf` },
      { src: `${origin}/fonts/NotoSerif-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}

type Palette = Record<"ACCENT" | "DEEP" | "INK" | "MUTED" | "PAGE" | "COVER" | "COVER_TEXT" | "COVER_MUTED" | "BAND" | "LINE" | "TABLE_HEAD", string>;

const PALETTE: Palette = {
  ACCENT: "#a88a55",
  DEEP: "#5c4726",
  INK: "#26221c",
  MUTED: "#6f675b",
  PAGE: "#f8f3ea",
  COVER: "#14120f",
  COVER_TEXT: "#f8f3ea",
  COVER_MUTED: "#cbbf9f",
  BAND: "#14120f",
  LINE: "#d9ccb4",
  TABLE_HEAD: "#efe5d3",
};

const makeStyles = ({ ACCENT, DEEP, INK, MUTED, PAGE, COVER, COVER_TEXT, COVER_MUTED, BAND, LINE, TABLE_HEAD }: Palette) => StyleSheet.create({
  page: { backgroundColor: PAGE, fontFamily: "Sans", fontSize: 12, color: INK, paddingTop: 56, paddingBottom: 72, paddingHorizontal: 56 },
  frame: { position: "absolute", top: 24, left: 24, right: 24, bottom: 48, borderWidth: 0.8, borderColor: ACCENT, borderRadius: 22 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 22, flexDirection: "row", justifyContent: "space-between", fontSize: 9.5, color: MUTED },

  cover: { backgroundColor: COVER, color: COVER_TEXT, fontFamily: "Sans", padding: 0 },
  coverFrame: { position: "absolute", top: 28, left: 28, right: 28, bottom: 28, borderWidth: 0.8, borderColor: ACCENT, borderRadius: 26 },
  coverBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 72 },
  coverLogo: { width: 210, height: 160, objectFit: "contain", marginBottom: 28 },
  coverName: { fontFamily: "Serif", fontSize: 36, color: ACCENT, textAlign: "center" },
  coverTagline: { fontSize: 13, letterSpacing: 4, textTransform: "uppercase", color: COVER_MUTED, marginTop: 8 },
  coverRule: { width: 60, height: 1, backgroundColor: ACCENT, marginVertical: 30 },
  coverDoc: { fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: COVER_MUTED },
  coverClient: { fontFamily: "Serif", fontSize: 24, marginTop: 6, textAlign: "center" },
  coverEvent: { fontSize: 12, color: COVER_MUTED, marginTop: 10, textAlign: "center" },
  coverContact: { position: "absolute", left: 64, right: 64, bottom: 60, textAlign: "center", fontSize: 11, color: COVER_MUTED, lineHeight: 1.6 },

  menuTitle: { fontFamily: "Serif", fontWeight: "bold", fontSize: 26.5, color: DEEP, textAlign: "center", marginBottom: 18 },
  partyName: { fontFamily: "Serif", fontWeight: "bold", fontSize: 18, color: ACCENT, textAlign: "center" },
  partyMeta: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 3, marginBottom: 8 },
  sectionTitle: { fontFamily: "Serif", fontWeight: "bold", fontSize: 15, color: DEEP, marginTop: 14, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.6, borderBottomColor: LINE },
  items: { flexDirection: "row", flexWrap: "wrap" },
  item: { flexDirection: "row", paddingVertical: 2, paddingLeft: 10 },
  bullet: { width: 12, color: ACCENT },
  itemName: { flex: 1 },
  itemQty: { marginLeft: 8, color: DEEP, fontWeight: "bold" },

  band: { backgroundColor: BAND, marginHorizontal: -56, marginTop: -56, paddingHorizontal: 56, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  bandTitle: { color: ACCENT, fontSize: 21.5, letterSpacing: 8, textTransform: "uppercase" },
  bandLogo: { width: 62, height: 47, objectFit: "contain" },
  row: { flexDirection: "row" },
  companyName: { fontFamily: "Serif", fontWeight: "bold", fontSize: 15.5, color: DEEP, marginBottom: 3 },
  small: { fontSize: 11, color: MUTED, lineHeight: 1.45 },
  metaLabel: { fontSize: 9.5, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 12, fontWeight: "bold", color: DEEP, marginBottom: 6 },
  blockTitle: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: DEEP, paddingBottom: 4, marginBottom: 6, borderBottomWidth: 0.8, borderBottomColor: ACCENT },
  detailRow: { flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.4, borderBottomColor: LINE },
  detailLabel: { width: 84, color: MUTED, fontSize: 11 },
  detailValue: { flex: 1, fontSize: 11.5 },

  table: { marginTop: 16, borderWidth: 0.8, borderColor: ACCENT },
  th: { flexDirection: "row", backgroundColor: TABLE_HEAD, borderBottomWidth: 0.8, borderBottomColor: ACCENT },
  tr: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: LINE },
  cellDesc: { flex: 3, padding: 5, fontWeight: "bold" },
  cellRemarks: { flex: 2.4, padding: 5, borderLeftWidth: 0.4, borderLeftColor: LINE, color: MUTED },
  cellAmt: { width: 118, padding: 5, textAlign: "right", borderLeftWidth: 0.4, borderLeftColor: LINE },
  thText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: DEEP, fontWeight: "bold" },

  totals: { alignSelf: "flex-end", width: 300, marginTop: 10 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 0.8, borderTopColor: ACCENT },
  grandText: { fontSize: 15.5, fontWeight: "bold", color: DEEP },
  words: { textAlign: "right", fontWeight: "bold", color: DEEP, fontSize: 12, marginTop: 8 },

  notesTitle: { fontSize: 11, fontWeight: "bold", color: DEEP, marginTop: 10, marginBottom: 3 },
  sign: { width: 170, marginTop: 10, justifyContent: "flex-end", paddingLeft: 12, borderLeftWidth: 0.6, borderLeftColor: LINE },
});

const s = makeStyles(PALETTE);

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

const clean = (sections: Section[]) =>
  sections
    .map((sec) => ({ ...sec, items: sec.items.filter((i) => i.name.trim()) }))
    .filter((sec) => sec.items.length > 0);

const Footer = ({ q }: { q: Estimate }) => (
  <View style={s.footer} fixed>
    <Text>{[q.company.name, q.company.phone, q.company.website].filter(Boolean).join("  ·  ")}</Text>
    <Text render={({ pageNumber, totalPages }) => `${q.number}  ·  Page ${pageNumber} of ${totalPages}`} />
  </View>
);

// The party name is printed beside this, so a time or nature matching it would read twice.
const partySummary = ({ name, event: { date, time, venue, pax, nature } }: Party) => {
  const differsFromName = (value: string) => value.trim().toLowerCase() !== name.trim().toLowerCase();
  return [date && formatDate(date), differsFromName(time) && time, venue, pax && `${pax} Pax`, differsFromName(nature) && nature]
    .filter(Boolean)
    .join("  ·  ");
};

export function EstimateDocument({ q, logoSrc }: { q: Estimate; logoSrc: string }) {
  const hasManyParties = q.parties.length > 1;
  const { event } = q.parties[0];
  const total = grandTotalOf(q);
  const hasRemarks = q.costs.some((c) => c.remarks.trim());
  const eventLine = hasManyParties
    ? ""
    : [event.nature, event.date && formatDate(event.date), event.venue].filter(Boolean).join("  ·  ");
  const eventDetails: [string, string][] = hasManyParties
    ? q.parties.map((p, i) => [partyLabel(p, i), partySummary(p)])
    : [
        ["Date", formatDate(event.date)],
        ["Venue", event.venue],
        ["No. Pax", event.pax],
        ["Time", event.time],
        ["Nature", event.nature],
      ];

  return (
    <Document title={`${q.documentTitle} ${q.number} - ${q.client.name}`} author={q.company.name}>
      {q.showCover && (
        <Page size="A4" style={s.cover}>
          <View style={s.coverFrame} fixed />
          <View style={s.coverBody}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSrc} style={s.coverLogo} />
            {/* <Text style={s.coverName}>{q.company.name}</Text> */}
            {q.company.tagline ? <Text style={s.coverTagline}>{q.company.tagline}</Text> : null}
            <View style={s.coverRule} />
            <Text style={s.coverDoc}>{q.documentTitle} prepared for</Text>
            <Text style={s.coverClient}>{q.client.name || "—"}</Text>
            {eventLine ? <Text style={s.coverEvent}>{eventLine}</Text> : null}
          </View>
          <Text style={s.coverContact}>
            {q.company.address}
            {"\n"}
            {[q.company.phone, q.company.email, q.company.website].filter(Boolean).join("   |   ")}
          </Text>
        </Page>
      )}

      {q.parties.map((party, partyIndex) => {
        const sections = clean(party.sections);
        const summary = partySummary(party);
        if (sections.length === 0) return null;
        return (
        <Page key={party.id} size="A4" style={s.page}>
          <View style={s.frame} fixed />
          {q.menuTitle ? <Text style={s.menuTitle}>{q.menuTitle}</Text> : null}
          {hasManyParties ? <Text style={s.partyName}>{partyLabel(party, partyIndex)}</Text> : null}
          {hasManyParties && summary ? <Text style={s.partyMeta}>{summary}</Text> : null}
          {sections.map((sec) => {
            const rows = chunk(sec.items, sec.columns);
            const renderRow = (row: typeof sec.items, key: number) => (
              <View key={key} style={s.items} wrap={false}>
                {row.map((it) => (
                  <View key={it.id} style={[s.item, { width: sec.columns === 2 ? "50%" : "100%" }]}>
                    <Text style={s.bullet}>•</Text>
                    <Text style={s.itemName}>{it.name}</Text>
                    {it.qty ? <Text style={s.itemQty}>{it.qty}</Text> : null}
                  </View>
                ))}
              </View>
            );
            return (
              <View key={sec.id}>
                {/* Heading travels with its first row so it is never orphaned at a page end. */}
                <View wrap={false}>
                  <Text style={s.sectionTitle}>{sec.title}</Text>
                  {renderRow(rows[0], 0)}
                </View>
                {rows.slice(1).map((row, i) => renderRow(row, i + 1))}
              </View>
            );
          })}
          <Footer q={q} />
        </Page>
        );
      })}

      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <Text style={s.bandTitle}>{q.documentTitle}</Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoSrc} style={s.bandLogo} />
        </View>

        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View style={{ flex: 1, paddingRight: 20 }}>
            <Text style={s.companyName}>{q.company.name}</Text>
            <Text style={s.small}>{q.company.address}</Text>
            <Text style={s.small}>{[q.company.phone, q.company.website].filter(Boolean).join(" | ")}</Text>
            <Text style={s.small}>{q.company.email}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{formatDate(q.date)}</Text>
            <Text style={s.metaLabel}>{q.documentTitle} No.</Text>
            <Text style={s.metaValue}>{q.number}</Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 20 }]}>
          <View style={{ flex: 1, marginRight: 24 }}>
            <Text style={s.blockTitle}>Bill To</Text>
            <Text style={{ fontWeight: "bold", fontSize: 12.5 }}>{q.client.name}</Text>
            {q.client.phone ? <Text style={s.small}>{q.client.phone}</Text> : null}
            {q.client.address ? <Text style={s.small}>{q.client.address}</Text> : null}
          </View>
          <View style={{ flex: 1.2 }}>
            <Text style={s.blockTitle}>Event Details</Text>
            {eventDetails
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <View key={label} style={s.detailRow}>
                  <Text style={s.detailLabel}>{label}</Text>
                  <Text style={s.detailValue}>{value}</Text>
                </View>
              ))}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.cellDesc, s.thText]}>Description</Text>
            {hasRemarks ? <Text style={[s.cellRemarks, s.thText]}>Remarks</Text> : null}
            <Text style={[s.cellAmt, s.thText]}>Total (₹)</Text>
          </View>
          {q.costs.map((c, i) => (
            <View key={c.id} style={[s.tr, i === q.costs.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
              <Text style={s.cellDesc}>{costLabel(q, c)}</Text>
              {hasRemarks ? <Text style={s.cellRemarks}>{c.remarks}</Text> : null}
              <Text style={s.cellAmt}>{formatINR(Number(c.amount) || 0)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.grand}>
            <Text style={s.grandText}>{q.documentTitle} Total</Text>
            <Text style={s.grandText}>₹ {formatINR(total)}</Text>
          </View>
        </View>
        <Text style={s.words}>{amountInWords(total)}</Text>

        {q.quantityNote ? <Text style={[s.small, { marginTop: 14 }]}>** {q.quantityNote} **</Text> : null}
        <View style={s.row}>
          <View style={{ flex: 1, paddingRight: 24 }}>
            {q.paymentTerms ? (
              <View wrap={false}>
                <Text style={s.notesTitle}>Payment Terms</Text>
                <Text style={s.small}>{q.paymentTerms}</Text>
              </View>
            ) : null}
            {q.terms ? (
              <View wrap={false}>
                <Text style={s.notesTitle}>Terms & Conditions</Text>
                <Text style={s.small}>{q.terms}</Text>
              </View>
            ) : null}
            {q.wasteTerms ? (
              <View wrap={false}>
                <Text style={s.notesTitle}>Waste Management</Text>
                <Text style={s.small}>{q.wasteTerms}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.sign} wrap={false}>
            <Text style={{ fontSize: 11.5 }}>For {q.company.name},</Text>
            <View style={{ height: 30 }} />
            {q.signatory.name ? <Text style={{ fontWeight: "bold" }}>{q.signatory.name}</Text> : null}
            {q.signatory.title ? <Text style={s.small}>{q.signatory.title}</Text> : null}
            {q.signatory.contact ? <Text style={s.small}>{q.signatory.contact}</Text> : null}
          </View>
        </View>
        <Footer q={q} />
      </Page>
    </Document>
  );
}

// Loaded on demand from the editor so react-pdf never touches the server bundle.
export async function renderEstimatePdf(q: Estimate): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  const origin = window.location.origin;
  registerFonts(origin);
  return pdf(<EstimateDocument q={q} logoSrc={`${origin}/images/adco-logo.png`} />).toBlob();
}

// A4 at 2.5x is about 1490 x 2105 px: sharp on phones and still quick to share.
const IMAGE_SCALE = 2.5;

// One PNG per page, so images always match the PDF layout and pagination.
export async function renderEstimateImages(q: Estimate, pdfBlob?: Blob): Promise<Blob[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();

  const data = await (pdfBlob ?? (await renderEstimatePdf(q))).arrayBuffer();
  const task = pdfjs.getDocument({ data });
  try {
    const doc = await task.promise;
    const images: Blob[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: IMAGE_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      page.cleanup();
      images.push(
        await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode page image"))), "image/png"),
        ),
      );
    }
    return images;
  } finally {
    await task.destroy();
  }
}
