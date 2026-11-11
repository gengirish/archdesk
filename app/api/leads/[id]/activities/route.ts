import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { firstLeadIssue, leadActivitySchema } from "@/lib/validation/lead";

/** Log a manual activity (call / note / meeting …) against a lead. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const parsed = leadActivitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: firstLeadIssue(parsed.error) }, { status: 400 });
    }

    const lead = await db.lead.findFirst({
      where: { id: params.id, firmId: user.firmId },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json({ data: null, error: "Lead not found" }, { status: 404 });
    }

    const [activity] = await db.$transaction([
      db.leadActivity.create({
        data: { leadId: lead.id, userId: user.id, ...parsed.data },
        include: { user: true },
      }),
      // Touch the lead so lists ordered by updatedAt surface recent activity.
      db.lead.update({ where: { id: lead.id }, data: { updatedAt: new Date() } }),
    ]);

    return NextResponse.json({ data: activity, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_LEAD_ACTIVITY_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
