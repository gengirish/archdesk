import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LeadActivity } from "@prisma/client";
import type {
  Lead,
  User,
  CreateLeadInput,
  LeadStage,
  LeadSource,
  ProjectType,
  ProjectWithRelations,
} from "@/types";
import { clientKeys } from "./useClients";
import { projectKeys } from "./useProjects";

type ApiEnvelope<T> = { data: T | null; error: string | null };

export type LeadWithActivityLog = Lead & {
  activities: Array<LeadActivity & { user: User | null }>;
};

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

export type UpdateLeadInput = Partial<{
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  projectType: ProjectType | null;
  budget: number | null;
  area: number | null;
  source: LeadSource;
  stage: LeadStage;
  notes: string | null;
  followUpAt: string | Date | null;
}>;

// ── Query keys ────────────────────────────────────────────────
export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...leadKeys.lists(), filters] as const,
};

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
    mutationFn: async (
      input: CreateLeadInput & {
        area?: number;
        address?: string | null;
        followUpAt?: string | Date | null;
      }
    ): Promise<LeadWithActivityLog> => {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<LeadWithActivityLog>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

// ── Update lead ───────────────────────────────────────────────
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: UpdateLeadInput & { id: string }): Promise<LeadWithActivityLog> => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return parseApiResponse<LeadWithActivityLog>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

// ── Convert lead to project ───────────────────────────────────
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<ProjectWithRelations> => {
      const res = await fetch(`/api/leads/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return parseApiResponse<ProjectWithRelations>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}
