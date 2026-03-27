import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ApiEnvelope<T> = { data: T | null; error: string | null };

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) {
    throw new Error(json.error ?? `Request failed (${res.status})`);
  }
  if (json.data === null || json.data === undefined) {
    throw new Error(json.error ?? "No data");
  }
  return json.data;
}

export type FloorPlanRecord = {
  id: string;
  name: string;
  sourceType: "MANUAL" | "DXF" | "PDF" | "IMAGE";
  unit: string;
  scale: number;
  wallHeight: number;
  wallThickness: number;
  planJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export type FlatSceneRecord = {
  id: string;
  name: string;
  status: "DRAFT" | "GENERATED" | "FAILED";
  floorPlanId: string | null;
  sceneJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export const studioKeys = {
  all: ["studio"] as const,
  floorPlans: (projectId: string) => [...studioKeys.all, "floor-plans", projectId] as const,
  scenes: (projectId: string) => [...studioKeys.all, "flat-scenes", projectId] as const,
};

export function useProjectFloorPlans(projectId: string) {
  return useQuery({
    queryKey: studioKeys.floorPlans(projectId),
    queryFn: async (): Promise<FloorPlanRecord[]> => {
      const res = await fetch(`/api/projects/${projectId}/floor-plans`);
      return parseApiResponse<FloorPlanRecord[]>(res);
    },
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}

export function useProjectFlatScenes(projectId: string) {
  return useQuery({
    queryKey: studioKeys.scenes(projectId),
    queryFn: async (): Promise<FlatSceneRecord[]> => {
      const res = await fetch(`/api/projects/${projectId}/flat-scenes`);
      return parseApiResponse<FlatSceneRecord[]>(res);
    },
    enabled: !!projectId,
    staleTime: 1000 * 30,
  });
}

export function useCreateSampleFloorPlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<FloorPlanRecord> => {
      const res = await fetch(`/api/projects/${projectId}/floor-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sourceType: "MANUAL",
        }),
      });
      return parseApiResponse<FloorPlanRecord>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.floorPlans(projectId) });
    },
  });
}

export function useGenerateFlatScene(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      floorPlanId,
      sceneName,
    }: {
      floorPlanId: string;
      sceneName?: string;
    }): Promise<FlatSceneRecord> => {
      const res = await fetch(`/api/projects/${projectId}/flat-scenes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorPlanId,
          sceneName,
        }),
      });
      return parseApiResponse<FlatSceneRecord>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studioKeys.scenes(projectId) });
    },
  });
}

