import { randomBytes } from "node:crypto";

/**
 * Client-portal access token: 32 bytes from the OS CSPRNG, base64url (43 chars).
 *
 * The previous default was a cuid, which shares a timestamp prefix with the
 * project id and is not designed to be unguessable. The token is stored as-is
 * (not hashed) so staff can copy the link again from the project page; rotate
 * it with "Regenerate link" if it leaks.
 */
export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cheap shape check so obviously bogus tokens never reach the database. */
export function isPlausiblePortalToken(token: string): boolean {
  // New tokens are 43 base64url chars; legacy cuid tokens are ~25 lowercase chars.
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}
