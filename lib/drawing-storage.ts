import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sanitizeDrawingStorageFileName,
  validateDrawingUploadFile,
} from "@/lib/drawing-upload";
import {
  STORAGE_FOLDERS,
  StorageNotConfiguredError,
  storePublicFile,
} from "@/lib/storage";

export const DRAWING_DETAIL_INCLUDE = {
  versions: { orderBy: { version: "desc" as const } },
  comments: {
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  },
};

type StoreResult =
  | { ok: true; url: string; size: number; contentType: string }
  | { ok: false; response: NextResponse };

function errorResponse(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status });
}

/**
 * Validates and stores an uploaded drawing file. On failure returns a ready
 * response; storage errors are logged with `requestId` so a user-visible
 * reference can be matched to the server log.
 */
export async function storeDrawingFile(params: {
  file: File | null;
  firmId: string;
  projectId: string;
  logTag: string;
  requestId: string;
}): Promise<StoreResult> {
  const validated = validateDrawingUploadFile(params.file);
  if (!validated.ok) {
    return { ok: false, response: errorResponse(validated.error, validated.status) };
  }

  const storageName = sanitizeDrawingStorageFileName(validated.file.name);
  const pathname = `${STORAGE_FOLDERS.DRAWINGS}/${params.firmId}/${params.projectId}/${storageName}`;

  try {
    const stored = await storePublicFile(pathname, validated.file, validated.contentType);
    return {
      ok: true,
      url: stored.url,
      size: validated.file.size,
      contentType: validated.contentType,
    };
  } catch (err) {
    console.error(params.logTag, `requestId=${params.requestId}`, "storage upload failed", err);
    if (err instanceof StorageNotConfiguredError) {
      return {
        ok: false,
        response: errorResponse(
          `File storage is not configured. Ask an admin to connect storage (ref ${params.requestId}).`,
          503
        ),
      };
    }
    return {
      ok: false,
      response: errorResponse(
        `Could not store the file. Please try again (ref ${params.requestId}).`,
        502
      ),
    };
  }
}

/** Loads a drawing only if it belongs to the given project in the user's firm. */
export async function findFirmDrawing(params: {
  clerkId: string;
  projectId: string;
  drawingId: string;
}) {
  const user = await db.user.findUnique({ where: { clerkId: params.clerkId } });
  if (!user) return { user: null, drawing: null };
  const drawing = await db.drawing.findFirst({
    where: {
      id: params.drawingId,
      projectId: params.projectId,
      project: { firmId: user.firmId },
    },
  });
  return { user, drawing };
}
