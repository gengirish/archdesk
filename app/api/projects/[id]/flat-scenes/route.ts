import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { FlatSceneStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";

type FlatSceneListItem = {
  id: string;
  name: string;
  status: FlatSceneStatus;
  floorPlanId: string | null;
  sceneJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<FlatSceneListItem[]>>> {
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

    const scenes = await db.flatScene.findMany({
      where: { projectId: params.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: scenes, error: null });
  } catch (error) {
    console.error("[PROJECT_FLAT_SCENES_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

