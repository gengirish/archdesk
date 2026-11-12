/**
 * Raster floor-plan analysis (server-only): turns a drawn plan into an outer
 * boundary polygon and a set of walls, deterministically.
 *
 *   PNG bytes ──decodePng──▶ grey pixels ──binarise (Otsu)──▶ wall mask
 *   wall mask ──close + flood from outside──▶ footprint ──trace──▶ polygon
 *   wall mask ──row/column runs──▶ bands ──merge/dedupe──▶ walls
 *
 * Walls lying on the boundary are reported as exterior (the polygon edges
 * stand in for them) so they are never double-counted as interior walls.
 * Vector plans (DXF/PDF line work) reuse the same pipeline via `rasterizeSegments`.
 */
import { inflateSync } from "node:zlib";

export type Point = { x: number; y: number };
export type Segment = { start: Point; end: Point };

export type GrayImage = { width: number; height: number; data: Uint8Array };

export type RasterPlanAnalysis = {
  /** Outer boundary along the wall centreline, clockwise, in output units. */
  polygon: Point[];
  /** Interior (partition) walls only. */
  internalWalls: Segment[];
  /** Estimated wall thickness, in output units. */
  wallThickness: number;
  /** Footprint bounding box size, in output units. */
  width: number;
  height: number;
};

// ─────────────────────────────────────────────────────────────
// PNG decoding (no dependencies; non-interlaced, all colour types/depths)
// ─────────────────────────────────────────────────────────────

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function decodePng(bytes: Uint8Array): GrayImage | null {
  if (bytes.length < 33 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | null = null;
  let paletteAlpha: Uint8Array | null = null;
  const idat: Uint8Array[] = [];

  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") paletteAlpha = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType as 0 | 2 | 3 | 4 | 6];
  if (!width || !height || !channels || interlace !== 0 || idat.length === 0) return null;
  if (width * height > 40_000_000) return null;

  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }

  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  if (raw.length < (stride + 1) * height) return null;

  // Undo per-row filters in place.
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= bpp ? pixels[dst + i - bpp] : 0;
      const b = y > 0 ? pixels[prev + i] : 0;
      const c = y > 0 && i >= bpp ? pixels[prev + i - bpp] : 0;
      let v: number;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: return null;
      }
      pixels[dst + i] = v & 0xff;
    }
  }

  const maxSample = (1 << bitDepth) - 1;
  const sample = (rowStart: number, index: number): number => {
    if (bitDepth === 8) return pixels[rowStart + index];
    if (bitDepth === 16) return pixels[rowStart + index * 2];
    const bitPos = index * bitDepth;
    const byte = pixels[rowStart + (bitPos >> 3)];
    const shift = 8 - bitDepth - (bitPos & 7);
    return Math.round((((byte >> shift) & maxSample) * 255) / maxSample);
  };

  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      let r: number, g: number, b: number, alpha = 255;
      if (colorType === 3) {
        const idx = bitDepth === 8 ? pixels[row + x] : (() => {
          const bitPos = x * bitDepth;
          return (pixels[row + (bitPos >> 3)] >> (8 - bitDepth - (bitPos & 7))) & maxSample;
        })();
        r = palette?.[idx * 3] ?? 0;
        g = palette?.[idx * 3 + 1] ?? 0;
        b = palette?.[idx * 3 + 2] ?? 0;
        if (paletteAlpha && idx < paletteAlpha.length) alpha = paletteAlpha[idx];
      } else {
        const base = x * channels;
        r = sample(row, base);
        g = colorType === 2 || colorType === 6 ? sample(row, base + 1) : r;
        b = colorType === 2 || colorType === 6 ? sample(row, base + 2) : r;
        if (colorType === 4) alpha = sample(row, base + 1);
        if (colorType === 6) alpha = sample(row, base + 3);
      }
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      // Composite on white so transparent backgrounds read as paper.
      gray[y * width + x] = Math.round((lum * alpha + 255 * (255 - alpha)) / 255);
    }
  }
  return { width, height, data: gray };
}

// ─────────────────────────────────────────────────────────────
// Binary mask helpers
// ─────────────────────────────────────────────────────────────

type Mask = { w: number; h: number; d: Uint8Array };

function otsuThreshold(data: Uint8Array): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < data.length; i++) hist[data[i]]++;
  const total = data.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return Math.min(200, Math.max(60, threshold));
}

/** Binarise and downsample so the longest side is ≤ maxSide cells ("any dark pixel" per block). */
function toWallMask(img: GrayImage, maxSide = 600): { mask: Mask; cellPx: number } {
  const threshold = otsuThreshold(img.data);
  const cellPx = Math.max(1, Math.ceil(Math.max(img.width, img.height) / maxSide));
  const w = Math.ceil(img.width / cellPx);
  const h = Math.ceil(img.height / cellPx);
  const d = new Uint8Array(w * h);
  for (let y = 0; y < img.height; y++) {
    const cy = Math.floor(y / cellPx);
    for (let x = 0; x < img.width; x++) {
      if (img.data[y * img.width + x] <= threshold) d[cy * w + Math.floor(x / cellPx)] = 1;
    }
  }
  return { mask: { w, h, d }, cellPx };
}

function pad(mask: Mask, p: number): Mask {
  const w = mask.w + 2 * p;
  const h = mask.h + 2 * p;
  const d = new Uint8Array(w * h);
  for (let y = 0; y < mask.h; y++) d.set(mask.d.subarray(y * mask.w, (y + 1) * mask.w), (y + p) * w + p);
  return { w, h, d };
}

/** Square-kernel dilation (value=1) or erosion (value=0) via separable sliding windows. */
function morph(mask: Mask, r: number, dilate: boolean): Mask {
  if (r <= 0) return mask;
  const { w, h } = mask;
  const target = dilate ? 1 : 0;
  const pass = (src: Uint8Array, horizontal: boolean): Uint8Array => {
    const out = new Uint8Array(w * h).fill(dilate ? 0 : 1);
    const lines = horizontal ? h : w;
    const len = horizontal ? w : h;
    const at = (line: number, i: number) => (horizontal ? line * w + i : i * w + line);
    for (let line = 0; line < lines; line++) {
      let count = 0; // cells equal to `target` in window
      for (let i = 0; i < Math.min(r, len); i++) if (src[at(line, i)] === target) count++;
      for (let i = 0; i < len; i++) {
        if (i + r < len && src[at(line, i + r)] === target) count++;
        if (i - r - 1 >= 0 && src[at(line, i - r - 1)] === target) count--;
        // Out-of-range counts as background for dilation and as "outside" for erosion.
        const outside = dilate ? 0 : Math.max(0, r - i) + Math.max(0, i + r - (len - 1));
        if (count + outside > 0) out[at(line, i)] = target;
      }
    }
    return out;
  };
  return { w, h, d: pass(pass(mask.d, true), false) };
}

function floodOutside(mask: Mask): Uint8Array {
  const { w, h, d } = mask;
  const outside = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (i: number) => {
    if (!outside[i] && !d[i]) {
      outside[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  return outside;
}

function largestComponent(mask: Mask): { mask: Mask; area: number } {
  const { w, h, d } = mask;
  const label = new Int32Array(w * h);
  const queue = new Int32Array(w * h);
  let bestLabel = 0, bestArea = 0, next = 0;
  for (let s = 0; s < w * h; s++) {
    if (!d[s] || label[s]) continue;
    next++;
    let head = 0, tail = 0, area = 0;
    label[s] = next;
    queue[tail++] = s;
    while (head < tail) {
      const i = queue[head++];
      area++;
      const x = i % w;
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
      for (const n of neighbours) {
        if (n >= 0 && n < w * h && d[n] && !label[n]) {
          label[n] = next;
          queue[tail++] = n;
        }
      }
    }
    if (area > bestArea) { bestArea = area; bestLabel = next; }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (label[i] === bestLabel && bestLabel) out[i] = 1;
  return { mask: { w, h, d: out }, area: bestArea };
}

// ─────────────────────────────────────────────────────────────
// Contour tracing + simplification
// ─────────────────────────────────────────────────────────────

/** Outer boundary of a 4-connected component on the pixel-corner lattice, clockwise (y down). */
function traceOuterContour(mask: Mask): Point[] {
  const { w, h, d } = mask;
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[y * w + x] === 1;
  let sx = -1, sy = -1;
  for (let i = 0; i < w * h && sx < 0; i++) if (d[i]) { sx = i % w; sy = Math.floor(i / w); }
  if (sx < 0) return [];

  // Is the directed lattice edge from (x,y) in direction (dx,dy) a boundary edge
  // with the component on its right-hand side?
  const isEdge = (x: number, y: number, dx: number, dy: number): boolean => {
    if (dx === 1) return at(x, y) && !at(x, y - 1);
    if (dx === -1) return at(x - 1, y - 1) && !at(x - 1, y);
    if (dy === 1) return at(x - 1, y) && !at(x, y);
    return at(x, y - 1) && !at(x - 1, y - 1); // dy === -1
  };

  const points: Point[] = [];
  let x = sx, y = sy, dx = 1, dy = 0;
  const limit = 4 * w * h + 8;
  for (let step = 0; step < limit; step++) {
    points.push({ x, y });
    x += dx;
    y += dy;
    if (x === sx && y === sy) break;
    // Prefer a right turn, then straight, then left (keeps 4-connectivity at pinches).
    const options: [number, number][] = [[-dy, dx], [dx, dy], [dy, -dx]];
    const nextDir = options.find(([ndx, ndy]) => isEdge(x, y, ndx, ndy));
    if (!nextDir) break;
    [dx, dy] = nextDir;
  }
  return removeCollinear(points);
}

function removeCollinear(points: Point[], tolerance = 1e-9): Point[] {
  let pts = points.filter((p, i) => {
    const q = points[(i + points.length - 1) % points.length];
    return Math.abs(p.x - q.x) > tolerance || Math.abs(p.y - q.y) > tolerance;
  });
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    const out: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[i];
      const c = pts[(i + 1) % pts.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) <= tolerance) { changed = true; continue; }
      out.push(b);
    }
    pts = out;
  }
  return pts;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) { maxDist = dist; index = i; }
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]];
  const left = douglasPeucker(points.slice(0, index + 1), epsilon);
  const right = douglasPeucker(points.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
}

function simplifyRing(ring: Point[], epsilon: number): Point[] {
  if (ring.length <= 4) return ring;
  let far = 0, best = -1;
  for (let i = 1; i < ring.length; i++) {
    const dist = Math.hypot(ring[i].x - ring[0].x, ring[i].y - ring[0].y);
    if (dist > best) { best = dist; far = i; }
  }
  const a = douglasPeucker(ring.slice(0, far + 1), epsilon);
  const b = douglasPeucker([...ring.slice(far), ring[0]], epsilon);
  const simplified = [...a.slice(0, -1), ...b.slice(0, -1)];
  return simplified.length >= 3 ? simplified : ring;
}

/** Snap near-axis-aligned edges (within ~12°) to exact horizontals/verticals. */
function orthogonalize(ring: Point[]): Point[] {
  const pts = ring.map((p) => ({ ...p }));
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
    if (dy <= dx * 0.21) { const y = (a.y + b.y) / 2; a.y = y; b.y = y; }
    else if (dx <= dy * 0.21) { const x = (a.x + b.x) / 2; a.x = x; b.x = x; }
  }
  return removeCollinear(pts, 1e-6);
}

// ─────────────────────────────────────────────────────────────
// Wall detection
// ─────────────────────────────────────────────────────────────

/** Axis-aligned wall in lattice units: `pos` is the centreline, [a, b] the extent. */
type Band = { horizontal: boolean; pos: number; a: number; b: number; thickness: number };

function detectBands(mask: Mask, horizontal: boolean, minLen: number, maxThickness: number): Band[] {
  const { w, h, d } = mask;
  const lines = horizontal ? h : w;
  const len = horizontal ? w : h;
  const at = (line: number, i: number) => d[horizontal ? line * w + i : i * w + line];

  type Group = { first: number; last: number; a: number; b: number; lastA: number; lastB: number; rows: number };
  let active: Group[] = [];
  const done: Group[] = [];

  for (let line = 0; line <= lines; line++) {
    const runs: [number, number][] = [];
    if (line < lines) {
      let start = -1;
      for (let i = 0; i <= len; i++) {
        const on = i < len && at(line, i) === 1;
        if (on && start < 0) start = i;
        if (!on && start >= 0) {
          if (i - start >= minLen) runs.push([start, i]);
          start = -1;
        }
      }
    }
    const nextActive: Group[] = [];
    for (const [ra, rb] of runs) {
      const match = active.find((g) => {
        const overlap = Math.min(g.lastB, rb) - Math.max(g.lastA, ra);
        return overlap >= 0.5 * Math.min(g.lastB - g.lastA, rb - ra) && !nextActive.includes(g);
      });
      if (match) {
        match.last = line;
        match.lastA = ra;
        match.lastB = rb;
        match.a = Math.min(match.a, ra);
        match.b = Math.max(match.b, rb);
        match.rows++;
        nextActive.push(match);
      } else {
        nextActive.push({ first: line, last: line, a: ra, b: rb, lastA: ra, lastB: rb, rows: 1 });
      }
    }
    for (const g of active) if (!nextActive.includes(g)) done.push(g);
    active = nextActive;
  }

  return done
    .map((g) => ({
      horizontal,
      pos: (g.first + g.last + 1) / 2,
      a: g.a,
      b: g.b,
      thickness: g.last - g.first + 1,
    }))
    .filter((band) => band.thickness <= maxThickness && band.b - band.a >= 2 * band.thickness);
}

/**
 * Merge bands that describe the same wall: collinear pieces that overlap or
 * touch, and parallel lines closer than `pairGap` (a wall drawn as two outlines).
 */
function mergeBands(bands: Band[], pairGap: number): Band[] {
  const merged = bands.map((b) => ({ ...b }));
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const p = merged[i], q = merged[j];
        if (p.horizontal !== q.horizontal) continue;
        const overlap = Math.min(p.b, q.b) - Math.max(p.a, q.a);
        const shorter = Math.min(p.b - p.a, q.b - q.a);
        const pLo = p.pos - p.thickness / 2, pHi = p.pos + p.thickness / 2;
        const qLo = q.pos - q.thickness / 2, qHi = q.pos + q.thickness / 2;
        const gap = Math.max(qLo - pHi, pLo - qHi);
        const collinear = gap <= 0.5 && overlap >= -1;
        const doubleLine = gap <= pairGap && overlap >= 0.5 * shorter;
        if (!collinear && !doubleLine) continue;
        const lo = Math.min(pLo, qLo), hi = Math.max(pHi, qHi);
        merged[i] = {
          horizontal: p.horizontal,
          pos: (lo + hi) / 2,
          a: Math.min(p.a, q.a),
          b: Math.max(p.b, q.b),
          thickness: hi - lo,
        };
        merged.splice(j, 1);
        changed = true;
        break outer;
      }
    }
  }
  return merged;
}

function bandToSegment(band: Band): Segment {
  return band.horizontal
    ? { start: { x: band.a, y: band.pos }, end: { x: band.b, y: band.pos } }
    : { start: { x: band.pos, y: band.a }, end: { x: band.pos, y: band.b } };
}

function polygonEdges(polygon: Point[]): Segment[] {
  return polygon.map((p, i) => ({ start: p, end: polygon[(i + 1) % polygon.length] }));
}

/** True if an axis-aligned band runs along (≥ 50% of its length) a parallel polygon edge. */
function liesOnBoundary(band: Band, edges: Segment[], tolerance: number): boolean {
  return edges.some(({ start, end }) => {
    const horizontalEdge = Math.abs(start.y - end.y) < 1e-6;
    const verticalEdge = Math.abs(start.x - end.x) < 1e-6;
    if (band.horizontal && horizontalEdge && Math.abs(start.y - band.pos) <= tolerance) {
      const overlap = Math.min(band.b, Math.max(start.x, end.x)) - Math.max(band.a, Math.min(start.x, end.x));
      return overlap >= 0.5 * (band.b - band.a);
    }
    if (!band.horizontal && verticalEdge && Math.abs(start.x - band.pos) <= tolerance) {
      const overlap = Math.min(band.b, Math.max(start.y, end.y)) - Math.max(band.a, Math.min(start.y, end.y));
      return overlap >= 0.5 * (band.b - band.a);
    }
    return false;
  });
}

/** Pull wall endpoints onto a perpendicular wall/boundary centreline within `tolerance`. */
function snapEndpoints(seg: Segment, targets: Segment[], tolerance: number): Segment {
  const horizontal = Math.abs(seg.start.y - seg.end.y) < 1e-6;
  const snap = (p: Point): Point => {
    let best: Point = p, bestDist = tolerance;
    for (const t of targets) {
      const tVertical = Math.abs(t.start.x - t.end.x) < 1e-6;
      const tHorizontal = Math.abs(t.start.y - t.end.y) < 1e-6;
      if (horizontal && tVertical) {
        const lo = Math.min(t.start.y, t.end.y) - tolerance, hi = Math.max(t.start.y, t.end.y) + tolerance;
        const dist = Math.abs(p.x - t.start.x);
        if (p.y >= lo && p.y <= hi && dist <= bestDist) { best = { x: t.start.x, y: p.y }; bestDist = dist; }
      } else if (!horizontal && tHorizontal) {
        const lo = Math.min(t.start.x, t.end.x) - tolerance, hi = Math.max(t.start.x, t.end.x) + tolerance;
        const dist = Math.abs(p.y - t.start.y);
        if (p.x >= lo && p.x <= hi && dist <= bestDist) { best = { x: p.x, y: t.start.y }; bestDist = dist; }
      }
    }
    return best;
  };
  return { start: snap(seg.start), end: snap(seg.end) };
}

// ─────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────

/**
 * Analyse a binary wall mask (1 = ink). Returns null when no enclosed
 * footprint can be found (e.g. a photo or an empty page).
 * Output is scaled so the footprint's longest side equals `targetLongest`.
 */
function analyzeMask(
  walls: Mask,
  targetLongest: number
): { analysis: RasterPlanAnalysis; cellToOutput: (p: Point) => Point } | null {
  const longest = Math.max(walls.w, walls.h);
  const minLen = Math.max(4, Math.round(0.05 * longest));
  const maxThickness = Math.max(3, Math.round(0.06 * longest));

  // Noisy scans can produce many short bands; keep the longest so merging stays fast.
  const bands = [
    ...detectBands(walls, true, minLen, maxThickness),
    ...detectBands(walls, false, minLen, maxThickness),
  ]
    .sort((p, q) => q.b - q.a - (p.b - p.a))
    .slice(0, 300);
  const pairGap = Math.max(2, Math.round(0.03 * longest));
  const merged = mergeBands(bands, pairGap);

  // Typical wall thickness, length-weighted median.
  const sorted = [...merged].sort((p, q) => p.thickness - q.thickness);
  const totalLen = sorted.reduce((s, b) => s + (b.b - b.a), 0);
  let acc = 0, thickness = 1;
  for (const b of sorted) {
    acc += b.b - b.a;
    if (acc >= totalLen / 2) { thickness = b.thickness; break; }
  }

  // Footprint: close door/window gaps, fill from outside, undo the closing.
  const closeRadius = Math.max(1, Math.round(0.04 * longest));
  const padding = closeRadius + 2;
  const padded = pad(walls, padding);
  const closed = morph(padded, closeRadius, true);
  const outside = floodOutside(closed);
  const filled: Mask = { w: padded.w, h: padded.h, d: outside.map((o) => (o ? 0 : 1)) };
  const footprint = morph(filled, closeRadius, false);
  const { mask: body, area } = largestComponent(footprint);
  if (area < 0.03 * walls.w * walls.h) return null;

  // Trace on the wall centreline: shrink by half a wall thickness first.
  const centre = morph(body, Math.floor(thickness / 2), false);
  const contour = traceOuterContour(largestComponent(centre).mask);
  if (contour.length < 3) return null;
  let polygon = orthogonalize(simplifyRing(contour, Math.max(1.5, thickness * 0.75)));
  polygon = polygon.map((p) => ({ x: p.x - padding, y: p.y - padding }));
  if (polygon.length < 3) return null;

  const edges = polygonEdges(polygon);
  const boundaryTolerance = thickness / 2 + 2;
  const interiorBands = merged.filter((b) => !liesOnBoundary(b, edges, boundaryTolerance));
  const interiorSegs = interiorBands.map(bandToSegment);
  const snapTargets = [...edges, ...interiorSegs];
  const internal = interiorSegs.map((s) => snapEndpoints(s, snapTargets, thickness + 2));

  // Scale: footprint bounding box → targetLongest, origin at its top-left.
  const xs = polygon.map((p) => p.x), ys = polygon.map((p) => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const bboxLongest = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
  if (!(bboxLongest > 0)) return null;
  const scale = targetLongest / bboxLongest;
  const tx = (p: Point): Point => ({
    x: Math.round((p.x - minX) * scale),
    y: Math.round((p.y - minY) * scale),
  });

  const scaledPolygon = removeCollinear(polygon.map(tx), 1e-6);
  const analysis: RasterPlanAnalysis = {
    polygon: scaledPolygon,
    internalWalls: internal
      .map((s) => ({ start: tx(s.start), end: tx(s.end) }))
      .filter((s) => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y) > 0),
    wallThickness: Math.round(thickness * scale),
    width: Math.round((Math.max(...xs) - minX) * scale),
    height: Math.round((Math.max(...ys) - minY) * scale),
  };
  return { analysis, cellToOutput: tx };
}

export function analyzeGrayPlan(img: GrayImage, targetLongest = 12000): RasterPlanAnalysis | null {
  const { mask } = toWallMask(img);
  return analyzeMask(mask, targetLongest)?.analysis ?? null;
}

export function analyzePngPlan(bytes: Uint8Array, targetLongest = 12000): RasterPlanAnalysis | null {
  const img = decodePng(bytes);
  return img ? analyzeGrayPlan(img, targetLongest) : null;
}

/**
 * Rasterise vector line work (DXF/PDF) onto a mask so the same footprint
 * logic can find the outer boundary. Returns the mask plus the transform
 * from source coordinates to cells.
 */
export function rasterizeSegments(
  segments: Segment[],
  maxSide = 600,
  lineCells = 3
): { mask: Mask; toCell: (p: Point) => Point } | null {
  if (segments.length === 0) return null;
  const pts = segments.flatMap((s) => [s.start, s.end]);
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) return null;
  const margin = lineCells + 2;
  const scale = (maxSide - 2 * margin) / span;
  const w = Math.ceil((maxX - minX) * scale) + 2 * margin;
  const h = Math.ceil((maxY - minY) * scale) + 2 * margin;
  const d = new Uint8Array(w * h);
  const toCell = (p: Point): Point => ({ x: (p.x - minX) * scale + margin, y: (p.y - minY) * scale + margin });
  const half = Math.floor(lineCells / 2);
  for (const s of segments) {
    const a = toCell(s.start), b = toCell(s.end);
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2));
    for (let i = 0; i <= steps; i++) {
      const cx = Math.round(a.x + ((b.x - a.x) * i) / steps);
      const cy = Math.round(a.y + ((b.y - a.y) * i) / steps);
      for (let oy = -half; oy <= half; oy++) {
        for (let ox = -half; ox <= half; ox++) {
          const x = cx + ox, y = cy + oy;
          if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = 1;
        }
      }
    }
  }
  return { mask: { w, h, d }, toCell };
}

/**
 * Boundary + walls for vector line work, via the raster pipeline. Axis-aligned
 * walls come from the raster bands (which dedupes doubled lines); diagonal
 * source lines are kept as-is unless they trace the boundary.
 */
export function analyzeVectorPlan(segments: Segment[], targetLongest = 12000): RasterPlanAnalysis | null {
  const raster = rasterizeSegments(segments);
  if (!raster) return null;
  const result = analyzeMask(raster.mask, targetLongest);
  if (!result) return null;
  const { analysis, cellToOutput } = result;
  const edges = polygonEdges(analysis.polygon);
  const tolerance = Math.max(analysis.wallThickness, targetLongest * 0.01);
  const diagonal = segments
    .filter((s) => {
      const dx = Math.abs(s.end.x - s.start.x), dy = Math.abs(s.end.y - s.start.y);
      return dx > dy * 0.21 && dy > dx * 0.21;
    })
    .map((s) => ({ start: cellToOutput(raster.toCell(s.start)), end: cellToOutput(raster.toCell(s.end)) }))
    .filter((s) => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y) >= targetLongest * 0.05)
    .filter(
      (s) =>
        !edges.some(
          (e) => perpendicularDistance(s.start, e.start, e.end) <= tolerance &&
            perpendicularDistance(s.end, e.start, e.end) <= tolerance
        )
    );
  return { ...analysis, internalWalls: [...analysis.internalWalls, ...diagonal] };
}
