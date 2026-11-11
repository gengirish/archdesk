import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Members of the signed-in user's firm (for team pickers). */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const members = await db.user.findMany({
      where: { firmId: user.firmId },
      select: { id: true, name: true, email: true, role: true, avatar: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: members, error: null });
  } catch (error) {
    console.error("[API_TEAM_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
