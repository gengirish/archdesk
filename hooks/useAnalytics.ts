import { useQuery } from "@tanstack/react-query";

type ApiEnvelope<T> = { data: T | null; error: string | null };

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || json.error) throw new Error(json.error ?? `Request failed (${res.status})`);
  if (json.data === null || json.data === undefined) throw new Error(json.error ?? "No data");
  return json.data;
}

export type AnalyticsData = {
  revenueByMonth: { month: string; revenue: number; invoiced: number }[];
  projectsByStage: { stage: string; count: number }[];
  projectsByType: { type: string; count: number }[];
  leadConversion: { total: number; won: number; lost: number; rate: number };
  topClients: { name: string; projects: number; totalValue: number }[];
  cashFlow: {
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    projectedNextMonth: number;
  };
  decisionInsights: {
    totalDecisionsLast30Days: number;
    approvedLast30Days: number;
    rejectedLast30Days: number;
    approvalRate: number;
    openDecisionRequests: number;
    avgResponseHours: number;
    slaHealth: {
      healthy: number;
      atRisk: number;
      breached: number;
    };
    bottlenecksByProject: {
      projectId: string;
      projectName: string;
      openRequests: number;
      oldestOpenHours: number;
      avgResponseHours: number;
      decisionsLast30Days: number;
    }[];
  };
  recentActivity: { type: string; description: string; date: string }[];
};

export function useAnalytics() {
  return useQuery({
    queryKey: ["dashboard", "analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      const res = await fetch("/api/dashboard/analytics");
      return parseApiResponse<AnalyticsData>(res);
    },
    staleTime: 1000 * 60 * 2,
  });
}
