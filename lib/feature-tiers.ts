export type PlanTier = "free" | "pro" | "enterprise";

export const PLAN_HIERARCHY: PlanTier[] = ["free", "pro", "enterprise"];

export type FeatureKey =
  | "dashboard"
  | "projects"
  | "clients"
  | "basic_billing"
  | "settings"
  | "unlimited_projects"
  | "unlimited_clients"
  | "drawings"
  | "site_tracker"
  | "leads_crm"
  | "vendors"
  | "advanced_billing"
  | "ai_estimator"
  | "pdf_invoices"
  | "file_uploads"
  | "client_portal"
  | "multi_user"
  | "analytics"
  | "white_label"
  | "api_access"
  | "priority_support";

export const FEATURE_TIERS: Record<FeatureKey, PlanTier> = {
  dashboard: "free",
  projects: "free",
  clients: "free",
  basic_billing: "free",
  settings: "free",
  unlimited_projects: "pro",
  unlimited_clients: "pro",
  drawings: "pro",
  site_tracker: "pro",
  leads_crm: "pro",
  vendors: "pro",
  advanced_billing: "pro",
  ai_estimator: "pro",
  pdf_invoices: "pro",
  file_uploads: "pro",
  client_portal: "enterprise",
  multi_user: "enterprise",
  analytics: "enterprise",
  white_label: "enterprise",
  api_access: "enterprise",
  priority_support: "enterprise",
};

export const PLAN_LIMITS: Record<
  PlanTier,
  { maxProjects: number | null; maxClients: number | null }
> = {
  free: { maxProjects: 3, maxClients: 5 },
  pro: { maxProjects: null, maxClients: null },
  enterprise: { maxProjects: null, maxClients: null },
};

export const PLAN_DISPLAY: Record<
  PlanTier,
  { label: string; description: string; accent: string; ring: string; badge: string }
> = {
  free: {
    label: "Free",
    description: "Essentials for solo architects getting started.",
    accent: "text-muted-foreground",
    ring: "ring-border",
    badge: "bg-muted text-muted-foreground",
  },
  pro: {
    label: "Pro",
    description: "Full studio workflow, billing, and AI tools.",
    accent: "text-primary",
    ring: "ring-primary/40",
    badge: "bg-primary/15 text-primary border border-primary/30",
  },
  enterprise: {
    label: "Enterprise",
    description: "Portals, teams, analytics, and white-label control.",
    accent: "text-amber-400",
    ring: "ring-amber-500/35",
    badge: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  },
};

function tierRank(tier: PlanTier): number {
  return PLAN_HIERARCHY.indexOf(tier);
}

export function hasAccess(plan: PlanTier, feature: string): boolean {
  const minTier = FEATURE_TIERS[feature as FeatureKey];
  if (minTier === undefined) return true;
  return tierRank(plan) >= tierRank(minTier);
}

export function getRequiredPlan(feature: string): PlanTier | null {
  return FEATURE_TIERS[feature as FeatureKey] ?? null;
}

export function getFeaturesForPlan(plan: PlanTier): FeatureKey[] {
  const rank = tierRank(plan);
  return (Object.entries(FEATURE_TIERS) as [FeatureKey, PlanTier][]).filter(
    ([, min]) => tierRank(min) <= rank,
  ).map(([key]) => key);
}
