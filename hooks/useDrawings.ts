import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/hooks/useProjects";

type ApiEnvelope<T> = { data: T | null; error: string | null };

async function parseApiResponse<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON body (e.g. platform 413) */
  }
  if (!res.ok || !json || json.error) {
    if (res.status === 413) throw new Error("File is too large to upload");
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  if (json.data === null || json.data === undefined) {
    throw new Error("No data");
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

export type DrawingVersionItem = {
  id: string;
  version: number;
  fileUrl: string;
  fileSize: number | null;
  note: string | null;
  createdAt: string;
};

export type DrawingCommentItem = {
  id: string;
  content: string;
  isClient: boolean;
  clientName: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null } | null;
};

export type DrawingDetail = Omit<DrawingListItem, "comments"> & {
  mimeType: string | null;
  createdAt: string;
  versions: DrawingVersionItem[];
  comments: DrawingCommentItem[];
};

export const drawingKeys = {
  all: ["drawings"] as const,
  byProject: (projectId: string) => [...drawingKeys.all, "project", projectId] as const,
  detail: (drawingId: string) => [...drawingKeys.all, "detail", drawingId] as const,
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

export function useDrawingDetail(projectId: string | null, drawingId: string | null) {
  return useQuery({
    queryKey: drawingKeys.detail(drawingId ?? ""),
    queryFn: async (): Promise<DrawingDetail> => {
      const res = await fetch(`/api/projects/${projectId}/drawings/${drawingId}`);
      return parseApiResponse<DrawingDetail>(res);
    },
    enabled: !!projectId && !!drawingId,
  });
}

/** Refresh everything a drawing change can affect (lists, detail, project counts). */
function useInvalidateDrawing() {
  const queryClient = useQueryClient();
  return (projectId: string, drawingId?: string) => {
    queryClient.invalidateQueries({ queryKey: drawingKeys.byProject(projectId) });
    if (drawingId) queryClient.invalidateQueries({ queryKey: drawingKeys.detail(drawingId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useUploadDrawing() {
  const invalidate = useInvalidateDrawing();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      name: string;
      type: string;
      file: File;
      versionNote?: string;
    }): Promise<DrawingDetail> => {
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("name", input.name);
      formData.append("type", input.type);
      if (input.versionNote) formData.append("versionNote", input.versionNote);
      const res = await fetch(`/api/projects/${input.projectId}/drawings/upload`, {
        method: "POST",
        body: formData,
      });
      return parseApiResponse<DrawingDetail>(res);
    },
    onSuccess: (drawing, vars) => invalidate(vars.projectId, drawing.id),
  });
}

export function useUpdateDrawingStatus() {
  const invalidate = useInvalidateDrawing();
  return useMutation({
    mutationFn: async (input: { projectId: string; drawingId: string; status: string }) => {
      const res = await fetch(`/api/projects/${input.projectId}/drawings/${input.drawingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      });
      return parseApiResponse<DrawingDetail>(res);
    },
    onSuccess: (_, vars) => invalidate(vars.projectId, vars.drawingId),
  });
}

export function useAddDrawingComment() {
  const invalidate = useInvalidateDrawing();
  return useMutation({
    mutationFn: async (input: { projectId: string; drawingId: string; content: string }) => {
      const res = await fetch(
        `/api/projects/${input.projectId}/drawings/${input.drawingId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: input.content }),
        }
      );
      return parseApiResponse<DrawingCommentItem>(res);
    },
    onSuccess: (_, vars) => invalidate(vars.projectId, vars.drawingId),
  });
}

export function useUploadDrawingVersion() {
  const invalidate = useInvalidateDrawing();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      drawingId: string;
      file: File;
      note?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.note) formData.append("note", input.note);
      const res = await fetch(
        `/api/projects/${input.projectId}/drawings/${input.drawingId}/versions`,
        { method: "POST", body: formData }
      );
      return parseApiResponse<DrawingDetail>(res);
    },
    onSuccess: (_, vars) => invalidate(vars.projectId, vars.drawingId),
  });
}
