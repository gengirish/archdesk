"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, UserPlus, Phone, Loader2 } from "lucide-react";
import { LeadSource, ProjectType } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINRShort } from "@/lib/utils";
import type { LeadStage } from "@/types";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import { useLeads, useCreateLead } from "@/hooks/useLeads";

const LEAD_SOURCES: LeadSource[] = [
  LeadSource.REFERRAL,
  LeadSource.INSTAGRAM,
  LeadSource.FACEBOOK,
  LeadSource.WALKIN,
  LeadSource.WEBSITE,
  LeadSource.HOUZZ,
  LeadSource.PHONE,
  LeadSource.OTHER,
];

const PROJECT_TYPES: ProjectType[] = [
  ProjectType.RESIDENTIAL,
  ProjectType.COMMERCIAL,
  ProjectType.INDUSTRIAL,
  ProjectType.INTERIOR,
  ProjectType.LANDSCAPE,
  ProjectType.INSTITUTIONAL,
];

function formatEnumLabel(val: string) {
  return val.charAt(0) + val.slice(1).toLowerCase().replace(/_/g, " ");
}

const stageConfig: Record<LeadStage, { label: string; color: string }> = {
  NEW: { label: "New", color: "#8891A8" },
  CONTACTED: { label: "Contacted", color: "#4A8EFF" },
  SITE_VISIT: { label: "Site Visit", color: "#9B72FF" },
  PROPOSAL_SENT: { label: "Proposal Sent", color: "#E8A045" },
  NEGOTIATION: { label: "Negotiation", color: "#FF8A4A" },
  WON: { label: "Won", color: "#3DD68C" },
  LOST: { label: "Lost", color: "#F25757" },
};

const pipelineStages: LeadStage[] = ["NEW", "CONTACTED", "SITE_VISIT", "PROPOSAL_SENT", "NEGOTIATION"];

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const { plan } = usePlan();
  const [search, setSearch] = useState("");
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>(LEAD_SOURCES[0]);
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const { data: leads, isLoading } = useLeads();
  const createLead = useCreateLead();

  function resetLeadForm() {
    setName("");
    setPhone("");
    setEmail("");
    setSource(LEAD_SOURCES[0]);
    setProjectType("");
    setBudget("");
  }

  function handleSubmitLead() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      toast.error("Name and phone are required");
      return;
    }
    let budgetNum: number | undefined;
    if (budget.trim()) {
      const n = Number(budget.replace(/,/g, ""));
      if (Number.isNaN(n) || n < 0) {
        toast.error("Enter a valid budget");
        return;
      }
      budgetNum = n;
    }
    createLead.mutate(
      {
        name: trimmedName,
        phone: trimmedPhone,
        source,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(projectType ? { projectType: projectType as ProjectType } : {}),
        ...(budgetNum !== undefined ? { budget: budgetNum } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Lead created");
          setAddLeadOpen(false);
          resetLeadForm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create lead");
        },
      }
    );
  }

  const filtered = (leads ?? []).filter(
    (l) => !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FeatureGate feature="leads_crm" plan={plan}>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(leads ?? []).length} leads &middot; Pipeline value:{" "}
            {formatINRShort(
              (leads ?? [])
                .filter((l) => !["WON", "LOST"].includes(l.stage))
                .reduce((s, l) => s + (l.budget || 0), 0)
            )}
          </p>
        </div>
        <Button onClick={() => setAddLeadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>

      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="lead-name">Name</Label>
              <Input
                id="lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-source">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger id="lead-source">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {formatEnumLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-project-type">Project type</Label>
              <Select
                value={projectType || "__none__"}
                onValueChange={(v) => setProjectType(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="lead-project-type">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatEnumLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-budget">Budget (INR)</Label>
              <Input
                id="lead-budget"
                type="text"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddLeadOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitLead} disabled={createLead.isPending}>
              {createLead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban pipeline */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const leads = filtered.filter((l) => l.stage === stage);
          const config = stageConfig[stage];
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">{leads.length}</Badge>
              </div>
              <div className="space-y-2">
                {leads.map((lead) => (
                  <Card key={lead.id} className="cursor-pointer transition-colors hover:border-primary/30">
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{lead.name}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        +91 {lead.phone}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          {lead.projectType?.charAt(0)}{lead.projectType?.slice(1).toLowerCase()}
                        </Badge>
                        {lead.budget && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatINRShort(lead.budget)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-[10px] text-muted-foreground/70">
                        via {lead.source.charAt(0) + lead.source.slice(1).toLowerCase()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {leads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/40 py-8 text-center">
                    <p className="text-xs text-muted-foreground/50">No leads</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Won & Lost */}
      <div className="grid gap-6 lg:grid-cols-2">
        {(["WON", "LOST"] as LeadStage[]).map((stage) => {
          const leads = filtered.filter((l) => l.stage === stage);
          const config = stageConfig[stage];
          return (
            <Card key={stage}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                  {config.label} ({leads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {leads.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No {config.label.toLowerCase()} leads yet</p>
                ) : (
                  <div className="space-y-2">
                    {leads.map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-secondary/30">
                        <div>
                          <div className="text-sm font-medium">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.projectType?.charAt(0)}{lead.projectType?.slice(1).toLowerCase()}
                          </div>
                        </div>
                        <span className="text-xs font-medium">{formatINRShort(lead.budget || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </FeatureGate>
  );
}
