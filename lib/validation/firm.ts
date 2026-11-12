/**
 * Firm settings validation shared by Settings and /api/firm.
 * Client-safe: imports nothing server-only.
 */
import { z } from "zod";
import {
  emailSchema,
  optionalGstinSchema,
  optionalIndianMobileSchema,
  optionalTextSchema,
} from "./common";

export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"] as const;

export const firmUpdateSchema = z
  .object({
    name: z.string().trim().min(1, "Firm name is required").max(120).optional(),
    // Firm.phone is non-nullable: blank / "—" is stored as "" (shown as "not set").
    phone: optionalIndianMobileSchema.transform((v) => v ?? "").optional(),
    email: emailSchema.optional(),
    address: optionalTextSchema(300).optional(),
    city: optionalTextSchema(80).optional(),
    state: optionalTextSchema(60).optional(),
    gstNumber: optionalGstinSchema.optional(),
    website: optionalTextSchema(200).optional(),
    brandColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Brand colour must be a hex value like #E8A045")
      .optional(),
    // Only clearing is allowed here; uploads go through /api/firm/logo.
    logo: z.null().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "No valid fields to update");
