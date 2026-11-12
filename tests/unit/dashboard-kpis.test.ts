import { describe, expect, it } from "vitest";
import {
  computeMonthlyRevenue,
  formatMomChange,
  istMonthKey,
  previousIstMonthKey,
  startOfPreviousIstMonth,
} from "@/lib/dashboard-kpis";

describe("IST months", () => {
  it("uses India time at month boundaries", () => {
    // 31 Oct 19:00 UTC = 1 Nov 00:30 IST
    expect(istMonthKey("2026-10-31T19:00:00Z")).toBe("2026-11");
    expect(istMonthKey("2026-10-31T18:00:00Z")).toBe("2026-10");
  });
  it("previous month wraps the year", () => {
    expect(previousIstMonthKey(new Date("2026-01-15T00:00:00Z"))).toBe("2025-12");
    expect(startOfPreviousIstMonth(new Date("2026-11-11T10:00:00Z")).toISOString()).toBe(
      "2026-09-30T18:30:00.000Z"
    );
  });
});

describe("computeMonthlyRevenue", () => {
  const now = new Date("2026-11-11T10:00:00Z");
  const paid = (paidAt: string, amount = 50000, paidAmount?: number) => ({
    amount,
    gstPercent: 18,
    status: "PAID",
    paidAt,
    paidAmount: paidAmount ?? null,
  });

  it("sums PAID incl. GST by IST month, using paidAmount when recorded", () => {
    const r = computeMonthlyRevenue(
      [
        paid("2026-11-02T05:00:00Z"), // 59,000
        paid("2026-11-05T05:00:00Z", 10000, 11000), // recorded 11,000
        paid("2026-10-10T05:00:00Z", 100000), // 1,18,000 last month
        { amount: 99999, gstPercent: 18, status: "DUE", paidAt: null },
        paid("2026-09-10T05:00:00Z"), // older, ignored
      ],
      now
    );
    expect(r).toEqual({ thisMonth: 70000, lastMonth: 118000, momPercent: -40.7 });
    expect(formatMomChange(r)).toBe("-40.7%");
  });

  it("zero previous month → null %, labelled New or —", () => {
    const r = computeMonthlyRevenue([paid("2026-11-02T05:00:00Z")], now);
    expect(r.momPercent).toBeNull();
    expect(formatMomChange(r)).toBe("New");
    expect(formatMomChange(computeMonthlyRevenue([], now))).toBe("—");
  });

  it("positive change has a plus sign and no trailing .0", () => {
    const r = computeMonthlyRevenue(
      [paid("2026-11-02T05:00:00Z", 100000), paid("2026-10-02T05:00:00Z", 50000)],
      now
    );
    expect(formatMomChange(r)).toBe("+100%");
  });
});
