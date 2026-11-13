/**
 * Phase 4 data clean-up. Run AFTER `npx prisma db push` (Firm.phone is now nullable).
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/phase4-migrate.ts           # dry run
 *   … --apply                     # clear placeholder firm phones ("—", "-", "n/a" …) to NULL
 *   … --apply --rename-hubbali    # also rewrite city values that are exactly "Hubbali"
 *
 * The Hubbali rename is opt-in. The old default was "Hubbali", but a user could
 * also have typed it, and the database can't tell the two apart. The dry run
 * lists the rows so you can decide.
 */
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const renameCity = process.argv.includes("--rename-hubbali");
const db = new PrismaClient();
const PLACEHOLDERS = ["", "-", "—", "–", "n/a", "N/A", "na", "NA", "nil", "none"];

async function main() {
  console.log(apply ? "APPLY mode — writing changes" : "DRY RUN — no changes (pass --apply to write)");

  // 1. Placeholder firm phones → NULL
  const firms = await db.firm.findMany({
    where: { phone: { in: PLACEHOLDERS } },
    select: { id: true, name: true, phone: true },
  });
  console.log(`firms with a placeholder phone: ${firms.length}`);
  for (const f of firms) console.log(`  ${f.id}  ${f.name}  phone=${JSON.stringify(f.phone)}`);
  if (apply && firms.length) {
    const r = await db.firm.updateMany({ where: { id: { in: firms.map((f) => f.id) } }, data: { phone: null } });
    console.log(`  cleared ${r.count}`);
  }

  // 2. "Hubbali" → "Hubballi" (opt-in)
  const [firmCity, vendorCity, clientCity] = await Promise.all([
    db.firm.findMany({ where: { city: "Hubbali" }, select: { id: true, name: true } }),
    db.vendor.findMany({ where: { city: "Hubbali" }, select: { id: true, name: true } }),
    db.client.findMany({ where: { city: "Hubbali" }, select: { id: true, name: true } }),
  ]);
  console.log(
    `city = "Hubbali": firms ${firmCity.length}, vendors ${vendorCity.length}, clients ${clientCity.length}`
  );
  for (const f of firmCity) console.log(`  firm    ${f.id}  ${f.name}`);
  for (const v of vendorCity) console.log(`  vendor  ${v.id}  ${v.name}`);
  for (const c of clientCity) console.log(`  client  ${c.id}  ${c.name}`);
  if (renameCity) {
    if (apply) {
      const data = { city: "Hubballi" };
      const [a, b, c] = await db.$transaction([
        db.firm.updateMany({ where: { city: "Hubbali" }, data }),
        db.vendor.updateMany({ where: { city: "Hubbali" }, data }),
        db.client.updateMany({ where: { city: "Hubbali" }, data }),
      ]);
      console.log(`  renamed: firms ${a.count}, vendors ${b.count}, clients ${c.count}`);
    } else {
      console.log("  (would rename these with --apply)");
    }
  } else if (firmCity.length + vendorCity.length + clientCity.length > 0) {
    console.log("  skip rename (pass --rename-hubbali to rewrite them)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
