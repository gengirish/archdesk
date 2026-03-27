import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Project, Firm, Client, Milestone, Invoice, Drawing, SiteUpdate, ClientDecision } from "@prisma/client";

export type PortalProjectPayload = Project & {
  firm: Firm;
  client: Client;
  milestones: (Milestone & { invoices: Invoice[] })[];
  drawings: Drawing[];
  siteUpdates: SiteUpdate[];
  pendingMilestoneDecisions: Pick<
    Milestone,
    "id" | "name" | "amount" | "gstPercent" | "dueDate" | "stage" | "description"
  >[];
  recentClientDecisions: (ClientDecision & {
    milestone: Pick<Milestone, "id" | "name" | "stage">;
  })[];
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse<ApiResponse<PortalProjectPayload>>> {
  try {
    const token = params.token?.trim();
    if (!token) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const project = await db.project.findUnique({
      where: { clientToken: token },
      include: {
        firm: true,
        client: true,
        milestones: {
          orderBy: { createdAt: "asc" },
          include: { invoices: true },
        },
        drawings: {
          where: { status: "APPROVED" },
          orderBy: { updatedAt: "desc" },
        },
        siteUpdates: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        clientDecisions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            milestone: {
              select: { id: true, name: true, stage: true },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const canUseClientDecisions = project.firm.plan === "enterprise";
    const pendingMilestoneDecisions = canUseClientDecisions
      ? await db.milestone.findMany({
          where: { projectId: project.id, clientDecisionOpen: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            amount: true,
            gstPercent: true,
            dueDate: true,
            stage: true,
            description: true,
          },
        })
      : [];

    return NextResponse.json({
      data: {
        ...project,
        pendingMilestoneDecisions,
        recentClientDecisions: canUseClientDecisions ? project.clientDecisions : [],
      },
      error: null,
    });
  } catch (error) {
    console.error("[PORTAL_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
