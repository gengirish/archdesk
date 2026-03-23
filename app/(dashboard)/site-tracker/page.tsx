"use client";

import { HardHat, Plus, Camera, Cloud, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, STAGE_LABELS } from "@/lib/utils";

const mockUpdates = [
  {
    id: "1",
    project: "Patil Residence",
    user: "Anil Kumar",
    note: "Foundation work completed. Plinth beam casting done. Ready for curing.",
    photos: 3,
    milestone: "EXECUTION",
    weather: "Sunny",
    createdAt: "2026-03-23",
  },
  {
    id: "2",
    project: "KLE Campus Block B",
    user: "Prakash S",
    note: "Second floor slab shuttering in progress. Steel binding 70% complete.",
    photos: 5,
    milestone: "EXECUTION",
    weather: "Partly Cloudy",
    createdAt: "2026-03-22",
  },
  {
    id: "3",
    project: "Patil Residence",
    user: "Anil Kumar",
    note: "Brickwork started on ground floor. Material delivery from Desai Tiles received.",
    photos: 2,
    milestone: "EXECUTION",
    weather: "Sunny",
    createdAt: "2026-03-21",
  },
  {
    id: "4",
    project: "Sharma Interiors",
    user: "Ravi M",
    note: "False ceiling framework installed in living room. Electrical conduit routing done.",
    photos: 4,
    milestone: "EXECUTION",
    weather: "Rainy",
    createdAt: "2026-03-20",
  },
];

const mockIssues = [
  { id: "1", project: "Patil Residence", title: "Water seepage in basement", severity: "HIGH", status: "OPEN", createdAt: "2026-03-20" },
  { id: "2", project: "KLE Campus Block B", title: "Steel delivery delayed", severity: "MEDIUM", status: "IN_PROGRESS", createdAt: "2026-03-19" },
  { id: "3", project: "Sharma Interiors", title: "Wrong tile shade delivered", severity: "LOW", status: "RESOLVED", createdAt: "2026-03-18" },
];

const severityColors: Record<string, string> = {
  LOW: "#4A8EFF",
  MEDIUM: "#E8A045",
  HIGH: "#F25757",
  CRITICAL: "#DC2626",
};

export default function SiteTrackerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Site Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily progress logs and issue tracking
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Log Update
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Updates timeline */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Recent Updates</h2>
          {mockUpdates.map((update) => (
            <Card key={update.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {update.user.split(" ").map((w) => w[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{update.user}</span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs text-muted-foreground">{formatDate(update.createdAt)}</span>
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {update.project}
                    </Badge>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {update.note}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        {update.photos} photos
                      </span>
                      <span className="flex items-center gap-1">
                        <Cloud className="h-3 w-3" />
                        {update.weather}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardHat className="h-3 w-3" />
                        {STAGE_LABELS[update.milestone]}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Issues sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Open Issues</h2>
            <Badge variant="secondary" className="text-[10px]">
              {mockIssues.filter((i) => i.status !== "RESOLVED").length}
            </Badge>
          </div>
          {mockIssues.map((issue) => (
            <Card key={issue.id} className="cursor-pointer transition-colors hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: severityColors[issue.severity] }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{issue.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{issue.project}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: severityColors[issue.severity],
                          color: severityColors[issue.severity],
                        }}
                      >
                        {issue.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {issue.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
