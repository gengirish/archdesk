import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generatePortalToken } from "@/lib/portal-token";
import { NextRequest, NextResponse } from "next/server";
import { ActivityType, LeadStage, ProjectType } from "@prisma/client";
import {
  firstLeadIssue,
  leadUpdateSchema,
  normalizeIndianMobile,
  stageChangeNote,
} from "@/lib/validation/lead";

const LEAD_INCLUDE = {
  activities: { orderBy: { createdAt: "desc" as const }, include: { user: true } },
};

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
      include: LEAD_INCLUDE,
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

    const parsed = leadUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: firstLeadIssue(parsed.error) }, { status: 400 });
    }
    const input = parsed.data;

    const existing = await db.lead.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Lead not found" }, { status: 404 });
    }

    const stageChanged = input.stage !== undefined && input.stage !== existing.stage;

    const lead = await db.$transaction(async (tx) => {
      if (stageChanged && input.stage) {
        await tx.leadActivity.create({
          data: {
            leadId: existing.id,
            userId: user.id,
            type: ActivityType.STAGE_CHANGE,
            note: stageChangeNote(existing.stage, input.stage),
          },
        });
      }

      return tx.lead.update({
        where: { id: existing.id },
        data: input,
        include: LEAD_INCLUDE,
      });
    });

    return NextResponse.json({ data: lead, error: null });
  } catch (error) {
    console.error("[API_LEADS_ID_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

class AlreadyConvertedError extends Error {}

/**
 * Convert lead → project (stage WON, convertedProjectId). Reuses an existing
 * client in the firm with the same normalised mobile number instead of
 * creating a duplicate.
 */
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
      return NextResponse.json({ data: null, error: "Lead already converted" }, { status: 409 });
    }

    const projectType = lead.projectType ?? ProjectType.RESIDENTIAL;
    const leadPhone = normalizeIndianMobile(lead.phone);

    // Phones are stored in mixed formats (older rows predate normalisation),
    // so compare normalised digits in JS rather than with an equality query.
    const firmClients = leadPhone
      ? await db.client.findMany({
          where: { firmId: user.firmId },
          select: { id: true, phone: true },
        })
      : [];
    const existingClient = leadPhone
      ? firmClients.find((c) => normalizeIndianMobile(c.phone) === leadPhone)
      : undefined;

    const result = await db.$transaction(async (tx) => {
      const clientId =
        existingClient?.id ??
        (
          await tx.client.create({
            data: {
              firmId: user.firmId,
              name: lead.name,
              phone: leadPhone ?? lead.phone,
              email: lead.email,
              address: lead.address,
              notes: lead.notes,
            },
            select: { id: true },
          })
        ).id;

      const created = await tx.project.create({
        data: {
          firmId: user.firmId,
          clientId,
          clientToken: generatePortalToken(),
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
          note: `${stageChangeNote(lead.stage, LeadStage.WON)} (converted to project)`,
        },
      });

      // Conditional claim: if a concurrent request already converted this lead,
      // throw so this transaction (client + project) rolls back.
      const claimed = await tx.lead.updateMany({
        where: { id: lead.id, convertedProjectId: null },
        data: { stage: LeadStage.WON, convertedProjectId: created.id },
      });
      if (claimed.count === 0) throw new AlreadyConvertedError();

      return created;
    });

    return NextResponse.json(
      { data: { ...result, reusedClient: Boolean(existingClient) }, error: null },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AlreadyConvertedError) {
      return NextResponse.json({ data: null, error: "Lead already converted" }, { status: 409 });
    }
    console.error("[API_LEADS_ID_CONVERT_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
