import { FloorPlanSourceType } from "@prisma/client";
import type { FloorPlanPayload } from "@/lib/flat-scene-generator";
import { FLOOR_PLAN_SCHEMA_VERSION } from "@/lib/flat-scene-generator";
import { analyzePngPlan, analyzeVectorPlan, type RasterPlanAnalysis } from "@/lib/floor-plan-raster";

export const MAX_FLOOR_PLAN_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MiB

const ALLOWED_FLOOR_PLAN_EXTENSIONS = new Set(["pdf", "dxf", "png", "jpg", "jpeg", "webp"]);

type Point2D = { x: number; y: number };
type WallSegment = { start: Point2D; end: Point2D };

type PlanFileValidation =
  | { ok: true; file: File; ext: string }
  | { ok: false; error: string; status: number };

type UploadParseResult = {
  sourceType: FloorPlanSourceType;
  planJson: FloorPlanPayload;
};

function extensionFromOriginalName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").trim();
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function sanitizeFloorPlanName(originalName: string): string {
  const base = originalName.replace(/^.*[/\\]/, "").trim() || "Uploaded Floor Plan";
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return stem.replace(/\s+/g, " ").trim().slice(0, 120) || "Uploaded Floor Plan";
}

export function validateFloorPlanUploadFile(file: File | null): PlanFileValidation {
  if (!file || typeof file !== "object" || !(file instanceof File)) {
    return { ok: false, error: "file is required", status: 400 };
  }

  if (file.size <= 0) {
    return { ok: false, error: "file is empty", status: 400 };
  }
  if (file.size > MAX_FLOOR_PLAN_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `file exceeds maximum size of ${MAX_FLOOR_PLAN_UPLOAD_BYTES} bytes`,
      status: 413,
    };
  }

  const ext = extensionFromOriginalName(file.name);
  if (!ext || !ALLOWED_FLOOR_PLAN_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: "file type not allowed; allowed: PDF, DXF, PNG, JPG, JPEG, WEBP",
      status: 415,
    };
  }

  return { ok: true, file, ext };
}

function sourceTypeFromExtension(ext: string): FloorPlanSourceType {
  if (ext === "pdf") return FloorPlanSourceType.PDF;
  if (ext === "dxf") return FloorPlanSourceType.DXF;
  return FloorPlanSourceType.IMAGE;
}

/** Unreadable file: the default sample layout (honest placeholder, no random walls). */
function fallbackPlan(): FloorPlanPayload {
  return rectanglePlan(12000, 9000, { withCenterWall: true });
}

/** Outer walls from a boundary polygon, plus interior walls. */
function planFromAnalysis(analysis: RasterPlanAnalysis): FloorPlanPayload {
  const { polygon, internalWalls } = analysis;
  const exterior = polygon.map((point, index) => ({
    start: point,
    end: polygon[(index + 1) % polygon.length],
  }));
  return {
    schemaVersion: FLOOR_PLAN_SCHEMA_VERSION,
    polygon,
    walls: [...exterior, ...internalWalls].slice(0, 500),
  };
}

function rectanglePlan(
  widthMm: number,
  heightMm: number,
  options?: { withCenterWall?: boolean }
): FloorPlanPayload {
  const w = Math.max(2000, Math.round(widthMm));
  const h = Math.max(2000, Math.round(heightMm));

  const polygon: Point2D[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];

  const walls: WallSegment[] = [
    { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
    { start: { x: w, y: 0 }, end: { x: w, y: h } },
    { start: { x: w, y: h }, end: { x: 0, y: h } },
    { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
  ];

  if (options?.withCenterWall) {
    walls.push({ start: { x: Math.round(w / 2), y: 0 }, end: { x: Math.round(w / 2), y: Math.round(h * 0.62) } });
  }

  return {
    schemaVersion: FLOOR_PLAN_SCHEMA_VERSION,
    polygon,
    walls,
  };
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (!isPng) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return width > 0 && height > 0 ? { width, height } : null;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let index = 2;
  while (index + 9 < bytes.length) {
    if (bytes[index] !== 0xff) {
      index += 1;
      continue;
    }
    const marker = bytes[index + 1];
    const size = (bytes[index + 2] << 8) + bytes[index + 3];
    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;
    if (isSof && size >= 7) {
      const height = (bytes[index + 5] << 8) + bytes[index + 6];
      const width = (bytes[index + 7] << 8) + bytes[index + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (size < 2) break;
    index += 2 + size;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff !== "RIFF" || webp !== "WEBP") return null;

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk === "VP8X" && bytes.length >= 30) {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

function imagePlanFromBytes(ext: string, bytes: Uint8Array): FloorPlanPayload {
  // PNG: real wall/boundary detection.
  if (ext === "png") {
    const analysis = analyzePngPlan(bytes);
    if (analysis) return planFromAnalysis(analysis);
  }

  // JPEG/WebP (no decoder bundled) or an unreadable PNG: outline only, at the
  // image's aspect ratio. Interior walls are not guessed.
  const dims =
    (ext === "png" ? pngDimensions(bytes) : null) ||
    ((ext === "jpg" || ext === "jpeg") ? jpegDimensions(bytes) : null) ||
    (ext === "webp" ? webpDimensions(bytes) : null);

  if (!dims) return fallbackPlan();

  const longestPx = Math.max(dims.width, dims.height);
  const scale = longestPx > 0 ? 12000 / longestPx : 1;
  return rectanglePlan(dims.width * scale, dims.height * scale);
}

function parsePdfVectorLineWalls(snippet: string): WallSegment[] {
  const walls: WallSegment[] = [];
  const lineRegex =
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+m\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+l/g;

  let match: RegExpExecArray | null = lineRegex.exec(snippet);
  while (match) {
    const x1 = Number.parseFloat(match[1]);
    const y1 = Number.parseFloat(match[2]);
    const x2 = Number.parseFloat(match[3]);
    const y2 = Number.parseFloat(match[4]);
    if (
      Number.isFinite(x1) &&
      Number.isFinite(y1) &&
      Number.isFinite(x2) &&
      Number.isFinite(y2) &&
      !(x1 === x2 && y1 === y2)
    ) {
      walls.push({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
      });
    }
    match = lineRegex.exec(snippet);
  }

  return walls;
}

function pdfPlanFromBytes(bytes: Uint8Array): FloorPlanPayload {
  const snippet = new TextDecoder("latin1")
    .decode(bytes.subarray(0, Math.min(bytes.length, 1_800_000)))
    .replace(/\r/g, "\n");

  const vectorWalls = parsePdfVectorLineWalls(snippet);
  if (vectorWalls.length >= 4) {
    return normalizeWallsToPlan(vectorWalls);
  }

  const match = snippet.match(/\/MediaBox\s*\[\s*-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/);
  if (!match) return fallbackPlan();

  const widthPt = Math.abs(Number.parseFloat(match[1]));
  const heightPt = Math.abs(Number.parseFloat(match[2]));
  if (!Number.isFinite(widthPt) || !Number.isFinite(heightPt) || widthPt <= 0 || heightPt <= 0) {
    return fallbackPlan();
  }

  const ptToMm = 0.352778;
  return rectanglePlan(widthPt * ptToMm, heightPt * ptToMm);
}

function parseDxfLines(text: string): WallSegment[] {
  const rows = text.split(/\r?\n/);
  const walls: WallSegment[] = [];

  let entityType = "";
  let x1: number | null = null;
  let y1: number | null = null;
  let x2: number | null = null;
  let y2: number | null = null;
  let lwPoints: Point2D[] = [];
  let lwClosed = false;

  const flushEntity = () => {
    if (entityType === "LINE" && x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      walls.push({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
    }
    if (entityType === "LWPOLYLINE" && lwPoints.length >= 2) {
      for (let index = 0; index < lwPoints.length - 1; index += 1) {
        walls.push({ start: lwPoints[index], end: lwPoints[index + 1] });
      }
      if (lwClosed) {
        walls.push({ start: lwPoints[lwPoints.length - 1], end: lwPoints[0] });
      }
    }
    x1 = y1 = x2 = y2 = null;
    lwPoints = [];
    lwClosed = false;
  };

  for (let index = 0; index + 1 < rows.length; index += 2) {
    const code = rows[index].trim();
    const value = rows[index + 1].trim();

    if (code === "0") {
      flushEntity();
      entityType = value;
      continue;
    }

    if (entityType === "LINE") {
      if (code === "10") x1 = Number.parseFloat(value);
      if (code === "20") y1 = Number.parseFloat(value);
      if (code === "11") x2 = Number.parseFloat(value);
      if (code === "21") y2 = Number.parseFloat(value);
      continue;
    }

    if (entityType === "LWPOLYLINE") {
      if (code === "10") {
        const x = Number.parseFloat(value);
        const yCode = rows[index + 2]?.trim();
        const yRaw = rows[index + 3]?.trim();
        const y = yCode === "20" ? Number.parseFloat(yRaw) : Number.NaN;
        if (Number.isFinite(x) && Number.isFinite(y)) {
          lwPoints.push({ x, y });
        }
        continue;
      }
      if (code === "70") {
        const flags = Number.parseInt(value, 10);
        lwClosed = Number.isFinite(flags) && (flags & 1) === 1;
      }
    }
  }

  flushEntity();
  return walls.filter((wall) => {
    return (
      Number.isFinite(wall.start.x) &&
      Number.isFinite(wall.start.y) &&
      Number.isFinite(wall.end.x) &&
      Number.isFinite(wall.end.y) &&
      !(wall.start.x === wall.end.x && wall.start.y === wall.end.y)
    );
  });
}

function normalizeWallsToPlan(walls: WallSegment[]): FloorPlanPayload {
  if (walls.length === 0) return fallbackPlan();

  // Preferred: trace the real footprint and dedupe the line work.
  const analysis = analyzeVectorPlan(walls);
  if (analysis) return planFromAnalysis(analysis);

  // Open line work with no enclosed footprint: keep the lines, scaled, with
  // a bounding outline (no invented walls).
  const points = walls.flatMap((wall) => [wall.start, wall.end]);
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const longest = Math.max(maxX - minX, maxY - minY);
  if (!(longest > 0)) return fallbackPlan();
  const scale = 12000 / longest;
  const tx = (p: Point2D) => ({ x: Math.round((p.x - minX) * scale), y: Math.round((p.y - minY) * scale) });
  const outline = rectanglePlan((maxX - minX) * scale, (maxY - minY) * scale);
  return {
    schemaVersion: FLOOR_PLAN_SCHEMA_VERSION,
    polygon: outline.polygon,
    walls: walls.map((wall) => ({ start: tx(wall.start), end: tx(wall.end) })).slice(0, 500),
  };
}

function dxfPlanFromBytes(bytes: Uint8Array): FloorPlanPayload {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const lines = parseDxfLines(text);
  return normalizeWallsToPlan(lines);
}

export async function toFloorPlanFromUpload(file: File): Promise<UploadParseResult> {
  const valid = validateFloorPlanUploadFile(file);
  if (!valid.ok) {
    const error = new Error(valid.error);
    (error as Error & { status?: number }).status = valid.status;
    throw error;
  }

  const bytes = new Uint8Array(await valid.file.arrayBuffer());
  const sourceType = sourceTypeFromExtension(valid.ext);

  let planJson: FloorPlanPayload;
  if (valid.ext === "pdf") {
    planJson = pdfPlanFromBytes(bytes);
  } else if (valid.ext === "dxf") {
    planJson = dxfPlanFromBytes(bytes);
  } else {
    planJson = imagePlanFromBytes(valid.ext, bytes);
  }

  return {
    sourceType,
    planJson,
  };
}
