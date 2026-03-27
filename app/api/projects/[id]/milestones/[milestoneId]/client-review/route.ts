import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";

const clientReviewSchema = z.object({
  open: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        firm: {
          select: { plan: true },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }
    if (user.firm.plan !== "enterprise") {
      return NextResponse.json(
        { data: null, error: "Client decision requests require Enterprise plan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = clientReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid payload" }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const milestone = await db.milestone.findFirst({
      where: { id: params.milestoneId, projectId: params.id },
      select: { id: true, clientDecisionOpen: true },
    });
    if (!milestone) {
      return NextResponse.json({ data: null, error: "Milestone not found" }, { status: 404 });
    }

    const updated = await db.milestone.update({
      where: { id: params.milestoneId },
      data: {
        clientDecisionOpen: parsed.data.open,
        ...(parsed.data.open ? { clientDecisionOpenedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error("[API_MILESTONE_CLIENT_REVIEW_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
