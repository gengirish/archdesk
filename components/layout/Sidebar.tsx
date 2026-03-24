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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";
import type { PlanTier } from "@/lib/feature-tiers";
import { PLAN_DISPLAY } from "@/lib/feature-tiers";

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
  { label: "Analytics", href: "/analytics", icon: BarChart3, minPlan: "enterprise" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useProjectStore();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border/50 bg-card transition-all duration-200",
        sidebarOpen ? "w-56" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {sidebarOpen && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">ArchDesk</span>
          </Link>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && (
                <span className="flex flex-1 items-center justify-between">
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      <Sparkles className="h-2.5 w-2.5" />
                      {item.badge}
                    </span>
                  )}
                  {item.minPlan === "enterprise" && !item.badge && (
                    <span className="ml-auto rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400/90">
                      ENT
                    </span>
                  )}
                  {item.minPlan === "pro" && !item.badge && (
                    <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary/60">
                      PRO
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border/50 p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            pathname === "/settings" && "bg-primary/10 text-primary"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </Link>
      </div>

      {/* Powered by */}
      {sidebarOpen && (
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
    </aside>
  );
}
