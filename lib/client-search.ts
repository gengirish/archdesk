import type { Prisma } from "@prisma/client";
import { phoneSearchDigits } from "@/lib/validation/common";

/**
 * Name / email / phone search for clients. Phone-like queries ("+91 98765",
 * "98765 43210") match stored 10-digit phones by digits; the raw text is also
 * tried so phones saved before normalisation still match.
 */
export function clientSearchWhere(search: string): Prisma.ClientWhereInput {
  const digits = phoneSearchDigits(search);
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      ...(digits ? [{ phone: { contains: digits } }] : []),
    ],
  };
}
