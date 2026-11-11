import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deliverClientNudge } from "@/lib/client-nudge";

/** Manual nudges: at most one successful nudge per milestone in this window. */
const NUDGE_COOLDOWN_HOURS = 12;

function friendlyDeliveryError(raw?: string): string {
  if (!raw) return "Couldn't send the nudge. Please try again.";
  if (/api key|not configured|unauthori[sz]ed|forbidden/i.test(raw)) {
    return `Email isn't set up correctly (${raw}). Ask an admin to check the AgentMail (or Resend) settings.`;
  }
  if (/client email is missing/i.test(raw)) {
    return "This client has no email address. Add one to the client first.";
  }
  if (/domain|from address|verify/i.test(raw)) {
    return `The sender address isn't verified with the email provider (${raw}).`;
  }
  return `Couldn't send the nudge: ${raw}`;
}

const clientNudgeSchema = z.object({
  channel: z.enum(["email", "whatsapp"]).default("email"),
  message: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        firm: {
          select: { plan: true },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }
    if (user.firm.plan !== "enterprise") {
      return NextResponse.json(
        { data: null, error: "Client nudges require Enterprise plan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = clientNudgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid payload" }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
      select: {
        id: true,
        name: true,
        clientToken: true,
        client: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const milestone = await db.milestone.findFirst({
      where: {
        id: params.milestoneId,
        projectId: params.id,
      },
      select: {
        id: true,
        name: true,
        clientDecisionOpen: true,
        clientDecisionOpenedAt: true,
      },
    });
    if (!milestone) {
      return NextResponse.json({ data: null, error: "Milestone not found" }, { status: 404 });
    }
    if (!milestone.clientDecisionOpen) {
      return NextResponse.json(
        { data: null, error: "This milestone is not awaiting a client decision" },
        { status: 409 }
      );
    }

    const since = new Date(Date.now() - NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000);
    const recent = await db.clientNudge.findFirst({
      where: { milestoneId: milestone.id, status: { in: ["SENT", "QUEUED"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recent) {
      const nextAt = new Date(recent.createdAt.getTime() + NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000);
      const time = nextAt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      });
      return NextResponse.json(
        {
          data: null,
          error: `The client was already nudged in the last ${NUDGE_COOLDOWN_HOURS} hours. You can nudge again after ${time}.`,
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil((nextAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || request.nextUrl.origin;
    const portalUrl = `${appUrl}/portal/${project.clientToken}`;
    const channelUpper = parsed.data.channel.toUpperCase() as "EMAIL" | "WHATSAPP";
    const idempotencySeed = `${project.id}:${milestone.id}:${milestone.clientDecisionOpenedAt?.getTime() ?? "na"}`;

    const delivery = await deliverClientNudge(
      channelUpper,
      {
        projectName: project.name,
        milestoneName: milestone.name,
        clientName: project.client.name,
        clientEmail: project.client.email,
        clientPhone: project.client.phone,
        portalUrl,
        customMessage: parsed.data.message,
      },
      idempotencySeed
    );

    const persisted = await db.clientNudge.create({
      data: {
        projectId: project.id,
        milestoneId: milestone.id,
        requestedById: user.id,
        channel: channelUpper,
        status: delivery.status,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        idempotencyKey: delivery.idempotencyKey,
        message: parsed.data.message,
        errorMessage: delivery.errorMessage,
        metadata: {
          clientId: project.client.id,
          clientName: project.client.name,
          portalUrl,
        },
        sentAt: delivery.status === "SENT" ? new Date() : null,
      },
    });

    if (delivery.status === "FAILED") {
      console.error(
        "[API_MILESTONE_CLIENT_NUDGE_POST] delivery failed",
        { nudgeId: persisted.id, provider: delivery.provider, error: delivery.errorMessage }
      );
      return NextResponse.json(
        { data: null, error: friendlyDeliveryError(delivery.errorMessage) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: {
        queued: true,
        channel: parsed.data.channel,
        nudgeId: persisted.id,
        status: persisted.status,
        queuedAt: persisted.createdAt.toISOString(),
        projectId: project.id,
        projectName: project.name,
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        client: {
          name: project.client.name,
          phone: project.client.phone,
          email: project.client.email,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error("[API_MILESTONE_CLIENT_NUDGE_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
