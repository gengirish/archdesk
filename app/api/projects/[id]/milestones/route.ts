import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { milestoneCreateSchema } from "@/lib/validation/milestone";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const milestones = await db.milestone.findMany({
      where: { projectId: params.id },
      include: {
        invoices: { orderBy: { createdAt: "desc" } },
        // Latest client decision, so Billing can show "Approved — note" not just "Closed".
        clientDecisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { outcome: true, comment: true, respondentName: true, createdAt: true },
        },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: milestones, error: null });
  } catch (error) {
    console.error("[API_PROJECT_MILESTONES_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const parsed = milestoneCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid milestone" },
        { status: 400 }
      );
    }
    const { name, stage, amount, dueDate, description, gstPercent } = parsed.data;

    const milestone = await db.milestone.create({
      data: {
        projectId: params.id,
        name,
        stage,
        amount,
        dueDate: dueDate ?? undefined,
        description: description ?? undefined,
        gstPercent,
      },
      include: { invoices: true },
    });

    return NextResponse.json({ data: milestone, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_PROJECT_MILESTONES_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
