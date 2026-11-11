"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { DrawingType } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatFileSize } from "@/lib/utils";
import { useUploadDrawing } from "@/hooks/useDrawings";
import {
  DRAWING_ACCEPT,
  MAX_DRAWING_UPLOAD_BYTES,
  validateDrawingFile,
} from "@/components/drawings/drawing-helpers";

const drawingTypes = Object.values(DrawingType);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
  /** When set, the project picker is hidden and uploads go to this project. */
  fixedProjectId?: string;
};

export function UploadDrawingDialog({ open, onOpenChange, projects, fixedProjectId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<DrawingType>(DrawingType.PLAN);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadDrawing();

  const targetProjectId = fixedProjectId ?? projectId;

  function reset() {
    setProjectId("");
    setName("");
    setType(DrawingType.PLAN);
    setNote("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!targetProjectId || !name.trim()) {
      toast.error("Project and name are required");
      return;
    }
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    const fileError = validateDrawingFile(file);
    if (fileError) {
      toast.error(fileError);
      return;
    }
    upload.mutate(
      {
        projectId: targetProjectId,
        name: name.trim(),
        type,
        file,
        versionNote: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Drawing uploaded");
          onOpenChange(false);
          reset();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to upload drawing");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Drawing</DialogTitle>
          <DialogDescription>
            PDF, PNG, JPG, WEBP, DWG or DXF, up to {formatFileSize(MAX_DRAWING_UPLOAD_BYTES)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedProjectId ? (
            <div className="space-y-2">
              <Label htmlFor="drawing-project">Project</Label>
              <Select
                value={projectId || undefined}
                onValueChange={setProjectId}
                disabled={projects.length === 0}
              >
                <SelectTrigger id="drawing-project">
                  <SelectValue
                    placeholder={projects.length === 0 ? "No projects available" : "Select project"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="drawing-name">Name</Label>
            <Input
              id="drawing-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ground floor plan"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="drawing-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DrawingType)}>
              <SelectTrigger id="drawing-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {drawingTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "BOQ" ? "BOQ" : t.charAt(0) + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="drawing-file">File</Label>
            <Input
              ref={fileInputRef}
              id="drawing-file"
              type="file"
              accept={DRAWING_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
              aria-required="true"
            />
            {file ? (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Selected: {file.name} ({formatFileSize(file.size)})
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="drawing-note">Version note (optional)</Label>
            <Textarea
              id="drawing-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="First issue for client review"
              rows={2}
              maxLength={2000}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
