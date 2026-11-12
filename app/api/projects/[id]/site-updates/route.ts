import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  newRequestId,
  removeStoredFile,
  storePublicFile,
  StorageNotConfiguredError,
  STORAGE_FOLDERS,
} from "@/lib/storage";
import {
  MAX_SITE_PHOTOS,
  SITE_PHOTO_EXTENSIONS,
  siteUpdateFieldsSchema,
  sniffImageType,
  validateSitePhotos,
} from "@/lib/validation/site-update";

const LOG_TAG = "[API_PROJECT_SITE_UPDATES_POST]";

function fail(error: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ data: null, error }, { status, headers });
}

async function firmProject(clerkId: string, projectId: string) {
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return { user: null, project: null };
  const project = await db.project.findFirst({
    where: { id: projectId, firmId: user.firmId },
    select: { id: true },
  });
  return { user, project };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Unauthorized", 401);
    const { user, project } = await firmProject(userId, params.id);
    if (!user) return fail("User not found", 404);
    if (!project) return fail("Project not found", 404);

    const siteUpdates = await db.siteUpdate.findMany({
      where: { projectId: params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: siteUpdates, error: null });
  } catch (error) {
    console.error("[API_PROJECT_SITE_UPDATES_GET]", error);
    return fail("Internal server error", 500);
  }
}

/**
 * Create a site update.
 * - multipart/form-data: note, milestone, weather, photos (0–6 image files).
 * - application/json: { note, milestone, weather, photos?: string[] } where
 *   photos are already-stored https URLs (kept for backwards compatibility).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = newRequestId();
  const uploaded: string[] = [];
  try {
    const { userId } = await auth();
    if (!userId) return fail("Unauthorized", 401);
    const { user, project } = await firmProject(userId, params.id);
    if (!user) return fail("User not found", 404);
    if (!project) return fail("Project not found", 404);

    const isMultipart = (request.headers.get("content-type") ?? "").includes("multipart/form-data");
    let rawFields: Record<string, unknown>;
    let files: File[] = [];
    let urlPhotos: string[] = [];

    if (isMultipart) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch (err) {
        console.error(LOG_TAG, `requestId=${requestId}`, "multipart parse failed", err);
        return fail("Invalid upload. Try again with fewer or smaller photos.", 400);
      }
      rawFields = {
        note: form.get("note") ?? null,
        weather: form.get("weather") ?? null,
        milestone: form.get("milestone") ?? null,
      };
      files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    } else {
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return fail("Invalid JSON body", 400);
      }
      rawFields = body;
      const photos = body.photos;
      if (photos !== undefined && photos !== null) {
        if (
          !Array.isArray(photos) ||
          photos.length > MAX_SITE_PHOTOS ||
          photos.some((p) => typeof p !== "string" || !/^https:\/\//.test(p))
        ) {
          return fail(`photos must be up to ${MAX_SITE_PHOTOS} https URLs`, 400);
        }
        urlPhotos = photos as string[];
      }
    }

    const parsed = siteUpdateFieldsSchema.safeParse(rawFields);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    const fields = parsed.data;

    const photoError = validateSitePhotos(files.map((f) => ({ name: f.name, size: f.size, type: f.type })));
    if (photoError) return fail(photoError, files.length > MAX_SITE_PHOTOS ? 400 : 413);

    if (!fields.note && files.length === 0 && urlPhotos.length === 0) {
      return fail("Add a note or at least one photo", 400);
    }

    // Read and sniff every file before storing any, so a bad file uploads nothing.
    const prepared: { bytes: ArrayBuffer; type: keyof typeof SITE_PHOTO_EXTENSIONS }[] = [];
    for (const f of files) {
      const bytes = await f.arrayBuffer();
      const type = sniffImageType(new Uint8Array(bytes.slice(0, 16)));
      if (!type) return fail(`${f.name || "A file"} isn't a valid JPG, PNG or WebP image`, 400);
      prepared.push({ bytes, type });
    }

    const stamp = Date.now();
    for (let i = 0; i < prepared.length; i++) {
      const p = prepared[i];
      const pathname = `${STORAGE_FOLDERS.SITE_PHOTOS}/${user.firmId}/${params.id}/${stamp}-${i + 1}.${SITE_PHOTO_EXTENSIONS[p.type]}`;
      const stored = await storePublicFile(pathname, p.bytes, p.type);
      uploaded.push(stored.url);
    }

    const siteUpdate = await db.siteUpdate.create({
      data: {
        projectId: params.id,
        userId: user.id,
        note: fields.note,
        photos: [...urlPhotos, ...uploaded],
        milestone: fields.milestone,
        weather: fields.weather,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: siteUpdate, error: null }, { status: 201 });
  } catch (error) {
    if (uploaded.length) {
      await Promise.allSettled(uploaded.map((u) => removeStoredFile(u)));
    }
    if (error instanceof StorageNotConfiguredError) {
      console.error(LOG_TAG, `requestId=${requestId}`, error.message);
      return fail(
        `Photo storage isn't set up yet, so photos can't be uploaded. Save the update without photos, or ask your admin to connect file storage. (ref ${requestId})`,
        503
      );
    }
    console.error(LOG_TAG, `requestId=${requestId}`, error);
    return fail(`Couldn't save the site update. Please try again. (ref ${requestId})`, 500);
  }
}
