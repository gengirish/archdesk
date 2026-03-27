import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
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
  clientDecisionOpen: boolean;
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

export function useToggleMilestoneClientReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
      open,
    }: {
      projectId: string;
      milestoneId: string;
      open: boolean;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/client-review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ open }),
        }
      );
      const json = (await response.json()) as ApiEnvelope<{ id: string }>;
      if (!response.ok || json.error) {
        throw new Error(json.error ?? "Unable to update client review state");
      }
      return json.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["milestones", "project", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["portal", "project", variables.projectId],
      });
    },
  });
}

export function useSendClientDecisionNudge() {
  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
      channel,
      message,
    }: {
      projectId: string;
      milestoneId: string;
      channel: "email" | "whatsapp";
      message?: string;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/client-nudge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ channel, message }),
        }
      );
      const json = (await response.json()) as ApiEnvelope<{
        queued: boolean;
        channel: string;
        queuedAt: string;
      }>;
      if (!response.ok || json.error) {
        throw new Error(json.error ?? "Unable to queue client nudge");
      }
      return json.data;
    },
  });
}

export function useRunDecisionSlaAutomation() {
  return useMutation({
    mutationFn: async ({
      send,
      channel,
      breachHours,
      nudgeCooldownHours,
      limit,
      message,
    }: {
      send: boolean;
      channel?: "email" | "whatsapp";
      breachHours?: number;
      nudgeCooldownHours?: number;
      limit?: number;
      message?: string;
    }) => {
      const response = await fetch("/api/automation/decision-sla", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          send,
          channel: channel ?? "email",
          breachHours: breachHours ?? 48,
          nudgeCooldownHours: nudgeCooldownHours ?? 24,
          limit: limit ?? 25,
          message,
        }),
      });
      const json = (await response.json()) as ApiEnvelope<{
        mode: "dry-run" | "execute";
        scanned: number;
        healthy: number;
        atRisk: number;
        breached: number;
        nudged: number;
        failed: number;
      }>;
      if (!response.ok || json.error) {
        throw new Error(json.error ?? "Unable to run decision SLA automation");
      }
      if (!json.data) {
        throw new Error("Decision SLA automation returned no data");
      }
      return json.data;
    },
  });
}
