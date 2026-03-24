import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ProjectStage } from "@prisma/client";

const PROJECT_STAGES = new Set(Object.values(ProjectStage));

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
      include: { invoices: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
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

    const body = await request.json();
    const { name, stage, amount, dueDate, description, gstPercent } = body;

    if (!name || stage === undefined || stage === null || amount === undefined || amount === null) {
      return NextResponse.json({ data: null, error: "Name, stage, and amount are required" }, { status: 400 });
    }
    if (!PROJECT_STAGES.has(stage)) {
      return NextResponse.json({ data: null, error: "Invalid project stage" }, { status: 400 });
    }

    const milestone = await db.milestone.create({
      data: {
        projectId: params.id,
        name,
        stage,
        amount,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        description,
        gstPercent: gstPercent !== undefined && gstPercent !== null ? gstPercent : 18,
      },
      include: { invoices: true },
    });

    return NextResponse.json({ data: milestone, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_PROJECT_MILESTONES_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
