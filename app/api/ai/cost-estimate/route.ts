import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  computeEstimate,
  ESTIMATOR_PROJECT_TYPES,
  type CostEstimateResult,
} from "@/lib/estimator";
import type { ApiResponse } from "@/types";

export type { CostEstimateResult } from "@/lib/estimator";

const bodySchema = z.object({
  projectType: z.enum(ESTIMATOR_PROJECT_TYPES),
  area: z.number().positive().finite().max(10_000_000),
  quality: z.enum(["standard", "premium", "luxury"]),
  location: z.string().trim().min(1).max(200),
  floors: z.number().int().min(1).max(120).optional(),
  includeInterior: z.boolean().optional(),
});

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<CostEstimateResult>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const first = flat.formErrors[0] ?? Object.values(flat.fieldErrors).flat()[0];
      return NextResponse.json({ data: null, error: first || "Invalid input" }, { status: 400 });
    }

    return NextResponse.json({ data: computeEstimate(parsed.data), error: null });
  } catch (error) {
    console.error("[AI_COST_ESTIMATE_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
