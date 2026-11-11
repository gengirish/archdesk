import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { LeadStage } from "@prisma/client";
import { firstLeadIssue, leadCreateSchema } from "@/lib/validation/lead";

const LEAD_STAGES = new Set(Object.values(LeadStage));

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const stageParam = request.nextUrl.searchParams.get("stage");
    const stageFilter =
      stageParam && LEAD_STAGES.has(stageParam as LeadStage) ? (stageParam as LeadStage) : undefined;
    if (stageParam && !stageFilter) {
      return NextResponse.json({ data: null, error: "Invalid stage filter" }, { status: 400 });
    }

    const leads = await db.lead.findMany({
      where: {
        firmId: user.firmId,
        ...(stageFilter ? { stage: stageFilter } : {}),
      },
      include: {
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: leads, error: null });
  } catch (error) {
    console.error("[API_LEADS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const parsed = leadCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: firstLeadIssue(parsed.error) }, { status: 400 });
    }

    const lead = await db.lead.create({
      data: { firmId: user.firmId, ...parsed.data },
      include: {
        activities: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
    });

    return NextResponse.json({ data: lead, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_LEADS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
