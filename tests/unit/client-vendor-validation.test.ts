import { describe, expect, it } from "vitest";
import { clientCreateSchema, clientUpdateSchema, matchesClientSearch } from "@/lib/validation/client";
import { vendorCreateSchema, vendorUpdateSchema } from "@/lib/validation/vendor";
import { firmUpdateSchema } from "@/lib/validation/firm";
import { fieldErrors } from "@/lib/validation/form-errors";

const QA = { name: "QA-Client Sharma", phone: "9876543210", email: "gen.girish+qa@gmail.com" };

describe("client schema", () => {
  it("normalises phone, blanks to null, keeps notes", () => {
    const r = clientCreateSchema.parse({
      ...QA,
      phone: "+91 98765 43210",
      email: " Gen.Girish+QA@gmail.com ",
      city: "",
      state: "Karnataka",
      notes: "  Prefers WhatsApp  ",
    });
    expect(r).toMatchObject({
      phone: "9876543210",
      email: "gen.girish+qa@gmail.com",
      city: null,
      state: "Karnataka",
      notes: "Prefers WhatsApp",
    });
  });

  it("rejects 12345, bad email, blank name, notes > 2000 with per-field errors", () => {
    const r = clientCreateSchema.safeParse({ name: " ", phone: "12345", email: "nope", notes: "x".repeat(2001) });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = fieldErrors(r.error);
      expect(Object.keys(e).sort()).toEqual(["email", "name", "notes", "phone"]);
      expect(e.phone).toMatch(/10-digit/);
    }
  });

  it("update: omitted fields stay undefined (not cleared); empty body rejected", () => {
    const r = clientUpdateSchema.parse({ notes: "QA-note" });
    expect(r).toEqual({ notes: "QA-note" });
    expect("email" in r).toBe(false);
    expect(clientUpdateSchema.safeParse({}).success).toBe(false);
    expect(clientUpdateSchema.parse({ email: "" }).email).toBeNull();
  });
});

describe("client search", () => {
  const c = { name: "QA-Client Sharma", email: "gen.girish+qa@gmail.com", phone: "9876543210" };
  it.each(["+91 98765", "98765 43210", "9876543210", "sharma", "girish+qa"])("matches %s", (q) =>
    expect(matchesClientSearch(c, q)).toBe(true)
  );
  it("does not match unrelated digits or names", () => {
    expect(matchesClientSearch(c, "11111")).toBe(false);
    expect(matchesClientSearch(c, "Patil")).toBe(false);
  });
  it("matches legacy stored formats by digits", () => {
    expect(matchesClientSearch({ ...c, phone: "+91 98765 43210" }, "9876543210")).toBe(true);
  });
});

describe("vendor schema", () => {
  const base = { name: "QA-Vendor Tiles", category: "TILES", phone: "9876543210" };
  it("uppercases GSTIN and accepts a star rating", () => {
    const r = vendorCreateSchema.parse({ ...base, gst: "29abcde1234f1z5", rating: "4" });
    expect(r).toMatchObject({ gst: "29ABCDE1234F1Z5", rating: 4 });
  });
  it("rejects GSTIN ABC123, rating 6 / 2.5, unknown category, phone 12345", () => {
    expect(vendorCreateSchema.safeParse({ ...base, gst: "ABC123" }).success).toBe(false);
    expect(vendorCreateSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(vendorCreateSchema.safeParse({ ...base, rating: 2.5 }).success).toBe(false);
    expect(vendorCreateSchema.safeParse({ ...base, category: "MAGIC" }).success).toBe(false);
    expect(vendorCreateSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
  });
  it("blank rating / GSTIN → null; update can clear the rating", () => {
    expect(vendorCreateSchema.parse({ ...base, rating: "", gst: "" })).toMatchObject({ rating: null, gst: null });
    expect(vendorUpdateSchema.parse({ rating: null })).toEqual({ rating: null });
  });
});

describe("firm settings schema", () => {
  it("treats a placeholder phone as not set (stored as null)", () => {
    expect(firmUpdateSchema.parse({ phone: "—" }).phone).toBeNull();
    expect(firmUpdateSchema.parse({ phone: "" }).phone).toBeNull();
    expect(firmUpdateSchema.parse({ phone: "+91 98765 43210" }).phone).toBe("9876543210");
  });
  it("validates GSTIN, email and brand colour", () => {
    expect(firmUpdateSchema.safeParse({ gstNumber: "ABC123" }).success).toBe(false);
    expect(firmUpdateSchema.parse({ gstNumber: "" }).gstNumber).toBeNull();
    expect(firmUpdateSchema.safeParse({ email: "bad" }).success).toBe(false);
    expect(firmUpdateSchema.safeParse({ brandColor: "orange" }).success).toBe(false);
    expect(firmUpdateSchema.parse({ brandColor: "#E8A045" }).brandColor).toBe("#E8A045");
  });
  it("only allows clearing the logo, never setting an arbitrary URL", () => {
    expect(firmUpdateSchema.parse({ logo: null }).logo).toBeNull();
    expect(firmUpdateSchema.safeParse({ logo: "https://evil.example/x.png" }).success).toBe(false);
  });
});
