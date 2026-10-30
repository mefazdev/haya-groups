import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Estimate } from "@/lib/estimate/types";
import { amountInWords, formatDate, formatINR, grandTotalOf, subtotalOf, taxOf } from "@/lib/estimate/utils";

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

const GOLD = "#a88a55";
const DEEP = "#5c4726";
const INK = "#26221c";
const MUTED = "#6f675b";
const CREAM = "#f8f3ea";
const DARK = "#14120f";
const LINE = "#d9ccb4";

const s = StyleSheet.create({
  page: { backgroundColor: CREAM, fontFamily: "Sans", fontSize: 10, color: INK, paddingTop: 56, paddingBottom: 72, paddingHorizontal: 64 },
  frame: { position: "absolute", top: 24, left: 24, right: 24, bottom: 48, borderWidth: 0.8, borderColor: GOLD, borderRadius: 22 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 22, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },

  cover: { backgroundColor: DARK, color: CREAM, fontFamily: "Sans", padding: 0 },
  coverFrame: { position: "absolute", top: 28, left: 28, right: 28, bottom: 28, borderWidth: 0.8, borderColor: GOLD, borderRadius: 26 },
  coverBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 72 },
  coverLogo: { width: 210, height: 160, objectFit: "contain", marginBottom: 28 },
  coverName: { fontFamily: "Serif", fontSize: 30, color: GOLD, textAlign: "center" },
  coverTagline: { fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#cbbf9f", marginTop: 8 },
  coverRule: { width: 60, height: 1, backgroundColor: GOLD, marginVertical: 30 },
  coverDoc: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#cbbf9f" },
  coverClient: { fontFamily: "Serif", fontSize: 20, marginTop: 6, textAlign: "center" },
  coverEvent: { fontSize: 10, color: "#cbbf9f", marginTop: 10, textAlign: "center" },
  coverContact: { position: "absolute", left: 64, right: 64, bottom: 60, textAlign: "center", fontSize: 9, color: "#cbbf9f", lineHeight: 1.6 },

  menuTitle: { fontFamily: "Serif", fontWeight: "bold", fontSize: 22, color: DEEP, textAlign: "center", marginBottom: 18 },
  sectionTitle: { fontFamily: "Serif", fontWeight: "bold", fontSize: 12.5, color: DEEP, marginTop: 14, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.6, borderBottomColor: LINE },
  items: { flexDirection: "row", flexWrap: "wrap" },
  item: { flexDirection: "row", paddingVertical: 2, paddingLeft: 10 },
  bullet: { width: 10, color: GOLD },
  itemName: { flex: 1 },
  itemQty: { marginLeft: 8, color: DEEP, fontWeight: "bold" },

  band: { backgroundColor: DARK, marginHorizontal: -64, marginTop: -56, paddingHorizontal: 64, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  bandTitle: { color: GOLD, fontSize: 18, letterSpacing: 8, textTransform: "uppercase" },
  bandLogo: { width: 62, height: 47, objectFit: "contain" },
  row: { flexDirection: "row" },
  companyName: { fontFamily: "Serif", fontWeight: "bold", fontSize: 13, color: DEEP, marginBottom: 3 },
  small: { fontSize: 9, color: MUTED, lineHeight: 1.45 },
  metaLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  metaValue: { fontSize: 10, fontWeight: "bold", color: DEEP, marginBottom: 6 },
  blockTitle: { fontSize: 8.5, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, color: DEEP, paddingBottom: 4, marginBottom: 6, borderBottomWidth: 0.8, borderBottomColor: GOLD },
  detailRow: { flexDirection: "row", paddingVertical: 2, borderBottomWidth: 0.4, borderBottomColor: LINE },
  detailLabel: { width: 70, color: MUTED, fontSize: 9 },
  detailValue: { flex: 1, fontSize: 9.5 },

  table: { marginTop: 16, borderWidth: 0.8, borderColor: GOLD },
  th: { flexDirection: "row", backgroundColor: "#efe5d3", borderBottomWidth: 0.8, borderBottomColor: GOLD },
  tr: { flexDirection: "row", borderBottomWidth: 0.4, borderBottomColor: LINE },
  cellDesc: { flex: 3, padding: 5, fontWeight: "bold" },
  cellRemarks: { flex: 2.4, padding: 5, borderLeftWidth: 0.4, borderLeftColor: LINE, color: MUTED },
  cellAmt: { width: 100, padding: 5, textAlign: "right", borderLeftWidth: 0.4, borderLeftColor: LINE },
  thText: { fontSize: 8.5, textTransform: "uppercase", letterSpacing: 1, color: DEEP, fontWeight: "bold" },

  totals: { alignSelf: "flex-end", width: 250, marginTop: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, fontSize: 9.5 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 0.8, borderTopColor: GOLD },
  grandText: { fontSize: 13, fontWeight: "bold", color: DEEP },
  words: { textAlign: "right", fontWeight: "bold", color: DEEP, fontSize: 10, marginTop: 8 },
  taxNote: { textAlign: "right", fontWeight: "bold", color: "#8a3b2a", fontSize: 9, marginTop: 6 },

  notesTitle: { fontSize: 9, fontWeight: "bold", color: DEEP, marginTop: 10, marginBottom: 3 },
  sign: { width: 175, marginTop: 10, justifyContent: "flex-end", paddingLeft: 12, borderLeftWidth: 0.6, borderLeftColor: LINE },
});

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

const clean = (q: Estimate) =>
  q.sections
    .map((sec) => ({ ...sec, items: sec.items.filter((i) => i.name.trim()) }))
    .filter((sec) => sec.items.length > 0);

const Footer = ({ q }: { q: Estimate }) => (
  <View style={s.footer} fixed>
    <Text>{[q.company.name, q.company.phone, q.company.website].filter(Boolean).join("  ·  ")}</Text>
    <Text render={({ pageNumber, totalPages }) => `${q.number}  ·  Page ${pageNumber} of ${totalPages}`} />
  </View>
);

export function EstimateDocument({ q, logoSrc }: { q: Estimate; logoSrc: string }) {
  const sections = clean(q);
  const subtotal = subtotalOf(q);
  const tax = taxOf(q);
  const total = grandTotalOf(q);
  const hasRemarks = q.costs.some((c) => c.remarks.trim());
  const eventLine = [q.event.nature, q.event.date && formatDate(q.event.date), q.event.venue].filter(Boolean).join("  ·  ");
  const eventDetails: [string, string][] = [
    ["Date", formatDate(q.event.date)],
    ["Venue", q.event.venue],
    ["No. Pax", q.event.pax],
    ["Time", q.event.time],
    ["Nature", q.event.nature],
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

      {sections.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.frame} fixed />
          {q.menuTitle ? <Text style={s.menuTitle}>{q.menuTitle}</Text> : null}
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
      )}

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
            <Text style={{ fontWeight: "bold", fontSize: 10.5 }}>{q.client.name}</Text>
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
              <Text style={s.cellDesc}>{c.description}</Text>
              {hasRemarks ? <Text style={s.cellRemarks}>{c.remarks}</Text> : null}
              <Text style={s.cellAmt}>{formatINR(Number(c.amount) || 0)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text style={{ color: MUTED }}>Subtotal</Text>
            <Text>{formatINR(subtotal)}</Text>
          </View>
          {q.addTaxToTotal && q.taxPercent > 0 ? (
            <View style={s.totalRow}>
              <Text style={{ color: MUTED }}>GST ({q.taxPercent}%)</Text>
              <Text>{formatINR(tax)}</Text>
            </View>
          ) : null}
          <View style={s.grand}>
            <Text style={s.grandText}>{q.documentTitle} Total</Text>
            <Text style={s.grandText}>₹ {formatINR(total)}</Text>
          </View>
        </View>
        <Text style={s.words}>{amountInWords(total)}</Text>
        {!q.addTaxToTotal && q.taxPercent > 0 ? (
          <Text style={s.taxNote}>NOTE: {q.taxPercent}% GST will be charged extra on the total amount.</Text>
        ) : null}

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
                <Text style={s.notesTitle}>Note</Text>
                <Text style={s.small}>{q.terms}</Text>
              </View>
            ) : null}
          </View>
          <View style={s.sign} wrap={false}>
            <Text style={{ fontSize: 9.5 }}>For {q.company.name},</Text>
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
