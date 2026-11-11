"use client";

import { useState } from "react";
import { Upload, FileImage, Eye, MessageSquare, Clock, Loader2, PenTool } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize, STATUS_COLORS, formatDate } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import { useProjects } from "@/hooks/useProjects";
import { drawingKeys, type DrawingListItem } from "@/hooks/useDrawings";
import { UploadDrawingDialog } from "@/components/drawings/UploadDrawingDialog";
import { DrawingDetailsDialog } from "@/components/drawings/DrawingDetailsDialog";
import {
  DRAWING_STATUS_LABELS,
  DRAWING_TYPE_ICONS,
  isImageDrawing,
} from "@/components/drawings/drawing-helpers";

type DrawingWithProject = DrawingListItem & { projectName: string; mimeType?: string | null };

export default function DrawingsPage() {
  const { plan } = usePlan();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<DrawingWithProject | null>(null);

  const drawingQueries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: drawingKeys.byProject(project.id),
      queryFn: async (): Promise<DrawingWithProject[]> => {
        const res = await fetch(`/api/projects/${project.id}/drawings`);
        const json = (await res.json()) as { data: unknown; error: string | null };
        if (!res.ok || json.error || !Array.isArray(json.data)) {
          throw new Error(json.error ?? "Failed to load drawings");
        }
        return json.data.map((d) => ({ ...(d as DrawingListItem), projectName: project.name }));
      },
      staleTime: 1000 * 60,
      enabled: !!projects,
    })),
  });

  const isLoading =
    (!projectsError && projectsLoading) ||
    (!!projects && drawingQueries.some((q) => q.isLoading));
  const error = projectsError ?? drawingQueries.find((q) => q.error)?.error;
  const allDrawings = drawingQueries.flatMap((q) => q.data ?? []);
  const projectList = projects ?? [];

  const approvedCount = allDrawings.filter((d) => d.status === "APPROVED").length;
  const pendingCount = allDrawings.filter((d) => d.status === "PENDING_REVIEW").length;
  const revisionCount = allDrawings.filter((d) => d.status === "REVISION_REQUESTED").length;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load drawings"}
        </p>
      </div>
    );
  }

  return (
    <FeatureGate feature="drawings" plan={plan}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Drawings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {allDrawings.length} drawings &middot; {approvedCount} approved &middot; {pendingCount}{" "}
              pending &middot; {revisionCount} revisions
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} disabled={projectList.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Drawing
          </Button>
        </div>

        {allDrawings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <PenTool className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="font-medium">No drawings yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {projectList.length === 0
                    ? "Create a project first, then upload plans, elevations and renders for review."
                    : "Upload a plan, elevation or render to start the review cycle."}
                </p>
              </div>
              {projectList.length > 0 ? (
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload your first drawing
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allDrawings.map((drawing) => {
              const showImage = isImageDrawing(drawing.fileUrl, drawing.mimeType);
              return (
                <Card
                  key={drawing.id}
                  className="cursor-pointer transition-colors hover:border-primary/30"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(drawing)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(drawing);
                    }
                  }}
                  aria-label={`Open details for ${drawing.name}`}
                >
                  <CardContent className="p-0">
                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-t-lg">
                      {showImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={drawing.fileUrl}
                          alt={drawing.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`blueprint-bg flex h-full w-full items-center justify-center ${showImage ? "hidden" : ""}`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/80 text-lg font-bold text-muted-foreground">
                          {DRAWING_TYPE_ICONS[drawing.type] ?? "O"}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium">{drawing.name}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">{drawing.projectName}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px]"
                          style={{
                            borderColor: STATUS_COLORS[drawing.status],
                            color: STATUS_COLORS[drawing.status],
                          }}
                        >
                          {DRAWING_STATUS_LABELS[drawing.status] ?? drawing.status}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileImage className="h-3 w-3" />
                          {formatFileSize(drawing.fileSize ?? 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />v{drawing.version}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {drawing.comments?.length ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(drawing.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <UploadDrawingDialog open={uploadOpen} onOpenChange={setUploadOpen} projects={projectList} />
        <DrawingDetailsDialog
          projectId={selected?.projectId ?? null}
          drawingId={selected?.id ?? null}
          projectName={selected?.projectName}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      </div>
    </FeatureGate>
  );
}
