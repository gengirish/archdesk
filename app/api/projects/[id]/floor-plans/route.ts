import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FloorPlanSourceType } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  DEFAULT_SAMPLE_FLOOR_PLAN,
  FLOOR_PLAN_SCHEMA_VERSION,
  normalizeFloorPlanPayload,
} from "@/lib/flat-scene-generator";
import type { ApiResponse } from "@/types";

const floorPlanSchema = z.object({
  name: z.string().min(1).max(120),
  sourceType: z.nativeEnum(FloorPlanSourceType).optional(),
  unit: z.string().min(1).max(16).optional(),
  scale: z.number().positive().optional(),
  wallHeight: z.number().positive().optional(),
  wallThickness: z.number().positive().optional(),
  planJson: z.unknown().optional(),
});

type FloorPlanListItem = {
  id: string;
  name: string;
  sourceType: FloorPlanSourceType;
  unit: string;
  scale: number;
  wallHeight: number;
  wallThickness: number;
  planJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<FloorPlanListItem[]>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const floorPlans = await db.floorPlan.findMany({
      where: { projectId: params.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: floorPlans, error: null });
  } catch (error) {
    console.error("[PROJECT_FLOOR_PLANS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<FloorPlanListItem>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = floorPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid floor plan payload" }, { status: 400 });
    }

    let normalizedPlanJson;
    try {
      normalizedPlanJson = parsed.data.planJson
        ? normalizeFloorPlanPayload(parsed.data.planJson)
        : DEFAULT_SAMPLE_FLOOR_PLAN;
    } catch (error) {
      console.error("[PROJECT_FLOOR_PLANS_NORMALIZE]", error);
      return NextResponse.json({ data: null, error: "Invalid floor plan geometry" }, { status: 400 });
    }

    if (normalizedPlanJson.schemaVersion !== FLOOR_PLAN_SCHEMA_VERSION) {
      return NextResponse.json({ data: null, error: "Unsupported floor plan schema version" }, { status: 400 });
    }

    const floorPlan = await db.floorPlan.create({
      data: {
        projectId: params.id,
        name: parsed.data.name,
        sourceType: parsed.data.sourceType ?? FloorPlanSourceType.MANUAL,
        unit: parsed.data.unit ?? "mm",
        scale: parsed.data.scale ?? 1,
        wallHeight: parsed.data.wallHeight ?? 3000,
        wallThickness: parsed.data.wallThickness ?? 200,
        planJson: normalizedPlanJson,
      },
    });

    return NextResponse.json({ data: floorPlan, error: null }, { status: 201 });
  } catch (error) {
    console.error("[PROJECT_FLOOR_PLANS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

