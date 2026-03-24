import { useQueries } from "@tanstack/react-query";
import { useProjects } from "./useProjects";

type ApiEnvelope<T> = { data: T | null; error: string | null };

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) throw new Error(json.error ?? `Request failed (${res.status})`);
  if (json.data === null || json.data === undefined) throw new Error(json.error ?? "No data");
  return json.data;
}

export type MilestoneListItem = {
  id: string;
  name: string;
  stage: string;
  amount: number;
  gstPercent: number;
  status: string;
  paidAt: string | null;
  paidAmount: number | null;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  invoices: { id: string; invoiceNo: string; totalAmount: number; status: string }[];
};

export function useAllMilestones() {
  const { data: projects } = useProjects();

  const milestoneQueries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: ["milestones", "project", project.id],
      queryFn: async (): Promise<MilestoneListItem[]> => {
        const res = await fetch(`/api/projects/${project.id}/milestones`);
        const data = await parseApiResponse<any[]>(res);
        return data.map((m) => ({ ...m, projectName: project.name }));
      },
      staleTime: 1000 * 60,
      enabled: !!projects,
    })),
  });

  const isLoading = !projects || milestoneQueries.some((q) => q.isLoading);
  const milestones = milestoneQueries.flatMap((q) => q.data ?? []);

  return { milestones, isLoading };
}
