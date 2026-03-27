import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  FLOOR_PLAN_SCHEMA_VERSION,
  normalizeFloorPlanPayload,
  toFlatScenePayload,
} from "@/lib/flat-scene-generator";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  floorPlanId: z.string().cuid(),
  sceneName: z.string().min(1).max(120).optional(),
});

type GeneratedSceneResponse = {
  id: string;
  name: string;
  status: "GENERATED";
  floorPlanId: string | null;
  sceneJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<GeneratedSceneResponse>>> {
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
      select: { id: true, name: true },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid generation payload" }, { status: 400 });
    }

    const floorPlan = await db.floorPlan.findFirst({
      where: {
        id: parsed.data.floorPlanId,
        projectId: params.id,
      },
    });
    if (!floorPlan) {
      return NextResponse.json({ data: null, error: "Floor plan not found" }, { status: 404 });
    }

    let normalizedPlanJson;
    let scenePayload;
    try {
      normalizedPlanJson = normalizeFloorPlanPayload(floorPlan.planJson);
      if (normalizedPlanJson.schemaVersion !== FLOOR_PLAN_SCHEMA_VERSION) {
        return NextResponse.json({ data: null, error: "Unsupported floor plan schema version" }, { status: 400 });
      }

      scenePayload = toFlatScenePayload({
        planJson: normalizedPlanJson,
        unit: floorPlan.unit,
        wallHeight: floorPlan.wallHeight,
        wallThickness: floorPlan.wallThickness,
      });
    } catch (error) {
      console.error("[PROJECT_FLAT_SCENE_GENERATE_PARSE]", error);
      return NextResponse.json({ data: null, error: "Invalid floor plan geometry" }, { status: 422 });
    }

    const scene = await db.flatScene.create({
      data: {
        projectId: params.id,
        floorPlanId: floorPlan.id,
        name: parsed.data.sceneName ?? `${project.name} — Generated Scene`,
        status: "GENERATED",
        sceneJson: scenePayload,
        generationMeta: {
          generatedAt: new Date().toISOString(),
          generator: "rule-based-v1",
        },
      },
    });

    return NextResponse.json({ data: scene as GeneratedSceneResponse, error: null }, { status: 201 });
  } catch (error) {
    console.error("[PROJECT_FLAT_SCENE_GENERATE_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

