import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generatePortalToken } from "@/lib/portal-token";
import type { ApiResponse, ProjectWithRelations } from "@/types";
import { firstIssue, projectCreateSchema } from "@/lib/validation/project";

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ProjectWithRelations[]>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const stage = searchParams.get("stage");

    const projects = await db.project.findMany({
      where: {
        firmId: user.firmId,
        ...(type ? { type: type as never } : {}),
        ...(stage ? { stage: stage as never } : {}),
      },
      include: {
        client: true,
        team: { include: { user: true } },
        _count: { select: { drawings: true, milestones: true, siteUpdates: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: projects as ProjectWithRelations[], error: null });
  } catch (error) {
    console.error("[PROJECTS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ProjectWithRelations>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const parsed = projectCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: firstIssue(parsed.error) }, { status: 400 });
    }
    const { name, clientId, type, budget, area, location, startDate, deadline, description } =
      parsed.data;

    const client = await db.client.findFirst({
      where: { id: clientId, firmId: user.firmId },
    });
    if (!client) {
      return NextResponse.json({ data: null, error: "Client not found" }, { status: 404 });
    }

    const project = await db.project.create({
      data: {
        firmId: user.firmId,
        clientId,
        clientToken: generatePortalToken(),
        name,
        type,
        description,
        budget,
        area,
        location,
        startDate,
        deadline,
        team: {
          create: { userId: user.id, role: "Lead Architect" },
        },
      },
      include: {
        client: true,
        team: { include: { user: true } },
        _count: { select: { drawings: true, milestones: true, siteUpdates: true } },
      },
    });

    return NextResponse.json({ data: project as ProjectWithRelations, error: null }, { status: 201 });
  } catch (error) {
    console.error("[PROJECTS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
