import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isPlausiblePortalToken } from "@/lib/portal-token";

/**
 * Public, unauthenticated portal payload. Everything is an explicit `select`
 * so firm-internal data (client notes, plan, other projects, payment provider
 * ids, the token itself, staff details) can never leak by adding a column.
 */
const PORTAL_SELECT = {
  id: true,
  name: true,
  type: true,
  stage: true,
  status: true,
  location: true,
  area: true,
  startDate: true,
  deadline: true,
  firm: {
    select: {
      name: true,
      logo: true,
      brandColor: true,
      phone: true,
      email: true,
      website: true,
      city: true,
      plan: true, // used below, stripped before responding
    },
  },
  client: { select: { name: true } },
  milestones: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      name: true,
      stage: true,
      amount: true,
      gstPercent: true,
      dueDate: true,
      status: true,
      paidAt: true,
      razorpayLinkUrl: true,
      description: true,
      clientDecisionOpen: true,
    },
  },
  drawings: {
    where: { status: "APPROVED" as const },
    orderBy: { updatedAt: "desc" as const },
    select: { id: true, name: true, type: true, version: true, fileUrl: true, mimeType: true, updatedAt: true },
  },
  siteUpdates: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
    select: { id: true, note: true, photos: true, weather: true, milestone: true, createdAt: true },
  },
  clientDecisions: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
    select: {
      id: true,
      outcome: true,
      comment: true,
      respondentName: true,
      createdAt: true,
      milestone: { select: { id: true, name: true, stage: true } },
    },
  },
} satisfies Prisma.ProjectSelect;

type PortalRow = Prisma.ProjectGetPayload<{ select: typeof PORTAL_SELECT }>;

export type PortalProjectPayload = Omit<PortalRow, "firm" | "clientDecisions"> & {
  firm: Omit<PortalRow["firm"], "plan">;
  pendingMilestoneDecisions: PortalRow["milestones"];
  recentClientDecisions: PortalRow["clientDecisions"];
};

export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = params.token?.trim();
    if (!token || !isPlausiblePortalToken(token)) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const project = await db.project.findUnique({
      where: { clientToken: token },
      select: PORTAL_SELECT,
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const { firm, clientDecisions, ...rest } = project;
    const { plan, ...publicFirm } = firm;
    const canUseClientDecisions = plan === "enterprise";

    const payload: PortalProjectPayload = {
      ...rest,
      firm: publicFirm,
      pendingMilestoneDecisions: canUseClientDecisions
        ? project.milestones.filter((m) => m.clientDecisionOpen)
        : [],
      recentClientDecisions: canUseClientDecisions ? clientDecisions : [],
    };

    return NextResponse.json(
      { data: payload, error: null },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[PORTAL_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
