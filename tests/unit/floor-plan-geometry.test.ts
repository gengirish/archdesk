import { describe, expect, it } from "vitest";
import { analyzePngPlan, analyzeVectorPlan, decodePng } from "@/lib/floor-plan-raster";
import { toFloorPlanFromUpload } from "@/lib/floor-plan-upload";
import { triangulatePolygon } from "@/lib/triangulate";
import {
  lShape,
  outlinedWalls,
  rectangleWithOneWall,
  twoRoomsWithDoors,
} from "../fixtures/floor-plans/synthetic-plans";

type P = { x: number; y: number };

/** Normalise a polygon to start at its top-left vertex so comparisons are order-stable. */
function canonical(poly: P[]): P[] {
  const start = poly.reduce((best, p, i) => {
    const b = poly[best];
    return p.y < b.y || (p.y === b.y && p.x < b.x) ? i : best;
  }, 0);
  return [...poly.slice(start), ...poly.slice(0, start)];
}

function expectPolygonClose(actual: P[], expected: P[], tolerance: number) {
  expect(actual).toHaveLength(expected.length);
  canonical(actual).forEach((p, i) => {
    expect(Math.abs(p.x - expected[i].x)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(p.y - expected[i].y)).toBeLessThanOrEqual(tolerance);
  });
}

const TOL = 150; // mm, on a 12 m footprint (≈ 1.3%)

describe("decodePng", () => {
  it("decodes a filtered RGB PNG back to the drawn pixels", () => {
    const img = decodePng(rectangleWithOneWall());
    expect(img).not.toBeNull();
    expect(img!.width).toBe(400);
    expect(img!.height).toBe(300);
    expect(img!.data[0]).toBe(255); // paper
    expect(img!.data[22 * 400 + 22]).toBe(0); // wall
  });

  it("rejects non-PNG bytes", () => {
    expect(decodePng(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("floor-plan geometry from images", () => {
  it("(a) rectangle with one internal wall → 4-vertex boundary and exactly 1 internal wall", () => {
    const plan = analyzePngPlan(rectangleWithOneWall())!;
    expect(plan).not.toBeNull();
    expect(plan.internalWalls).toHaveLength(1);
    // Footprint 354×254 px on the centreline → 12000 × ~8610 mm.
    expectPolygonClose(plan.polygon, [
      { x: 0, y: 0 },
      { x: 12000, y: 0 },
      { x: 12000, y: 8610 },
      { x: 0, y: 8610 },
    ], TOL);

    const [w] = plan.internalWalls;
    expect(w.start.x).toBe(w.end.x); // vertical
    expect(Math.abs(w.start.x - 6000)).toBeLessThanOrEqual(TOL); // in the middle
    // Spans wall-to-wall (endpoints snapped onto the boundary centreline).
    expect(Math.min(w.start.y, w.end.y)).toBeLessThanOrEqual(TOL);
    expect(Math.max(w.start.y, w.end.y)).toBeGreaterThanOrEqual(8610 - TOL);
  });

  it("(b) L-shaped plan → 6-vertex L polygon, not its bounding rectangle", () => {
    const plan = analyzePngPlan(lShape())!;
    expect(plan.internalWalls).toHaveLength(0);
    const k = 12000 / 354; // mm per px
    expectPolygonClose(plan.polygon, [
      { x: 0, y: 0 },
      { x: 12000, y: 0 },
      { x: 12000, y: Math.round(124 * k) },
      { x: Math.round(180 * k), y: Math.round(124 * k) },
      { x: Math.round(180 * k), y: Math.round(254 * k) },
      { x: 0, y: Math.round(254 * k) },
    ], TOL);
  });

  it("(c) door gaps: outer gap is closed for the boundary, inner wall stays two segments, labels ignored", () => {
    const plan = analyzePngPlan(twoRoomsWithDoors())!;
    expect(plan.polygon).toHaveLength(4);
    expect(plan.internalWalls).toHaveLength(2);
    const [a, b] = [...plan.internalWalls].sort((p, q) => Math.min(p.start.y, p.end.y) - Math.min(q.start.y, q.end.y));
    expect(a.start.x).toBe(b.start.x); // collinear
    const gap = Math.min(b.start.y, b.end.y) - Math.max(a.start.y, a.end.y);
    expect(gap).toBeGreaterThan(900); // ~40 px ≈ 1.36 m door
  });

  it("(d) a wall drawn as two parallel outlines counts once", () => {
    const plan = analyzePngPlan(outlinedWalls())!;
    expect(plan.polygon).toHaveLength(4);
    expect(plan.internalWalls).toHaveLength(1);
  });

  it("is deterministic: the same file always yields the same geometry", () => {
    expect(analyzePngPlan(lShape())).toEqual(analyzePngPlan(lShape()));
  });
});

describe("toFloorPlanFromUpload", () => {
  it("PNG upload: outer walls follow the polygon, internal walls aren't double-counted", async () => {
    const file = new File([rectangleWithOneWall() as BlobPart], "plan.png", { type: "image/png" });
    const { planJson } = await toFloorPlanFromUpload(file);
    expect(planJson.polygon).toHaveLength(4);
    expect(planJson.walls).toHaveLength(4 + 1);
  });

  it("L-shaped PNG upload keeps the L footprint", async () => {
    const file = new File([lShape() as BlobPart], "l.png", { type: "image/png" });
    const { planJson } = await toFloorPlanFromUpload(file);
    expect(planJson.polygon).toHaveLength(6);
    expect(planJson.walls).toHaveLength(6);
  });

  it("DXF with an L outline + one partition → 6-vertex polygon, 1 internal wall, no duplicates", async () => {
    const lines: [number, number, number, number][] = [
      [0, 0, 10, 0], [10, 0, 10, 4], [10, 4, 5, 4], [5, 4, 5, 8], [5, 8, 0, 8], [0, 8, 0, 0],
      [3, 0, 3, 8], // partition
    ];
    const dxf = ["0", "SECTION", "2", "ENTITIES",
      ...lines.flatMap(([x1, y1, x2, y2]) => ["0", "LINE", "10", `${x1}`, "20", `${y1}`, "11", `${x2}`, "21", `${y2}`]),
      "0", "ENDSEC", "0", "EOF"].join("\n");
    const { planJson } = await toFloorPlanFromUpload(new File([dxf], "plan.dxf"));
    expect(planJson.polygon).toHaveLength(6);
    expect(planJson.walls).toHaveLength(6 + 1);
  });

  it("vector analysis keeps diagonal walls that aren't on the boundary", () => {
    const plan = analyzeVectorPlan([
      { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
      { start: { x: 10, y: 0 }, end: { x: 10, y: 8 } },
      { start: { x: 10, y: 8 }, end: { x: 0, y: 8 } },
      { start: { x: 0, y: 8 }, end: { x: 0, y: 0 } },
      { start: { x: 2, y: 2 }, end: { x: 6, y: 6 } },
    ])!;
    expect(plan.polygon).toHaveLength(4);
    expect(plan.internalWalls).toHaveLength(1);
  });
});

describe("triangulatePolygon (3D floor for non-rectangular footprints)", () => {
  const area = (pts: P[], tri: number[]) => {
    let sum = 0;
    for (let i = 0; i < tri.length; i += 3) {
      const [a, b, c] = [pts[tri[i]], pts[tri[i + 1]], pts[tri[i + 2]]];
      sum += Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
    }
    return sum;
  };

  it("covers an L exactly (no bounding-box fill)", () => {
    const L = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 5, y: 4 }, { x: 5, y: 8 }, { x: 0, y: 8 },
    ];
    const tri = triangulatePolygon(L);
    expect(tri).toHaveLength((L.length - 2) * 3);
    expect(area(L, tri)).toBeCloseTo(10 * 4 + 5 * 4);
    expect(area([...L].reverse(), triangulatePolygon([...L].reverse()))).toBeCloseTo(60);
  });
});
