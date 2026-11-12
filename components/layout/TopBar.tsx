"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Building2,
  Users,
  UserPlus,
  Loader2,
  HardHat,
  IndianRupee,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { matchesClientSearch } from "@/lib/validation/client";
import { MobileNav } from "@/components/layout/MobileNav";
import type { ProjectWithRelations } from "@/types";
import type { ClientWithProjectCount } from "@/hooks/useClients";
import type { LeadWithActivityLog } from "@/hooks/useLeads";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatSourceLabel(val: string): string {
  return val.charAt(0) + val.slice(1).toLowerCase().replace(/_/g, " ");
}

type RecentActivityItem = {
  type: string;
  description: string;
  date: string;
};

type AnalyticsPayload = {
  recentActivity: RecentActivityItem[];
};

function activityIcon(type: string) {
  switch (type) {
    case "site_update":
      return HardHat;
    case "lead_activity":
      return UserPlus;
    case "invoice_payment":
      return IndianRupee;
    default:
      return Bell;
  }
}

export function TopBar() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: leads, isLoading: leadsLoading } = useLeads();

  const {
    data: analyticsPayload,
    isLoading: analyticsLoading,
    isError: analyticsError,
  } = useQuery({
    queryKey: ["dashboard", "analytics"],
    queryFn: async (): Promise<AnalyticsPayload> => {
      const res = await fetch("/api/dashboard/analytics");
      const json = (await res.json()) as {
        data: AnalyticsPayload | null;
        error: string | null;
      };
      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error ?? "Failed to load analytics");
      }
      return json.data;
    },
    staleTime: 60_000,
  });

  const recentActivity = analyticsPayload?.recentActivity ?? [];
  const activityPreview = recentActivity.slice(0, 5);
  const hasActivities = !analyticsLoading && recentActivity.length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  const q = paletteQuery.trim().toLowerCase();

  const filteredProjects = useMemo(() => {
    const list = projects ?? [];
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client.name.toLowerCase().includes(q)
    );
  }, [projects, q]);

  const filteredClients = useMemo(() => {
    const list = clients ?? [];
    if (!q) return list;
    // Name / email, or phone by digits ("+91 98765", "98765 43210").
    return list.filter((c) => matchesClientSearch(c, q));
  }, [clients, q]);

  const filteredLeads = useMemo(() => {
    const list = leads ?? [];
    if (!q) return list;
    return list.filter(
      (l) =>
        matchesClientSearch({ name: l.name, email: l.email, phone: l.phone }, q) ||
        formatSourceLabel(l.source).toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
    );
  }, [leads, q]);

  const dataLoading = projectsLoading || clientsLoading || leadsLoading;

  const hasAnyResults =
    filteredProjects.length > 0 ||
    filteredClients.length > 0 ||
    filteredLeads.length > 0;

  function goToProject(p: ProjectWithRelations) {
    router.push(`/projects/${p.id}`);
    setSearchOpen(false);
    setPaletteQuery("");
  }

  function goToClient(c: ClientWithProjectCount) {
    router.push(`/clients?q=${encodeURIComponent(c.name)}`);
    setSearchOpen(false);
    setPaletteQuery("");
  }

  function goToLead(l: LeadWithActivityLog) {
    router.push(`/leads?q=${encodeURIComponent(l.name)}`);
    setSearchOpen(false);
    setPaletteQuery("");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <MobileNav />
      <Dialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) setPaletteQuery("");
        }}
      >
        {/* Mobile: icon-only search trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          aria-label="Search projects, clients and leads"
        >
          <Search className="h-4 w-4" />
        </button>
        {/* sm+: search field look-alike */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Search projects, clients and leads"
          onClick={() => setSearchOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSearchOpen(true);
            }
          }}
          className="hidden min-w-0 cursor-pointer items-center gap-2 rounded-md border border-border/50 bg-secondary/50 px-3 py-1.5 outline-none transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring sm:flex"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            readOnly
            placeholder="Search projects, clients..."
            className="pointer-events-none w-40 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none lg:w-64"
            tabIndex={-1}
            aria-hidden
          />
          <kbd className="hidden shrink-0 rounded border border-border/50 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline-block">
            ⌘K
          </kbd>
        </div>

        <DialogContent
          className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-lg p-0 sm:max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="border-b border-border/50 p-3">
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/50 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search projects, clients, leads..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {dataLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasAnyResults ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No results found
              </p>
            ) : (
              <div className="space-y-4">
                {filteredProjects.length > 0 && (
                  <div>
                    <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Projects
                    </p>
                    <ul className="space-y-0.5">
                      {filteredProjects.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => goToProject(p)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                              "hover:bg-secondary focus:bg-secondary focus:outline-none"
                            )}
                          >
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">
                                {p.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {p.client.name}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {filteredClients.length > 0 && (
                  <div>
                    <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Clients
                    </p>
                    <ul className="space-y-0.5">
                      {filteredClients.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => goToClient(c)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                              "hover:bg-secondary focus:bg-secondary focus:outline-none"
                            )}
                          >
                            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">
                                {c.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {c.phone}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {filteredLeads.length > 0 && (
                  <div>
                    <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Leads
                    </p>
                    <ul className="space-y-0.5">
                      {filteredLeads.map((l) => (
                        <li key={l.id}>
                          <button
                            type="button"
                            onClick={() => goToLead(l)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
                              "hover:bg-secondary focus:bg-secondary focus:outline-none"
                            )}
                          >
                            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">
                                {l.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {formatSourceLabel(l.source)}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {hasActivities ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))]">
            <DropdownMenuLabel>Recent activity</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : analyticsError ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Could not load activity
              </p>
            ) : activityPreview.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No recent activity
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto py-1">
                {activityPreview.map((item, i) => {
                  const Icon = activityIcon(item.type);
                  return (
                    <div
                      key={`${item.date}-${i}`}
                      className="flex gap-3 rounded-sm px-2 py-2 text-sm"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="leading-snug text-foreground">
                          {item.description}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {timeAgo(item.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer">
                View all
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
