import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generatePortalToken } from "@/lib/portal-token";

/** Rotates the client-portal token. The old link stops working immediately. */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const result = await db.project.updateMany({
      where: { id: params.id, firmId: user.firmId },
      data: { clientToken: generatePortalToken() },
    });
    if (result.count === 0) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const project = await db.project.findUnique({
      where: { id: params.id },
      select: { id: true, clientToken: true },
    });
    return NextResponse.json({ data: project, error: null });
  } catch (error) {
    console.error("[API_PROJECT_PORTAL_TOKEN_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
