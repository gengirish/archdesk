import type { Prisma } from "@prisma/client";

/** 3-letter prefix from the firm name, e.g. "Sanskruti Design Studio" → "SAN". */
export function firmInvoicePrefix(firmName: string): string {
  const alpha = firmName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (alpha + "XXX").slice(0, 3);
}

export function formatInvoiceNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Claims the next invoice sequence for (firm, year) inside the caller's
 * transaction. The INSERT … ON CONFLICT DO UPDATE takes a row lock, so
 * concurrent requests serialise and each gets a distinct number; if the
 * caller's transaction rolls back, the increment rolls back too, so numbers
 * have no gaps.
 *
 * The first claim for a (firm, year) seeds the counter from invoices that
 * already exist (created before this table), so old numbers aren't reused.
 */
export async function claimInvoiceSequence(
  tx: Prisma.TransactionClient,
  firmId: string,
  year: number
): Promise<number> {
  await tx.$executeRaw`
    INSERT INTO invoice_sequences ("firmId", "year", "last")
    SELECT ${firmId}, ${year}, COALESCE(MAX(
      CASE WHEN i."invoiceNo" ~ ('-' || ${year}::text || '-[0-9]+$')
        THEN CAST(substring(i."invoiceNo" from '([0-9]+)$') AS INTEGER) END
    ), 0)
    FROM invoices i
    JOIN milestones m ON m.id = i."milestoneId"
    JOIN projects p ON p.id = m."projectId"
    WHERE p."firmId" = ${firmId}
    ON CONFLICT ("firmId", "year") DO NOTHING
  `;
  const rows = await tx.$queryRaw<{ last: number }[]>`
    UPDATE invoice_sequences SET "last" = "last" + 1
    WHERE "firmId" = ${firmId} AND "year" = ${year}
    RETURNING "last"
  `;
  const next = rows[0]?.last;
  if (typeof next !== "number") throw new Error("Failed to claim invoice sequence");
  return next;
}
