"use client";

import { useState, type FormEvent } from "react";
import {
  Upload,
  FileImage,
  Eye,
  MessageSquare,
  Clock,
  Loader2,
} from "lucide-react";
import { DrawingType } from "@prisma/client";
import { toast } from "sonner";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize, STATUS_COLORS, formatDate } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import { useProjects } from "@/hooks/useProjects";
import { drawingKeys } from "@/hooks/useDrawings";

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

const drawingTypes = Object.values(DrawingType);

type DrawingWithProject = {
  id: string;
  name: string;
  type: string;
  status: string;
  version: number;
  fileUrl: string;
  fileSize: number | null;
  updatedAt: string;
  projectId: string;
  comments?: { id: string }[];
  projectName: string;
};

function isImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/.test(lower) ||
    lower.includes("supabase") ||
    lower.includes("placehold")
  );
}

export default function DrawingsPage() {
  const { plan } = usePlan();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [drawingProjectId, setDrawingProjectId] = useState("");
  const [drawingName, setDrawingName] = useState("");
  const [drawingType, setDrawingType] = useState<DrawingType>(DrawingType.PLAN);
  const [drawingFileUrl, setDrawingFileUrl] = useState("");

  const projectList = projects ?? [];

  const createDrawing = useMutation({
    mutationFn: async (input: {
      projectId: string;
      name: string;
      type: string;
      fileUrl: string;
    }) => {
      const res = await fetch(`/api/projects/${input.projectId}/drawings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.name, type: input.type, fileUrl: input.fileUrl }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed to upload drawing");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.byProject(vars.projectId) });
    },
  });

  const drawingQueries = useQueries({
    queries: (projects ?? []).map((project) => ({
      queryKey: drawingKeys.byProject(project.id),
      queryFn: async (): Promise<DrawingWithProject[]> => {
        const res = await fetch(`/api/projects/${project.id}/drawings`);
        const json = (await res.json()) as {
          data: unknown;
          error: string | null;
        };
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed");
        }
        const list = json.data;
        if (!Array.isArray(list)) {
          throw new Error("Failed");
        }
        return list.map((d) => ({
          ...(d as DrawingWithProject),
          projectName: project.name,
        }));
      },
      staleTime: 1000 * 60,
      enabled: !!projects,
    })),
  });

  function resetUploadForm() {
    setDrawingProjectId("");
    setDrawingName("");
    setDrawingType(DrawingType.PLAN);
    setDrawingFileUrl("");
  }

  function handleUploadDrawing(e: FormEvent) {
    e.preventDefault();
    if (!drawingProjectId.trim() || !drawingName.trim() || !drawingFileUrl.trim()) {
      toast.error("Project, name, and file URL are required");
      return;
    }
    createDrawing.mutate(
      {
        projectId: drawingProjectId.trim(),
        name: drawingName.trim(),
        type: drawingType,
        fileUrl: drawingFileUrl.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Drawing uploaded");
          setUploadOpen(false);
          resetUploadForm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to upload drawing");
        },
      }
    );
  }

  const isLoading =
    (!projectsError && projectsLoading) ||
    (!!projects && drawingQueries.some((q) => q.isLoading));
  const drawingQueryError = drawingQueries.find((q) => q.error)?.error;
  const error = projectsError ?? drawingQueryError;

  const allDrawings = drawingQueries.flatMap((q) => q.data ?? []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Drawings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allDrawings.length} drawings &middot; {approvedCount} approved &middot;{" "}
            {pendingCount} pending &middot; {revisionCount} revisions
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Drawing
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allDrawings.map((drawing) => (
          <Card key={drawing.id} className="cursor-pointer transition-colors hover:border-primary/30">
            <CardContent className="p-0">
              <div className="flex h-36 items-center justify-center overflow-hidden rounded-t-lg">
                {isImageUrl(drawing.fileUrl) ? (
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
                  className={`blueprint-bg flex h-full w-full items-center justify-center ${isImageUrl(drawing.fileUrl) ? "hidden" : ""}`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/80 text-lg font-bold text-muted-foreground">
                    {typeIcons[drawing.type] ?? "O"}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
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
                    {statusLabels[drawing.status] ?? drawing.status}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileImage className="h-3 w-3" />
                    {formatFileSize(drawing.fileSize ?? 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    v{drawing.version}
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
        ))}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Drawing</DialogTitle>
            <DialogDescription>Add a drawing record linked to a project</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadDrawing} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="drawing-project" className="text-sm">
                Project
              </Label>
              <Select
                value={drawingProjectId || undefined}
                onValueChange={setDrawingProjectId}
                disabled={projectList.length === 0}
              >
                <SelectTrigger id="drawing-project" className="text-sm">
                  <SelectValue
                    placeholder={
                      projectList.length === 0 ? "No projects available" : "Select project"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projectList.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawing-name" className="text-sm">
                Name
              </Label>
              <Input
                id="drawing-name"
                value={drawingName}
                onChange={(e) => setDrawingName(e.target.value)}
                placeholder="Drawing name"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawing-type" className="text-sm">
                Type
              </Label>
              <Select value={drawingType} onValueChange={(v) => setDrawingType(v as DrawingType)}>
                <SelectTrigger id="drawing-type" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {drawingTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-sm">
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawing-file-url" className="text-sm">
                File URL
              </Label>
              <Input
                id="drawing-file-url"
                value={drawingFileUrl}
                onChange={(e) => setDrawingFileUrl(e.target.value)}
                placeholder="https://…"
                className="text-sm"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadOpen(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDrawing.isPending} className="text-sm">
                {createDrawing.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </FeatureGate>
  );
}
