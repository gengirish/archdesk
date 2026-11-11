"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINRShort } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import {
  useCreateLead,
  useLeads,
  useMoveLeadStage,
  type LeadWithActivityLog,
} from "@/hooks/useLeads";
import {
  firstLeadIssue,
  leadCreateSchema,
  leadStageLabel,
  pipelineValue,
  type LeadStageValue,
} from "@/lib/validation/lead";
import { LeadBoard } from "@/components/leads/LeadBoard";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import {
  EMPTY_LEAD_FORM,
  LeadFormFields,
  type LeadFormState,
} from "@/components/leads/LeadFormFields";
import { LEAD_STAGE_COLORS, projectTypeLabel } from "@/components/leads/lead-helpers";

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LeadsContent />
    </Suspense>
  );
}

/** Matches name, or phone by digits so "+91 98765" and "98765 43210" both work. */
function matchesSearch(lead: LeadWithActivityLog, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (lead.name.toLowerCase().includes(q)) return true;
  let digits = q.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  return digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits);
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const { plan } = usePlan();
  const [search, setSearch] = useState("");
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [form, setForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  const { data: leads, isLoading, error } = useLeads();
  const createLead = useCreateLead();
  const moveStage = useMoveLeadStage();

  const allLeads = leads ?? [];
  const filtered = allLeads.filter((l) => matchesSearch(l, search));
  // Read the open lead from live query data so the sheet reflects optimistic moves.
  const openLead = openLeadId ? allLeads.find((l) => l.id === openLeadId) ?? null : null;

  function handleSubmitLead(e: FormEvent) {
    e.preventDefault();
    const check = leadCreateSchema.safeParse(form);
    if (!check.success) {
      toast.error(firstLeadIssue(check.error));
      return;
    }
    createLead.mutate(form, {
      onSuccess: () => {
        toast.success("Lead created");
        setAddLeadOpen(false);
        setForm(EMPTY_LEAD_FORM);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create lead"),
    });
  }

  function handleMoveStage(lead: LeadWithActivityLog, stage: LeadStageValue) {
    if (lead.stage === stage) return;
    const from = lead.stage;
    moveStage.mutate(
      { id: lead.id, stage },
      {
        onSuccess: () =>
          toast.success(`${lead.name}: ${leadStageLabel(from)} → ${leadStageLabel(stage)}`),
        onError: (err) =>
          toast.error(
            `Couldn't move ${lead.name}: ${err instanceof Error ? err.message : "please try again"}`
          ),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load leads"}
        </p>
      </div>
    );
  }

  const activeCount = allLeads.filter((l) => l.stage !== "WON" && l.stage !== "LOST").length;

  return (
    <FeatureGate feature="leads_crm" plan={plan}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium tracking-tight">Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeCount} active of {allLeads.length} &middot; Pipeline value:{" "}
              {formatINRShort(pipelineValue(allLeads))}
            </p>
          </div>
          <Button onClick={() => setAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>

        <div className="relative sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search leads"
          />
        </div>

        {allLeads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <UserPlus className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="font-medium">No leads yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add enquiries from referrals, Instagram or walk-ins and track them to a signed project.
                </p>
              </div>
              <Button size="sm" onClick={() => setAddLeadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first lead
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Drag a card by its handle, or use the stage menu on each card.
            </p>
            <LeadBoard
              leads={filtered}
              onOpen={(l) => setOpenLeadId(l.id)}
              onMoveStage={handleMoveStage}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              {(["WON", "LOST"] as const).map((stage) => {
                const stageLeads = filtered.filter((l) => l.stage === stage);
                return (
                  <Card key={stage}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-medium">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: LEAD_STAGE_COLORS[stage] }}
                        />
                        {leadStageLabel(stage)} ({stageLeads.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stageLeads.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No {leadStageLabel(stage).toLowerCase()} leads yet
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {stageLeads.map((lead) => (
                            <li key={lead.id} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setOpenLeadId(lead.id)}
                                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">{lead.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {projectTypeLabel(lead.projectType) || "—"}
                                    {lead.convertedProjectId ? " · converted" : ""}
                                  </span>
                                </span>
                                <span className="shrink-0 text-xs font-medium">
                                  {formatINRShort(lead.budget ?? 0)}
                                </span>
                              </button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 shrink-0 text-xs"
                                onClick={() => handleMoveStage(lead, "NEGOTIATION")}
                                aria-label={`Reopen ${lead.name}`}
                              >
                                Reopen
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add lead</DialogTitle>
              <DialogDescription>New enquiries start in the “New” column.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitLead} className="space-y-4">
              <LeadFormFields idPrefix="lead-new" value={form} onChange={setForm} />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setAddLeadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createLead.isPending}>
                  {createLead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create lead
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <LeadDetailSheet
          lead={openLead}
          onOpenChange={(open) => {
            if (!open) setOpenLeadId(null);
          }}
          onMoveStage={handleMoveStage}
        />
      </div>
    </FeatureGate>
  );
}
