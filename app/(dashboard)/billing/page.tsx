"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertCircle, Bot, CheckCircle, FileText, IndianRupee, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatINR, formatINRShort } from "@/lib/utils";
import { computeBillingSummary } from "@/lib/billing-metrics";
import { hasAccess } from "@/lib/feature-tiers";
import { usePlan } from "@/hooks/usePlan";
import { useProjects } from "@/hooks/useProjects";
import {
  useAllMilestones,
  useRunDecisionSlaAutomation,
  type MilestoneListItem,
} from "@/hooks/useBilling";
import { MilestoneList } from "@/components/billing/MilestoneList";
import { MilestoneFormDialog } from "@/components/billing/MilestoneFormDialog";

function BillingPageContent() {
  const searchParams = useSearchParams();
  const { milestones, isLoading } = useAllMilestones();
  const { data: projects = [] } = useProjects();
  const { plan } = usePlan();
  const canUseDecisions = hasAccess(plan, "client_portal");
  const runDecisionSla = useRunDecisionSlaAutomation();
  const [slaInfo, setSlaInfo] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MilestoneListItem | null>(null);

  const projectIdFilter = searchParams.get("projectId")?.trim() || "";
  const decisionFilter = searchParams.get("decision")?.trim() || "";

  const filtered = milestones.filter((m) => {
    if (projectIdFilter && m.projectId !== projectIdFilter) return false;
    if (decisionFilter === "open" && !m.clientDecisionOpen) return false;
    return true;
  });

  const selectedProjectName =
    projects.find((p) => p.id === projectIdFilter)?.name ?? filtered[0]?.projectName ?? null;

  // Same definitions as Dashboard and Analytics (lib/billing-metrics.ts), incl. GST.
  const summary = computeBillingSummary(filtered);

  function runSla(send: boolean) {
    setSlaInfo(null);
    runDecisionSla.mutate(
      { send, channel: "email" },
      {
        onSuccess: (r) => {
          const text = send
            ? `Auto-nudge: ${r.nudged} nudged, ${r.failed} failed, ${r.breached} breached.`
            : `SLA scan: ${r.scanned} open, ${r.atRisk} at risk, ${r.breached} breached.`;
          setSlaInfo(text);
          if (send && r.failed > 0) toast.error(`${r.failed} nudge(s) failed to send`);
          else toast.success(send ? "Auto-nudge complete" : "SLA scan complete");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "SLA automation failed"),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Milestone-based billing across all projects. Amounts include GST.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={projects.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add milestone
        </Button>
      </div>

      {canUseDecisions ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={runDecisionSla.isPending} onClick={() => runSla(false)}>
            {runDecisionSla.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="mr-1.5 h-3.5 w-3.5" />
            )}
            Run SLA scan
          </Button>
          <Button size="sm" variant="outline" disabled={runDecisionSla.isPending} onClick={() => runSla(true)}>
            Auto-nudge breached
          </Button>
          {slaInfo ? <p className="w-full text-xs text-muted-foreground sm:w-auto">{slaInfo}</p> : null}
        </div>
      ) : null}

      {projectIdFilter || decisionFilter ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {projectIdFilter ? (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
              Project: {selectedProjectName ?? "filtered"}
            </span>
          ) : null}
          {decisionFilter === "open" ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-500">Decision: Open</span>
          ) : null}
          <Link href="/billing" className="font-medium text-muted-foreground underline-offset-4 hover:underline">
            Clear filters
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total billed</span>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl" title={formatINR(summary.billed)}>
              {formatINRShort(summary.billed)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{summary.count.total} milestones</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collected</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="mt-2 text-xl font-semibold text-green-500 sm:text-2xl" title={formatINR(summary.collected)}>
              {formatINRShort(summary.collected)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{summary.count.paid} paid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Outstanding</span>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="mt-2 text-xl font-semibold text-yellow-500 sm:text-2xl" title={formatINR(summary.outstanding)}>
              {formatINRShort(summary.outstanding)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {summary.overdue > 0 ? `${formatINRShort(summary.overdue)} overdue` : `${summary.count.outstanding} unpaid`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collection rate</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">{summary.collectionRate}%</div>
            <Progress value={summary.collectionRate} className="mt-2" aria-label="Collection rate" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base font-medium">
            {projectIdFilter && selectedProjectName ? `${selectedProjectName} milestones` : "All milestones"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading milestones…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {projects.length === 0
                ? "Create a project first, then add its fee milestones here."
                : decisionFilter === "open"
                  ? "No milestones are waiting on a client decision."
                  : "No milestones yet. Add the retainer and stage fees to start billing."}
            </div>
          ) : (
            <MilestoneList
              milestones={filtered}
              canUseDecisions={canUseDecisions}
              showProject={!projectIdFilter}
              onEdit={(m) => {
                setEditing(m);
                setFormOpen(true);
              }}
            />
          )}
          {!canUseDecisions ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Client decision requests are available on the Enterprise plan.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <MilestoneFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        projects={projects.map((p) => ({ id: p.id, name: p.name, stage: p.stage }))}
        fixedProjectId={projectIdFilter || undefined}
        milestone={editing}
      />
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
