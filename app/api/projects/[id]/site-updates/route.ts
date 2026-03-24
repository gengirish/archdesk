import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ProjectStage } from "@prisma/client";

const PROJECT_STAGES = new Set(Object.values(ProjectStage));

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const siteUpdates = await db.siteUpdate.findMany({
      where: { projectId: params.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: siteUpdates, error: null });
  } catch (error) {
    console.error("[API_PROJECT_SITE_UPDATES_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const project = await db.project.findFirst({
      where: { id: params.id, firmId: user.firmId },
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { note, photos, milestone, weather } = body;

    if (milestone !== undefined && milestone !== null && !PROJECT_STAGES.has(milestone)) {
      return NextResponse.json({ data: null, error: "Invalid milestone stage" }, { status: 400 });
    }
    if (photos !== undefined && photos !== null && !Array.isArray(photos)) {
      return NextResponse.json({ data: null, error: "photos must be an array of strings" }, { status: 400 });
    }
    const photoList = Array.isArray(photos) ? photos : [];
    if (photoList.some((p: unknown) => typeof p !== "string")) {
      return NextResponse.json({ data: null, error: "photos must be an array of strings" }, { status: 400 });
    }

    const siteUpdate = await db.siteUpdate.create({
      data: {
        projectId: params.id,
        userId: user.id,
        note,
        photos: photoList,
        milestone,
        weather,
      },
      include: { user: true },
    });

    return NextResponse.json({ data: siteUpdate, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_PROJECT_SITE_UPDATES_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
