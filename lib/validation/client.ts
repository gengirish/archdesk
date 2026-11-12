/**
 * Client validation shared by the clients UI and /api/clients routes.
 * Client-safe: imports nothing server-only.
 */
import { z } from "zod";
import { indianMobileSchema, optionalEmailSchema, optionalTextSchema, phoneSearchDigits } from "./common";

const clientFields = {
  name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
  phone: indianMobileSchema,
  email: optionalEmailSchema,
  address: optionalTextSchema(300),
  city: optionalTextSchema(80),
  state: optionalTextSchema(60),
  notes: optionalTextSchema(2000),
};

export const clientCreateSchema = z.object(clientFields);
export type ClientCreateInput = z.input<typeof clientCreateSchema>;

export const clientUpdateSchema = z
  .object({
    name: clientFields.name.optional(),
    phone: clientFields.phone.optional(),
    email: clientFields.email.optional(),
    address: clientFields.address.optional(),
    city: clientFields.city.optional(),
    state: clientFields.state.optional(),
    notes: clientFields.notes.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");
export type ClientUpdateInput = z.input<typeof clientUpdateSchema>;

export const CLIENT_NOTES_MAX = 2000;

/**
 * Client-side search: name / email substring, or phone by digits so
 * "+91 98765", "98765 43210" and "9876543210" all match.
 */
export function matchesClientSearch(
  c: { name: string; email?: string | null; phone: string },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)) return true;
  const digits = phoneSearchDigits(q);
  return digits ? c.phone.replace(/\D/g, "").includes(digits) : c.phone.includes(q);
}
