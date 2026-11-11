/**
 * Server-only file storage (Vercel Blob, public store).
 *
 * Public blobs get an unguessable random suffix, which is what lets the
 * client portal show approved drawings / site photos without a login.
 * Configure by connecting a Blob store to the Vercel project — that injects
 * BLOB_READ_WRITE_TOKEN. Locally: `vercel env pull .env.local`.
 */
import { put, del } from "@vercel/blob";

export const STORAGE_FOLDERS = {
  DRAWINGS: "drawings",
  SITE_PHOTOS: "site-photos",
  FIRM_ASSETS: "firm-assets",
} as const;

/**
 * Vercel Functions reject request bodies above 4.5 MB, so server-side uploads
 * are capped just under that. Larger files need direct client uploads.
 */
export const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured (BLOB_READ_WRITE_TOKEN missing)");
    this.name = "StorageNotConfiguredError";
  }
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type StoredFile = { url: string; pathname: string };

export async function storePublicFile(
  pathname: string,
  body: File | Blob | ArrayBuffer,
  contentType: string
): Promise<StoredFile> {
  if (!isStorageConfigured()) throw new StorageNotConfiguredError();
  const blob = await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/** Best-effort removal of an uploaded object (e.g. after a failed DB write). */
export async function removeStoredFile(url: string): Promise<void> {
  if (!isStorageConfigured()) return;
  await del(url);
}

/** Short id to correlate a user-facing error with server logs. */
export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}
