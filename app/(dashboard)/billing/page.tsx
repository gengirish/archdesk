"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Suspense } from "react";
import { IndianRupee, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatINR, formatINRShort, formatDate, calculateGST } from "@/lib/utils";
import { hasAccess } from "@/lib/feature-tiers";
import { usePlan } from "@/hooks/usePlan";
import {
  useAllMilestones,
  useSendClientDecisionNudge,
  useToggleMilestoneClientReview,
} from "@/hooks/useBilling";

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  PAID: { color: "text-green-400", icon: CheckCircle },
  DUE: { color: "text-yellow-400", icon: Clock },
  OVERDUE: { color: "text-destructive", icon: AlertCircle },
  UPCOMING: { color: "text-muted-foreground", icon: Clock },
  UNPAID: { color: "text-yellow-400", icon: Clock },
};

function BillingPageContent() {
  const searchParams = useSearchParams();
  const { milestones, isLoading } = useAllMilestones();
  const { plan } = usePlan();
  const canUseClientPortalDecisions = hasAccess(plan, "client_portal");
  const toggleDecisionCollection = useToggleMilestoneClientReview();
  const sendClientNudge = useSendClientDecisionNudge();
  const [nudgedMilestones, setNudgedMilestones] = useState<Record<string, true>>({});
  const [nudgeError, setNudgeError] = useState<string | null>(null);

  const projectIdFilter = searchParams.get("projectId")?.trim() || "";
  const decisionFilter = searchParams.get("decision")?.trim() || "";

  const filteredMilestones = milestones.filter((milestone) => {
    if (projectIdFilter && milestone.projectId !== projectIdFilter) return false;
    if (decisionFilter === "open" && !milestone.clientDecisionOpen) return false;
    return true;
  });

  const selectedProjectName =
    filteredMilestones[0]?.projectName ??
    milestones.find((milestone) => milestone.projectId === projectIdFilter)?.projectName ??
    null;

  const totalBilled = filteredMilestones.reduce((sum, milestone) => sum + milestone.amount, 0);
  const totalPaid = filteredMilestones
    .filter((milestone) => milestone.status === "PAID")
    .reduce((sum, milestone) => sum + milestone.amount, 0);
  const totalDue = filteredMilestones
    .filter((milestone) => ["DUE", "OVERDUE", "UNPAID"].includes(milestone.status))
    .reduce((sum, milestone) => sum + milestone.amount, 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Milestone-based billing across all projects
        </p>
        {(projectIdFilter || decisionFilter) && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
              {selectedProjectName ? `Project: ${selectedProjectName}` : "Project filtered"}
            </span>
            {decisionFilter === "open" && (
              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-500">
                Decision: Open
              </span>
            )}
            <Link href="/billing" className="font-medium text-muted-foreground underline-offset-4 hover:underline">
              Clear filters
            </Link>
          </div>
        )}
        {nudgeError && (
          <p className="mt-2 text-xs text-destructive">{nudgeError}</p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Billed</span>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{formatINRShort(totalBilled)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              incl. GST: {formatINRShort(calculateGST(totalBilled).totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collected</span>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-green-400">
              {formatINRShort(totalPaid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Outstanding</span>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-yellow-400">
              {formatINRShort(totalDue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collection Rate</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{collectionRate}%</div>
            <Progress value={collectionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Milestones table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-sm text-muted-foreground">Loading milestones...</div>
          ) : filteredMilestones.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">No milestones found yet.</div>
          ) : (
            <div className="divide-y divide-border/50">
            <div className="grid grid-cols-7 gap-4 pb-3 text-xs font-medium text-muted-foreground">
              <span className="col-span-2">Milestone</span>
              <span>Project</span>
              <span>Amount</span>
              <span>With GST</span>
              <span>Status</span>
              <span className="col-span-2">Client Decision</span>
            </div>
            {filteredMilestones.map((m) => {
              const gst = calculateGST(m.amount);
              const config = statusConfig[m.status];
              const Icon = config.icon;
              return (
                <div key={m.id} className="grid grid-cols-7 items-center gap-4 py-3">
                  <div className="col-span-2">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.stage.replace(/_/g, " ")}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.projectName}</span>
                  <span className="text-xs font-medium">{formatINR(m.amount)}</span>
                  <span className="text-xs text-muted-foreground">{formatINR(gst.totalAmount)}</span>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ color: config.color.replace("text-", "") }}
                    >
                      {m.status}
                    </Badge>
                    {m.paidAt && (
                      <span className="text-[10px] text-muted-foreground/70">
                        {formatDate(m.paidAt)}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Badge variant={m.clientDecisionOpen ? "default" : "secondary"} className="text-[10px]">
                      {m.clientDecisionOpen ? "Open" : "Closed"}
                    </Badge>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        toggleDecisionCollection.isPending ||
                        !canUseClientPortalDecisions
                      }
                      onClick={() => {
                        toggleDecisionCollection.mutate({
                          projectId: m.projectId,
                          milestoneId: m.id,
                          open: !m.clientDecisionOpen,
                        });
                      }}
                    >
                      {m.clientDecisionOpen ? "Close" : "Open"}
                    </button>
                    {m.clientDecisionOpen && (
                      <button
                        type="button"
                        className="rounded border border-border px-2 py-1 text-[10px] font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={sendClientNudge.isPending || !canUseClientPortalDecisions}
                        onClick={() => {
                          setNudgeError(null);
                          sendClientNudge.mutate(
                            {
                              projectId: m.projectId,
                              milestoneId: m.id,
                              channel: "email",
                            },
                            {
                              onSuccess: () => {
                                setNudgedMilestones((previous) => ({ ...previous, [m.id]: true }));
                              },
                              onError: (error) => {
                                setNudgeError(error instanceof Error ? error.message : "Unable to queue nudge.");
                              },
                            }
                          );
                        }}
                      >
                        {nudgedMilestones[m.id] ? "Nudged" : "Nudge client"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
          {!canUseClientPortalDecisions && (
            <p className="mt-3 text-xs text-muted-foreground">
              Client decision requests are available on the Enterprise plan.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading billing…</div>}>
      <BillingPageContent />
    </Suspense>
  );
}
