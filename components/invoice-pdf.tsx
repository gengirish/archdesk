"use client";

import type { Client, Firm, Invoice, Milestone, Project } from "@prisma/client";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils";

const ACCENT = "#E8A045";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    paddingBottom: 12,
  },
  firmName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  firmMeta: {
    fontSize: 9,
    color: "#333",
    marginBottom: 2,
  },
  titleBlock: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: ACCENT,
    letterSpacing: 1,
  },
  titleSub: {
    fontSize: 9,
    marginTop: 4,
    textAlign: "right",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: ACCENT,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  row: {
    marginBottom: 3,
    fontSize: 9,
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fafafa",
  },
  colLabel: { flex: 3, fontSize: 9 },
  colValue: { flex: 1, fontSize: 9, textAlign: "right", fontWeight: "bold" },
  wordsBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f7f7f7",
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
  },
  wordsText: {
    fontSize: 9,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    fontSize: 8,
    color: "#555",
  },
  footerThanks: {
    fontSize: 10,
    fontWeight: "bold",
    color: ACCENT,
    marginBottom: 8,
  },
});

const BELOW_20 = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return BELOW_20[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${BELOW_20[o]}` : ""}`.trim();
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  if (n < 100) return twoDigits(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${BELOW_20[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ""}`.trim();
}

/** Indian numbering up to 99,99,999 (9,999,999 rupees). */
export function amountInWordsINR(rupees: number): string {
  const n = Math.floor(Math.abs(rupees));
  if (n > 9_999_999) {
    return "Amount exceeds ninety-nine lakh ninety-nine thousand nine hundred ninety-nine rupees";
  }
  if (n === 0) return "Zero Rupees Only";

  let rem = n;
  const last3 = rem % 1000;
  rem = Math.floor(rem / 1000);
  const thousands = rem % 100;
  rem = Math.floor(rem / 100);
  const lakhs = rem % 100;
  rem = Math.floor(rem / 100);
  const crores = rem;

  const parts: string[] = [];
  if (crores) parts.push(`${threeDigits(crores)} Crore`);
  if (lakhs) parts.push(`${twoDigits(lakhs)} Lakh`);
  if (thousands) parts.push(`${twoDigits(thousands)} Thousand`);
  if (last3) parts.push(threeDigits(last3));

  const core = parts.join(" ").trim();
  return `${core} Rupees Only`;
}

export type InvoicePdfPayload = {
  invoice: Invoice;
  firm: Firm;
  client: Client;
  project: Project;
  milestone: Milestone;
};

function formatINRPdf(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InvoicePdfDocument({ invoice, firm, client, project, milestone }: InvoicePdfPayload) {
  const base = invoice.baseAmount;
  const cgst = Math.round(invoice.gstAmount / 2);
  const sgst = invoice.gstAmount - cgst;
  const total = invoice.totalAmount;

  const firmAddress = [firm.address, [firm.city, firm.state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.firmName}>{firm.name}</Text>
            {firmAddress ? <Text style={styles.firmMeta}>{firmAddress}</Text> : null}
            {firm.gstNumber ? (
              <Text style={styles.firmMeta}>GSTIN: {firm.gstNumber}</Text>
            ) : null}
            <Text style={styles.firmMeta}>
              {firm.phone}
              {firm.email ? ` · ${firm.email}` : ""}
            </Text>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>TAX INVOICE</Text>
            <Text style={styles.titleSub}>No. {invoice.invoiceNo}</Text>
            <Text style={styles.titleSub}>Date: {formatDate(invoice.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.row}>{client.name}</Text>
          <Text style={styles.row}>{client.phone}</Text>
          {client.email ? <Text style={styles.row}>{client.email}</Text> : null}
          {[client.address, client.city].filter(Boolean).length > 0 ? (
            <Text style={styles.row}>{[client.address, client.city].filter(Boolean).join(", ")}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project & milestone</Text>
          <Text style={styles.row}>Project: {project.name}</Text>
          <Text style={styles.row}>Milestone: {milestone.name}</Text>
          {milestone.description ? (
            <Text style={styles.row}>{milestone.description}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amounts (GST)</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>Base Amount</Text>
              <Text style={styles.colValue}>{formatINRPdf(base)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>CGST (9%)</Text>
              <Text style={styles.colValue}>{formatINRPdf(cgst)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colLabel}>SGST (9%)</Text>
              <Text style={styles.colValue}>{formatINRPdf(sgst)}</Text>
            </View>
            <View style={styles.tableRowLast}>
              <Text style={styles.colLabel}>Total Amount</Text>
              <Text style={styles.colValue}>{formatINRPdf(total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.wordsBox}>
          <Text style={styles.wordsText}>Amount in words: {amountInWordsINR(invoice.totalAmount)}</Text>
        </View>

        {invoice.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.row}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerThanks}>Thank you for your business</Text>
          <Text style={styles.row}>Bank: [Bank name]</Text>
          <Text style={styles.row}>Account: [Account number] · IFSC: [IFSC code]</Text>
          <Text style={styles.row}>UPI / payment instructions: [Add details]</Text>
        </View>
      </Page>
    </Document>
  );
}
