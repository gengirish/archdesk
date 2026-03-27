import { auth } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deliverClientNudge } from "@/lib/client-nudge";
import { db } from "@/lib/db";
import { classifyDecisionSla, isNudgeCooldownComplete } from "@/lib/decision-sla";

const runSchema = z.object({
  send: z.boolean().default(false),
  channel: z.enum(["email", "whatsapp"]).default("email"),
  limit: z.number().int().min(1).max(100).default(25),
  breachHours: z.number().int().min(4).max(168).default(48),
  nudgeCooldownHours: z.number().int().min(1).max(168).default(24),
  message: z.string().trim().max(500).optional(),
});

type MilestoneRow = {
  id: string;
  name: string;
  clientDecisionOpenedAt: Date | null;
  project: {
    id: string;
    name: string;
    clientToken: string;
    client: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    };
  };
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { firm: { select: { plan: true } } },
    });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }
    if (user.firm.plan !== "enterprise") {
      return NextResponse.json(
        { data: null, error: "Decision SLA automations require Enterprise plan" },
        { status: 403 },
      );
    }
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { data: null, error: "Only Owner/Admin can run decision SLA automation" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = runSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid payload" }, { status: 400 });
    }

    const now = new Date();
    const config = parsed.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
    const channelUpper = config.channel.toUpperCase() as "EMAIL" | "WHATSAPP";

    const openMilestones = await db.milestone.findMany({
      where: {
        project: { firmId: user.firmId },
        clientDecisionOpen: true,
      },
      orderBy: { clientDecisionOpenedAt: "asc" },
      take: config.limit,
      select: {
        id: true,
        name: true,
        clientDecisionOpenedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            clientToken: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    const nudgeHistory = await db.clientNudge.findMany({
      where: {
        projectId: { in: openMilestones.map((milestone) => milestone.project.id) },
        milestoneId: { in: openMilestones.map((milestone) => milestone.id) },
      },
      orderBy: { createdAt: "desc" },
      select: { milestoneId: true, createdAt: true },
    });
    const latestNudgeByMilestone = new Map<string, Date>();
    for (const nudge of nudgeHistory) {
      if (latestNudgeByMilestone.has(nudge.milestoneId)) continue;
      latestNudgeByMilestone.set(nudge.milestoneId, nudge.createdAt);
    }

    const items = (openMilestones as MilestoneRow[]).map((milestone) => {
      const sla = classifyDecisionSla(milestone.clientDecisionOpenedAt, now, config.breachHours);
      const lastNudgedAt = latestNudgeByMilestone.get(milestone.id) ?? null;
      const canAutoNudge = isNudgeCooldownComplete(lastNudgedAt, now, config.nudgeCooldownHours);
      return {
        milestone,
        project: milestone.project,
        sla,
        lastNudgedAt,
        canAutoNudge,
      };
    });

    const breached = items.filter((item) => item.sla.state === "BREACHED");
    const sent: Array<{ milestoneId: string; status: string; error: string | null }> = [];

    if (config.send) {
      for (const item of breached) {
        if (!item.canAutoNudge) continue;

        const portalUrl = `${appUrl}/portal/${item.project.clientToken}`;
        const idempotencySeed = `${item.project.id}:${item.milestone.id}:${item.milestone.clientDecisionOpenedAt?.getTime() ?? "na"}:sla`;
        const delivery = await deliverClientNudge(
          channelUpper,
          {
            projectName: item.project.name,
            milestoneName: item.milestone.name,
            clientName: item.project.client.name,
            clientEmail: item.project.client.email,
            clientPhone: item.project.client.phone,
            portalUrl,
            customMessage: config.message,
          },
          idempotencySeed,
        );

        await db.clientNudge.create({
          data: {
            projectId: item.project.id,
            milestoneId: item.milestone.id,
            requestedById: user.id,
            channel: channelUpper,
            status: delivery.status,
            provider: delivery.provider,
            providerMessageId: delivery.providerMessageId,
            idempotencyKey: delivery.idempotencyKey,
            message: config.message,
            errorMessage: delivery.errorMessage,
            metadata: {
              automation: "decision_sla",
              breachHours: config.breachHours,
              nudgeCooldownHours: config.nudgeCooldownHours,
              ageHours: item.sla.ageHours,
            },
            sentAt: delivery.status === "SENT" ? now : null,
          },
        });

        sent.push({
          milestoneId: item.milestone.id,
          status: delivery.status,
          error: delivery.errorMessage ?? null,
        });
      }
    }

    return NextResponse.json({
      data: {
        mode: config.send ? "execute" : "dry-run",
        scanned: items.length,
        healthy: items.filter((item) => item.sla.state === "HEALTHY").length,
        atRisk: items.filter((item) => item.sla.state === "AT_RISK").length,
        breached: breached.length,
        nudged: sent.filter((item) => item.status !== "FAILED").length,
        failed: sent.filter((item) => item.status === "FAILED").length,
        items: items.map((item) => ({
          projectId: item.project.id,
          projectName: item.project.name,
          milestoneId: item.milestone.id,
          milestoneName: item.milestone.name,
          slaState: item.sla.state,
          ageHours: item.sla.ageHours,
          lastNudgedAt: item.lastNudgedAt?.toISOString() ?? null,
          canAutoNudge: item.canAutoNudge,
        })),
      },
      error: null,
    });
  } catch (error) {
    console.error("[API_AUTOMATION_DECISION_SLA_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
