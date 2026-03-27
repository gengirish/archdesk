import { z } from "zod";

type Point2D = {
  x: number;
  y: number;
};

type WallSegment = {
  start: Point2D;
  end: Point2D;
};

export const FLOOR_PLAN_SCHEMA_VERSION = "1.0";
export const FLAT_SCENE_SCHEMA_VERSION = "1.0";

export type FloorPlanPayload = {
  schemaVersion: string;
  polygon: Point2D[];
  walls: WallSegment[];
};

export type FlatScenePayload = {
  schemaVersion: string;
  unit: string;
  wallHeight: number;
  wallThickness: number;
  floorPolygon: Point2D[];
  walls: {
    id: string;
    start: Point2D;
    end: Point2D;
    height: number;
    thickness: number;
  }[];
};

export const DEFAULT_SAMPLE_FLOOR_PLAN: FloorPlanPayload = {
  schemaVersion: FLOOR_PLAN_SCHEMA_VERSION,
  polygon: [
    { x: 0, y: 0 },
    { x: 12000, y: 0 },
    { x: 12000, y: 9000 },
    { x: 0, y: 9000 },
  ],
  walls: [
    { start: { x: 0, y: 0 }, end: { x: 12000, y: 0 } },
    { start: { x: 12000, y: 0 }, end: { x: 12000, y: 9000 } },
    { start: { x: 12000, y: 9000 }, end: { x: 0, y: 9000 } },
    { start: { x: 0, y: 9000 }, end: { x: 0, y: 0 } },
    { start: { x: 6000, y: 0 }, end: { x: 6000, y: 5500 } },
  ],
};

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const wallSchema = z.object({
  start: pointSchema,
  end: pointSchema,
});

const floorPlanPayloadSchema = z.object({
  schemaVersion: z.string().optional(),
  polygon: z.array(pointSchema).min(3),
  walls: z.array(wallSchema).min(1),
});

export function normalizeFloorPlanPayload(payload: unknown): FloorPlanPayload {
  const parsed = floorPlanPayloadSchema.parse(payload);

  return {
    schemaVersion: parsed.schemaVersion ?? FLOOR_PLAN_SCHEMA_VERSION,
    polygon: parsed.polygon,
    walls: parsed.walls,
  };
}

export function toFlatScenePayload(input: {
  planJson: FloorPlanPayload;
  unit?: string;
  wallHeight?: number;
  wallThickness?: number;
}): FlatScenePayload {
  const wallHeight = input.wallHeight ?? 3000;
  const wallThickness = input.wallThickness ?? 200;

  return {
    schemaVersion: FLAT_SCENE_SCHEMA_VERSION,
    unit: input.unit ?? "mm",
    wallHeight,
    wallThickness,
    floorPolygon: input.planJson.polygon,
    walls: input.planJson.walls.map((wall, index) => ({
      id: `wall-${index + 1}`,
      start: wall.start,
      end: wall.end,
      height: wallHeight,
      thickness: wallThickness,
    })),
  };
}

