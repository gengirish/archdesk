"use client";

import {
  Building2,
  IndianRupee,
  UserPlus,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatINRShort, STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboard";

function StatCardSkeleton() {
  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="mt-2 h-8 w-24" />
      </CardContent>
    </Card>
  );
}

function RecentProjectsSkeleton() {
  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md px-3 py-2.5"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardStats();

  const errMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your firm&apos;s projects, revenue, and pipeline
        </p>
      </div>

      {errMessage && (
        <Card className="border-destructive/40 bg-card">
          <CardContent className="p-4 text-sm text-destructive">{errMessage}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active Projects</span>
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-semibold">{data.activeProjects}</div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Revenue</span>
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-semibold text-primary">
                  {formatINRShort(data.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Pending Revenue</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-semibold text-primary">
                  {formatINRShort(data.pendingRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Active Leads</span>
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-semibold">{data.totalLeads}</div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Clients</span>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-semibold">{data.totalClients}</div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Overdue Items</span>
                  <AlertCircle
                    className={`h-4 w-4 ${data.overdueInvoices > 0 ? "text-destructive" : "text-muted-foreground"}`}
                  />
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold ${data.overdueInvoices > 0 ? "text-destructive" : ""}`}
                >
                  {data.overdueInvoices}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <RecentProjectsSkeleton />
      ) : data ? (
        <Card className="border-border bg-card text-card-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentProjects.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No projects yet. Create a project to see it here.
              </p>
            ) : (
              data.recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{project.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {project.client.name}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-xs text-muted-foreground">
                      {project.budget != null ? formatINR(project.budget) : "—"}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: STAGE_COLORS[project.stage] ?? STAGE_COLORS.CONCEPT,
                        color: STAGE_COLORS[project.stage] ?? STAGE_COLORS.CONCEPT,
                      }}
                    >
                      {STAGE_LABELS[project.stage] ?? project.stage}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
