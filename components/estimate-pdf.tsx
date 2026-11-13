"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CostEstimateResult } from "@/app/api/ai/cost-estimate/route";
import { formatDate } from "@/lib/utils";

const ACCENT = "#E8A045";
const DARK = "#111318";
const MUTED = "#555";

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  brand: { fontSize: 18, fontWeight: "bold", color: DARK },
  brandSub: { fontSize: 9, color: MUTED, marginTop: 2 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 14, fontWeight: "bold", color: ACCENT, letterSpacing: 1 },
  titleDate: { fontSize: 9, color: MUTED, marginTop: 4, textAlign: "right" },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: ACCENT,
    marginBottom: 6,
    textTransform: "uppercase",
  },

  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  metaCell: {
    width: "33%",
    paddingVertical: 6,
    paddingRight: 8,
  },
  metaLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: "bold" },

  table: { marginTop: 4, borderWidth: 1, borderColor: "#ddd" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fafafa",
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f0ebe0",
  },
  colCategory: { flex: 3, fontSize: 9 },
  colPct: { flex: 1, fontSize: 9, textAlign: "center" },
  colAmount: { flex: 2, fontSize: 9, textAlign: "right" },
  colHeaderText: { fontSize: 8, fontWeight: "bold", color: MUTED, textTransform: "uppercase" },

  summaryBox: {
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 10, color: "#333" },
  summaryValue: { fontSize: 10, fontWeight: "bold" },
  grandTotalLabel: { fontSize: 12, fontWeight: "bold", color: DARK },
  grandTotalValue: { fontSize: 12, fontWeight: "bold", color: ACCENT },

  assumptionsList: { marginTop: 6 },
  assumption: { fontSize: 8, color: MUTED, marginBottom: 3, lineHeight: 1.4 },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: MUTED },
});

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export type EstimatePdfProps = {
  result: CostEstimateResult;
  inputs: {
    projectType: string;
    area: number;
    quality: string;
    location: string;
    floors: number;
    includeInterior: boolean;
  };
};

export function EstimatePdfDocument({ result, inputs }: EstimatePdfProps) {
  const today = formatDate(new Date());

  const constructionSubtotal = result.breakdown.reduce((sum, r) => sum + r.amount, 0);
  const interiorSubtotal = result.interiorBreakdown?.reduce((sum, r) => sum + r.amount, 0) ?? 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>ArchDesk</Text>
            <Text style={s.brandSub}>Construction Cost Estimate</Text>
          </View>
          <View style={s.titleBlock}>
            <Text style={s.title}>ESTIMATE</Text>
            <Text style={s.titleDate}>{today}</Text>
          </View>
        </View>

        {/* Project Inputs */}
        <View style={s.metaGrid}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Project Type</Text>
            <Text style={s.metaValue}>{inputs.projectType}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Built-up Area</Text>
            <Text style={s.metaValue}>
              {inputs.area.toLocaleString("en-IN")} sq ft
            </Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Quality Tier</Text>
            <Text style={s.metaValue}>
              {inputs.quality.charAt(0).toUpperCase() + inputs.quality.slice(1)}
            </Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Location</Text>
            <Text style={s.metaValue}>{inputs.location}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Floors</Text>
            <Text style={s.metaValue}>{inputs.floors}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Interior Fit-out</Text>
            <Text style={s.metaValue}>{inputs.includeInterior ? "Yes" : "No"}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Shell Rate Band</Text>
            <Text style={s.metaValue}>
              {fmtINR(result.rateRange.min)} – {fmtINR(result.rateRange.max)} / sqft
            </Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Shell Rate Used</Text>
            <Text style={s.metaValue}>{fmtINR(result.rateRange.used)} / sqft</Text>
          </View>
          {result.interiorRateRange ? (
            <View style={s.metaCell}>
              <Text style={s.metaLabel}>Rate With Interior</Text>
              <Text style={s.metaValue}>
                {fmtINR(result.interiorRateRange.used)} / sqft (band{" "}
                {fmtINR(result.interiorRateRange.min)} – {fmtINR(result.interiorRateRange.max)})
              </Text>
            </View>
          ) : null}
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Timeline</Text>
            <Text style={s.metaValue}>{result.timeline}</Text>
          </View>
        </View>

        {/* Construction Breakdown */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Construction Cost Breakdown</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.colCategory, s.colHeaderText]}>Category</Text>
              <Text style={[s.colPct, s.colHeaderText]}>%</Text>
              <Text style={[s.colAmount, s.colHeaderText]}>Amount</Text>
            </View>
            {result.breakdown.map((row, i) => (
              <View key={row.category} style={i % 2 === 1 ? s.tableRowAlt : s.tableRow}>
                <Text style={s.colCategory}>{row.category}</Text>
                <Text style={s.colPct}>{row.percentage}%</Text>
                <Text style={s.colAmount}>{fmtINR(row.amount)}</Text>
              </View>
            ))}
            <View style={s.tableRowTotal}>
              <Text style={[s.colCategory, { fontWeight: "bold" }]}>Construction Subtotal</Text>
              <Text style={[s.colPct, { fontWeight: "bold" }]}>100%</Text>
              <Text style={[s.colAmount, { fontWeight: "bold" }]}>
                {fmtINR(constructionSubtotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* Interior Breakdown */}
        {result.interiorBreakdown && result.interiorBreakdown.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Interior Fit-out Breakdown</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.colCategory, s.colHeaderText]}>Category</Text>
                <Text style={[s.colAmount, s.colHeaderText]}>Amount</Text>
              </View>
              {result.interiorBreakdown.map((row, i) => (
                <View key={row.category} style={i % 2 === 1 ? s.tableRowAlt : s.tableRow}>
                  <Text style={s.colCategory}>{row.category}</Text>
                  <Text style={s.colAmount}>{fmtINR(row.amount)}</Text>
                </View>
              ))}
              <View style={s.tableRowTotal}>
                <Text style={[s.colCategory, { fontWeight: "bold" }]}>Interior Subtotal</Text>
                <Text style={[s.colAmount, { fontWeight: "bold" }]}>
                  {fmtINR(interiorSubtotal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={s.summaryBox}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal (ex-GST)</Text>
            <Text style={s.summaryValue}>{fmtINR(result.summary.totalCost)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>GST @ 18%</Text>
            <Text style={s.summaryValue}>{fmtINR(result.summary.gstAmount)}</Text>
          </View>
          <View style={[s.summaryRow, { borderTopWidth: 1, borderTopColor: ACCENT, marginTop: 4, paddingTop: 8 }]}>
            <Text style={s.grandTotalLabel}>Grand Total (incl. GST)</Text>
            <Text style={s.grandTotalValue}>{fmtINR(result.summary.grandTotal)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Effective cost per sq ft</Text>
            <Text style={s.summaryValue}>{fmtINR(result.summary.costPerSqFt)}</Text>
          </View>
        </View>

        {/* Assumptions */}
        <View style={[s.section, { marginTop: 14 }]}>
          <Text style={s.sectionTitle}>Assumptions & Disclaimers</Text>
          <View style={s.assumptionsList}>
            {result.assumptions.map((a, i) => (
              <Text key={i} style={s.assumption}>
                {i + 1}. {a}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Generated by ArchDesk · archdesk.vercel.app
          </Text>
          <Text style={s.footerText}>
            This is an indicative estimate, not a quotation.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
