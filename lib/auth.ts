import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export type AuthUser = Awaited<ReturnType<typeof getAuthUser>>;

export async function getAuthUser() {
  const { userId } = await auth();
  if (!userId) return null;

  return db.user.findUnique({
    where: { clerkId: userId },
    include: { firm: true },
  });
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
