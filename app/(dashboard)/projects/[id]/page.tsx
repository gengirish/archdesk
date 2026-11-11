"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Loader2,
  MapPin,
  Ruler,
  Plus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotFoundError, useProject, useUpdateProject } from "@/hooks/useProjects";
import { useDrawingsByProject } from "@/hooks/useDrawings";
import { usePlan } from "@/hooks/usePlan";
import { hasAccess } from "@/lib/feature-tiers";
import {
  formatDate,
  formatFileSize,
  formatINR,
  STAGE_COLORS,
  STAGE_LABELS,
  STATUS_COLORS,
} from "@/lib/utils";
import { isProjectOverdue, PROJECT_STAGES } from "@/lib/validation/project";
import { StageStepper } from "@/components/projects/StageStepper";
import { ProjectDetailsForm } from "@/components/projects/ProjectDetailsForm";
import { ProjectTeamCard } from "@/components/projects/ProjectTeamCard";
import { ProjectPortalCard } from "@/components/projects/ProjectPortalCard";
import { UploadDrawingDialog } from "@/components/drawings/UploadDrawingDialog";
import { DrawingDetailsDialog } from "@/components/drawings/DrawingDetailsDialog";
import { DRAWING_STATUS_LABELS } from "@/components/drawings/drawing-helpers";
import { MilestoneList } from "@/components/billing/MilestoneList";
import { MilestoneFormDialog } from "@/components/billing/MilestoneFormDialog";
import { useProjectMilestones, type MilestoneListItem } from "@/hooks/useBilling";
import { computeBillingSummary } from "@/lib/billing-metrics";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

type SiteUpdateRow = {
  id: string;
  note: string | null;
  photos: string[];
  weather: string | null;
  milestone: string | null;
  createdAt: string;
  user: { name: string } | null;
};

async function fetchList<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as { data?: T[]; error?: string } | null;
  if (!res.ok || !json || json.error || !Array.isArray(json.data)) {
    throw new Error(json?.error ?? "Failed to load");
  }
  return json.data;
}

const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const { data: project, isLoading, error } = useProject(projectId);
  const update = useUpdateProject(projectId);
  const { plan } = usePlan();
  const drawings = useDrawingsByProject(projectId);
  const milestones = useProjectMilestones(projectId, project?.name ?? "");
  const siteUpdates = useQuery({
    queryKey: ["site-updates", "project", projectId],
    queryFn: () => fetchList<SiteUpdateRow>(`/api/projects/${projectId}/site-updates`),
    enabled: !!project,
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [openDrawingId, setOpenDrawingId] = useState<string | null>(null);
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneListItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    const notFound = error instanceof NotFoundError;
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {notFound
            ? "This project doesn't exist or isn't part of your firm."
            : error instanceof Error
              ? error.message
              : "Failed to load project"}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    );
  }

  const overdue = isProjectOverdue(project);

  function changeStage(stage: (typeof PROJECT_STAGES)[number]) {
    update.mutate(
      { stage },
      {
        onSuccess: () => toast.success(`Stage set to ${STAGE_LABELS[stage]}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update stage"),
      }
    );
  }

  function changeStatus(status: string) {
    update.mutate(
      { status: status as (typeof STATUS_OPTIONS)[number]["value"] },
      {
        onSuccess: () =>
          toast.success(`Status set to ${STATUS_OPTIONS.find((o) => o.value === status)?.label}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update status"),
      }
    );
  }

  const drawingList = drawings.data ?? [];
  const milestoneList = milestones.data ?? [];
  const milestoneSummary = computeBillingSummary(milestoneList);
  const updateList = siteUpdates.data ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight">{project.name}</h1>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: STAGE_COLORS[project.stage], color: STAGE_COLORS[project.stage] }}
            >
              {STAGE_LABELS[project.stage]}
            </Badge>
            {overdue ? (
              <Badge variant="outline" className="border-destructive text-[10px] text-destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Past deadline
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.client.name} · {typeLabel(project.type)}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {project.area != null ? (
              <span className="flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" />
                {project.area.toLocaleString("en-IN")} sqft
              </span>
            ) : null}
            {project.budget != null ? (
              <span className="font-medium text-foreground">{formatINR(project.budget)}</span>
            ) : null}
            {project.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {project.location}
              </span>
            ) : null}
            {project.startDate || project.deadline ? (
              <span className={`flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}>
                <CalendarDays className="h-3.5 w-3.5" />
                {project.startDate ? formatDate(project.startDate) : "—"} →{" "}
                {project.deadline ? formatDate(project.deadline) : "no deadline"}
              </span>
            ) : null}
          </div>
        </div>
        <div className="w-full sm:w-44">
          <Select value={project.status} onValueChange={changeStatus} disabled={update.isPending}>
            <SelectTrigger aria-label="Project status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <StageStepper stage={project.stage} onChange={changeStage} disabled={update.isPending} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs defaultValue="drawings">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="drawings">Drawings ({drawingList.length})</TabsTrigger>
              <TabsTrigger value="milestones">Milestones ({milestoneList.length})</TabsTrigger>
              <TabsTrigger value="site">Site updates ({updateList.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="drawings" className="mt-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setUploadOpen(true)}>
                      <Upload className="mr-1.5 h-4 w-4" />
                      Upload drawing
                    </Button>
                  </div>
                  {drawings.isLoading ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  ) : drawingList.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No drawings for this project yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {drawingList.map((d) => (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => setOpenDrawingId(d.id)}
                            className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-left text-sm hover:bg-secondary/30"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
                            <span className="text-xs text-muted-foreground">
                              v{d.version} · {formatFileSize(d.fileSize ?? 0)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{ borderColor: STATUS_COLORS[d.status], color: STATUS_COLORS[d.status] }}
                            >
                              {DRAWING_STATUS_LABELS[d.status] ?? d.status}
                            </Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones" className="mt-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {milestoneList.length > 0
                        ? `${formatINR(milestoneSummary.collected)} of ${formatINR(milestoneSummary.billed)} collected`
                        : "Fee schedule for this project"}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/billing?projectId=${project.id}`}>Open in Billing</Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingMilestone(null);
                          setMilestoneFormOpen(true);
                        }}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add milestone
                      </Button>
                    </div>
                  </div>
                  {milestones.isLoading ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  ) : milestoneList.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No milestones yet.</p>
                  ) : (
                    <MilestoneList
                      milestones={milestoneList}
                      canUseDecisions={hasAccess(plan, "client_portal")}
                      showProject={false}
                      onEdit={(m) => {
                        setEditingMilestone(m);
                        setMilestoneFormOpen(true);
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="site" className="mt-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/site-tracker">Open Site Tracker</Link>
                    </Button>
                  </div>
                  {siteUpdates.isLoading ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  ) : updateList.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No site updates yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {updateList.map((u) => (
                        <li key={u.id} className="rounded-md border border-border/50 p-3 text-sm">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(u.createdAt)}
                            {u.user ? ` · ${u.user.name}` : ""}
                            {u.weather ? ` · ${u.weather}` : ""}
                            {u.milestone ? ` · ${STAGE_LABELS[u.milestone] ?? u.milestone}` : ""}
                          </p>
                          {u.note ? <p className="mt-1 whitespace-pre-wrap">{u.note}</p> : null}
                          {u.photos.length > 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">{u.photos.length} photo(s)</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <ProjectDetailsForm project={project} />
        </div>

        <div className="space-y-6">
          <ProjectPortalCard
            projectId={project.id}
            clientToken={project.clientToken}
            canUsePortal={hasAccess(plan, "client_portal")}
          />
          <ProjectTeamCard project={project} />
        </div>
      </div>

      <MilestoneFormDialog
        open={milestoneFormOpen}
        onOpenChange={(open) => {
          setMilestoneFormOpen(open);
          if (!open) setEditingMilestone(null);
        }}
        projects={[{ id: project.id, name: project.name, stage: project.stage }]}
        fixedProjectId={project.id}
        milestone={editingMilestone}
      />
      <UploadDrawingDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projects={[{ id: project.id, name: project.name }]}
        fixedProjectId={project.id}
      />
      <DrawingDetailsDialog
        projectId={openDrawingId ? project.id : null}
        drawingId={openDrawingId}
        projectName={project.name}
        onOpenChange={(open) => {
          if (!open) setOpenDrawingId(null);
        }}
      />
    </div>
  );
}
