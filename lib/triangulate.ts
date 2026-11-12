type Point2D = { x: number; y: number };

/** Twice the signed area (positive = counter-clockwise in a y-up frame). */
function signedArea(points: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area;
}

/**
 * Ear-clipping triangulation for a simple polygon (L/U-shaped plans etc.).
 * Returns index triples into `points`.
 */
export function triangulatePolygon(points: Point2D[]): number[] {
  const n = points.length;
  if (n < 3) return [];
  const ccw = signedArea(points) > 0;
  const remaining = Array.from({ length: n }, (_, i) => i);
  const triangles: number[] = [];
  const cross = (a: Point2D, b: Point2D, c: Point2D) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const inside = (p: Point2D, a: Point2D, b: Point2D, c: Point2D) => {
    const d1 = cross(a, b, p), d2 = cross(b, c, p), d3 = cross(c, a, p);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  };

  let guard = n * n;
  while (remaining.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const ia = remaining[(i + remaining.length - 1) % remaining.length];
      const ib = remaining[i];
      const ic = remaining[(i + 1) % remaining.length];
      const a = points[ia], b = points[ib], c = points[ic];
      const turn = cross(a, b, c);
      if (ccw ? turn <= 0 : turn >= 0) continue; // reflex or degenerate
      const blocked = remaining.some(
        (j) => j !== ia && j !== ib && j !== ic && inside(points[j], a, b, c)
      );
      if (blocked) continue;
      triangles.push(ia, ib, ic);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // not simple; fall back to a fan for what's left
  }
  for (let i = 1; i + 1 < remaining.length; i++) {
    triangles.push(remaining[0], remaining[i], remaining[i + 1]);
  }
  return triangles;
}
