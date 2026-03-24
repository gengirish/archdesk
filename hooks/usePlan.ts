import { useQuery } from "@tanstack/react-query";
import type { PlanTier } from "@/lib/feature-tiers";

export function usePlan(): { plan: PlanTier; isLoading: boolean } {
  const { isLoading } = useQuery({
    queryKey: ["firm"],
    queryFn: async () => {
      const res = await fetch("/api/firm");
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return json.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const plan: PlanTier = "free";

  return { plan, isLoading };
}
