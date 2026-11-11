import { auth } from "@clerk/nextjs/server";
import { DrawingType } from "@prisma/client";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { DRAWING_DETAIL_INCLUDE, storeDrawingFile } from "@/lib/drawing-storage";
import { newRequestId, removeStoredFile } from "@/lib/storage";

const DRAWING_TYPES = new Set(Object.values(DrawingType));
const LOG_TAG = "[API_PROJECT_DRAWINGS_UPLOAD_POST]";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = newRequestId();
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

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error(LOG_TAG, `requestId=${requestId}`, "multipart parse failed", parseErr);
      return NextResponse.json(
        { data: null, error: "Invalid multipart form data" },
        { status: 400 }
      );
    }

    const nameRaw = formData.get("name");
    const typeRaw = formData.get("type");
    const versionNoteRaw = formData.get("versionNote");
    const fileField = formData.get("file");

    if (typeof nameRaw !== "string" || !nameRaw.trim()) {
      return NextResponse.json({ data: null, error: "name is required" }, { status: 400 });
    }
    if (typeof typeRaw !== "string" || !DRAWING_TYPES.has(typeRaw as DrawingType)) {
      return NextResponse.json(
        { data: null, error: "type is required and must be a valid DrawingType" },
        { status: 400 }
      );
    }

    const stored = await storeDrawingFile({
      file: fileField instanceof File ? fileField : null,
      firmId: user.firmId,
      projectId: params.id,
      logTag: LOG_TAG,
      requestId,
    });
    if (!stored.ok) return stored.response;

    const versionNote =
      typeof versionNoteRaw === "string" && versionNoteRaw.trim()
        ? versionNoteRaw.trim().slice(0, 2000)
        : null;

    try {
      const drawing = await db.drawing.create({
        data: {
          projectId: params.id,
          name: nameRaw.trim().slice(0, 200),
          type: typeRaw as DrawingType,
          fileUrl: stored.url,
          fileSize: stored.size,
          mimeType: stored.contentType,
          uploadedById: user.id,
          versions: {
            create: { version: 1, fileUrl: stored.url, fileSize: stored.size, note: versionNote },
          },
        },
        include: DRAWING_DETAIL_INCLUDE,
      });

      return NextResponse.json({ data: drawing, error: null }, { status: 201 });
    } catch (dbErr) {
      console.error(LOG_TAG, `requestId=${requestId}`, "database error after storage upload", dbErr);
      await removeStoredFile(stored.url).catch((delErr) =>
        console.error(LOG_TAG, `requestId=${requestId}`, "failed to remove orphan blob", delErr)
      );
      return NextResponse.json(
        { data: null, error: `Failed to save drawing (ref ${requestId})` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(LOG_TAG, `requestId=${requestId}`, "unhandled error", error);
    return NextResponse.json(
      { data: null, error: `Internal server error (ref ${requestId})` },
      { status: 500 }
    );
  }
}
