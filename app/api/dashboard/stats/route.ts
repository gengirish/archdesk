import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { InvoiceStatus, LeadStage, MilestoneStatus, ProjectStatus } from "@prisma/client";

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
      paidRevenueAgg,
      pendingRevenueAgg,
      totalClients,
      totalLeads,
      overdueInvoices,
      recentProjects,
    ] = await Promise.all([
      db.project.count({
        where: { firmId, status: ProjectStatus.ACTIVE },
      }),
      db.project.count({
        where: { firmId, status: ProjectStatus.COMPLETED },
      }),
      db.milestone.aggregate({
        where: { project: { firmId }, status: MilestoneStatus.PAID },
        _sum: { paidAmount: true },
      }),
      db.milestone.aggregate({
        where: { project: { firmId }, status: { not: MilestoneStatus.PAID } },
        _sum: { amount: true },
      }),
      db.client.count({ where: { firmId } }),
      db.lead.count({
        where: { firmId, stage: { notIn: [LeadStage.WON, LeadStage.LOST] } },
      }),
      db.invoice.count({
        where: {
          milestone: { project: { firmId } },
          OR: [
            { status: InvoiceStatus.OVERDUE },
            {
              status: InvoiceStatus.UNPAID,
              milestone: { dueDate: { lt: now } },
            },
          ],
        },
      }),
      db.project.findMany({
        where: { firmId },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { client: true },
      }),
    ]);

    const totalRevenue = paidRevenueAgg._sum.paidAmount ?? 0;
    const pendingRevenue = pendingRevenueAgg._sum.amount ?? 0;

    return NextResponse.json({
      data: {
        activeProjects,
        completedProjects,
        totalRevenue,
        pendingRevenue,
        totalClients,
        totalLeads,
        overdueInvoices,
        recentProjects,
      },
      error: null,
    });
  } catch (error) {
    console.error("[API_DASHBOARD_STATS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
