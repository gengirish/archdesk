import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ActivityType, LeadSource, LeadStage, ProjectType } from "@prisma/client";

const LEAD_STAGES = new Set(Object.values(LeadStage));
const LEAD_SOURCES = new Set(Object.values(LeadSource));
const PROJECT_TYPES = new Set(Object.values(ProjectType));

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const lead = await db.lead.findFirst({
      where: { id: params.id, firmId: user.firmId },
      include: {
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ data: null, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ data: lead, error: null });
  } catch (error) {
    console.error("[API_LEADS_ID_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const existing = await db.lead.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body.stage !== undefined && body.stage !== null && !LEAD_STAGES.has(body.stage)) {
      return NextResponse.json({ data: null, error: "Invalid lead stage" }, { status: 400 });
    }
    if (body.source !== undefined && body.source !== null && !LEAD_SOURCES.has(body.source)) {
      return NextResponse.json({ data: null, error: "Invalid lead source" }, { status: 400 });
    }
    if (body.projectType !== undefined && body.projectType !== null && !PROJECT_TYPES.has(body.projectType)) {
      return NextResponse.json({ data: null, error: "Invalid project type" }, { status: 400 });
    }

    const stageChanged =
      body.stage !== undefined && body.stage !== null && body.stage !== existing.stage;

    const lead = await db.$transaction(async (tx) => {
      if (stageChanged) {
        await tx.leadActivity.create({
          data: {
            leadId: existing.id,
            userId: user.id,
            type: ActivityType.STAGE_CHANGE,
            note: `${existing.stage} → ${body.stage}`,
          },
        });
      }

      return tx.lead.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.email !== undefined && { email: body.email }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.projectType !== undefined && { projectType: body.projectType }),
          ...(body.budget !== undefined && { budget: body.budget }),
          ...(body.area !== undefined && { area: body.area }),
          ...(body.source !== undefined && { source: body.source }),
          ...(body.stage !== undefined && { stage: body.stage }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.followUpAt !== undefined && {
            followUpAt: body.followUpAt ? new Date(body.followUpAt) : null,
          }),
        },
        include: {
          activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
        },
      });
    });

    return NextResponse.json({ data: lead, error: null });
  } catch (error) {
    console.error("[API_LEADS_ID_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

/** Convert lead → client + project (stage WON, convertedProjectId). */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const lead = await db.lead.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!lead) {
      return NextResponse.json({ data: null, error: "Lead not found" }, { status: 404 });
    }
    if (lead.convertedProjectId) {
      return NextResponse.json({ data: null, error: "Lead already converted" }, { status: 400 });
    }

    const projectType = lead.projectType ?? ProjectType.RESIDENTIAL;

    const project = await db.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          firmId: user.firmId,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          address: lead.address,
          notes: lead.notes,
        },
      });

      const created = await tx.project.create({
        data: {
          firmId: user.firmId,
          clientId: client.id,
          name: `${lead.name} — Project`,
          type: projectType,
          budget: lead.budget ?? undefined,
          area: lead.area ?? undefined,
          location: lead.address ?? undefined,
          team: { create: { userId: user.id, role: "Lead Architect" } },
        },
        include: {
          client: true,
          team: { include: { user: true } },
          _count: { select: { drawings: true, milestones: true, siteUpdates: true } },
        },
      });

      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          type: ActivityType.STAGE_CHANGE,
          note: `${lead.stage} → ${LeadStage.WON} (converted to project)`,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          stage: LeadStage.WON,
          convertedProjectId: created.id,
        },
      });

      return created;
    });

    return NextResponse.json({ data: project, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_LEADS_ID_CONVERT_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
