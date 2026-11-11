import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Client } from "@/types";
import type { ClientCreateInput, ClientUpdateInput } from "@/lib/validation/client";
import { readApiEnvelope } from "@/lib/validation/form-errors";

export type ClientWithProjectCount = Client & { _count: { projects: number } };

const parseApiResponse = readApiEnvelope;

// ── Query keys ────────────────────────────────────────────────
export const clientKeys = {
  all: ["clients"] as const,
  lists: () => [...clientKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...clientKeys.lists(), filters] as const,
};

// ── Fetch clients ─────────────────────────────────────────────
export function useClients(search?: string) {
  return useQuery({
    queryKey: clientKeys.list({ search: search ?? "" }),
    queryFn: async (): Promise<ClientWithProjectCount[]> => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/clients?${params.toString()}`);
      return parseApiResponse<ClientWithProjectCount[]>(res);
    },
    staleTime: 1000 * 60,
  });
}

// ── Create client ─────────────────────────────────────────────
export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClientCreateInput): Promise<ClientWithProjectCount> => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<ClientWithProjectCount>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() });
    },
  });
}

// ── Update client ─────────────────────────────────────────────
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: ClientUpdateInput & { id: string }): Promise<ClientWithProjectCount> => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<ClientWithProjectCount>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
      // Client names / phones appear on projects and invoices too.
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
