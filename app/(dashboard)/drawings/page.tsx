"use client";

import { PenTool, Upload, FileImage, Eye, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, STATUS_COLORS, formatDate } from "@/lib/utils";

const mockDrawings = [
  { id: "1", name: "Ground Floor Plan", project: "Patil Residence", type: "PLAN", status: "APPROVED", version: 3, fileSize: 2450000, updatedAt: "2026-03-15", commentsCount: 4 },
  { id: "2", name: "Front Elevation", project: "Patil Residence", type: "ELEVATION", status: "PENDING_REVIEW", version: 1, fileSize: 1800000, updatedAt: "2026-03-20", commentsCount: 0 },
  { id: "3", name: "Section A-A", project: "Patil Residence", type: "SECTION", status: "REVISION_REQUESTED", version: 2, fileSize: 3200000, updatedAt: "2026-03-18", commentsCount: 6 },
  { id: "4", name: "Living Room Render", project: "Sharma Interiors", type: "RENDER", status: "APPROVED", version: 2, fileSize: 8500000, updatedAt: "2026-03-12", commentsCount: 2 },
  { id: "5", name: "Site Plan", project: "KLE Campus Block B", type: "PLAN", status: "APPROVED", version: 5, fileSize: 5400000, updatedAt: "2026-02-28", commentsCount: 8 },
  { id: "6", name: "BOQ - Phase 1", project: "KLE Campus Block B", type: "BOQ", status: "PENDING_REVIEW", version: 1, fileSize: 420000, updatedAt: "2026-03-22", commentsCount: 0 },
  { id: "7", name: "Kitchen Detail", project: "Sharma Interiors", type: "DETAIL", status: "APPROVED", version: 1, fileSize: 1200000, updatedAt: "2026-03-10", commentsCount: 1 },
];

const statusLabels: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REVISION_REQUESTED: "Revision Requested",
};

const typeIcons: Record<string, string> = {
  PLAN: "P",
  ELEVATION: "E",
  SECTION: "S",
  RENDER: "R",
  BOQ: "B",
  DETAIL: "D",
  OTHER: "O",
};

export default function DrawingsPage() {
  const approvedCount = mockDrawings.filter((d) => d.status === "APPROVED").length;
  const pendingCount = mockDrawings.filter((d) => d.status === "PENDING_REVIEW").length;
  const revisionCount = mockDrawings.filter((d) => d.status === "REVISION_REQUESTED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Drawings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockDrawings.length} drawings &middot; {approvedCount} approved &middot;{" "}
            {pendingCount} pending &middot; {revisionCount} revisions
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Drawing
        </Button>
      </div>

      {/* Drawings grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockDrawings.map((drawing) => (
          <Card key={drawing.id} className="cursor-pointer transition-colors hover:border-primary/30">
            <CardContent className="p-0">
              {/* Preview placeholder */}
              <div className="blueprint-bg flex h-36 items-center justify-center rounded-t-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/80 text-lg font-bold text-muted-foreground">
                  {typeIcons[drawing.type]}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">{drawing.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{drawing.project}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px]"
                    style={{
                      borderColor: STATUS_COLORS[drawing.status],
                      color: STATUS_COLORS[drawing.status],
                    }}
                  >
                    {statusLabels[drawing.status]}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileImage className="h-3 w-3" />
                    {formatFileSize(drawing.fileSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    v{drawing.version}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {drawing.commentsCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(drawing.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
