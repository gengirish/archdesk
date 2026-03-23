"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINRShort, STAGE_LABELS, STAGE_COLORS } from "@/lib/utils";

const mockProjects = [
  {
    id: "1",
    name: "Patil Residence",
    client: "Rajesh Patil",
    stage: "WORKING_DRAWINGS",
    type: "RESIDENTIAL",
    status: "ACTIVE",
    budget: 3500000,
    area: 2400,
    location: "Vidyanagar, Hubbali",
    drawingsCount: 12,
    milestonesCount: 4,
  },
  {
    id: "2",
    name: "Sharma Interiors",
    client: "Priya Sharma",
    stage: "DESIGN_DEV",
    type: "INTERIOR",
    status: "ACTIVE",
    budget: 1200000,
    area: 1800,
    location: "Keshwapur, Hubbali",
    drawingsCount: 6,
    milestonesCount: 3,
  },
  {
    id: "3",
    name: "KLE Campus Block B",
    client: "KLE Society",
    stage: "EXECUTION",
    type: "INSTITUTIONAL",
    status: "ACTIVE",
    budget: 15000000,
    area: 12000,
    location: "Vidyanagar, Hubbali",
    drawingsCount: 48,
    milestonesCount: 6,
  },
  {
    id: "4",
    name: "Deshpande Office",
    client: "Suresh Deshpande",
    stage: "CONCEPT",
    type: "COMMERCIAL",
    status: "ACTIVE",
    budget: 800000,
    area: 600,
    location: "CBD, Dharwad",
    drawingsCount: 2,
    milestonesCount: 1,
  },
  {
    id: "5",
    name: "Green Valley Homes",
    client: "Hubli Builders",
    stage: "SCHEMATIC",
    type: "RESIDENTIAL",
    status: "ACTIVE",
    budget: 9500000,
    area: 8000,
    location: "Navanagar, Hubbali",
    drawingsCount: 8,
    milestonesCount: 2,
  },
  {
    id: "6",
    name: "Café Aroma Fit-out",
    client: "Anand Kulkarni",
    stage: "COMPLETED",
    type: "INTERIOR",
    status: "COMPLETED",
    budget: 650000,
    area: 450,
    location: "Lamington Road, Hubbali",
    drawingsCount: 5,
    milestonesCount: 4,
  },
];

const projectTypes = [
  "ALL",
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "INTERIOR",
  "LANDSCAPE",
  "INSTITUTIONAL",
];

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = mockProjects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
    if (stageFilter !== "ALL" && p.stage !== stageFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockProjects.length} projects &middot; {mockProjects.filter((p) => p.status === "ACTIVE").length} active
          </p>
        </div>
        <Button>
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
                      {project.client}
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
                  <span>{formatINRShort(project.budget)}</span>
                  <span>
                    {project.type.charAt(0) + project.type.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 border-t border-border/30 pt-3 text-xs text-muted-foreground">
                  <span>{project.drawingsCount} drawings</span>
                  <span>{project.milestonesCount} milestones</span>
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
                    {project.client}
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
                  {formatINRShort(project.budget)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
