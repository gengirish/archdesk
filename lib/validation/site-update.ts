/**
 * Site update validation (note, stage, weather, photos), shared by the site
 * tracker UI and POST /api/projects/[id]/site-updates. Client-safe.
 */
import { z } from "zod";

export const MAX_SITE_PHOTOS = 6;
/**
 * The whole request must stay under Vercel's 4.5 MB body limit, so all photos
 * together are capped at 4 MB. The UI downsizes photos before upload to fit.
 */
export const MAX_SITE_PHOTOS_TOTAL_BYTES = 4 * 1024 * 1024;
export const SITE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const PROJECT_STAGE_VALUES = [
  "CONCEPT",
  "SCHEMATIC",
  "DESIGN_DEV",
  "WORKING_DRAWINGS",
  "EXECUTION",
  "COMPLETED",
] as const;

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? null : v.trim() || null))
    .pipe(z.string().max(max, `Keep this under ${max} characters`).nullable());

/** Text fields of a site update (photos are validated separately). */
export const siteUpdateFieldsSchema = z.object({
  note: optionalText(5000),
  weather: optionalText(100),
  milestone: z
    .union([z.enum(PROJECT_STAGE_VALUES), z.literal(""), z.null(), z.undefined()])
    .transform((v) => (v ? v : null)),
});

export type PhotoMeta = { name: string; size: number; type: string };

/** Returns an error message, or null when the photo set is acceptable. */
export function validateSitePhotos(photos: PhotoMeta[]): string | null {
  if (photos.length > MAX_SITE_PHOTOS) return `Attach up to ${MAX_SITE_PHOTOS} photos per update`;
  for (const p of photos) {
    if (!(SITE_PHOTO_TYPES as readonly string[]).includes(p.type)) {
      return `${p.name || "A file"} isn't a JPG, PNG or WebP image`;
    }
    if (p.size <= 0) return `${p.name || "A photo"} is empty`;
  }
  const total = photos.reduce((s, p) => s + p.size, 0);
  if (total > MAX_SITE_PHOTOS_TOTAL_BYTES) {
    return "Photos are too large together (4 MB max). Attach fewer photos.";
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Sniffs the real image type from the first bytes; null if not JPG/PNG/WebP. */
export function sniffImageType(bytes: Uint8Array): (typeof SITE_PHOTO_TYPES)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export const SITE_PHOTO_EXTENSIONS: Record<(typeof SITE_PHOTO_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
