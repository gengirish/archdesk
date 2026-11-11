import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Vendor } from "@/types";
import { readApiEnvelope } from "@/lib/validation/form-errors";
import type { VendorCreateInput } from "@/lib/validation/vendor";

const parseApiResponse = readApiEnvelope;

export type CreateVendorInput = VendorCreateInput;
export type UpdateVendorInput = Partial<VendorCreateInput> & { id: string };

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

// ── Update vendor ─────────────────────────────────────────────
export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateVendorInput): Promise<Vendor> => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PATCH",
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
