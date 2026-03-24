import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Client, CreateClientInput } from "@/types";

export type ClientWithProjectCount = Client & { _count: { projects: number } };

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
    mutationFn: async (
      input: CreateClientInput & { notes?: string | null }
    ): Promise<ClientWithProjectCount> => {
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
