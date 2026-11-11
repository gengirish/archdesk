import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectWithRelations, CreateProjectInput } from "@/types";
import type { ProjectCreateInput, ProjectUpdateInput } from "@/lib/validation/project";

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

/** Thrown for 404s so pages can render a not-found state instead of an error. */
export class NotFoundError extends Error {}

async function readEnvelope<T>(res: Response, fallback: string): Promise<T> {
  let json: { data?: T; error?: string | null } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (res.status === 404) throw new NotFoundError(json?.error ?? "Not found");
  if (!res.ok || !json || json.error) throw new Error(json?.error ?? fallback);
  return json.data as T;
}

// ── Fetch single project ──────────────────────────────────────
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<ProjectWithRelations> =>
      readEnvelope<ProjectWithRelations>(await fetch(`/api/projects/${id}`), "Failed to fetch project"),
    enabled: !!id,
    staleTime: 1000 * 30,
    retry: (count, err) => !(err instanceof NotFoundError) && count < 2,
  });
}

/** Everything a project change can affect: lists, detail, dashboard KPIs, portal. */
function invalidateProject(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: projectKeys.all });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["portal", "project", id] });
}

// ── Update project (any editable field) ──────────────────────
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectUpdateInput): Promise<ProjectWithRelations> =>
      readEnvelope<ProjectWithRelations>(
        await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
        "Failed to update project"
      ),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(id), project);
      invalidateProject(queryClient, id);
    },
  });
}

// ── Client portal link ───────────────────────────────────────
export function useRegeneratePortalToken(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      readEnvelope<{ id: string; clientToken: string }>(
        await fetch(`/api/projects/${projectId}/portal-token`, { method: "POST" }),
        "Failed to regenerate the portal link"
      ),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

// ── Team ──────────────────────────────────────────────────────
export type FirmMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
};

export function useFirmMembers() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async (): Promise<FirmMember[]> =>
      readEnvelope<FirmMember[]>(await fetch("/api/team"), "Failed to load team"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddTeamMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; role: string }) =>
      readEnvelope(
        await fetch(`/api/projects/${projectId}/team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
        "Failed to add team member"
      ),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useRemoveTeamMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      readEnvelope(
        await fetch(`/api/projects/${projectId}/team?userId=${encodeURIComponent(userId)}`, {
          method: "DELETE",
        }),
        "Failed to remove team member"
      ),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

// ── Create project ────────────────────────────────────────────
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectCreateInput | CreateProjectInput): Promise<ProjectWithRelations> => {
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
