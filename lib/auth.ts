import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { provisionUser } from "@/lib/provision-user";

export type AuthUser = Awaited<ReturnType<typeof getAuthUser>>;

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { firm: true },
  });
  if (user) return user;

  // Signed in with Clerk but no DB row (e.g. user.created webhook missed):
  // provision from the Clerk profile so the account works immediately.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `user_${clerkUser.id}@pending.archdesk.local`;

  return provisionUser({
    clerkId: clerkUser.id,
    email,
    phone: clerkUser.primaryPhoneNumber?.phoneNumber ?? clerkUser.phoneNumbers[0]?.phoneNumber ?? "",
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl || null,
  });
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
