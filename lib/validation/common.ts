/**
 * Field validators shared by every form and API route (clients, leads,
 * vendors, settings). Client-safe: imports nothing server-only.
 */
import { z } from "zod";

export const PHONE_ERROR = "Enter a valid 10-digit Indian mobile number";
export const GSTIN_ERROR = "Enter a valid 15-character GSTIN, e.g. 29ABCDE1234F1Z5";
export const EMAIL_ERROR = "Enter a valid email address";

/**
 * Normalises an Indian mobile number to 10 digits: strips spaces, dashes,
 * brackets, a +91 / 91 country code and a leading trunk 0. Returns null when
 * the result isn't a valid mobile (10 digits starting 6–9).
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Uppercases and strips spaces; returns null if the result isn't a GSTIN. */
export function normalizeGstin(input: string): string | null {
  const v = input.replace(/\s/g, "").toUpperCase();
  return GSTIN_REGEX.test(v) ? v : null;
}

/** Placeholder values people type for "no value". */
const PLACEHOLDERS = new Set(["", "-", "—", "–", "n/a", "na", "nil", "none"]);
export function isPlaceholder(v: string | null | undefined): boolean {
  return v == null || PLACEHOLDERS.has(v.trim().toLowerCase());
}

/** Required Indian mobile → 10 digits. */
export const indianMobileSchema = z.string().transform((v, ctx) => {
  const n = normalizeIndianMobile(v);
  if (!n) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_ERROR });
    return z.NEVER;
  }
  return n;
});

/** Optional Indian mobile: blank / placeholder → null. */
export const optionalIndianMobileSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (isPlaceholder(v)) return null;
    const n = normalizeIndianMobile(v!);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_ERROR });
      return z.NEVER;
    }
    return n;
  });

/** Optional GSTIN: blank → null, otherwise uppercased and checked. */
export const optionalGstinSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v, ctx) => {
    if (isPlaceholder(v)) return null;
    const n = normalizeGstin(v!);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: GSTIN_ERROR });
      return z.NEVER;
    }
    return n;
  });

export const emailSchema = z.string().trim().toLowerCase().email(EMAIL_ERROR).max(254);

/** Optional email: blank → null. */
export const optionalEmailSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (isPlaceholder(v) ? null : v!.trim().toLowerCase()))
  .pipe(z.string().email(EMAIL_ERROR).max(254).nullable());

/** Trimmed optional text: blank → null. */
export const optionalTextSchema = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? null : v.trim() || null))
    .pipe(z.string().max(max).nullable());

/**
 * For search: if the query looks like a phone number ("+91 98765",
 * "98765 43210"), return the digits to match against stored 10-digit phones;
 * otherwise null. A leading 91 / 0 is dropped once enough digits are present.
 */
export function phoneSearchDigits(query: string): string | null {
  if (!/^[\d\s+()-]+$/.test(query.trim())) return null;
  let d = query.replace(/\D/g, "");
  if (d.length < 3) return null;
  if (query.trim().startsWith("+91") || (d.length > 10 && d.startsWith("91"))) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d || null;
}
