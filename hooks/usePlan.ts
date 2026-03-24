import { useQuery } from "@tanstack/react-query";
import type { PlanTier } from "@/lib/feature-tiers";
import { PLAN_HIERARCHY } from "@/lib/feature-tiers";

export function usePlan(): { plan: PlanTier; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["firm"],
    queryFn: async () => {
      const res = await fetch("/api/firm");
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed");
      return json.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const raw = data?.plan as string | undefined;
  const plan: PlanTier = raw && PLAN_HIERARCHY.includes(raw as PlanTier)
    ? (raw as PlanTier)
    : "free";

  return { plan, isLoading };
}
