import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { DrawingType } from "@prisma/client";

const DRAWING_TYPES = new Set(Object.values(DrawingType));

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

    const drawings = await db.drawing.findMany({
      where: { projectId: params.id },
      include: {
        versions: { orderBy: { version: "desc" } },
        comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: drawings, error: null });
  } catch (error) {
    console.error("[API_PROJECT_DRAWINGS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const LOG_TAG = "[API_PROJECT_DRAWINGS_POST]";
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ data: null, error: "Invalid JSON body" }, { status: 400 });
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ data: null, error: "Invalid JSON body" }, { status: 400 });
    }
    const { name, type, fileUrl, fileSize, mimeType } = body as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ data: null, error: "Name, type, and fileUrl are required" }, { status: 400 });
    }
    if (typeof type !== "string" || !DRAWING_TYPES.has(type as DrawingType)) {
      return NextResponse.json({ data: null, error: "Invalid drawing type" }, { status: 400 });
    }
    if (typeof fileUrl !== "string" || !fileUrl.trim()) {
      return NextResponse.json({ data: null, error: "Name, type, and fileUrl are required" }, { status: 400 });
    }

    const drawing = await db.drawing.create({
      data: {
        projectId: params.id,
        name: name.trim(),
        type: type as DrawingType,
        fileUrl: fileUrl.trim(),
        fileSize: typeof fileSize === "number" && Number.isFinite(fileSize) ? fileSize : undefined,
        mimeType: typeof mimeType === "string" ? mimeType : undefined,
        uploadedById: user.id,
      },
      include: {
        versions: { orderBy: { version: "desc" } },
        comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
      },
    });

    return NextResponse.json({ data: drawing, error: null }, { status: 201 });
  } catch (error) {
    console.error(LOG_TAG, error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
