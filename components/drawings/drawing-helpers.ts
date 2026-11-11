import { MAX_DRAWING_UPLOAD_BYTES } from "@/lib/drawing-upload";
import { formatFileSize } from "@/lib/utils";

export { MAX_DRAWING_UPLOAD_BYTES };

export const DRAWING_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision Requested",
};

export const DRAWING_TYPE_ICONS: Record<string, string> = {
  PLAN: "P",
  ELEVATION: "E",
  SECTION: "S",
  RENDER: "R",
  BOQ: "B",
  DETAIL: "D",
  OTHER: "O",
};

export const DRAWING_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf";

const ALLOWED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "dwg", "dxf"]);

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/** Mirrors the server's checks so users get instant feedback. Returns a message or null. */
export function validateDrawingFile(file: File): string | null {
  if (file.size <= 0) return "The file is empty";
  if (file.size > MAX_DRAWING_UPLOAD_BYTES) {
    return `File must be ${formatFileSize(MAX_DRAWING_UPLOAD_BYTES)} or smaller`;
  }
  if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
    return "Use PDF, PNG, JPG/JPEG, WEBP, DWG, or DXF";
  }
  return null;
}

export function isImageDrawing(fileUrl: string, mimeType?: string | null): boolean {
  if (mimeType) return mimeType.startsWith("image/") && mimeType !== "image/vnd.dxf";
  const url = fileUrl ?? "";
  // "placehold" covers seed/demo images served without a file extension.
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(url) || /placehold/i.test(url);
}
