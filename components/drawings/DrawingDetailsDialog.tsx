"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatFileSize, STATUS_COLORS } from "@/lib/utils";
import {
  useAddDrawingComment,
  useDrawingDetail,
  useUpdateDrawingStatus,
  useUploadDrawingVersion,
} from "@/hooks/useDrawings";
import {
  DRAWING_ACCEPT,
  DRAWING_STATUS_LABELS,
  DRAWING_TYPE_ICONS,
  isImageDrawing,
  validateDrawingFile,
} from "@/components/drawings/drawing-helpers";

type Props = {
  projectId: string | null;
  drawingId: string | null;
  projectName?: string;
  onOpenChange: (open: boolean) => void;
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function DrawingDetailsDialog({ projectId, drawingId, projectName, onOpenChange }: Props) {
  const open = !!projectId && !!drawingId;
  const { data: drawing, isLoading, error } = useDrawingDetail(projectId, drawingId);
  const updateStatus = useUpdateDrawingStatus();
  const addComment = useAddDrawingComment();
  const uploadVersion = useUploadDrawingVersion();

  const [comment, setComment] = useState("");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const versionInputRef = useRef<HTMLInputElement>(null);

  function setStatus(status: "APPROVED" | "REVISION_REQUESTED" | "PENDING_REVIEW") {
    if (!projectId || !drawingId) return;
    updateStatus.mutate(
      { projectId, drawingId, status },
      {
        onSuccess: () =>
          toast.success(
            status === "APPROVED"
              ? "Drawing approved"
              : status === "REVISION_REQUESTED"
                ? "Revision requested"
                : "Moved back to review"
          ),
        onError: (err) => toast.error(errorMessage(err, "Failed to update status")),
      }
    );
  }

  function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !drawingId || !comment.trim()) return;
    addComment.mutate(
      { projectId, drawingId, content: comment.trim() },
      {
        onSuccess: () => {
          setComment("");
          toast.success("Comment added");
        },
        onError: (err) => toast.error(errorMessage(err, "Failed to add comment")),
      }
    );
  }

  function submitVersion(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !drawingId) return;
    if (!versionFile) {
      toast.error("Choose a file for the new version");
      return;
    }
    const fileError = validateDrawingFile(versionFile);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    uploadVersion.mutate(
      { projectId, drawingId, file: versionFile, note: versionNote.trim() || undefined },
      {
        onSuccess: (updated) => {
          toast.success(`Uploaded v${updated.version}`);
          setVersionFile(null);
          setVersionNote("");
          if (versionInputRef.current) versionInputRef.current.value = "";
        },
        onError: (err) => toast.error(errorMessage(err, "Failed to upload new version")),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{drawing?.name ?? "Drawing details"}</DialogTitle>
          <DialogDescription>
            {[projectName, drawing?.type].filter(Boolean).join(" • ") || "Preview and review"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error || !drawing ? (
          <p className="text-sm text-destructive">{errorMessage(error, "Failed to load drawing")}</p>
        ) : (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-md border border-border/50 bg-secondary/20">
              {isImageDrawing(drawing.fileUrl, drawing.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drawing.fileUrl} alt={drawing.name} className="h-72 w-full object-contain" />
              ) : (
                <div className="blueprint-bg flex h-48 items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary/80 text-xl font-bold text-muted-foreground">
                    {DRAWING_TYPE_ICONS[drawing.type] ?? "O"}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className="mt-1 text-[11px]"
                  style={{ borderColor: STATUS_COLORS[drawing.status], color: STATUS_COLORS[drawing.status] }}
                >
                  {DRAWING_STATUS_LABELS[drawing.status] ?? drawing.status}
                </Badge>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="mt-1 font-medium">v{drawing.version}</p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">File size</p>
                <p className="mt-1 font-medium">{formatFileSize(drawing.fileSize ?? 0)}</p>
              </div>
              <div className="rounded-md border border-border/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Updated</p>
                <p className="mt-1 font-medium">{formatDate(drawing.updatedAt)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setStatus("APPROVED")}
                disabled={updateStatus.isPending || drawing.status === "APPROVED"}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus("REVISION_REQUESTED")}
                disabled={updateStatus.isPending || drawing.status === "REVISION_REQUESTED"}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Request revision
              </Button>
              {drawing.status !== "PENDING_REVIEW" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus("PENDING_REVIEW")}
                  disabled={updateStatus.isPending}
                >
                  Back to review
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild className="sm:ml-auto">
                <a href={drawing.fileUrl} target="_blank" rel="noopener noreferrer">
                  Open file
                </a>
              </Button>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-medium">Comments ({drawing.comments.length})</h3>
              <form onSubmit={submitComment} className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment for the team"
                  rows={2}
                  maxLength={2000}
                  aria-label="New comment"
                  className="sm:flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={addComment.isPending || !comment.trim()}
                  className="sm:self-end"
                >
                  {addComment.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                  Post
                </Button>
              </form>
              {drawing.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {drawing.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-border/50 px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {c.isClient ? `${c.clientName ?? "Client"} (client)` : c.user?.name ?? "Team"} ·{" "}
                        {formatDate(c.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium">Upload new version</h3>
              <form onSubmit={submitVersion} className="space-y-2">
                <Input
                  ref={versionInputRef}
                  type="file"
                  accept={DRAWING_ACCEPT}
                  onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
                  aria-label="New version file"
                  className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
                />
                <Label htmlFor="version-note" className="sr-only">
                  Version note
                </Label>
                <Input
                  id="version-note"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="What changed in this version?"
                  maxLength={2000}
                />
                <Button type="submit" size="sm" variant="outline" disabled={uploadVersion.isPending}>
                  {uploadVersion.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  Upload v{drawing.version + 1}
                </Button>
              </form>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Version history</h3>
              {drawing.versions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No version history recorded.</p>
              ) : (
                <ul className="divide-y divide-border/50 rounded-md border border-border/50">
                  {drawing.versions.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                      <span className="font-medium">v{v.version}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(v.fileSize ?? 0)}</span>
                      {v.note ? <span className="w-full text-xs sm:w-auto">{v.note}</span> : null}
                      <a
                        href={v.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-xs text-primary hover:underline"
                      >
                        Open
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
