import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_TEMPLATE,
  INTERIOR_PACKAGES,
  INTERIOR_TEMPLATE,
  LANDSCAPE_TEMPLATE,
  computeEstimate,
  estimateInputKey,
  getLocationMultiplier,
  type EstimateInput,
} from "@/lib/estimator";

const sum = (xs: { percentage: number }[]) => xs.reduce((s, x) => s + x.percentage, 0);

describe("category templates", () => {
  it("each template sums to 100%", () => {
    expect(sum([...CONSTRUCTION_TEMPLATE])).toBe(100);
    expect(sum([...INTERIOR_TEMPLATE])).toBe(100);
    expect(sum([...LANDSCAPE_TEMPLATE])).toBe(100);
    for (const pkg of Object.values(INTERIOR_PACKAGES)) {
      expect(pkg.reduce((s, x) => s + x.w, 0)).toBeCloseTo(1, 10);
    }
  });

  it("construction split is unchanged (30% structure, 12% brickwork)", () => {
    expect(CONSTRUCTION_TEMPLATE[0]).toEqual({ category: "Structure & Foundation", percentage: 30 });
    expect(CONSTRUCTION_TEMPLATE[1]).toEqual({ category: "Brickwork & Masonry", percentage: 12 });
  });
});

const base: EstimateInput = {
  projectType: "RESIDENTIAL",
  area: 2500,
  quality: "premium",
  location: "Bengaluru",
  floors: 2,
  includeInterior: false,
};

describe("computeEstimate", () => {
  it("Interior uses the fit-out template: no structure or brickwork", () => {
    const r = computeEstimate({ ...base, projectType: "INTERIOR" });
    const cats = r.breakdown.map((b) => b.category).join(" | ");
    expect(cats).not.toMatch(/Structure|Brickwork|Foundation/);
    expect(cats).toMatch(/Carpentry/);
    expect(r.breakdown.reduce((s, b) => s + b.amount, 0)).toBe(r.summary.totalCost);
  });

  it("Landscape uses the landscape template and ignores the interior toggle", () => {
    const r = computeEstimate({ ...base, projectType: "LANDSCAPE", includeInterior: true });
    expect(r.breakdown.map((b) => b.category)).toContain("Softscape & Planting");
    expect(r.interiorApplied).toBe(false);
    expect(r.interiorBreakdown).toBeUndefined();
    expect(r.interiorRateRange).toBeNull();
  });

  it("Commercial interior package has office items, not kitchen/wardrobes", () => {
    const r = computeEstimate({ ...base, projectType: "COMMERCIAL", includeInterior: true });
    const cats = r.interiorBreakdown!.map((b) => b.category).join(" | ");
    expect(cats).toMatch(/Workstations/);
    expect(cats).not.toMatch(/Kitchen|Wardrobe/);
  });

  it("Residential interior package keeps modular kitchen and wardrobes", () => {
    const r = computeEstimate({ ...base, includeInterior: true });
    const cats = r.interiorBreakdown!.map((b) => b.category);
    expect(cats).toContain("Modular Kitchen");
    expect(cats).toContain("Wardrobes & Storage");
  });

  it("rate bands are consistent with the effective rate", () => {
    const shellOnly = computeEstimate(base);
    expect(shellOnly.summary.costPerSqFt).toBe(shellOnly.rateRange.used);
    expect(shellOnly.rateRange.used).toBeGreaterThanOrEqual(shellOnly.rateRange.min);
    expect(shellOnly.rateRange.used).toBeLessThanOrEqual(shellOnly.rateRange.max);

    const withInt = computeEstimate({ ...base, includeInterior: true });
    const band = withInt.interiorRateRange!;
    expect(band.used).toBe(withInt.summary.costPerSqFt);
    expect(band.used).toBeGreaterThanOrEqual(band.min);
    expect(band.used).toBeLessThanOrEqual(band.max);
    // Shell band is the same either way.
    expect(withInt.rateRange).toEqual(shellOnly.rateRange);
  });

  it("totals add up: subtotal = breakdown + interior, grand = subtotal + 18% GST", () => {
    const r = computeEstimate({ ...base, includeInterior: true });
    const parts =
      r.breakdown.reduce((s, b) => s + b.amount, 0) +
      r.interiorBreakdown!.reduce((s, b) => s + b.amount, 0);
    expect(parts).toBe(r.summary.totalCost);
    expect(r.summary.grandTotal).toBe(r.summary.totalCost + r.summary.gstAmount);
  });
});

describe("city multipliers (unchanged)", () => {
  it.each([
    ["Hubballi", 1],
    ["Mumbai", 1.3],
    ["New Delhi", 1.3],
    ["Bengaluru", 1.15],
    ["Hyderabad", 1.15],
    ["Pune", 1.15],
    ["Chennai", 1.15],
  ])("%s → %s×", (city, mult) => expect(getLocationMultiplier(city).mult).toBe(mult));
});

describe("estimateInputKey (stale snapshot detection)", () => {
  it("changes when an input changes, ignores case/whitespace in location", () => {
    expect(estimateInputKey(base)).toBe(estimateInputKey({ ...base, location: " bengaluru " }));
    expect(estimateInputKey(base)).not.toBe(estimateInputKey({ ...base, area: 2600 }));
    expect(estimateInputKey(base)).not.toBe(estimateInputKey({ ...base, includeInterior: true }));
    expect(estimateInputKey(base)).not.toBe(estimateInputKey({ ...base, quality: "luxury" }));
  });
});
