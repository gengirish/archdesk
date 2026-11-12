"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { useUpdateSiteIssue, type SiteIssueItem } from "@/hooks/useSiteTracker";
import {
  FORWARD_ACTION_LABELS,
  isActiveIssue,
  ISSUE_SEVERITY_BORDER,
  ISSUE_SEVERITY_LABELS,
  ISSUE_SEVERITY_RANK,
  ISSUE_SEVERITY_STYLES,
  ISSUE_STATUS_LABELS,
  nextForwardStatus,
  type IssueStatusValue,
} from "@/lib/validation/site-issue";

const STATUS_STYLES: Record<IssueStatusValue, string> = {
  OPEN: "border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  IN_PROGRESS: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  RESOLVED: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  CLOSED: "border-transparent bg-muted text-muted-foreground",
};

export function SeverityBadge({ severity }: { severity: SiteIssueItem["severity"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
        ISSUE_SEVERITY_STYLES[severity]
      )}
    >
      {severity === "CRITICAL" && <AlertTriangle className="h-3 w-3" aria-hidden />}
      {ISSUE_SEVERITY_LABELS[severity]}
    </span>
  );
}

type Props = {
  issues: SiteIssueItem[];
  onReport: () => void;
};

export function IssueList({ issues, onReport }: Props) {
  const [showResolved, setShowResolved] = useState(false);
  const updateIssue = useUpdateSiteIssue();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { active, done } = useMemo(() => {
    const sorted = [...issues].sort(
      (a, b) =>
        ISSUE_SEVERITY_RANK[a.severity] - ISSUE_SEVERITY_RANK[b.severity] ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      active: sorted.filter((i) => isActiveIssue(i.status)),
      done: sorted
        .filter((i) => !isActiveIssue(i.status))
        .sort(
          (a, b) =>
            new Date(b.resolvedAt ?? b.updatedAt).getTime() -
            new Date(a.resolvedAt ?? a.updatedAt).getTime()
        ),
    };
  }, [issues]);

  function move(issue: SiteIssueItem, status: IssueStatusValue) {
    setPendingId(issue.id);
    updateIssue.mutate(
      { projectId: issue.projectId, issueId: issue.id, status },
      {
        onSuccess: () => toast.success(`“${issue.title}” is now ${ISSUE_STATUS_LABELS[status]}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update issue"),
        onSettled: () => setPendingId(null),
      }
    );
  }

  const visible = showResolved ? [...active, ...done] : active;

  return (
    <div className="space-y-3">
      {visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden />
            <p className="text-sm font-medium">
              {issues.length === 0 ? "No issues reported" : "No open issues"}
            </p>
            <p className="text-xs text-muted-foreground">
              {issues.length === 0
                ? "Report snags, defects or delays so they get tracked to resolution."
                : "Everything reported so far has been resolved."}
            </p>
            <Button size="sm" variant="outline" className="mt-1" onClick={onReport}>
              Report issue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((issue) => {
            const forward = nextForwardStatus(issue.status);
            const busy = pendingId === issue.id;
            return (
              <li key={issue.id}>
                <Card className={cn("border-l-4", ISSUE_SEVERITY_BORDER[issue.severity], !isActiveIssue(issue.status) && "opacity-75")}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SeverityBadge severity={issue.severity} />
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[issue.status])}>
                        {ISSUE_STATUS_LABELS[issue.status]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug">{issue.title}</p>
                    {issue.description && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">{issue.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="truncate">{issue.projectName}</span>
                      <span>&middot;</span>
                      <span>Reported {formatDate(issue.createdAt)}</span>
                      {issue.resolvedAt && (
                        <>
                          <span>&middot;</span>
                          <span>Resolved {formatDate(issue.resolvedAt)}</span>
                        </>
                      )}
                      {issue.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" aria-hidden />
                          {issue.assignedTo}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {forward && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => move(issue, forward)} disabled={busy}>
                          {busy && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                          {FORWARD_ACTION_LABELS[forward]}
                        </Button>
                      )}
                      {issue.status === "IN_PROGRESS" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => move(issue, "OPEN")} disabled={busy}>
                          Back to open
                        </Button>
                      )}
                      {(issue.status === "RESOLVED" || issue.status === "CLOSED") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => move(issue, "OPEN")} disabled={busy}>
                          {busy ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <RotateCcw className="mr-1.5 h-3 w-3" />}
                          Reopen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {done.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowResolved((v) => !v)}>
          {showResolved ? "Hide resolved" : `Show resolved (${done.length})`}
        </Button>
      )}
    </div>
  );
}
