"use client";

import { useState } from "react";
import { Plus, Search, UserPlus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatINRShort } from "@/lib/utils";

type LeadStage = "NEW" | "CONTACTED" | "SITE_VISIT" | "PROPOSAL_SENT" | "NEGOTIATION" | "WON" | "LOST";

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

const mockLeads = [
  { id: "1", name: "Mahesh Hegde", phone: "9876543220", source: "REFERRAL", stage: "NEW" as LeadStage, projectType: "RESIDENTIAL", budget: 5000000 },
  { id: "2", name: "Sunita Naik", phone: "9876543221", source: "INSTAGRAM", stage: "CONTACTED" as LeadStage, projectType: "INTERIOR", budget: 800000 },
  { id: "3", name: "Vinod Desai", phone: "9876543222", source: "WALKIN", stage: "SITE_VISIT" as LeadStage, projectType: "COMMERCIAL", budget: 3200000 },
  { id: "4", name: "Pooja Joshi", phone: "9876543223", source: "WEBSITE", stage: "PROPOSAL_SENT" as LeadStage, projectType: "RESIDENTIAL", budget: 4500000 },
  { id: "5", name: "Arun Kulkarni", phone: "9876543224", source: "REFERRAL", stage: "NEGOTIATION" as LeadStage, projectType: "INTERIOR", budget: 1200000 },
  { id: "6", name: "Meera Patil", phone: "9876543225", source: "FACEBOOK", stage: "NEW" as LeadStage, projectType: "LANDSCAPE", budget: 600000 },
  { id: "7", name: "Ravi Hiremath", phone: "9876543226", source: "PHONE", stage: "CONTACTED" as LeadStage, projectType: "RESIDENTIAL", budget: 7000000 },
  { id: "8", name: "Sanjay Gowda", phone: "9876543227", source: "REFERRAL", stage: "WON" as LeadStage, projectType: "COMMERCIAL", budget: 12000000 },
];

export default function LeadsPage() {
  const [search, setSearch] = useState("");

  const filtered = mockLeads.filter(
    (l) => !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockLeads.length} leads &middot; Pipeline value:{" "}
            {formatINRShort(mockLeads.filter((l) => !["WON", "LOST"].includes(l.stage)).reduce((s, l) => s + (l.budget || 0), 0))}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>

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
  );
}
