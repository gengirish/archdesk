"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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

/** Client-side cap; keep aligned with `/api/projects/:id/drawings/upload` when documented. */
const MAX_DRAWING_FILE_BYTES = 50 * 1024 * 1024;

const ALLOWED_DRAWING_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "dwg",
  "dxf",
]);

const ALLOWED_DRAWING_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/acad",
  "image/vnd.dxf",
  "application/octet-stream",
]);

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

function isAllowedDrawingMime(mime: string): boolean {
  return ALLOWED_DRAWING_MIMES.has(mime);
}

/** Returns a user-facing validation message, or `null` if the file passes guards. */
function validateDrawingFile(file: File): string | null {
  if (file.size > MAX_DRAWING_FILE_BYTES) {
    return `File must be ${formatFileSize(MAX_DRAWING_FILE_BYTES)} or smaller`;
  }
  const ext = fileExtension(file.name);
  const extOk = ext !== "" && ALLOWED_DRAWING_EXTENSIONS.has(ext);
  const mime = file.type.trim();
  const mimeOk = mime !== "" && isAllowedDrawingMime(mime);
  if (!extOk && !mimeOk) {
    return "Use PDF, PNG, JPG/JPEG, WEBP, DWG, or DXF";
  }
  return null;
}

function parseUploadErrorJson(body: unknown): string {
  if (body === null || typeof body !== "object") return "Failed to upload drawing";
  const err = (body as { error?: unknown }).error;
  return typeof err === "string" && err.length > 0 ? err : "Failed to upload drawing";
}

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
  const drawingFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingWithProject | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drawingProjectId, setDrawingProjectId] = useState("");
  const [drawingName, setDrawingName] = useState("");
  const [drawingType, setDrawingType] = useState<DrawingType>(DrawingType.PLAN);
  const [drawingFile, setDrawingFile] = useState<File | null>(null);

  const projectList = projects ?? [];

  const uploadDrawing = useMutation({
    mutationFn: async (input: { projectId: string; name: string; type: DrawingType; file: File }) => {
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("name", input.name);
      formData.append("type", input.type);

      const res = await fetch(`/api/projects/${input.projectId}/drawings/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let message = "Failed to upload drawing";
        try {
          message = parseUploadErrorJson(await res.json());
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message);
      }
      return await res.json();
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
    setDrawingFile(null);
    if (drawingFileInputRef.current) drawingFileInputRef.current.value = "";
  }

  function openDrawingDetails(drawing: DrawingWithProject) {
    setSelectedDrawing(drawing);
    setDetailsOpen(true);
  }

  function handleDrawingFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setDrawingFile(file);
  }

  function handleUploadDrawing(e: FormEvent) {
    e.preventDefault();
    if (!drawingProjectId.trim() || !drawingName.trim()) {
      toast.error("Project and name are required");
      return;
    }
    if (!drawingFile) {
      toast.error("Choose a file to upload");
      return;
    }
    const fileError = validateDrawingFile(drawingFile);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    uploadDrawing.mutate(
      {
        projectId: drawingProjectId.trim(),
        name: drawingName.trim(),
        type: drawingType,
        file: drawingFile,
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
          <Card
            key={drawing.id}
            className="cursor-pointer transition-colors hover:border-primary/30"
            role="button"
            tabIndex={0}
            onClick={() => openDrawingDetails(drawing)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDrawingDetails(drawing);
              }
            }}
            aria-label={`Open details for ${drawing.name}`}
          >
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
            <DialogDescription>
              Upload a file for a project. PDF, common image formats, and DWG/DXF up to{" "}
              {formatFileSize(MAX_DRAWING_FILE_BYTES)}.
            </DialogDescription>
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
              <Label htmlFor="drawing-file" className="text-sm">
                File
              </Label>
              <Input
                ref={drawingFileInputRef}
                id="drawing-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
                onChange={handleDrawingFileChange}
                className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                aria-required="true"
              />
              {drawingFile ? (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Selected: {drawingFile.name} ({formatFileSize(drawingFile.size)})
                </p>
              ) : null}
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
              <Button type="submit" disabled={uploadDrawing.isPending} className="text-sm">
                {uploadDrawing.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedDrawing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDrawing?.name ?? "Drawing details"}</DialogTitle>
            <DialogDescription>
              {selectedDrawing
                ? `${selectedDrawing.projectName} • ${selectedDrawing.type}`
                : "Preview and metadata"}
            </DialogDescription>
          </DialogHeader>

          {selectedDrawing ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-md border border-border/50 bg-secondary/20">
                {isImageUrl(selectedDrawing.fileUrl) ? (
                  <img
                    src={selectedDrawing.fileUrl}
                    alt={selectedDrawing.name}
                    className="h-72 w-full object-contain"
                  />
                ) : (
                  <div className="blueprint-bg flex h-72 items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary/80 text-xl font-bold text-muted-foreground">
                      {typeIcons[selectedDrawing.type] ?? "O"}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md border border-border/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 font-medium">
                    {statusLabels[selectedDrawing.status] ?? selectedDrawing.status}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="mt-1 font-medium">v{selectedDrawing.version}</p>
                </div>
                <div className="rounded-md border border-border/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">File size</p>
                  <p className="mt-1 font-medium">{formatFileSize(selectedDrawing.fileSize ?? 0)}</p>
                </div>
                <div className="rounded-md border border-border/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="mt-1 font-medium">{formatDate(selectedDrawing.updatedAt)}</p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
                <Button asChild>
                  <a href={selectedDrawing.fileUrl} target="_blank" rel="noopener noreferrer">
                    Open File
                  </a>
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </div>
    </FeatureGate>
  );
}
