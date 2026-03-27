import { auth } from "@clerk/nextjs/server";
import { ActivityType, ClientDecisionOutcome, InvoiceStatus, LeadStage, MilestoneStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classifyDecisionSla } from "@/lib/decision-sla";
import { calculateGST } from "@/lib/utils";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelForMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

function rolling12MonthKeys(end: Date): string[] {
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  const keys: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function activityTypeLabel(t: ActivityType): string {
  const map: Record<ActivityType, string> = {
    CALL: "Call",
    EMAIL: "Email",
    WHATSAPP: "WhatsApp",
    SITE_VISIT: "Site visit",
    PROPOSAL: "Proposal",
    NOTE: "Note",
    STAGE_CHANGE: "Stage change",
  };
  return map[t] ?? t;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const firmId = user.firmId;
    const now = new Date();
    const monthKeys = rolling12MonthKeys(now);
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    rangeStart.setHours(0, 0, 0, 0);
    const thirtyDaysAhead = new Date(now);
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
    const decisionWindowStart = new Date(now);
    decisionWindowStart.setDate(decisionWindowStart.getDate() - 30);

    const revenueBuckets = Object.fromEntries(monthKeys.map((k) => [k, 0])) as Record<string, number>;
    const invoicedBuckets = Object.fromEntries(monthKeys.map((k) => [k, 0])) as Record<string, number>;

    const [
      paidMilestonesInRange,
      invoicesInRange,
      byStage,
      byType,
      wonCount,
      lostCount,
      totalLeads,
      projectsForClients,
      totalReceivedAgg,
      totalPendingAgg,
      totalOverdueAgg,
      dueSoonMilestones,
      siteUpdates,
      leadActivities,
      paidInvoicesRecent,
      pendingDecisionCount,
      decisionOutcomeCounts,
      recentDecisionsForLatency,
      openDecisionMilestones,
      decisionsForProjectBottlenecks,
    ] = await Promise.all([
      db.milestone.findMany({
        where: {
          project: { firmId },
          paidAt: { gte: rangeStart },
          paidAmount: { not: null },
        },
        select: { paidAt: true, paidAmount: true },
      }),
      db.invoice.findMany({
        where: {
          milestone: { project: { firmId } },
          createdAt: { gte: rangeStart },
        },
        select: { createdAt: true, totalAmount: true },
      }),
      db.project.groupBy({
        by: ["stage"],
        where: { firmId },
        _count: { _all: true },
      }),
      db.project.groupBy({
        by: ["type"],
        where: { firmId },
        _count: { _all: true },
      }),
      db.lead.count({ where: { firmId, stage: LeadStage.WON } }),
      db.lead.count({ where: { firmId, stage: LeadStage.LOST } }),
      db.lead.count({ where: { firmId } }),
      db.project.findMany({
        where: { firmId },
        select: {
          budget: true,
          clientId: true,
          client: { select: { name: true } },
        },
      }),
      db.milestone.aggregate({
        where: { project: { firmId }, status: MilestoneStatus.PAID },
        _sum: { paidAmount: true },
      }),
      db.invoice.aggregate({
        where: {
          milestone: { project: { firmId } },
          status: {
            in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.DRAFT],
          },
        },
        _sum: { totalAmount: true },
      }),
      db.invoice.aggregate({
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
        _sum: { totalAmount: true },
      }),
      db.milestone.findMany({
        where: {
          project: { firmId },
          dueDate: { gte: now, lte: thirtyDaysAhead },
          status: { not: MilestoneStatus.PAID },
        },
        select: { amount: true, gstPercent: true },
      }),
      db.siteUpdate.findMany({
        where: { project: { firmId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { project: { select: { name: true } } },
      }),
      db.leadActivity.findMany({
        where: { lead: { firmId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { lead: { select: { name: true } } },
      }),
      db.invoice.findMany({
        where: {
          milestone: { project: { firmId } },
          paidAt: { not: null },
        },
        orderBy: { paidAt: "desc" },
        take: 10,
        include: {
          milestone: {
            select: {
              name: true,
              project: { select: { name: true } },
            },
          },
        },
      }),
      db.milestone.count({
        where: {
          project: { firmId },
          clientDecisionOpen: true,
        },
      }),
      db.clientDecision.groupBy({
        by: ["outcome"],
        where: {
          project: { firmId },
          createdAt: { gte: decisionWindowStart },
        },
        _count: { _all: true },
      }),
      db.clientDecision.findMany({
        where: {
          project: { firmId },
          createdAt: { gte: decisionWindowStart },
        },
        select: {
          createdAt: true,
          milestone: {
            select: {
              clientDecisionOpenedAt: true,
            },
          },
        },
      }),
      db.milestone.findMany({
        where: {
          project: { firmId },
          clientDecisionOpen: true,
        },
        select: {
          projectId: true,
          clientDecisionOpenedAt: true,
          project: {
            select: { name: true },
          },
        },
      }),
      db.clientDecision.findMany({
        where: {
          project: { firmId },
          createdAt: { gte: decisionWindowStart },
        },
        select: {
          projectId: true,
          createdAt: true,
          milestone: {
            select: {
              clientDecisionOpenedAt: true,
              project: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    for (const m of paidMilestonesInRange) {
      if (!m.paidAt || m.paidAmount == null) continue;
      const key = monthKey(new Date(m.paidAt));
      if (key in revenueBuckets) revenueBuckets[key] += m.paidAmount;
    }

    for (const inv of invoicesInRange) {
      const key = monthKey(new Date(inv.createdAt));
      if (key in invoicedBuckets) invoicedBuckets[key] += inv.totalAmount;
    }

    const revenueByMonth = monthKeys.map((key) => ({
      month: labelForMonthKey(key),
      revenue: Math.round(revenueBuckets[key] ?? 0),
      invoiced: Math.round(invoicedBuckets[key] ?? 0),
    }));

    const projectsByStage = byStage.map((row) => ({
      stage: row.stage,
      count: row._count._all,
    }));

    const projectsByType = byType.map((row) => ({
      type: row.type,
      count: row._count._all,
    }));

    const rate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 1000) / 10 : 0;

    const clientAgg = new Map<
      string,
      { name: string; projects: number; totalValue: number }
    >();
    for (const p of projectsForClients) {
      const cur = clientAgg.get(p.clientId) ?? {
        name: p.client.name,
        projects: 0,
        totalValue: 0,
      };
      cur.projects += 1;
      cur.totalValue += p.budget ?? 0;
      clientAgg.set(p.clientId, cur);
    }
    const topClients = Array.from(clientAgg.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        projects: c.projects,
        totalValue: Math.round(c.totalValue),
      }));

    let projectedNextMonth = 0;
    for (const m of dueSoonMilestones) {
      projectedNextMonth += calculateGST(m.amount, m.gstPercent).totalAmount;
    }
    projectedNextMonth = Math.round(projectedNextMonth);

    type ActivityRow = { type: string; description: string; date: Date };
    const activityRows: ActivityRow[] = [];

    for (const u of siteUpdates) {
      activityRows.push({
        type: "site_update",
        description: `Site update on ${u.project.name}`,
        date: u.createdAt,
      });
    }

    for (const a of leadActivities) {
      activityRows.push({
        type: "lead_activity",
        description: `${activityTypeLabel(a.type)} — ${a.lead.name}`,
        date: a.createdAt,
      });
    }

    for (const inv of paidInvoicesRecent) {
      if (!inv.paidAt) continue;
      const projName = inv.milestone.project.name;
      activityRows.push({
        type: "invoice_payment",
        description: `Payment received for ${inv.milestone.name} (${projName})`,
        date: inv.paidAt,
      });
    }

    activityRows.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentActivity = activityRows.slice(0, 10).map((a) => ({
      type: a.type,
      description: a.description,
      date: a.date.toISOString(),
    }));

    const decisionTotal = decisionOutcomeCounts.reduce((sum, row) => sum + row._count._all, 0);
    const approvedCount =
      decisionOutcomeCounts.find((row) => row.outcome === ClientDecisionOutcome.APPROVED)?._count._all ?? 0;
    const rejectedCount =
      decisionOutcomeCounts.find((row) => row.outcome === ClientDecisionOutcome.REJECTED)?._count._all ?? 0;
    const approvalRate = decisionTotal > 0 ? Math.round((approvedCount / decisionTotal) * 1000) / 10 : 0;

    let latencyHoursTotal = 0;
    let latencyCount = 0;
    for (const decision of recentDecisionsForLatency) {
      const openedAt = decision.milestone.clientDecisionOpenedAt;
      if (!openedAt) continue;
      const hours = (decision.createdAt.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
      if (!Number.isFinite(hours) || hours < 0) continue;
      latencyHoursTotal += hours;
      latencyCount += 1;
    }
    const avgDecisionHours = latencyCount > 0 ? Math.round((latencyHoursTotal / latencyCount) * 10) / 10 : 0;

    type BottleneckAggregate = {
      projectName: string;
      openRequests: number;
      oldestOpenHours: number;
      totalResponseHours: number;
      responseCount: number;
      decisionsLast30Days: number;
    };

    const bottleneckMap = new Map<string, BottleneckAggregate>();

    for (const item of openDecisionMilestones) {
      const current = bottleneckMap.get(item.projectId) ?? {
        projectName: item.project.name,
        openRequests: 0,
        oldestOpenHours: 0,
        totalResponseHours: 0,
        responseCount: 0,
        decisionsLast30Days: 0,
      };
      current.openRequests += 1;
      if (item.clientDecisionOpenedAt) {
        const openHours = (now.getTime() - item.clientDecisionOpenedAt.getTime()) / (1000 * 60 * 60);
        if (Number.isFinite(openHours) && openHours > current.oldestOpenHours) {
          current.oldestOpenHours = openHours;
        }
      }
      bottleneckMap.set(item.projectId, current);
    }

    for (const item of decisionsForProjectBottlenecks) {
      const current = bottleneckMap.get(item.projectId) ?? {
        projectName: item.milestone.project.name,
        openRequests: 0,
        oldestOpenHours: 0,
        totalResponseHours: 0,
        responseCount: 0,
        decisionsLast30Days: 0,
      };
      current.decisionsLast30Days += 1;
      const openedAt = item.milestone.clientDecisionOpenedAt;
      if (openedAt) {
        const responseHours = (item.createdAt.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
        if (Number.isFinite(responseHours) && responseHours >= 0) {
          current.totalResponseHours += responseHours;
          current.responseCount += 1;
        }
      }
      bottleneckMap.set(item.projectId, current);
    }

    const bottlenecksByProject = Array.from(bottleneckMap.entries())
      .map(([projectId, item]) => ({
        projectId,
        projectName: item.projectName,
        openRequests: item.openRequests,
        oldestOpenHours: Math.round(item.oldestOpenHours * 10) / 10,
        avgResponseHours:
          item.responseCount > 0
            ? Math.round((item.totalResponseHours / item.responseCount) * 10) / 10
            : 0,
        decisionsLast30Days: item.decisionsLast30Days,
      }))
      .sort((a, b) => {
        if (b.openRequests !== a.openRequests) return b.openRequests - a.openRequests;
        if (b.oldestOpenHours !== a.oldestOpenHours) return b.oldestOpenHours - a.oldestOpenHours;
        return b.avgResponseHours - a.avgResponseHours;
      })
      .slice(0, 5);

    const slaHealth = { healthy: 0, atRisk: 0, breached: 0 };
    for (const milestone of openDecisionMilestones) {
      const { state } = classifyDecisionSla(milestone.clientDecisionOpenedAt, now, 48);
      if (state === "BREACHED") slaHealth.breached += 1;
      else if (state === "AT_RISK") slaHealth.atRisk += 1;
      else slaHealth.healthy += 1;
    }

    return NextResponse.json({
      data: {
        revenueByMonth,
        projectsByStage,
        projectsByType,
        leadConversion: {
          total: totalLeads,
          won: wonCount,
          lost: lostCount,
          rate,
        },
        topClients,
        cashFlow: {
          totalReceived: Math.round(totalReceivedAgg._sum.paidAmount ?? 0),
          totalPending: Math.round(totalPendingAgg._sum.totalAmount ?? 0),
          totalOverdue: Math.round(totalOverdueAgg._sum.totalAmount ?? 0),
          projectedNextMonth,
        },
        decisionInsights: {
          totalDecisionsLast30Days: decisionTotal,
          approvedLast30Days: approvedCount,
          rejectedLast30Days: rejectedCount,
          approvalRate,
          openDecisionRequests: pendingDecisionCount,
          avgResponseHours: avgDecisionHours,
          slaHealth,
          bottlenecksByProject,
        },
        recentActivity,
      },
      error: null,
    });
  } catch (error) {
    console.error("[API_DASHBOARD_ANALYTICS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
