"use client";

/* eslint-disable @next/next/no-img-element -- local object-URL previews */
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { formatFileSize, STAGE_LABELS } from "@/lib/utils";
import { useCreateSiteUpdate } from "@/hooks/useSiteTracker";
import {
  MAX_SITE_PHOTOS,
  MAX_SITE_PHOTOS_TOTAL_BYTES,
  siteUpdateFieldsSchema,
  validateSitePhotos,
} from "@/lib/validation/site-update";
import { compressImage } from "./compress-image";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
};

type Picked = { file: File; preview: string };

export function LogUpdateDialog({ open, onOpenChange, projects, defaultProjectId }: Props) {
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [note, setNote] = useState("");
  const [weather, setWeather] = useState("");
  const [milestone, setMilestone] = useState("");
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const createUpdate = useCreateSiteUpdate();

  // Revoke preview URLs when photos are removed or the dialog unmounts.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setProjectId(defaultProjectId ?? "");
    setNote("");
    setWeather("");
    setMilestone("");
    setPhotos([]);
    setError(null);
  }

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    const room = MAX_SITE_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_SITE_PHOTOS} photos`);
      return;
    }
    if (incoming.length > room) {
      toast.error(`Only the first ${room} photo${room === 1 ? "" : "s"} were added (max ${MAX_SITE_PHOTOS})`);
    }
    const nonImages = incoming.filter((f) => !f.type.startsWith("image/"));
    if (nonImages.length) toast.error(`${nonImages[0].name} isn't an image`);
    setPreparing(true);
    try {
      const compressed = await Promise.all(
        incoming
          .filter((f) => f.type.startsWith("image/"))
          .slice(0, room)
          .map((f) => compressImage(f))
      );
      setPhotos((prev) => [
        ...prev,
        ...compressed.map((file) => ({ file, preview: URL.createObjectURL(file) })),
      ]);
      setError(null);
    } finally {
      setPreparing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, j) => j !== i);
    });
  }

  const totalBytes = photos.reduce((s, p) => s + p.file.size, 0);

  function submit() {
    if (!projectId) return setError("Select a project");
    const fields = siteUpdateFieldsSchema.safeParse({ note, weather, milestone });
    if (!fields.success) return setError(fields.error.issues[0]?.message ?? "Check the form");
    if (!fields.data.note && photos.length === 0) return setError("Add a note or at least one photo");
    const photoError = validateSitePhotos(
      photos.map((p) => ({ name: p.file.name, size: p.file.size, type: p.file.type }))
    );
    if (photoError) return setError(photoError);
    setError(null);

    createUpdate.mutate(
      {
        projectId,
        note: fields.data.note ?? "",
        weather: fields.data.weather ?? undefined,
        milestone: fields.data.milestone ?? undefined,
        photos: photos.map((p) => p.file),
      },
      {
        onSuccess: () => {
          toast.success(photos.length ? `Update logged with ${photos.length} photo${photos.length === 1 ? "" : "s"}` : "Update logged");
          reset();
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to log update"),
      }
    );
  }

  const busy = createUpdate.isPending || preparing;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && createUpdate.isPending) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log site update</DialogTitle>
          <DialogDescription>Photos appear in the timeline and on the client portal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="log-project">Project</Label>
            <Select value={projectId || undefined} onValueChange={setProjectId}>
              <SelectTrigger id="log-project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No projects
                  </SelectItem>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="log-note">Note</Label>
            <Textarea
              id="log-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened on site?"
              rows={4}
              maxLength={5000}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="log-photos">Photos</Label>
              <span className="text-xs text-muted-foreground">
                {photos.length}/{MAX_SITE_PHOTOS}
                {photos.length > 0 && ` · ${formatFileSize(totalBytes)} of ${formatFileSize(MAX_SITE_PHOTOS_TOTAL_BYTES)}`}
              </span>
            </div>
            {photos.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <li key={p.preview} className="relative aspect-square overflow-hidden rounded-md ring-1 ring-border">
                    <img src={p.preview} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      disabled={createUpdate.isPending}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileInput}
              id="log-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={busy || photos.length >= MAX_SITE_PHOTOS}
            >
              {preparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              {preparing ? "Preparing photos…" : "Add photos"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Up to {MAX_SITE_PHOTOS} JPG, PNG or WebP photos. Large photos are resized automatically.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="log-weather">Weather</Label>
              <Input
                id="log-weather"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="Optional"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-milestone">Stage</Label>
              <Select
                value={milestone || "__none__"}
                onValueChange={(v) => setMilestone(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="log-milestone">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {Object.entries(STAGE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createUpdate.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {createUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createUpdate.isPending ? (photos.length ? "Uploading…" : "Saving…") : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
