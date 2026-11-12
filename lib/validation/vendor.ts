/**
 * Vendor validation shared by the vendors UI and /api/vendors routes.
 * Client-safe: imports nothing server-only.
 */
import { z } from "zod";
import {
  indianMobileSchema,
  optionalEmailSchema,
  optionalGstinSchema,
  optionalTextSchema,
} from "./common";

export const VENDOR_CATEGORIES = [
  "CONTRACTOR",
  "TILES",
  "STEEL",
  "WOOD",
  "GLASS",
  "ELECTRICAL",
  "PLUMBING",
  "PAINT",
  "HARDWARE",
  "FURNITURE",
  "LANDSCAPING",
  "OTHER",
] as const;

/** Rating 1–5; blank / 0 / null → null. Accepts form strings. */
export const ratingSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "" || v === 0 || v === "0") return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rating must be 1 to 5 stars" });
      return z.NEVER;
    }
    return n;
  });

const vendorFields = {
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  category: z.enum(VENDOR_CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }),
  phone: indianMobileSchema,
  email: optionalEmailSchema,
  address: optionalTextSchema(300),
  city: optionalTextSchema(80),
  gst: optionalGstinSchema,
  notes: optionalTextSchema(2000),
  rating: ratingSchema,
};

export const vendorCreateSchema = z.object(vendorFields);
export type VendorCreateInput = z.input<typeof vendorCreateSchema>;

export const vendorUpdateSchema = z
  .object({
    name: vendorFields.name.optional(),
    category: vendorFields.category.optional(),
    phone: vendorFields.phone.optional(),
    email: vendorFields.email.optional(),
    address: vendorFields.address.optional(),
    city: vendorFields.city.optional(),
    gst: vendorFields.gst.optional(),
    notes: vendorFields.notes.optional(),
    rating: vendorFields.rating.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
