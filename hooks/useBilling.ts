import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useProjects, projectKeys } from "./useProjects";
import type { MilestoneCreateInput, MilestoneUpdateInput } from "@/lib/validation/milestone";
import type { InvoicePdfPayload } from "@/components/invoice-pdf";

type ApiEnvelope<T> = { data: T | null; error: string | null };

async function parseApiResponse<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok || !json || json.error) throw new Error(json?.error ?? `Request failed (${res.status})`);
  if (json.data === null || json.data === undefined) throw new Error("No data");
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
  description: string | null;
  clientDecisionOpen: boolean;
  projectId: string;
  projectName: string;
  invoices: { id: string; invoiceNo: string; totalAmount: number; status: string }[];
  /** Latest client decision (most recent first, at most one). */
  clientDecisions?: {
    outcome: "APPROVED" | "REJECTED";
    comment: string;
    respondentName: string | null;
    createdAt: string;
  }[];
};

export const milestoneKeys = {
  byProject: (projectId: string) => ["milestones", "project", projectId] as const,
};

/** Billing changes ripple into lists, project counts, dashboard/analytics KPIs and the portal. */
function useInvalidateBilling() {
  const queryClient = useQueryClient();
  return (projectId: string) => {
    queryClient.invalidateQueries({ queryKey: milestoneKeys.byProject(projectId) });
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["portal", "project", projectId] });
  };
}

export function useCreateMilestone() {
  const invalidate = useInvalidateBilling();
  return useMutation({
    mutationFn: async ({ projectId, ...input }: MilestoneCreateInput & { projectId: string }) =>
      parseApiResponse<MilestoneListItem>(
        await fetch(`/api/projects/${projectId}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      ),
    onSuccess: (_, vars) => invalidate(vars.projectId),
  });
}

export function useUpdateMilestone() {
  const invalidate = useInvalidateBilling();
  return useMutation({
    mutationFn: async ({
      projectId,
      milestoneId,
      ...input
    }: MilestoneUpdateInput & { projectId: string; milestoneId: string }) =>
      parseApiResponse<MilestoneListItem>(
        await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      ),
    onSuccess: (_, vars) => invalidate(vars.projectId),
  });
}

export type GeneratedInvoice = InvoicePdfPayload & { created: boolean };

export function useGenerateInvoice() {
  const invalidate = useInvalidateBilling();
  return useMutation({
    mutationFn: async (input: { projectId: string; milestoneId: string; reissue?: boolean }) =>
      parseApiResponse<GeneratedInvoice>(
        await fetch("/api/invoices/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ milestoneId: input.milestoneId, reissue: input.reissue }),
        })
      ),
    onSuccess: (_, vars) => invalidate(vars.projectId),
  });
}

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

/** Milestones for one project (same cache entry as useAllMilestones). */
export function useProjectMilestones(projectId: string, projectName: string) {
  return useQuery({
    queryKey: milestoneKeys.byProject(projectId),
    queryFn: async (): Promise<MilestoneListItem[]> => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      const data = await parseApiResponse<Omit<MilestoneListItem, "projectName">[]>(res);
      return data.map((m) => ({ ...m, projectName }));
    },
    // Wait for the name: this cache entry is shared with Billing, which shows it.
    enabled: !!projectId && !!projectName,
    staleTime: 1000 * 60,
  });
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
