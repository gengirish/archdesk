import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { ApiResponse, ProjectWithRelations } from "@/types";

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

    const body = await request.json();

    const project = await db.project.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.stage !== undefined && { stage: body.stage }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.budget !== undefined && { budget: body.budget }),
        ...(body.area !== undefined && { area: body.area }),
        ...(body.location !== undefined && { location: body.location }),
      },
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
