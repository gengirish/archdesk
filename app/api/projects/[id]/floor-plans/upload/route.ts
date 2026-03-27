import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeFloorPlanPayload } from "@/lib/flat-scene-generator";
import { sanitizeFloorPlanName, toFloorPlanFromUpload } from "@/lib/floor-plan-upload";
import type { ApiResponse } from "@/types";

const LOG_TAG = "[PROJECT_FLOOR_PLAN_UPLOAD_POST]";

const fieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),
  unit: z.string().trim().min(1).max(16).optional(),
  scale: z.coerce.number().positive().optional(),
  wallHeight: z.coerce.number().positive().optional(),
  wallThickness: z.coerce.number().positive().optional(),
});

function readOptionalText(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : undefined;
}

type UploadedFloorPlanResponse = {
  id: string;
  name: string;
  sourceType: "DXF" | "PDF" | "IMAGE";
  unit: string;
  scale: number;
  wallHeight: number;
  wallThickness: number;
  planJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<UploadedFloorPlanResponse>>> {
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

    const formData = await request.formData();
    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;
    if (!file) {
      return NextResponse.json({ data: null, error: "file is required" }, { status: 400 });
    }

    const fieldsParsed = fieldsSchema.safeParse({
      name: readOptionalText(formData, "name"),
      unit: readOptionalText(formData, "unit"),
      scale: readOptionalText(formData, "scale"),
      wallHeight: readOptionalText(formData, "wallHeight"),
      wallThickness: readOptionalText(formData, "wallThickness"),
    });
    if (!fieldsParsed.success) {
      return NextResponse.json({ data: null, error: "Invalid upload payload" }, { status: 400 });
    }

    const fields = fieldsParsed.data;

    let parsedUpload;
    try {
      parsedUpload = await toFloorPlanFromUpload(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid floor plan file";
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? ((error as { status: number }).status ?? 400)
          : 400;
      return NextResponse.json({ data: null, error: message }, { status });
    }

    const floorPlan = await db.floorPlan.create({
      data: {
        projectId: params.id,
        name: fields.name ?? sanitizeFloorPlanName(file.name),
        sourceType: parsedUpload.sourceType,
        unit: fields.unit ?? "mm",
        scale: fields.scale ?? 1,
        wallHeight: fields.wallHeight ?? 3000,
        wallThickness: fields.wallThickness ?? 200,
        planJson: normalizeFloorPlanPayload(parsedUpload.planJson),
      },
    });

    return NextResponse.json(
      {
        data: floorPlan as UploadedFloorPlanResponse,
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(LOG_TAG, error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
