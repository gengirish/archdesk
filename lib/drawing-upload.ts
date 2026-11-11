/** Validation and filename helpers for drawing file uploads (API routes). */

/**
 * 4 MiB: Vercel Functions reject request bodies over 4.5 MB, so anything larger
 * would fail at the platform edge with an opaque 413. Keep in sync with
 * MAX_SERVER_UPLOAD_BYTES in lib/storage.ts (not imported: this file is client-safe).
 */
export const MAX_DRAWING_UPLOAD_BYTES = 4 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "dwg",
  "dxf",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

/** Extension → preferred Content-Type when uploading to storage */
const EXTENSION_CONTENT_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  dwg: "application/acad",
  dxf: "image/vnd.dxf",
};

const BINARY_MIMES = new Set([
  "application/octet-stream",
  "application/x-msdownload",
  "binary/octet-stream",
]);

export function extensionFromOriginalName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim();
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/**
 * Safe storage segment: basename only, ASCII-ish, preserves one extension.
 */
export function sanitizeDrawingStorageFileName(originalName: string): string {
  const base = originalName.replace(/^.*[/\\]/, "").trim() || "drawing";
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).replace(/\.+/g, ".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
  const safeStem = stem
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "")
    .slice(0, 120);
  const safeExt = ext.replace(/[^\w]/g, "").slice(0, 10);
  const core = safeStem || "drawing";
  return safeExt ? `${core}.${safeExt}` : core;
}

export function resolveDrawingContentType(file: File, ext: string): string {
  const fromExt = EXTENSION_CONTENT_TYPE[ext];
  if (fromExt) return fromExt;
  const t = file.type?.trim();
  if (t && t !== "application/octet-stream") return t;
  return "application/octet-stream";
}

export type DrawingFileValidation =
  | { ok: true; file: File; ext: string; contentType: string }
  | { ok: false; error: string; status: number };

export function validateDrawingUploadFile(file: File | null): DrawingFileValidation {
  if (!file || typeof file !== "object" || !(file instanceof File)) {
    return { ok: false, error: "file is required", status: 400 };
  }
  const f = file;
  if (f.size <= 0) {
    return { ok: false, error: "file is empty", status: 400 };
  }
  if (f.size > MAX_DRAWING_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `file exceeds maximum size of ${MAX_DRAWING_UPLOAD_BYTES} bytes`,
      status: 413,
    };
  }

  const ext = extensionFromOriginalName(f.name);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: "file type not allowed; allowed: PDF, DWG, DXF, PNG, JPG, JPEG, WEBP",
      status: 415,
    };
  }

  const mime = f.type?.trim().toLowerCase() ?? "";
  if (ext === "dwg" || ext === "dxf") {
    if (
      mime &&
      !BINARY_MIMES.has(mime) &&
      mime !== EXTENSION_CONTENT_TYPE[ext].toLowerCase()
    ) {
      return {
        ok: false,
        error: "file Content-Type is not consistent with a CAD upload",
        status: 415,
      };
    }
  } else if (mime && !BINARY_MIMES.has(mime)) {
    const expected = EXTENSION_CONTENT_TYPE[ext].toLowerCase();
    const jpegOk =
      (ext === "jpg" || ext === "jpeg") && (mime === "image/jpeg" || mime === "image/jpg");
    if (!jpegOk && mime !== expected) {
      return {
        ok: false,
        error: "file Content-Type does not match file extension",
        status: 415,
      };
    }
  }

  return {
    ok: true,
    file: f,
    ext,
    contentType: resolveDrawingContentType(f, ext),
  };
}
