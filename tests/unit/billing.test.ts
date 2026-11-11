import { describe, expect, it } from "vitest";
import { amountInWordsINR } from "@/lib/amount-in-words";
import { splitGst, stateFromGstin } from "@/lib/gst";
import { firmInvoicePrefix, formatInvoiceNumber } from "@/lib/invoice-number";
import { computeBillingSummary, isMilestoneOverdue } from "@/lib/billing-metrics";
import { milestoneCreateSchema, milestoneUpdateSchema } from "@/lib/validation/milestone";

describe("amountInWordsINR", () => {
  it.each([
    [123900, "One Lakh Twenty-Three Thousand Nine Hundred Rupees Only"],
    [59000, "Fifty-Nine Thousand Rupees Only"],
    [105000, "One Lakh Five Thousand Rupees Only"],
    [0, "Zero Rupees Only"],
    [1, "One Rupee Only"],
    [21, "Twenty-One Rupees Only"],
    [10_00_00_000, "Ten Crore Rupees Only"],
    [1_23_45_67_890, "One Hundred Twenty-Three Crore Forty-Five Lakh Sixty-Seven Thousand Eight Hundred Ninety Rupees Only"],
  ])("%d → %s", (n, words) => {
    expect(amountInWordsINR(n)).toBe(words);
  });

  it("includes paise", () => {
    expect(amountInWordsINR(59000.5)).toBe("Fifty-Nine Thousand Rupees and Fifty Paise Only");
  });
});

describe("splitGst", () => {
  it("₹50,000 intra-state → CGST 4,500 + SGST 4,500 = 59,000", () => {
    const r = splitGst({ baseAmount: 50000, gstPercent: 18, supplierState: "Karnataka", recipientState: "Karnataka" });
    expect(r).toMatchObject({ gstAmount: 9000, cgst: 4500, sgst: 4500, igst: 0, totalAmount: 59000, interState: false });
  });

  it("inter-state → IGST at the full rate", () => {
    const r = splitGst({ baseAmount: 50000, gstPercent: 18, supplierState: "Karnataka", recipientState: "Maharashtra" });
    expect(r).toMatchObject({ igst: 9000, cgst: 0, sgst: 0, totalAmount: 59000, interState: true });
    expect(r.placeOfSupply).toBe("Maharashtra");
  });

  it("unknown client state is treated as intra-state", () => {
    expect(splitGst({ baseAmount: 1000, gstPercent: 18, supplierState: "Karnataka" }).interState).toBe(false);
  });

  it("compares states loosely (case, aliases) and can read the GSTIN", () => {
    expect(splitGst({ baseAmount: 100, gstPercent: 18, supplierState: "karnataka ", recipientState: "KA" }).interState).toBe(false);
    expect(stateFromGstin("29ABCDE1234F1Z5")).toBe("Karnataka");
    expect(
      splitGst({ baseAmount: 100, gstPercent: 18, supplierGstin: "29ABCDE1234F1Z5", recipientState: "Goa" }).interState
    ).toBe(true);
  });

  it("CGST + SGST always add up to the GST total on odd amounts", () => {
    const r = splitGst({ baseAmount: 333, gstPercent: 18 });
    expect(r.cgst + r.sgst).toBe(r.gstAmount);
  });
});

describe("invoice numbers", () => {
  it("formats PREFIX-YEAR-NNN", () => {
    expect(formatInvoiceNumber("ARC", 2026, 1)).toBe("ARC-2026-001");
    expect(formatInvoiceNumber("ARC", 2026, 1234)).toBe("ARC-2026-1234");
  });
  it("derives a 3-letter prefix from the firm name", () => {
    expect(firmInvoicePrefix("Sanskruti Design Studio")).toBe("SAN");
    expect(firmInvoicePrefix("A1")).toBe("AXX");
  });
});

describe("computeBillingSummary (one definition for Billing, Dashboard, Analytics)", () => {
  const now = new Date("2026-11-11T10:00:00");

  it("reproduces the QA case: unpaid incl. GST is outstanding, including UPCOMING", () => {
    // ₹1,55,000 base unpaid across statuses → ₹1,82,900 incl. 18% GST.
    const s = computeBillingSummary(
      [
        { amount: 50000, gstPercent: 18, status: "UPCOMING" },
        { amount: 75000, gstPercent: 18, status: "DUE" },
        { amount: 30000, gstPercent: 18, status: "UNPAID" },
      ],
      now
    );
    expect(s.outstanding).toBe(182900);
    expect(s.billed).toBe(182900);
    expect(s.collected).toBe(0);
    expect(s.dueNow).toBe(88500 + 35400);
  });

  it("collected uses paidAmount when recorded; collection rate = collected ÷ billed", () => {
    const s = computeBillingSummary(
      [
        { amount: 50000, gstPercent: 18, status: "PAID", paidAmount: 59000 },
        { amount: 50000, gstPercent: 18, status: "PAID" },
        { amount: 100000, gstPercent: 18, status: "UPCOMING" },
      ],
      now
    );
    expect(s.collected).toBe(118000);
    expect(s.outstanding).toBe(118000);
    expect(s.collectionRate).toBe(50);
  });

  it("overdue = OVERDUE status or unpaid past the due date", () => {
    expect(isMilestoneOverdue({ amount: 1, gstPercent: 18, status: "DUE", dueDate: "2026-11-01" }, now)).toBe(true);
    expect(isMilestoneOverdue({ amount: 1, gstPercent: 18, status: "DUE", dueDate: "2026-11-11" }, now)).toBe(false);
    expect(isMilestoneOverdue({ amount: 1, gstPercent: 18, status: "PAID", dueDate: "2020-01-01" }, now)).toBe(false);
    expect(isMilestoneOverdue({ amount: 1, gstPercent: 18, status: "OVERDUE" }, now)).toBe(true);
  });

  it("empty input is all zeros", () => {
    expect(computeBillingSummary([], now)).toMatchObject({ billed: 0, collectionRate: 0 });
  });
});

describe("milestone validation", () => {
  it("accepts form strings and defaults GST to 18%", () => {
    const r = milestoneCreateSchema.parse({ name: "Retainer", stage: "CONCEPT", amount: "50,000", dueDate: "" });
    expect(r).toMatchObject({ amount: 50000, gstPercent: 18, dueDate: null });
  });
  it("rejects zero amounts, bad GST and unknown stages", () => {
    expect(milestoneCreateSchema.safeParse({ name: "x", stage: "CONCEPT", amount: 0 }).success).toBe(false);
    expect(milestoneCreateSchema.safeParse({ name: "x", stage: "CONCEPT", amount: 10, gstPercent: 40 }).success).toBe(false);
    expect(milestoneCreateSchema.safeParse({ name: "x", stage: "SOMETHING", amount: 10 }).success).toBe(false);
  });
  it("update needs at least one field", () => {
    expect(milestoneUpdateSchema.safeParse({}).success).toBe(false);
    expect(milestoneUpdateSchema.parse({ status: "PAID", paidAmount: "59000" }).paidAmount).toBe(59000);
  });
});
