import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectWithRelations, CreateProjectInput } from "@/types";

// ── Query keys ────────────────────────────────────────────────
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
};

// ── Fetch all projects ────────────────────────────────────────
export function useProjects(filters?: { type?: string; stage?: string }) {
  return useQuery({
    queryKey: projectKeys.list(filters ?? {}),
    queryFn: async (): Promise<ProjectWithRelations[]> => {
      const params = new URLSearchParams();
      if (filters?.type) params.set("type", filters.type);
      if (filters?.stage) params.set("stage", filters.stage);

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

// ── Fetch single project ──────────────────────────────────────
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<ProjectWithRelations> => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

// ── Create project ────────────────────────────────────────────
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<ProjectWithRelations> => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create project");
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ── Update project stage ──────────────────────────────────────
export function useUpdateProjectStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
