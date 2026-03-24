"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import { ProjectType } from "@prisma/client";
import { toast } from "sonner";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatINRShort, STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";

const projectTypes = [
  "ALL",
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "INTERIOR",
  "LANDSCAPE",
  "INSTITUTIONAL",
];

const createProjectTypes = Object.values(ProjectType);

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const { data: projects, isLoading, error } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const createProject = useCreateProject();
  const { newProjectOpen, setNewProjectOpen } = useProjectStore();
  const [search, setSearch] = useState("");
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [projectName, setProjectName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedType, setSelectedType] = useState<ProjectType>(ProjectType.RESIDENTIAL);
  const [projectBudget, setProjectBudget] = useState("");
  const [projectArea, setProjectArea] = useState("");
  const [projectLocation, setProjectLocation] = useState("");

  const clientList = clients ?? [];

  function resetNewProjectForm() {
    setProjectName("");
    setSelectedClientId("");
    setSelectedType(ProjectType.RESIDENTIAL);
    setProjectBudget("");
    setProjectArea("");
    setProjectLocation("");
  }

  async function handleCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !selectedClientId || !selectedType) {
      toast.error("Name, client, and type are required");
      return;
    }
    createProject.mutate(
      {
        name: projectName.trim(),
        clientId: selectedClientId,
        type: selectedType,
        budget: projectBudget ? parseFloat(projectBudget) : undefined,
        area: projectArea ? parseFloat(projectArea) : undefined,
        location: projectLocation || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Project created");
          setNewProjectOpen(false);
          resetNewProjectForm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create project");
        },
      }
    );
  }

  const projectList = projects ?? [];

  const filtered = projectList.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
    if (stageFilter !== "ALL" && p.stage !== stageFilter) return false;
    return true;
  });

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
          {error instanceof Error ? error.message : "Failed to load projects"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectList.length} projects &middot;{" "}
            {projectList.filter((p) => p.status === "ACTIVE").length} active
          </p>
        </div>
        <Button onClick={() => setNewProjectOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-3 w-3" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {projectTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "ALL" ? "All Types" : type.charAt(0) + type.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 rounded-md border border-border/50 p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded p-1.5 transition-colors ${viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No projects found</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:border-primary/30"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">{project.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {project.client.name}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px]"
                    style={{
                      borderColor: STAGE_COLORS[project.stage],
                      color: STAGE_COLORS[project.stage],
                    }}
                  >
                    {STAGE_LABELS[project.stage]}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{project.area?.toLocaleString()} sqft</span>
                  <span>{formatINRShort(project.budget ?? 0)}</span>
                  <span>
                    {project.type.charAt(0) + project.type.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
                  <span>{project._count.drawings} drawings</span>
                  <span>{project._count.milestones} milestones</span>
                </div>

                {project.location && (
                  <p className="mt-2 truncate text-[11px] text-muted-foreground/70">
                    {project.location}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === "list" && filtered.length > 0 && (
        <Card>
          <div className="divide-y divide-border/50">
            <div className="grid grid-cols-6 gap-4 px-5 py-3 text-xs font-medium text-muted-foreground">
              <span className="col-span-2">Project</span>
              <span>Type</span>
              <span>Stage</span>
              <span>Area</span>
              <span className="text-right">Budget</span>
            </div>
            {filtered.map((project) => (
              <div
                key={project.id}
                className="grid cursor-pointer grid-cols-6 items-center gap-4 px-5 py-3 transition-colors hover:bg-secondary/30"
              >
                <div className="col-span-2 min-w-0">
                  <div className="truncate text-sm font-medium">{project.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {project.client.name}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {project.type.charAt(0) + project.type.slice(1).toLowerCase()}
                </span>
                <Badge
                  variant="outline"
                  className="w-fit text-[10px]"
                  style={{
                    borderColor: STAGE_COLORS[project.stage],
                    color: STAGE_COLORS[project.stage],
                  }}
                >
                  {STAGE_LABELS[project.stage]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {project.area?.toLocaleString()} sqft
                </span>
                <span className="text-right text-xs font-medium">
                  {formatINRShort(project.budget ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Create a new architecture project</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm">
                Name
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-client" className="text-sm">
                Client
              </Label>
              <Select
                value={selectedClientId || undefined}
                onValueChange={setSelectedClientId}
                disabled={clientsLoading}
              >
                <SelectTrigger id="project-client" className="text-sm">
                  <SelectValue placeholder={clientsLoading ? "Loading clients…" : "Select a client"} />
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-type" className="text-sm">
                Type
              </Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ProjectType)}>
                <SelectTrigger id="project-type" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createProjectTypes.map((t) => (
                    <SelectItem key={t} value={t} className="text-sm">
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="project-budget" className="text-sm">
                  Budget (optional)
                </Label>
                <Input
                  id="project-budget"
                  type="number"
                  min={0}
                  step="any"
                  value={projectBudget}
                  onChange={(e) => setProjectBudget(e.target.value)}
                  placeholder="₹"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-area" className="text-sm">
                  Area sqft (optional)
                </Label>
                <Input
                  id="project-area"
                  type="number"
                  min={0}
                  step="any"
                  value={projectArea}
                  onChange={(e) => setProjectArea(e.target.value)}
                  placeholder="sqft"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-location" className="text-sm">
                Location (optional)
              </Label>
              <Input
                id="project-location"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="City or site"
                className="text-sm"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewProjectOpen(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending} className="text-sm">
                {createProject.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
