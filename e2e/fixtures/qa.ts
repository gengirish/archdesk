import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the opt-in QA E2E flows (qa-flows.spec.ts, mobile-smoke.spec.ts).
 *
 * Test-data rules from the QA brief: every record starts with "QA-", and the
 * only contact details used are QA_EMAIL and QA_PHONE.
 */
export const QA_EMAIL = "gen.girish+qa@gmail.com";
export const QA_PHONE = "9876543210";

/** The Clerk test user the app signs in as (see fixtures/auth.ts). */
export const TEST_EMAIL = process.env.E2E_CLERK_USER_EMAIL || "";
export const TEST_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD || "";

/** Auth is available when we have a test user and a Clerk secret to mint sign-in tokens. */
export const HAS_AUTH = Boolean(TEST_EMAIL && process.env.CLERK_SECRET_KEY);
/** Write flows also need an explicit opt-in, because they create data. */
export const WRITES_ALLOWED = process.env.E2E_ALLOW_WRITES === "1";

/** "QA-<label>-<run id>": unique per run so repeated runs don't collide. */
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export function qaName(label: string): string {
  return `QA-${label}-${RUN_ID}`;
}

/** A valid 1×1 PNG, used for drawing uploads. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** Waits for a sonner toast whose text matches. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 15_000,
  });
}

/** Returns the project id from a /projects/<id> URL. */
export function projectIdFromUrl(url: string): string {
  const m = new URL(url).pathname.match(/\/projects\/([^/?#]+)/);
  if (!m) throw new Error(`Not a project URL: ${url}`);
  return m[1];
}
