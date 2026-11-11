import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

type Params = { params: { id: string } };

async function loadContext(clerkId: string, projectId: string) {
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return null;
  const project = await db.project.findFirst({
    where: { id: projectId, firmId: user.firmId },
    select: { id: true },
  });
  if (!project) return null;
  return { user, project };
}

const addSchema = z.object({
  userId: z.string().min(1, "Choose a team member"),
  role: z.string().trim().min(1, "Role is required").max(60).default("Architect"),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

    const parsed = addSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const ctx = await loadContext(userId, params.id);
    if (!ctx) return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });

    // Only people in the same firm can be added.
    const member = await db.user.findFirst({
      where: { id: parsed.data.userId, firmId: ctx.user.firmId },
      select: { id: true },
    });
    if (!member) {
      return NextResponse.json({ data: null, error: "Team member not found" }, { status: 404 });
    }

    const row = await db.projectMember.upsert({
      where: { projectId_userId: { projectId: params.id, userId: member.id } },
      create: { projectId: params.id, userId: member.id, role: parsed.data.role },
      update: { role: parsed.data.role },
      include: { user: true },
    });
    return NextResponse.json({ data: row, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_PROJECT_TEAM_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

    const memberId = request.nextUrl.searchParams.get("userId");
    if (!memberId) {
      return NextResponse.json({ data: null, error: "userId is required" }, { status: 400 });
    }

    const ctx = await loadContext(userId, params.id);
    if (!ctx) return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });

    const count = await db.projectMember.count({ where: { projectId: params.id } });
    if (count <= 1) {
      return NextResponse.json(
        { data: null, error: "A project needs at least one team member" },
        { status: 409 }
      );
    }

    const result = await db.projectMember.deleteMany({
      where: { projectId: params.id, userId: memberId },
    });
    if (result.count === 0) {
      return NextResponse.json({ data: null, error: "Not on this project" }, { status: 404 });
    }
    return NextResponse.json({ data: { removed: memberId }, error: null });
  } catch (error) {
    console.error("[API_PROJECT_TEAM_DELETE]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
