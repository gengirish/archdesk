import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { PLAN_HIERARCHY, type PlanTier } from "@/lib/feature-tiers";

export type ProvisionUserInput = {
  clerkId: string;
  email: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

export function displayName(firstName: string | null, lastName: string | null, email: string): string {
  const fromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  const local = email.split("@")[0];
  if (local) return local;
  return "Architect";
}

/**
 * Plan given to firms created at sign-up. Set SIGNUP_DEFAULT_PLAN=enterprise
 * during the beta so testers get every feature; unset it to go back to "free".
 * Only affects new firms — existing firms keep their plan.
 */
export function signupDefaultPlan(): PlanTier {
  const value = process.env.SIGNUP_DEFAULT_PLAN?.trim().toLowerCase();
  return PLAN_HIERARCHY.includes(value as PlanTier) ? (value as PlanTier) : "free";
}

/**
 * Creates the firm + OWNER user for a Clerk user if no DB row exists yet.
 * Shared by the Clerk webhook and the sign-in fallback in getAuthUser().
 */
export async function provisionUser(input: ProvisionUserInput) {
  const { clerkId, email, phone, imageUrl } = input;
  const name = displayName(input.firstName, input.lastName, email);

  const existing = await db.user.findUnique({ where: { clerkId }, include: { firm: true } });
  if (existing) return existing;

  try {
    return await db.$transaction(async (tx) => {
      const firm = await tx.firm.create({
        data: { name: `${name}'s Firm`, email, phone: phone || null, plan: signupDefaultPlan() },
      });

      return tx.user.create({
        data: {
          clerkId,
          firmId: firm.id,
          name,
          email,
          phone: phone || null,
          role: UserRole.OWNER,
          avatar: imageUrl || null,
        },
        include: { firm: true },
      });
    });
  } catch (err) {
    // Webhook and sign-in fallback can race; if the other one won, use its row.
    const raced = await db.user.findUnique({ where: { clerkId }, include: { firm: true } });
    if (raced) return raced;
    throw err;
  }
}
