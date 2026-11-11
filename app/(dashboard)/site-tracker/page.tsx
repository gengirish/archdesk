"use client";

import { useState } from "react";
import { HardHat, Plus, Camera, Cloud, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn, formatDate, STAGE_LABELS } from "@/lib/utils";
import { FeatureGate } from "@/components/feature-gate";
import { usePlan } from "@/hooks/usePlan";
import { useAllSiteUpdates } from "@/hooks/useSiteTracker";
import { useProjects } from "@/hooks/useProjects";

export default function SiteTrackerPage() {
  const { plan } = usePlan();
  const [logUpdateOpen, setLogUpdateOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [note, setNote] = useState("");
  const [weather, setWeather] = useState("");
  const [milestone, setMilestone] = useState("");
  const queryClient = useQueryClient();
  const { data: projects } = useProjects();
  const { updates, isLoading } = useAllSiteUpdates();

  const createUpdate = useMutation({
    mutationFn: async (input: {
      projectId: string;
      note: string;
      weather?: string;
      milestone?: string;
    }) => {
      const res = await fetch(`/api/projects/${input.projectId}/site-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: input.note,
          photos: [],
          weather: input.weather || undefined,
          milestone: input.milestone || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to log update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-updates"] });
    },
  });

  function resetLogForm() {
    setProjectId("");
    setNote("");
    setWeather("");
    setMilestone("");
  }

  function handleSubmitLog() {
    if (!projectId) {
      toast.error("Select a project");
      return;
    }
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      toast.error("Add a note");
      return;
    }
    createUpdate.mutate(
      {
        projectId,
        note: trimmedNote,
        weather: weather.trim() || undefined,
        milestone: milestone || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Update logged");
          setLogUpdateOpen(false);
          resetLogForm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to log update");
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FeatureGate feature="site_tracker" plan={plan}>
      <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight">Site Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily progress logs and issue tracking
          </p>
        </div>
        <Button onClick={() => setLogUpdateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Update
        </Button>
      </div>

      <Dialog open={logUpdateOpen} onOpenChange={setLogUpdateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log site update</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="log-project">Project</Label>
              <Select
                value={projectId || "__none__"}
                onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="log-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {(projects?.length ?? 0) === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No projects
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="__none__">Select project</SelectItem>
                      {(projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-note">Note</Label>
              <textarea
                id="log-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened on site?"
                rows={4}
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-weather">Weather</Label>
              <Input
                id="log-weather"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="log-milestone">Milestone</Label>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLogUpdateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitLog} disabled={createUpdate.isPending}>
              {createUpdate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Updates timeline */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Recent Updates</h2>
          {updates.map((update) => {
            const userName = update.user?.name ?? "Unknown";
            const stageLabel = update.milestone ? STAGE_LABELS[update.milestone] ?? update.milestone : "—";
            return (
              <Card key={update.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {update.user?.name?.split(" ").map((w: string) => w[0]).join("") ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{userName}</span>
                        <span className="text-xs text-muted-foreground">&middot;</span>
                        <span className="text-xs text-muted-foreground">{formatDate(update.createdAt)}</span>
                      </div>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {update.projectName}
                      </Badge>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {update.note ?? ""}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Camera className="h-3 w-3" />
                          {update.photos.length} photos
                        </span>
                        <span className="flex items-center gap-1">
                          <Cloud className="h-3 w-3" />
                          {update.weather}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardHat className="h-3 w-3" />
                          {stageLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Issues sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Open Issues</h2>
            <Badge variant="secondary" className="text-[10px]">
              0
            </Badge>
          </div>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">No issues tracked yet</p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </FeatureGate>
  );
}
