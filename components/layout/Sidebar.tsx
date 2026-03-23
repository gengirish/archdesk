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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: Building2 },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Drawings", href: "/drawings", icon: PenTool },
  { label: "Billing", href: "/billing", icon: IndianRupee },
  { label: "Site Tracker", href: "/site-tracker", icon: HardHat },
  { label: "Leads", href: "/leads", icon: UserPlus },
  { label: "Vendors", href: "/vendors", icon: Truck },
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
              {sidebarOpen && <span>{item.label}</span>}
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
    </aside>
  );
}
