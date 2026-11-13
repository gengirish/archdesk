/**
 * Invoice numbering under concurrency, against a real Postgres.
 *
 * Opt-in and NEVER against production:
 *   TEST_DATABASE_URL=postgres://…neon-branch… npm run test:integration
 *
 * The database needs the current schema (`DATABASE_URL=$TEST_DATABASE_URL npx prisma db push`).
 * It only touches invoice_sequences rows whose firmId starts with "QA-" and
 * deletes them afterwards.
 */
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { claimInvoiceSequence } from "@/lib/invoice-number";

const url = process.env.TEST_DATABASE_URL;
const looksLikeProd = !!url && !!process.env.DATABASE_URL && url === process.env.DATABASE_URL;
const enabled = !!url && !looksLikeProd;

describe.skipIf(!enabled)("claimInvoiceSequence (Postgres)", () => {
  // describe.skipIf still evaluates this body, so only connect when enabled.
  const db = enabled ? new PrismaClient({ datasources: { db: { url } } }) : (null as unknown as PrismaClient);
  const firmId = `QA-concurrency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const year = 2099;

  afterAll(async () => {
    if (!enabled) return;
    await db.$executeRaw`DELETE FROM invoice_sequences WHERE "firmId" = ${firmId}`;
    await db.$disconnect();
  });

  it("20 parallel claims get 1..20 with no duplicates", async () => {
    const claims = await Promise.all(
      Array.from({ length: 20 }, () =>
        db.$transaction((tx) => claimInvoiceSequence(tx, firmId, year), { timeout: 20_000 })
      )
    );
    expect([...claims].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  }, 60_000);

  it("a rolled-back transaction leaves no gap", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await claimInvoiceSequence(tx, firmId, year);
        throw new Error("simulated failure after claiming");
      })
    ).rejects.toThrow("simulated failure");
    const next = await db.$transaction((tx) => claimInvoiceSequence(tx, firmId, year));
    expect(next).toBe(21);
  }, 30_000);
});

describe.skipIf(enabled)("claimInvoiceSequence (Postgres)", () => {
  it.skip(
    looksLikeProd
      ? "TEST_DATABASE_URL equals DATABASE_URL — refusing to run against that database"
      : "set TEST_DATABASE_URL (a Neon branch or local Postgres) to run",
    () => {}
  );
});
