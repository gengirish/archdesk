import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  STORAGE_FOLDERS,
  StorageNotConfiguredError,
  newRequestId,
  removeStoredFile,
  storePublicFile,
} from "@/lib/storage";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "@/lib/validation/firm";

const LOG_TAG = "[API_FIRM_LOGO_POST]";
const EXT: Record<(typeof LOGO_TYPES)[number], string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Upload a firm logo (PNG / SVG / JPEG / WebP, ≤ 1 MB) and save it on the firm. */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId }, select: { firmId: true } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    let file: FormDataEntryValue | null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return NextResponse.json({ data: null, error: "Invalid multipart form data" }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ data: null, error: "Choose a logo file to upload" }, { status: 400 });
    }
    const type = file.type as (typeof LOGO_TYPES)[number];
    if (!LOGO_TYPES.includes(type)) {
      return NextResponse.json(
        { data: null, error: "Logo must be a PNG, SVG, JPEG or WebP image" },
        { status: 400 }
      );
    }
    if (file.size > LOGO_MAX_BYTES) {
      return NextResponse.json({ data: null, error: "Logo must be 1 MB or smaller" }, { status: 413 });
    }

    const previous = await db.firm.findUnique({ where: { id: user.firmId }, select: { logo: true } });
    const stored = await storePublicFile(
      `${STORAGE_FOLDERS.FIRM_ASSETS}/${user.firmId}/logo.${EXT[type]}`,
      file,
      type
    );

    let firm;
    try {
      firm = await db.firm.update({ where: { id: user.firmId }, data: { logo: stored.url } });
    } catch (dbErr) {
      await removeStoredFile(stored.url).catch(() => undefined);
      throw dbErr;
    }

    // Best-effort cleanup of the old logo if it was one of ours.
    if (previous?.logo && previous.logo.includes(`/${STORAGE_FOLDERS.FIRM_ASSETS}/`)) {
      await removeStoredFile(previous.logo).catch(() => undefined);
    }

    return NextResponse.json({ data: { logo: firm.logo, firm }, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      console.error(LOG_TAG, `requestId=${requestId}`, error.message);
      return NextResponse.json(
        { data: null, error: "File storage isn't set up yet, so logos can't be uploaded. Ask your admin to connect Vercel Blob." },
        { status: 503 }
      );
    }
    console.error(LOG_TAG, `requestId=${requestId}`, error);
    return NextResponse.json(
      { data: null, error: `Logo upload failed. Please try again (ref ${requestId}).` },
      { status: 500 }
    );
  }
}
