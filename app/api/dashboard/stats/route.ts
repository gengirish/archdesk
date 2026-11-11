import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { DrawingStatus, InvoiceStatus, LeadStage, ProjectStatus } from "@prisma/client";
import { computeBillingSummary, isMilestoneOverdue, milestoneTotal } from "@/lib/billing-metrics";
import { computeMonthlyRevenue } from "@/lib/dashboard-kpis";
import { pipelineValue } from "@/lib/validation/lead";
import { PROJECT_STAGES } from "@/lib/validation/project";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const firmId = user.firmId;
    const now = new Date();

    const [
      activeProjects,
      completedProjects,
      milestones,
      totalClients,
      activeLeads,
      overdueInvoices,
      pendingDrawingApprovals,
      stageGroups,
      recentProjects,
    ] = await Promise.all([
      db.project.count({ where: { firmId, status: ProjectStatus.ACTIVE } }),
      db.project.count({ where: { firmId, status: ProjectStatus.COMPLETED } }),
      db.milestone.findMany({
        where: { project: { firmId } },
        select: {
          amount: true,
          gstPercent: true,
          status: true,
          paidAmount: true,
          paidAt: true,
          dueDate: true,
        },
      }),
      db.client.count({ where: { firmId } }),
      db.lead.findMany({
        where: { firmId, stage: { notIn: [LeadStage.WON, LeadStage.LOST] } },
        select: { stage: true, budget: true },
      }),
      db.invoice.count({
        where: {
          milestone: { project: { firmId } },
          OR: [
            { status: InvoiceStatus.OVERDUE },
            { status: InvoiceStatus.UNPAID, milestone: { dueDate: { lt: now } } },
          ],
        },
      }),
      db.drawing.count({
        where: { project: { firmId }, status: DrawingStatus.PENDING_REVIEW },
      }),
      db.project.groupBy({
        by: ["stage"],
        where: { firmId, status: { in: [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD] } },
        _count: { _all: true },
      }),
      db.project.findMany({
        where: { firmId },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { client: true },
      }),
    ]);

    // Shared definitions (lib/billing-metrics.ts): amounts include GST.
    const billing = computeBillingSummary(milestones, now);
    const monthlyRevenue = computeMonthlyRevenue(milestones, now);
    const overdue = milestones.filter((m) => isMilestoneOverdue(m, now));
    const counts = new Map(stageGroups.map((g) => [g.stage as string, g._count._all]));
    const stageDistribution = PROJECT_STAGES.map((stage) => ({
      stage,
      count: counts.get(stage) ?? 0,
    }));

    return NextResponse.json({
      data: {
        activeProjects,
        completedProjects,
        totalRevenue: billing.collected,
        pendingRevenue: billing.outstanding,
        totalClients,
        totalLeads: activeLeads.length,
        overdueInvoices,
        recentProjects,
        billing,
        monthlyRevenue,
        pendingDrawingApprovals,
        pipelineValue: pipelineValue(activeLeads),
        overdueMilestones: {
          count: overdue.length,
          amount: overdue.reduce((s, m) => s + milestoneTotal(m), 0),
        },
        stageDistribution,
      },
      error: null,
    });
  } catch (error) {
    console.error("[API_DASHBOARD_STATS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
