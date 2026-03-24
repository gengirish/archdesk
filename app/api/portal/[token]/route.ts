import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Project, Firm, Client, Milestone, Invoice, Drawing, SiteUpdate } from "@prisma/client";

export type PortalProjectPayload = Project & {
  firm: Firm;
  client: Client;
  milestones: (Milestone & { invoices: Invoice[] })[];
  drawings: Drawing[];
  siteUpdates: SiteUpdate[];
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
      },
    });

    if (!project) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project, error: null });
  } catch (error) {
    console.error("[PORTAL_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
