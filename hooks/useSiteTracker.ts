import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useProjects } from "./useProjects";
import type {
  IssueSeverityValue,
  IssueStatusValue,
  SiteIssueCreateInput,
  SiteIssueUpdateInput,
} from "@/lib/validation/site-issue";

type ApiEnvelope<T> = { data: T | null; error: string | null };

/** Parses the API envelope; tolerates non-JSON error bodies (e.g. a proxy 413). */
async function parseApiResponse<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // fall through
  }
  if (!res.ok || !json || json.error) {
    if (res.status === 413) throw new Error("Photos are too large. Attach fewer or smaller photos.");
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  if (json.data === null || json.data === undefined) throw new Error("No data");
  return json.data;
}

const toIso = (d: unknown) => (typeof d === "string" ? d : new Date(d as Date).toISOString());

/**
 * The site tracker caches mapped rows (with projectName), so it uses its own
 * keys rather than the project page's raw ["site-updates", "project", id].
 */
export const siteKeys = {
  updates: (projectId: string) => ["site-tracker", "updates", projectId] as const,
  issues: (projectId: string) => ["site-tracker", "issues", projectId] as const,
  projectPageUpdates: (projectId: string) => ["site-updates", "project", projectId] as const,
};

// ── Site updates ──────────────────────────────────────────────

export type SiteUpdateItem = {
  id: string;
  projectId: string;
  note: string | null;
  photos: string[];
  milestone: string | null;
  weather: string | null;
  createdAt: string;
  projectName: string;
  user: { name: string } | null;
};

export function useAllSiteUpdates() {
  const { data: projects } = useProjects();

  const queries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: siteKeys.updates(project.id),
      queryFn: async (): Promise<SiteUpdateItem[]> => {
        const res = await fetch(`/api/projects/${project.id}/site-updates`);
        const data = await parseApiResponse<any[]>(res);
        return data.map((u) => ({
          id: u.id,
          projectId: project.id,
          note: u.note,
          photos: Array.isArray(u.photos) ? u.photos : [],
          milestone: u.milestone ?? null,
          weather: u.weather ?? null,
          createdAt: toIso(u.createdAt),
          projectName: project.name,
          user: u.user ? { name: u.user.name ?? "" } : null,
        }));
      },
      staleTime: 1000 * 60,
      enabled: !!projects,
    })),
  });

  const isLoading = !projects || queries.some((q) => q.isLoading);
  const updates = queries
    .flatMap((q) => q.data ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { updates, isLoading };
}

export type CreateSiteUpdateInput = {
  projectId: string;
  note: string;
  weather?: string;
  milestone?: string;
  photos: File[];
};

export function useCreateSiteUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSiteUpdateInput) => {
      const form = new FormData();
      form.set("note", input.note);
      if (input.weather) form.set("weather", input.weather);
      if (input.milestone) form.set("milestone", input.milestone);
      for (const photo of input.photos) form.append("photos", photo, photo.name);
      const res = await fetch(`/api/projects/${input.projectId}/site-updates`, {
        method: "POST",
        body: form,
      });
      return parseApiResponse<unknown>(res);
    },
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.updates(input.projectId) });
      queryClient.invalidateQueries({ queryKey: siteKeys.projectPageUpdates(input.projectId) });
    },
  });
}

// ── Site issues ───────────────────────────────────────────────

export type SiteIssueItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string | null;
  severity: IssueSeverityValue;
  status: IssueStatusValue;
  assignedTo: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useAllSiteIssues() {
  const { data: projects } = useProjects();

  const queries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: siteKeys.issues(project.id),
      queryFn: async (): Promise<SiteIssueItem[]> => {
        const res = await fetch(`/api/projects/${project.id}/site-issues`);
        const data = await parseApiResponse<any[]>(res);
        return data.map((i) => ({
          id: i.id,
          projectId: project.id,
          projectName: project.name,
          title: i.title,
          description: i.description ?? null,
          severity: i.severity,
          status: i.status,
          assignedTo: i.assignedTo ?? null,
          resolvedAt: i.resolvedAt ? toIso(i.resolvedAt) : null,
          createdAt: toIso(i.createdAt),
          updatedAt: toIso(i.updatedAt),
        }));
      },
      staleTime: 1000 * 60,
      enabled: !!projects,
    })),
  });

  const isLoading = !projects || queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const issues = queries.flatMap((q) => q.data ?? []);
  return { issues, isLoading, isError };
}

export function useCreateSiteIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...input }: SiteIssueCreateInput & { projectId: string }) => {
      const res = await fetch(`/api/projects/${projectId}/site-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<unknown>(res);
    },
    onSuccess: (_d, input) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.issues(input.projectId) });
    },
  });
}

export function useUpdateSiteIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      issueId,
      ...input
    }: SiteIssueUpdateInput & { projectId: string; issueId: string }) => {
      const res = await fetch(`/api/projects/${projectId}/site-issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<unknown>(res);
    },
    onSettled: (_d, _e, input) => {
      queryClient.invalidateQueries({ queryKey: siteKeys.issues(input.projectId) });
    },
  });
}
