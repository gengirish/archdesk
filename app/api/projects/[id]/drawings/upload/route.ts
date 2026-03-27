import { auth } from "@clerk/nextjs/server";
import { DrawingType } from "@prisma/client";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  sanitizeDrawingStorageFileName,
  validateDrawingUploadFile,
} from "@/lib/drawing-upload";
import {
  BUCKETS,
  deleteFileAdmin,
  getPublicUrl,
  uploadBufferAdmin,
} from "@/lib/supabase";

const DRAWING_TYPES = new Set(Object.values(DrawingType));
const LOG_TAG = "[API_PROJECT_DRAWINGS_UPLOAD_POST]";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(LOG_TAG, "Supabase URL or service role key is missing");
      return NextResponse.json(
        { data: null, error: "File storage is not configured" },
        { status: 503 }
      );
    }

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
    });
    if (!project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseErr) {
      console.error(LOG_TAG, "multipart parse failed", parseErr);
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

    const fileEntry = fileField instanceof File ? fileField : null;
    const validated = validateDrawingUploadFile(fileEntry);
    if (!validated.ok) {
      return NextResponse.json(
        { data: null, error: validated.error },
        { status: validated.status }
      );
    }

    const uploadFile = validated.file;

    let versionNote: string | null = null;
    if (typeof versionNoteRaw === "string") {
      const t = versionNoteRaw.trim();
      if (t.length > 0) {
        versionNote = t.slice(0, 2000);
      }
    }

    const storageName = sanitizeDrawingStorageFileName(uploadFile.name);
    const storagePath = `${user.firmId}/${params.id}/${Date.now()}-${storageName}`;

    try {
      await uploadBufferAdmin(
        BUCKETS.DRAWINGS,
        storagePath,
        uploadFile,
        validated.contentType
      );
    } catch (storageErr) {
      console.error(LOG_TAG, "Supabase storage upload failed", storageErr);
      return NextResponse.json(
        { data: null, error: "Failed to store file" },
        { status: 502 }
      );
    }

    const fileUrl = getPublicUrl(BUCKETS.DRAWINGS, storagePath);

    try {
      const drawing = await db.drawing.create({
        data: {
          projectId: params.id,
          name: nameRaw.trim(),
          type: typeRaw as DrawingType,
          fileUrl,
          fileSize: uploadFile.size,
          mimeType: validated.contentType,
          uploadedById: user.id,
          versions: {
            create: {
              version: 1,
              fileUrl,
              fileSize: uploadFile.size,
              note: versionNote,
            },
          },
        },
        include: {
          versions: { orderBy: { version: "desc" } },
          comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
        },
      });

      return NextResponse.json({ data: drawing, error: null }, { status: 201 });
    } catch (dbErr) {
      console.error(LOG_TAG, "database error after storage upload", dbErr);
      try {
        await deleteFileAdmin(BUCKETS.DRAWINGS, storagePath);
      } catch (delErr) {
        console.error(LOG_TAG, "failed to remove orphan storage object", delErr);
      }
      return NextResponse.json(
        { data: null, error: "Failed to save drawing metadata" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(LOG_TAG, "unhandled error", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
