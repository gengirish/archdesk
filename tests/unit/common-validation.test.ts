import { describe, expect, it } from "vitest";
import { formatINR, formatINRShort } from "@/lib/utils";
import {
  normalizeGstin,
  normalizeIndianMobile,
  optionalEmailSchema,
  optionalGstinSchema,
  optionalIndianMobileSchema,
  phoneSearchDigits,
} from "@/lib/validation/common";

describe("Indian currency", () => {
  it.each([
    [105000, "₹1,05,000"],
    [85000, "₹85,000"],
  ])("formatINR(%d) = %s", (n, s) => expect(formatINR(n)).toBe(s));

  it.each([
    [350000, "₹3.5L"],
    [15000000, "₹1.5Cr"],
    [200000, "₹2L"],
    [10000000, "₹1Cr"],
    [85000, "₹85,000"],
    [999, "₹999"],
    [9996000, "₹1Cr"],
    [-350000, "-₹3.5L"],
  ])("formatINRShort(%d) = %s", (n, s) => expect(formatINRShort(n)).toBe(s));

  it("never uses K or a trailing .0", () => {
    for (const n of [1000, 5500, 45000, 100000, 1200000, 30000000]) {
      expect(formatINRShort(n)).not.toMatch(/K|\.0(?!\d)/);
    }
  });
});

describe("phone", () => {
  it.each(["9876543210", "+91 98765 43210", "098765-43210", "91 9876543210", "(987) 654-3210"])(
    "accepts %s",
    (v) => expect(normalizeIndianMobile(v)).toBe(v.includes("987") ? normalizeIndianMobile("9876543210") : null)
  );
  it.each(["12345", "5876543210", "98765432101", ""])("rejects %s", (v) =>
    expect(normalizeIndianMobile(v)).toBeNull()
  );
  it("optional schema: blank/placeholder → null, junk → error", () => {
    expect(optionalIndianMobileSchema.parse("")).toBeNull();
    expect(optionalIndianMobileSchema.parse("—")).toBeNull();
    expect(optionalIndianMobileSchema.parse("+91 98765 43210")).toBe("9876543210");
    expect(optionalIndianMobileSchema.safeParse("12345").success).toBe(false);
  });
});

describe("GSTIN", () => {
  it("uppercases and validates", () => {
    expect(normalizeGstin("29abcde1234f1z5")).toBe("29ABCDE1234F1Z5");
    expect(normalizeGstin("ABC123")).toBeNull();
    expect(normalizeGstin("29ABCDE1234F0Z5")).toBeNull(); // 13th char can't be 0
    expect(optionalGstinSchema.parse("")).toBeNull();
    expect(optionalGstinSchema.safeParse("ABC123").success).toBe(false);
  });
});

describe("email", () => {
  it("optional email", () => {
    expect(optionalEmailSchema.parse("")).toBeNull();
    expect(optionalEmailSchema.parse(" QA@Example.com ")).toBe("qa@example.com");
    expect(optionalEmailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("phoneSearchDigits", () => {
  it.each([
    ["+91 98765", "98765"],
    ["98765 43210", "9876543210"],
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["Sharma", null],
    ["12", null],
  ])("%s → %s", (q, d) => expect(phoneSearchDigits(q)).toBe(d));
});
