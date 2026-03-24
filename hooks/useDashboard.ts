import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@/types";

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

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const res = await fetch("/api/dashboard/stats");
      return parseApiResponse<DashboardStats>(res);
    },
    staleTime: 1000 * 30,
  });
}
