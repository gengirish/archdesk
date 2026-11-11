"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  PenTool,
  IndianRupee,
  HardHat,
  UserPlus,
  Truck,
  Settings,
  Ruler,
  PanelLeftClose,
  PanelLeft,
  Calculator,
  Sparkles,
  BarChart3,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";
import { usePlan } from "@/hooks/usePlan";
import type { PlanTier } from "@/lib/feature-tiers";

interface NavItemDef {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minPlan?: PlanTier;
  badge?: string;
}

const navItems: NavItemDef[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Building2 },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Drawings", href: "/drawings", icon: PenTool, minPlan: "pro" },
  { label: "Billing", href: "/billing", icon: IndianRupee },
  { label: "Site Tracker", href: "/site-tracker", icon: HardHat, minPlan: "pro" },
  { label: "Leads", href: "/leads", icon: UserPlus, minPlan: "pro" },
  { label: "Vendors", href: "/vendors", icon: Truck, minPlan: "pro" },
  { label: "AI Estimator", href: "/ai-estimator", icon: Calculator, minPlan: "pro", badge: "AI" },
  { label: "3D Studio", href: "/3d-studio", icon: Box, minPlan: "enterprise" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, minPlan: "enterprise" },
];

function PlanBadge({ item }: { item: NavItemDef }) {
  if (item.badge) {
    return (
      <span className="ml-auto flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
        <Sparkles className="h-2.5 w-2.5" />
        {item.badge}
      </span>
    );
  }
  if (item.minPlan === "enterprise") {
    return (
      <span className="ml-auto rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400/90">
        ENT
      </span>
    );
  }
  if (item.minPlan === "pro") {
    return (
      <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary/60">
        PRO
      </span>
    );
  }
  return null;
}

/**
 * Logo-less nav list shared by the desktop sidebar and the mobile drawer.
 * `expanded` shows labels; `onNavigate` lets the drawer close after a tap.
 */
export function SidebarNav({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { plan, isLoading: planLoading } = usePlan();
  // Plan badges are upgrade hints: never show them to Enterprise firms
  // (or while the plan is still loading, to avoid a flash).
  const showPlanBadges = !planLoading && plan !== "enterprise";

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Main">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              title={expanded ? undefined : item.label}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {expanded ? (
                <span className="flex flex-1 items-center justify-between">
                  {item.label}
                  {showPlanBadges ? <PlanBadge item={item} /> : null}
                </span>
              ) : (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          title={expanded ? undefined : "Settings"}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            pathname === "/settings" && "bg-primary/10 text-primary"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {expanded ? <span>Settings</span> : <span className="sr-only">Settings</span>}
        </Link>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3">
          <a
            href="https://www.intelliforge.tech/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            Powered by <span className="font-medium">IntelliForge AI</span>
          </a>
        </div>
      )}
    </>
  );
}

export function SidebarLogo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
      <Ruler className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium">ArchDesk</span>
    </Link>
  );
}

/** Desktop sidebar (md and up). Below md the TopBar's MobileNav drawer is used. */
export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useProjectStore();

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border/50 bg-card transition-all duration-200 md:flex",
        sidebarOpen ? "w-56" : "w-16"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {sidebarOpen && <SidebarLogo />}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
      </div>
      <SidebarNav expanded={sidebarOpen} />
    </aside>
  );
}
