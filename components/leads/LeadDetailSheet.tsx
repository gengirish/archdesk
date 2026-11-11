"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRightLeft, Loader2, Trophy, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_TYPE_LABELS,
  firstLeadIssue,
  leadStageLabel,
  leadUpdateSchema,
  MANUAL_ACTIVITY_TYPES,
  type LeadStageValue,
} from "@/lib/validation/lead";
import {
  useAddLeadActivity,
  useConvertLead,
  useUpdateLead,
  type LeadWithActivityLog,
} from "@/hooks/useLeads";
import { toDateInputValue } from "@/lib/validation/project";
import { formatINR } from "@/lib/utils";
import { formatDateTime, LEAD_STAGE_COLORS } from "@/components/leads/lead-helpers";
import { LeadFormFields, type LeadFormState } from "@/components/leads/LeadFormFields";

/** Older STAGE_CHANGE notes stored raw enums ("SITE_VISIT → WON"); show labels. */
function humaniseStageNote(note: string): string {
  return note.replace(
    /\b(NEW|CONTACTED|SITE_VISIT|PROPOSAL_SENT|NEGOTIATION|WON|LOST)\b/g,
    (m) => leadStageLabel(m)
  );
}

function toForm(lead: LeadWithActivityLog): LeadFormState {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? "",
    address: lead.address ?? "",
    projectType: lead.projectType ?? "",
    budget: lead.budget != null ? String(lead.budget) : "",
    area: lead.area != null ? String(lead.area) : "",
    source: lead.source,
    notes: lead.notes ?? "",
    followUpAt: toDateInputValue(lead.followUpAt),
  };
}

type Props = {
  lead: LeadWithActivityLog | null;
  onOpenChange: (open: boolean) => void;
  onMoveStage: (lead: LeadWithActivityLog, stage: LeadStageValue) => void;
};

export function LeadDetailSheet({ lead, onOpenChange, onMoveStage }: Props) {
  const update = useUpdateLead();
  const addActivity = useAddLeadActivity();
  const convert = useConvertLead();

  const [form, setForm] = useState<LeadFormState | null>(lead ? toForm(lead) : null);
  const [activityType, setActivityType] = useState<(typeof MANUAL_ACTIVITY_TYPES)[number]>("CALL");
  const [activityNote, setActivityNote] = useState("");
  const [convertedProjectId, setConvertedProjectId] = useState<string | null>(null);

  // Reset local state when a different lead opens or the stored lead changes.
  const leadId = lead?.id;
  const leadUpdatedAt = lead ? String(lead.updatedAt) : "";
  useEffect(() => {
    setForm(lead ? toForm(lead) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, leadUpdatedAt]);
  useEffect(() => {
    setConvertedProjectId(null);
    setActivityNote("");
  }, [leadId]);

  if (!lead || !form) {
    return <DialogPrimitive.Root open={false} onOpenChange={onOpenChange} />;
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(lead));
  const projectId = convertedProjectId ?? lead.convertedProjectId;
  const stage = lead.stage as LeadStageValue;

  function save(e: FormEvent) {
    e.preventDefault();
    if (!lead || !form) return;
    const check = leadUpdateSchema.safeParse(form);
    if (!check.success) {
      toast.error(firstLeadIssue(check.error));
      return;
    }
    update.mutate(
      { id: lead.id, ...form },
      {
        onSuccess: () => toast.success("Lead saved"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save lead"),
      }
    );
  }

  function logActivity(e: FormEvent) {
    e.preventDefault();
    if (!lead) return;
    if (!activityNote.trim()) {
      toast.error("Add a note for this activity");
      return;
    }
    addActivity.mutate(
      { id: lead.id, type: activityType, note: activityNote.trim() },
      {
        onSuccess: () => {
          setActivityNote("");
          toast.success(`${ACTIVITY_TYPE_LABELS[activityType]} logged`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to log activity"),
      }
    );
  }

  function convertToProject() {
    if (!lead) return;
    convert.mutate(lead.id, {
      onSuccess: (project) => {
        setConvertedProjectId(project.id);
        toast.success(
          project.reusedClient
            ? "Project created for the existing client"
            : "Project and client created",
          {
            action: {
              label: "Open project",
              onClick: () => window.location.assign(`/projects/${project.id}`),
            },
          }
        );
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to convert lead"),
    });
  }

  return (
    <DialogPrimitive.Root open onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-lg"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/50 p-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="truncate text-lg font-medium">
                {lead.name}
              </DialogPrimitive.Title>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: LEAD_STAGE_COLORS[stage], color: LEAD_STAGE_COLORS[stage] }}
                >
                  {leadStageLabel(stage)}
                </Badge>
                {lead.budget ? <span>{formatINR(lead.budget)}</span> : null}
              </div>
            </div>
            <DialogPrimitive.Close
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {/* Outcome actions */}
            <div className="flex flex-wrap gap-2">
              {stage !== "WON" ? (
                <Button size="sm" variant="outline" onClick={() => onMoveStage(lead, "WON")}>
                  <Trophy className="mr-1.5 h-4 w-4" />
                  Mark won
                </Button>
              ) : null}
              {stage !== "LOST" ? (
                <Button size="sm" variant="outline" onClick={() => onMoveStage(lead, "LOST")}>
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Mark lost
                </Button>
              ) : null}
              {stage === "WON" || stage === "LOST" ? (
                <Button size="sm" variant="ghost" onClick={() => onMoveStage(lead, "NEGOTIATION")}>
                  Reopen
                </Button>
              ) : null}
              {projectId ? (
                <Button size="sm" asChild className="sm:ml-auto">
                  <Link href={`/projects/${projectId}`}>View project</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="sm:ml-auto"
                  onClick={convertToProject}
                  disabled={convert.isPending}
                >
                  {convert.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="mr-1.5 h-4 w-4" />
                  )}
                  Convert to project
                </Button>
              )}
            </div>

            {/* Editable details */}
            <form onSubmit={save} className="space-y-4">
              <LeadFormFields idPrefix="lead-edit" value={form} onChange={setForm} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!dirty || update.isPending}>
                  {update.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Save changes
                </Button>
                {dirty ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setForm(toForm(lead))}>
                    Discard
                  </Button>
                ) : null}
              </div>
            </form>

            {/* Activity log */}
            <section className="space-y-3 border-t border-border/50 pt-5">
              <h3 className="text-sm font-medium">Activity</h3>
              <form onSubmit={logActivity} className="space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={activityType}
                    onValueChange={(v) => setActivityType(v as typeof activityType)}
                  >
                    <SelectTrigger className="w-36" aria-label="Activity type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUAL_ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTIVITY_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="submit"
                    size="sm"
                    className="ml-auto"
                    disabled={addActivity.isPending || !activityNote.trim()}
                  >
                    {addActivity.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    Log
                  </Button>
                </div>
                <Textarea
                  value={activityNote}
                  onChange={(e) => setActivityNote(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Called about site visit on Saturday…"
                  aria-label="Activity note"
                />
              </form>
              {lead.activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="space-y-2">
                  {lead.activities.map((a) => (
                    <li key={a.id} className="rounded-md border border-border/50 px-3 py-2 text-sm">
                      <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {ACTIVITY_TYPE_LABELS[a.type] ?? a.type}
                        </span>
                        <span>{formatDateTime(a.createdAt)}</span>
                        {a.user ? <span>· {a.user.name}</span> : null}
                      </p>
                      {a.note ? (
                        <p className="mt-1 whitespace-pre-wrap">
                          {a.type === "STAGE_CHANGE" ? humaniseStageNote(a.note) : a.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
