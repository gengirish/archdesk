"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  getRequiredPlan,
  hasAccess,
  PLAN_DISPLAY,
  type PlanTier,
} from "@/lib/feature-tiers";
import { cn } from "@/lib/utils";

type FeatureGateProps = {
  feature: string;
  children: ReactNode;
  plan?: PlanTier;
};

export function FeatureGate({ feature, children, plan = "pro" }: FeatureGateProps) {
  if (hasAccess(plan, feature)) {
    return <>{children}</>;
  }

  const required = getRequiredPlan(feature);
  const tier = required ?? "pro";
  const display = PLAN_DISPLAY[tier];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm",
        display.ring && "ring-1",
        display.ring,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
        <Lock className="h-6 w-6 text-primary" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Upgrade to unlock</p>
        <p className="text-sm text-muted-foreground">
          This area needs the {display.label} plan or higher.
        </p>
      </div>
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold",
          display.badge,
        )}
      >
        {display.label}
      </span>
      <Link
        href="/settings"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        View Plans
      </Link>
    </div>
  );
}
