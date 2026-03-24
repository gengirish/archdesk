import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Vendor, VendorCategory } from "@/types";

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

export type CreateVendorInput = {
  name: string;
  category: VendorCategory;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  gst?: string;
  notes?: string;
  rating?: number;
};

// ── Query keys ────────────────────────────────────────────────
export const vendorKeys = {
  all: ["vendors"] as const,
  lists: () => [...vendorKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...vendorKeys.lists(), filters] as const,
};

// ── Fetch vendors ─────────────────────────────────────────────
export function useVendors(category?: string) {
  return useQuery({
    queryKey: vendorKeys.list({ category: category ?? "" }),
    queryFn: async (): Promise<Vendor[]> => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);

      const res = await fetch(`/api/vendors?${params.toString()}`);
      return parseApiResponse<Vendor[]>(res);
    },
    staleTime: 1000 * 60,
  });
}

// ── Create vendor ─────────────────────────────────────────────
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVendorInput): Promise<Vendor> => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseApiResponse<Vendor>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}
