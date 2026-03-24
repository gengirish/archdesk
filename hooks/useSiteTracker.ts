import { useQueries } from "@tanstack/react-query";
import { useProjects } from "./useProjects";

type ApiEnvelope<T> = { data: T | null; error: string | null };

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) throw new Error(json.error ?? `Request failed (${res.status})`);
  if (json.data === null || json.data === undefined) throw new Error(json.error ?? "No data");
  return json.data;
}

export type SiteUpdateItem = {
  id: string;
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
      queryKey: ["site-updates", "project", project.id],
      queryFn: async (): Promise<SiteUpdateItem[]> => {
        const res = await fetch(`/api/projects/${project.id}/site-updates`);
        const data = await parseApiResponse<any[]>(res);
        return data.map((u) => ({
          id: u.id,
          note: u.note,
          photos: Array.isArray(u.photos) ? u.photos : [],
          milestone: u.milestone ?? null,
          weather: u.weather ?? null,
          createdAt: typeof u.createdAt === "string" ? u.createdAt : new Date(u.createdAt).toISOString(),
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
