import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isPlausiblePortalToken } from "@/lib/portal-token";
import { ClientDecisionOutcome } from "@prisma/client";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_POSTS = 12;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

type RateLimitEntry = { count: number; resetAt: number };
type IdempotencyEntry = {
  decisionId: string;
  createdAt: number;
  projectId: string;
  milestoneId: string;
};

const globalState = globalThis as unknown as {
  portalDecisionRateLimit?: Map<string, RateLimitEntry>;
  portalDecisionIdempotency?: Map<string, IdempotencyEntry>;
};

const rateLimitStore = globalState.portalDecisionRateLimit ?? new Map<string, RateLimitEntry>();
const idempotencyStore = globalState.portalDecisionIdempotency ?? new Map<string, IdempotencyEntry>();
if (!globalState.portalDecisionRateLimit) {
  globalState.portalDecisionRateLimit = rateLimitStore;
}
if (!globalState.portalDecisionIdempotency) {
  globalState.portalDecisionIdempotency = idempotencyStore;
}

const createDecisionSchema = z.object({
  milestoneId: z.string().min(1),
  outcome: z.nativeEnum(ClientDecisionOutcome),
  comment: z.string().trim().min(1).max(2000),
  costDeltaAmount: z.number().finite().optional(),
  costDeltaNote: z.string().trim().max(500).optional(),
  respondentName: z.string().trim().min(1).max(120).optional(),
});

function getRequesterKey(request: NextRequest, token: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${token}:${ip}`;
}

function enforcePostRateLimit(request: NextRequest, token: string): number | null {
  const key = getRequesterKey(request, token);
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (existing.count >= RATE_LIMIT_MAX_POSTS) {
    return Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  }

  rateLimitStore.set(key, { ...existing, count: existing.count + 1 });
  return null;
}

function getIdempotencyKey(request: NextRequest): string | null {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 8 || key.length > 128) return null;
  return key;
}

function cleanupIdempotencyStore(now: number) {
  for (const [key, value] of Array.from(idempotencyStore.entries())) {
    if (value.createdAt + IDEMPOTENCY_TTL_MS < now) {
      idempotencyStore.delete(key);
    }
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token?.trim();
    if (!token || !isPlausiblePortalToken(token)) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const project = await db.project.findUnique({
      where: { clientToken: token },
      select: {
        id: true,
        firm: {
          select: { plan: true },
        },
        milestones: {
          where: { clientDecisionOpen: true },
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
        },
      },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }
    if (project.firm.plan !== "enterprise") {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const recentDecisions = await db.clientDecision.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        milestone: {
          select: { id: true, name: true, stage: true },
        },
      },
    });

    return NextResponse.json({
      data: {
        pendingMilestoneDecisions: project.milestones,
        recentDecisions,
      },
      error: null,
    });
  } catch (error) {
    console.error("[PORTAL_DECISIONS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token?.trim();
    if (!token || !isPlausiblePortalToken(token)) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }
    const retryAfterSeconds = enforcePostRateLimit(request, token);
    if (retryAfterSeconds !== null) {
      return NextResponse.json(
        { data: null, error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = createDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid payload" }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { clientToken: token },
      select: {
        id: true,
        firm: {
          select: { plan: true },
        },
      },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }
    if (project.firm.plan !== "enterprise") {
      return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
    }

    const now = Date.now();
    cleanupIdempotencyStore(now);
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const namespaced = `${project.id}:${parsed.data.milestoneId}:${idempotencyKey}`;
      const existing = idempotencyStore.get(namespaced);
      if (existing) {
        const existingDecision = await db.clientDecision.findFirst({
          where: {
            id: existing.decisionId,
            projectId: existing.projectId,
            milestoneId: existing.milestoneId,
          },
        });
        if (existingDecision) {
          return NextResponse.json({ data: existingDecision, error: null });
        }
      }
    }

    const milestone = await db.milestone.findFirst({
      where: {
        id: parsed.data.milestoneId,
        projectId: project.id,
      },
      select: { id: true, clientDecisionOpen: true },
    });
    if (!milestone) {
      return NextResponse.json({ data: null, error: "Milestone not found" }, { status: 404 });
    }
    if (!milestone.clientDecisionOpen) {
      return NextResponse.json({ data: null, error: "This decision request is closed" }, { status: 409 });
    }

    const created = await db.$transaction(async (tx) => {
      const updated = await tx.milestone.updateMany({
        where: { id: milestone.id, clientDecisionOpen: true },
        data: { clientDecisionOpen: false },
      });
      if (updated.count === 0) {
        throw new Error("Decision already submitted");
      }

      return tx.clientDecision.create({
        data: {
          projectId: project.id,
          milestoneId: milestone.id,
          outcome: parsed.data.outcome,
          comment: parsed.data.comment,
          costDeltaAmount: parsed.data.costDeltaAmount,
          costDeltaNote: parsed.data.costDeltaNote,
          respondentName: parsed.data.respondentName,
        },
      });
    });

    const finalIdempotencyKey = getIdempotencyKey(request);
    if (finalIdempotencyKey) {
      idempotencyStore.set(`${project.id}:${milestone.id}:${finalIdempotencyKey}`, {
        decisionId: created.id,
        createdAt: now,
        projectId: project.id,
        milestoneId: milestone.id,
      });
    }

    return NextResponse.json({ data: created, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Decision already submitted") {
      return NextResponse.json({ data: null, error: "This decision request is closed" }, { status: 409 });
    }
    console.error("[PORTAL_DECISIONS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
