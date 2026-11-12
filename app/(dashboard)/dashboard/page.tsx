"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  FileCheck,
  IndianRupee,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatINRShort, STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboard";
import { formatMomChange } from "@/lib/dashboard-kpis";

function momClass(pct: number | null) {
  if (pct === null || pct === 0) return "text-muted-foreground";
  return pct > 0 ? "text-emerald-500" : "text-destructive";
}

function KpiCard({
  href,
  label,
  icon: Icon,
  value,
  sub,
  valueClass = "",
  iconClass = "text-primary",
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  value: string;
  sub?: ReactNode;
  valueClass?: string;
  iconClass?: string;
}) {
  return (
    <Link href={href} className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full border-border bg-card transition-colors group-hover:border-primary/40">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          </div>
          <div className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</div>
          {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
        </CardContent>
      </Card>
    </Link>
  );
}

function StageDistribution({ data }: { data: { stage: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Projects by stage</CardTitle>
        <p className="text-xs text-muted-foreground">Active and on-hold projects ({total})</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active projects yet.
          </p>
        ) : (
          <ul className="space-y-2.5" aria-label="Project stage distribution">
            {data.map((d) => (
              <li key={d.stage} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-xs sm:grid-cols-[10rem_1fr_2.5rem]">
                <span className="truncate text-muted-foreground">{STAGE_LABELS[d.stage] ?? d.stage}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(d.count / max) * 100}%`,
                      backgroundColor: STAGE_COLORS[d.stage] ?? STAGE_COLORS.CONCEPT,
                    }}
                  />
                </div>
                <span className="text-right font-medium tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : data ? (
          <>
            <KpiCard
              href="/projects"
              label="Active Projects"
              icon={Building2}
              value={String(data.activeProjects)}
              sub={`${data.completedProjects} completed`}
            />
            <KpiCard
              href="/billing"
              label="Revenue this month"
              icon={IndianRupee}
              value={formatINRShort(data.monthlyRevenue.thisMonth)}
              valueClass="text-primary"
              sub={
                <span>
                  <span className={momClass(data.monthlyRevenue.momPercent)}>
                    {formatMomChange(data.monthlyRevenue)}
                  </span>{" "}
                  vs last month ({formatINRShort(data.monthlyRevenue.lastMonth)})
                </span>
              }
            />
            <KpiCard
              href="/drawings"
              label="Pending drawing approvals"
              icon={FileCheck}
              value={String(data.pendingDrawingApprovals)}
              sub="Awaiting review"
            />
            <KpiCard
              href="/leads"
              label="Active Leads"
              icon={UserPlus}
              value={String(data.totalLeads)}
              sub={`${formatINRShort(data.pipelineValue)} pipeline`}
            />
            <KpiCard
              href="/billing"
              label="Overdue milestones"
              icon={AlertCircle}
              value={String(data.overdueMilestones.count)}
              valueClass={data.overdueMilestones.count > 0 ? "text-destructive" : ""}
              iconClass={data.overdueMilestones.count > 0 ? "text-destructive" : "text-muted-foreground"}
              sub={
                data.overdueMilestones.count > 0
                  ? `${formatINR(data.overdueMilestones.amount)} incl. GST`
                  : "Nothing overdue"
              }
            />
          </>
        ) : null}
      </div>

      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-lg" />
      ) : data ? (
        <StageDistribution data={data.stageDistribution} />
      ) : null}

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
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
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
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
