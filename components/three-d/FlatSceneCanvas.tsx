"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

type Point2D = { x: number; y: number };

type FlatScenePayload = {
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

type FlatSceneCanvasProps = {
  sceneJson: unknown;
};

const UNIT_SCALE: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048,
  in: 0.0254,
};

export function FlatSceneCanvas({ sceneJson }: FlatSceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneData = useMemo(() => sceneJson as FlatScenePayload, [sceneJson]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sceneData?.walls?.length) return;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor.set(0.03, 0.03, 0.04, 1);

    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 2.2,
      Math.PI / 3,
      24,
      new Vector3(0, 1.5, 0),
      scene
    );
    camera.attachControl(canvas, true);
    camera.wheelDeltaPercentage = 0.01;

    const hemi = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.95;

    const unitScale = UNIT_SCALE[sceneData.unit] ?? 0.001;

    const wallMaterial = new StandardMaterial("wall-material", scene);
    wallMaterial.diffuseColor = new Color3(0.79, 0.74, 0.66);

    const floorMaterial = new StandardMaterial("floor-material", scene);
    floorMaterial.diffuseColor = new Color3(0.2, 0.22, 0.25);

    if (sceneData.floorPolygon.length >= 3) {
      const xs = sceneData.floorPolygon.map((point) => point.x);
      const ys = sceneData.floorPolygon.map((point) => point.y);

      const width = (Math.max(...xs) - Math.min(...xs)) * unitScale;
      const depth = (Math.max(...ys) - Math.min(...ys)) * unitScale;
      const centerX = ((Math.max(...xs) + Math.min(...xs)) / 2) * unitScale;
      const centerZ = ((Math.max(...ys) + Math.min(...ys)) / 2) * unitScale;

      const floor = MeshBuilder.CreateGround(
        "flat-floor",
        {
          width: Math.max(width, 0.5),
          height: Math.max(depth, 0.5),
        },
        scene
      );
      floor.position.x = centerX;
      floor.position.z = centerZ;
      floor.material = floorMaterial;
    }

    sceneData.walls.forEach((wall) => {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const length = Math.hypot(dx, dy) * unitScale;

      const wallMesh = MeshBuilder.CreateBox(
        wall.id,
        {
          width: Math.max(length, 0.1),
          height: Math.max(wall.height * unitScale, 0.1),
          depth: Math.max(wall.thickness * unitScale, 0.06),
        },
        scene
      );

      const centerX = ((wall.start.x + wall.end.x) / 2) * unitScale;
      const centerZ = ((wall.start.y + wall.end.y) / 2) * unitScale;

      wallMesh.position = new Vector3(
        centerX,
        Math.max((wall.height * unitScale) / 2, 0.05),
        centerZ
      );
      wallMesh.rotation.y = Math.atan2(dy, dx);
      wallMesh.material = wallMaterial;
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    const onResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      engine.dispose();
    };
  }, [sceneData]);

  return <canvas ref={canvasRef} className="h-[460px] w-full rounded-md border border-border/50" />;
}

