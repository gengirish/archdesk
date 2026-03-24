import { useQuery } from "@tanstack/react-query";

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

export type DrawingListItem = {
  id: string;
  name: string;
  type: string;
  status: string;
  version: number;
  fileUrl: string;
  fileSize: number | null;
  updatedAt: string;
  projectId: string;
  comments: { id: string }[];
};

export const drawingKeys = {
  all: ["drawings"] as const,
  byProject: (projectId: string) => [...drawingKeys.all, "project", projectId] as const,
};

export function useDrawingsByProject(projectId: string) {
  return useQuery({
    queryKey: drawingKeys.byProject(projectId),
    queryFn: async (): Promise<DrawingListItem[]> => {
      const res = await fetch(`/api/projects/${projectId}/drawings`);
      return parseApiResponse<DrawingListItem[]>(res);
    },
    enabled: !!projectId,
    staleTime: 1000 * 60,
  });
}
