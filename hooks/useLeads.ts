import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { LeadActivity } from "@prisma/client";
import type { Lead, User, ProjectWithRelations } from "@/types";
import type {
  LeadActivityInput,
  LeadCreateInput,
  LeadStageValue,
  LeadUpdateInput,
} from "@/lib/validation/lead";
import { clientKeys } from "./useClients";
import { projectKeys } from "./useProjects";

type ApiEnvelope<T> = { data: T | null; error: string | null };

export type LeadWithActivityLog = Lead & {
  activities: Array<LeadActivity & { user: User | null }>;
};

async function parseApiResponse<T>(res: Response): Promise<T> {
  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok || !json || json.error) {
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  if (json.data === null || json.data === undefined) {
    throw new Error("No data");
  }
  return json.data;
}

/** @deprecated use LeadUpdateInput from lib/validation/lead */
export type UpdateLeadInput = LeadUpdateInput;

// ── Query keys ────────────────────────────────────────────────
export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...leadKeys.lists(), filters] as const,
};

/** Lead changes feed the dashboard KPIs and analytics lead conversion. */
function invalidateLeadDependents(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

// ── Fetch leads ───────────────────────────────────────────────
export function useLeads(stage?: string) {
  return useQuery({
    queryKey: leadKeys.list({ stage: stage ?? "" }),
    queryFn: async (): Promise<LeadWithActivityLog[]> => {
      const params = new URLSearchParams();
      if (stage) params.set("stage", stage);

      const res = await fetch(`/api/leads?${params.toString()}`);
      return parseApiResponse<LeadWithActivityLog[]>(res);
    },
    staleTime: 1000 * 60,
  });
}

// ── Create lead ───────────────────────────────────────────────
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LeadCreateInput): Promise<LeadWithActivityLog> => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<LeadWithActivityLog>(res);
    },
    onSuccess: () => invalidateLeadDependents(queryClient),
  });
}

// ── Update lead (detail form) ─────────────────────────────────
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: LeadUpdateInput & { id: string }): Promise<LeadWithActivityLog> => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseApiResponse<LeadWithActivityLog>(res);
    },
    onSuccess: () => invalidateLeadDependents(queryClient),
  });
}

// ── Move lead to another stage (optimistic) ───────────────────
type StageContext = { snapshots: [readonly unknown[], LeadWithActivityLog[] | undefined][] };

export function useMoveLeadStage() {
  const queryClient = useQueryClient();

  return useMutation<
    LeadWithActivityLog,
    Error,
    { id: string; stage: LeadStageValue },
    StageContext
  >({
    mutationFn: async ({ id, stage }) => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      return parseApiResponse<LeadWithActivityLog>(res);
    },
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: leadKeys.lists() });
      const snapshots = queryClient.getQueriesData<LeadWithActivityLog[]>({
        queryKey: leadKeys.lists(),
      });
      queryClient.setQueriesData<LeadWithActivityLog[]>({ queryKey: leadKeys.lists() }, (old) =>
        old?.map((l) => (l.id === id ? { ...l, stage } : l))
      );
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (updated) => {
      // Swap in the server copy (it carries the new STAGE_CHANGE activity).
      queryClient.setQueriesData<LeadWithActivityLog[]>({ queryKey: leadKeys.lists() }, (old) =>
        old?.map((l) => (l.id === updated.id ? updated : l))
      );
    },
    onSettled: () => invalidateLeadDependents(queryClient),
  });
}

// ── Log an activity ───────────────────────────────────────────
export function useAddLeadActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: LeadActivityInput & { id: string }) => {
      const res = await fetch(`/api/leads/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseApiResponse<LeadActivity & { user: User | null }>(res);
    },
    onSuccess: () => invalidateLeadDependents(queryClient),
  });
}

// ── Convert lead to project ───────────────────────────────────
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<ProjectWithRelations & { reusedClient?: boolean }> => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return parseApiResponse<ProjectWithRelations & { reusedClient?: boolean }>(res);
    },
    onSuccess: () => {
      invalidateLeadDependents(queryClient);
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}
