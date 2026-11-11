import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DRAWING_DETAIL_INCLUDE,
  findFirmDrawing,
  storeDrawingFile,
} from "@/lib/drawing-storage";
import { newRequestId, removeStoredFile } from "@/lib/storage";

const LOG_TAG = "[API_DRAWING_VERSION_POST]";

/** Upload a new revision: bumps the version, resets status to Pending Review. */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; drawingId: string } }
) {
  const requestId = newRequestId();
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

    const { user, drawing } = await findFirmDrawing({
      clerkId: userId,
      projectId: params.id,
      drawingId: params.drawingId,
    });
    if (!user || !drawing) {
      return NextResponse.json({ data: null, error: "Drawing not found" }, { status: 404 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ data: null, error: "Invalid multipart form data" }, { status: 400 });
    }

    const noteRaw = formData.get("note");
    const note = typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 2000) : null;
    const fileField = formData.get("file");

    const stored = await storeDrawingFile({
      file: fileField instanceof File ? fileField : null,
      firmId: user.firmId,
      projectId: params.id,
      logTag: LOG_TAG,
      requestId,
    });
    if (!stored.ok) return stored.response;

    try {
      const updated = await db.$transaction(async (tx) => {
        // Derive from stored versions as well as drawing.version so older rows
        // that never got a v1 DrawingVersion still number correctly.
        const latest = await tx.drawingVersion.aggregate({
          where: { drawingId: drawing.id },
          _max: { version: true },
        });
        const nextVersion = Math.max(latest._max.version ?? 0, drawing.version) + 1;

        await tx.drawingVersion.create({
          data: {
            drawingId: drawing.id,
            version: nextVersion,
            fileUrl: stored.url,
            fileSize: stored.size,
            note,
          },
        });
        return tx.drawing.update({
          where: { id: drawing.id },
          data: {
            version: nextVersion,
            fileUrl: stored.url,
            fileSize: stored.size,
            mimeType: stored.contentType,
            status: "PENDING_REVIEW",
          },
          include: DRAWING_DETAIL_INCLUDE,
        });
      });
      return NextResponse.json({ data: updated, error: null }, { status: 201 });
    } catch (dbErr) {
      console.error(LOG_TAG, `requestId=${requestId}`, "database error after storage upload", dbErr);
      await removeStoredFile(stored.url).catch(() => undefined);
      return NextResponse.json(
        { data: null, error: `Failed to save new version (ref ${requestId})` },
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
