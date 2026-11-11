/**
 * Phase 2 data migration. Run AFTER `npx prisma db push` has applied the schema.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/phase2-migrate.ts            # dry run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/phase2-migrate.ts --apply    # write
 *   … --apply --rotate-portal-tokens   # also replace every legacy portal token (breaks old links)
 *
 * Steps (idempotent):
 *  1. invoices.firmId ← milestone → project → firmId (needed for per-firm numbering).
 *  2. Rotate portal tokens that are legacy cuids (only with --rotate-portal-tokens).
 *     New tokens are 43-char base64url; legacy ones are ~25 lowercase chars.
 */
import { PrismaClient } from "@prisma/client";
import { generatePortalToken } from "../lib/portal-token";

const apply = process.argv.includes("--apply");
const rotate = process.argv.includes("--rotate-portal-tokens");
const db = new PrismaClient();

const isLegacyToken = (t: string) => !/^[A-Za-z0-9_-]{43}$/.test(t);

async function main() {
  console.log(apply ? "APPLY mode — writing changes" : "DRY RUN — no changes (pass --apply to write)");

  // 1. Backfill invoice firmId
  const missing = await db.invoice.findMany({
    where: { firmId: null },
    select: { id: true, milestone: { select: { project: { select: { firmId: true } } } } },
  });
  console.log(`invoices missing firmId: ${missing.length}`);
  if (apply) {
    for (const inv of missing) {
      await db.invoice.update({
        where: { id: inv.id },
        data: { firmId: inv.milestone.project.firmId },
      });
    }
  }

  // 2. Rotate legacy portal tokens
  const projects = await db.project.findMany({ select: { id: true, clientToken: true } });
  const legacy = projects.filter((p) => isLegacyToken(p.clientToken));
  console.log(`projects with legacy (predictable) portal tokens: ${legacy.length}`);
  if (rotate) {
    if (apply) {
      for (const p of legacy) {
        await db.project.update({ where: { id: p.id }, data: { clientToken: generatePortalToken() } });
      }
      console.log(`rotated ${legacy.length} tokens — old portal links no longer work; re-share from each project page`);
    } else {
      console.log("(would rotate these with --apply)");
    }
  } else if (legacy.length > 0) {
    console.log("skip rotation (pass --rotate-portal-tokens to replace them)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
