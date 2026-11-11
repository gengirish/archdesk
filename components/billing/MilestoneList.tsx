"use client";

import { useState } from "react";
import { FileDown, Loader2, MoreHorizontal, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatINR, STAGE_LABELS } from "@/lib/utils";
import { isMilestoneOverdue, milestoneTotal } from "@/lib/billing-metrics";
import { MILESTONE_STATUS_LABELS, MILESTONE_STATUSES } from "@/lib/validation/milestone";
import {
  useGenerateInvoice,
  useSendClientDecisionNudge,
  useToggleMilestoneClientReview,
  useUpdateMilestone,
  type MilestoneListItem,
} from "@/hooks/useBilling";
import { MarkPaidDialog } from "@/components/billing/MarkPaidDialog";
import { downloadInvoicePdf } from "@/components/billing/download-invoice";

const STATUS_STYLES: Record<string, string> = {
  PAID: "border-green-500/40 text-green-500",
  DUE: "border-yellow-500/40 text-yellow-500",
  UNPAID: "border-yellow-500/40 text-yellow-500",
  OVERDUE: "border-destructive/50 text-destructive",
  UPCOMING: "border-border text-muted-foreground",
};

type Props = {
  milestones: MilestoneListItem[];
  canUseDecisions: boolean;
  showProject?: boolean;
  onEdit: (m: MilestoneListItem) => void;
};

function errorText(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function MilestoneList({ milestones, canUseDecisions, showProject = true, onEdit }: Props) {
  const updateMilestone = useUpdateMilestone();
  const generateInvoice = useGenerateInvoice();
  const toggleDecision = useToggleMilestoneClientReview();
  const nudge = useSendClientDecisionNudge();
  const [paying, setPaying] = useState<MilestoneListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function setStatus(m: MilestoneListItem, status: (typeof MILESTONE_STATUSES)[number]) {
    if (status === m.status) return;
    if (status === "PAID") {
      setPaying(m);
      return;
    }
    updateMilestone.mutate(
      { projectId: m.projectId, milestoneId: m.id, status },
      {
        onSuccess: () => toast.success(`${m.name}: ${MILESTONE_STATUS_LABELS[status]}`),
        onError: (err) => toast.error(errorText(err, "Failed to update status")),
      }
    );
  }

  async function invoice(m: MilestoneListItem) {
    setBusyId(m.id);
    try {
      const result = await generateInvoice.mutateAsync({ projectId: m.projectId, milestoneId: m.id });
      await downloadInvoicePdf(result);
      toast.success(
        result.created ? `Invoice ${result.invoice.invoiceNo} created` : `Downloaded ${result.invoice.invoiceNo}`
      );
    } catch (err) {
      toast.error(errorText(err, "Couldn't generate the invoice"));
    } finally {
      setBusyId(null);
    }
  }

  function toggle(m: MilestoneListItem) {
    toggleDecision.mutate(
      { projectId: m.projectId, milestoneId: m.id, open: !m.clientDecisionOpen },
      {
        onSuccess: () =>
          toast.success(m.clientDecisionOpen ? "Decision request closed" : "Decision request sent to portal"),
        onError: (err) => toast.error(errorText(err, "Failed to update decision request")),
      }
    );
  }

  function sendNudge(m: MilestoneListItem) {
    nudge.mutate(
      { projectId: m.projectId, milestoneId: m.id, channel: "email" },
      {
        onSuccess: () => toast.success("Nudge sent"),
        onError: (err) => toast.error(errorText(err, "Couldn't send the nudge")),
      }
    );
  }

  return (
    <>
      <ul className="divide-y divide-border/50">
        {milestones.map((m) => {
          const total = milestoneTotal(m);
          const decision = m.clientDecisions?.[0];
          const overdue = isMilestoneOverdue(m);
          const latestInvoice = m.invoices.find((i) => i.status !== "CANCELLED");
          return (
            <li
              key={m.id}
              className="grid gap-3 py-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[showProject ? m.projectName : null, STAGE_LABELS[m.stage] ?? m.stage]
                    .filter(Boolean)
                    .join(" · ")}
                  {m.dueDate ? (
                    <span className={cn(overdue && "text-destructive")}> · due {formatDate(m.dueDate)}</span>
                  ) : null}
                </p>
                {latestInvoice ? (
                  <p className="text-[11px] text-muted-foreground">Invoice {latestInvoice.invoiceNo}</p>
                ) : null}
              </div>

              <div className="flex items-baseline gap-2 lg:block">
                <p className="text-sm font-medium">{formatINR(total)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatINR(m.amount)} + {m.gstPercent}% GST
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLES[m.status])}>
                  {MILESTONE_STATUS_LABELS[m.status] ?? m.status}
                </Badge>
                {m.status === "PAID" && m.paidAt ? (
                  <span className="text-[11px] text-muted-foreground">
                    {formatINR(m.paidAmount ?? total)} on {formatDate(m.paidAt)}
                  </span>
                ) : null}
                {canUseDecisions ? (
                  m.clientDecisionOpen ? (
                    <Badge className="text-[10px]">Awaiting client</Badge>
                  ) : decision ? (
                    <span
                      className={cn(
                        "max-w-full truncate text-[11px]",
                        decision.outcome === "APPROVED" ? "text-green-500" : "text-destructive"
                      )}
                      title={decision.comment}
                    >
                      Client {decision.outcome === "APPROVED" ? "approved" : "rejected"}
                      {decision.comment ? ` — “${decision.comment}”` : ""}
                    </span>
                  ) : null
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => invoice(m)}
                  disabled={busyId === m.id}
                  aria-label={`Invoice PDF for ${m.name}`}
                >
                  {busyId === m.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Invoice</span>
                </Button>
                {canUseDecisions && m.clientDecisionOpen ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendNudge(m)}
                    disabled={nudge.isPending}
                    aria-label={`Nudge client about ${m.name}`}
                  >
                    <Send className="h-4 w-4" />
                    <span className="ml-1.5">Nudge</span>
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`More actions for ${m.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onSelect={() => onEdit(m)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit milestone
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Set status</DropdownMenuLabel>
                    {MILESTONE_STATUSES.map((s) => (
                      <DropdownMenuItem key={s} disabled={s === m.status} onSelect={() => setStatus(m, s)}>
                        {MILESTONE_STATUS_LABELS[s]}
                        {s === "PAID" ? "…" : ""}
                      </DropdownMenuItem>
                    ))}
                    {canUseDecisions ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => toggle(m)}>
                          {m.clientDecisionOpen ? "Close client decision" : "Ask client to decide"}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>
      <MarkPaidDialog milestone={paying} onOpenChange={(open) => !open && setPaying(null)} />
    </>
  );
}
