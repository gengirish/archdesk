"use client";

import type { Client, Firm, Invoice, Milestone, Project } from "@prisma/client";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInWordsINR } from "@/lib/amount-in-words";
import { formatDate } from "@/lib/utils";
import type { GstSplit } from "@/lib/gst";

export type InvoicePdfPayload = {
  invoice: Invoice;
  gst: GstSplit;
  firm: Firm;
  client: Client;
  project: Omit<Project, "clientToken">;
  milestone: Milestone;
};

const FALLBACK_ACCENT = "#E8A045";

function safeColor(value?: string | null): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : FALLBACK_ACCENT;
}

function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const fmtRate = (r: number) => (Number.isInteger(r) ? String(r) : r.toFixed(1));

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 2,
    paddingBottom: 12,
  },
  firmBlock: { flexDirection: "row", gap: 10, maxWidth: "62%" },
  logo: { width: 48, height: 48, objectFit: "contain" },
  firmName: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  firmMeta: { fontSize: 9, color: "#333", marginBottom: 2 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  titleSub: { fontSize: 9, marginTop: 4, textAlign: "right" },
  twoCol: { flexDirection: "row", gap: 24, marginBottom: 14 },
  col: { flex: 1 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: { marginBottom: 3, fontSize: 9 },
  table: { marginTop: 4, borderWidth: 1, borderColor: "#ccc" },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f3f3f3",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  totalRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#fafafa" },
  colLabel: { flex: 3, fontSize: 9 },
  colValue: { flex: 1, fontSize: 9, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  wordsBox: { marginTop: 12, padding: 10, backgroundColor: "#f7f7f7", borderLeftWidth: 3 },
  wordsText: { fontSize: 9, lineHeight: 1.4 },
  footer: { marginTop: 28, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#ddd", fontSize: 8, color: "#555" },
  signature: { marginTop: 36, alignItems: "flex-end", fontSize: 9 },
});

export function InvoicePdfDocument({ invoice, gst, firm, client, project, milestone }: InvoicePdfPayload) {
  const accent = safeColor(firm.brandColor);
  const firmAddress = [firm.address, [firm.city, firm.state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(", ");
  const clientAddress = [client.address, client.city, client.state].filter(Boolean).join(", ");
  const half = gst.gstPercent / 2;

  return (
    <Document title={`Invoice ${invoice.invoiceNo}`} author={firm.name}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.headerRow, { borderBottomColor: accent }]}>
          <View style={styles.firmBlock}>
            {firm.logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
              <Image src={firm.logo} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.firmName}>{firm.name}</Text>
              {firmAddress ? <Text style={styles.firmMeta}>{firmAddress}</Text> : null}
              {firm.gstNumber ? <Text style={styles.firmMeta}>GSTIN: {firm.gstNumber}</Text> : null}
              <Text style={styles.firmMeta}>
                {[firm.phone, firm.email].filter((v) => v && v !== "—").join(" · ")}
              </Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: accent }]}>TAX INVOICE</Text>
            <Text style={styles.titleSub}>Invoice No: {invoice.invoiceNo}</Text>
            <Text style={styles.titleSub}>Date: {formatDate(invoice.createdAt)}</Text>
            {milestone.dueDate ? <Text style={styles.titleSub}>Due: {formatDate(milestone.dueDate)}</Text> : null}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[styles.sectionTitle, { color: accent }]}>Bill to</Text>
            <Text style={[styles.row, styles.bold]}>{client.name}</Text>
            {clientAddress ? <Text style={styles.row}>{clientAddress}</Text> : null}
            <Text style={styles.row}>{client.phone}</Text>
            {client.email ? <Text style={styles.row}>{client.email}</Text> : null}
          </View>
          <View style={styles.col}>
            <Text style={[styles.sectionTitle, { color: accent }]}>Project</Text>
            <Text style={styles.row}>{project.name}</Text>
            {project.location ? <Text style={styles.row}>{project.location}</Text> : null}
            {gst.placeOfSupply ? <Text style={styles.row}>Place of supply: {gst.placeOfSupply}</Text> : null}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: accent }]}>Particulars</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.colLabel, styles.bold]}>Description</Text>
            <Text style={[styles.colValue, styles.bold]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colLabel}>
              Architectural services — {milestone.name}
              {milestone.description ? `\n${milestone.description}` : ""}
              {"\n"}SAC 998321
            </Text>
            <Text style={styles.colValue}>{inr(gst.baseAmount)}</Text>
          </View>
          {gst.interState ? (
            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>IGST @ {fmtRate(gst.gstPercent)}%</Text>
              <Text style={styles.colValue}>{inr(gst.igst)}</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.colLabel}>CGST @ {fmtRate(half)}%</Text>
                <Text style={styles.colValue}>{inr(gst.cgst)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.colLabel}>SGST @ {fmtRate(half)}%</Text>
                <Text style={styles.colValue}>{inr(gst.sgst)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalRow}>
            <Text style={[styles.colLabel, styles.bold]}>Total</Text>
            <Text style={[styles.colValue, styles.bold]}>{inr(gst.totalAmount)}</Text>
          </View>
        </View>

        <View style={[styles.wordsBox, { borderLeftColor: accent }]}>
          <Text style={styles.wordsText}>Amount in words: {amountInWordsINR(gst.totalAmount)}</Text>
        </View>

        {invoice.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.sectionTitle, { color: accent }]}>Notes</Text>
            <Text style={styles.row}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.signature}>
          <Text>For {firm.name}</Text>
          <Text style={{ marginTop: 28, color: "#555" }}>Authorised signatory</Text>
        </View>

        <View style={styles.footer}>
          <Text>This is a computer-generated invoice.</Text>
        </View>
      </Page>
    </Document>
  );
}
