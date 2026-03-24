"use client";

import {
  IndianRupee,
  Clock,
  AlertCircle,
  TrendingUp,
  HardHat,
  UserPlus,
  Loader2,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatINRShort, STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";

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

function formatProjectType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function CashStatSkeleton() {
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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 text-foreground">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CashStatSkeleton key={i} />
        ))}
      </div>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-28 rounded-full" />
            ))}
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const { plan } = usePlan();
  const { data, isLoading, isFetching, error } = useAnalytics();

  const errMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  const showSpinnerFallback = isLoading && !data;

  return (
    <FeatureGate feature="analytics" plan={plan}>
      <div className="space-y-6 text-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deep insights into your firm&apos;s performance
            </p>
          </div>
          {showSpinnerFallback ? (
            <Loader2
              className="h-6 w-6 shrink-0 animate-spin text-muted-foreground"
              aria-label="Loading"
            />
          ) : isFetching ? (
            <Loader2
              className="h-5 w-5 shrink-0 animate-spin text-muted-foreground/70"
              aria-hidden
            />
          ) : null}
        </div>

        {errMessage && (
          <Card className="border-destructive/40 bg-card">
            <CardContent className="p-4 text-sm text-destructive">{errMessage}</CardContent>
          </Card>
        )}

        {isLoading ? (
          <AnalyticsSkeleton />
        ) : data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Received</span>
                    <IndianRupee className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-green-400">
                    {formatINRShort(data.cashFlow.totalReceived)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Pending</span>
                    <Clock className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-yellow-400">
                    {formatINRShort(data.cashFlow.totalPending)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Overdue</span>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-destructive">
                    {formatINRShort(data.cashFlow.totalOverdue)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Projected Next Month</span>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-primary">
                    {formatINRShort(data.cashFlow.projectedNextMonth)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card text-card-foreground">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Revenue by Month</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Collected revenue vs invoiced amount (rolling 12 months)
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center gap-4 border-b border-border/50 pb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="w-24 shrink-0">Month</span>
                  <span className="flex-1">Trend</span>
                  <span className="w-20 text-right">Revenue</span>
                  <span className="w-20 text-right">Invoiced</span>
                </div>
                {(() => {
                  const maxRevenue = Math.max(
                    ...data.revenueByMonth.map((m) => Math.max(m.revenue, m.invoiced)),
                    1,
                  );
                  return data.revenueByMonth.map((m) => (
                    <div key={m.month} className="flex items-center gap-4 py-1.5">
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">
                        {m.month}
                      </span>
                      <div className="flex-1">
                        <div className="flex h-3 min-w-0 gap-1 rounded bg-secondary/40 px-0.5 py-0.5">
                          <div
                            className="h-full min-w-0 rounded bg-primary/80 transition-all"
                            style={{
                              width: `${Math.min(100, (m.revenue / maxRevenue) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-20 text-right text-xs font-medium">
                        {formatINRShort(m.revenue)}
                      </span>
                      <span className="w-20 text-right text-xs text-muted-foreground">
                        {formatINRShort(m.invoiced)}
                      </span>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Projects by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.projectsByStage.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No projects yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.projectsByStage.map((row) => (
                        <Badge
                          key={row.stage}
                          variant="outline"
                          className="gap-1.5 text-xs font-normal"
                          style={{
                            borderColor: STAGE_COLORS[row.stage] ?? STAGE_COLORS.CONCEPT,
                            color: STAGE_COLORS[row.stage] ?? STAGE_COLORS.CONCEPT,
                          }}
                        >
                          <span>{STAGE_LABELS[row.stage] ?? row.stage}</span>
                          <span className="font-semibold tabular-nums">{row.count}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Projects by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.projectsByType.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No projects yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.projectsByType.map((row) => (
                        <Badge
                          key={row.type}
                          variant="secondary"
                          className="gap-1.5 text-xs font-normal"
                        >
                          <span>{formatProjectType(row.type)}</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {row.count}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card text-card-foreground">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Lead Conversion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center sm:grid-cols-3">
                  <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Total Leads</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">
                      {data.leadConversion.total}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Won</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums text-green-400">
                      {data.leadConversion.won}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-3">
                    <div className="text-xs text-muted-foreground">Lost</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums text-muted-foreground">
                      {data.leadConversion.lost}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Conversion rate</span>
                    <span className="font-medium tabular-nums text-primary">
                      {data.leadConversion.rate}%
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.max(0, data.leadConversion.rate))} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card text-card-foreground">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Top Clients</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No client data yet.</p>
                ) : (
                  <div className="divide-y divide-border/50">
                    <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 pb-3 text-xs font-medium text-muted-foreground sm:gap-4">
                      <span className="w-8">#</span>
                      <span>Client</span>
                      <span className="text-right">Projects</span>
                      <span className="text-right">Total Value</span>
                    </div>
                    {data.topClients.map((c, idx) => (
                      <div
                        key={c.name + idx}
                        className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3 text-sm sm:gap-4"
                      >
                        <span className="w-8 text-xs text-muted-foreground tabular-nums">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 truncate font-medium">{c.name}</span>
                        <span className="text-right text-xs tabular-nums text-muted-foreground">
                          {c.projects}
                        </span>
                        <span className="text-right text-xs font-medium tabular-nums">
                          {formatINRShort(c.totalValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card text-card-foreground">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data.recentActivity.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                    No recent activity.
                  </p>
                ) : (
                  data.recentActivity.slice(0, 10).map((item, idx) => {
                    const Icon = activityIcon(item.type);
                    return (
                      <div
                        key={`${item.date}-${idx}`}
                        className="flex gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-secondary/50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-secondary/30">
                          <Icon className="h-4 w-4 text-primary" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">{item.description}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {timeAgo(item.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        ) : !errMessage ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading analytics…</p>
          </div>
        ) : null}
      </div>
    </FeatureGate>
  );
}
