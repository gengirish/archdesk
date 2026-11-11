import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { ApiResponse, ProjectWithRelations } from "@/types";
import { firstIssue, projectUpdateSchema } from "@/lib/validation/project";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<ProjectWithRelations>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
      include: {
        client: true,
        team: { include: { user: true } },
        _count: { select: { drawings: true, milestones: true, siteUpdates: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project as ProjectWithRelations, error: null });
  } catch (error) {
    console.error("[PROJECT_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<ProjectWithRelations>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const existing = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const parsed = projectUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: firstIssue(parsed.error) }, { status: 400 });
    }
    const input = parsed.data;

    // Validate the date pair against stored values when only one side changes.
    const startDate = input.startDate !== undefined ? input.startDate : existing.startDate;
    const deadline = input.deadline !== undefined ? input.deadline : existing.deadline;
    if (startDate && deadline && deadline < startDate) {
      return NextResponse.json(
        { data: null, error: "Deadline can't be before the start date" },
        { status: 400 }
      );
    }

    if (input.clientId !== undefined) {
      const client = await db.client.findFirst({
        where: { id: input.clientId, firmId: user.firmId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ data: null, error: "Client not found" }, { status: 404 });
      }
    }

    // Keep stage and status consistent: finishing one finishes the other.
    const data: Prisma.ProjectUncheckedUpdateInput = { ...input };
    if (input.stage === "COMPLETED" && input.status === undefined) data.status = "COMPLETED";
    if (input.status === "COMPLETED" && input.stage === undefined) data.stage = "COMPLETED";

    const project = await db.project.update({
      where: { id: params.id },
      data,
      include: {
        client: true,
        team: { include: { user: true } },
        _count: { select: { drawings: true, milestones: true, siteUpdates: true } },
      },
    });

    return NextResponse.json({ data: project as ProjectWithRelations, error: null });
  } catch (error) {
    console.error("[PROJECT_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
