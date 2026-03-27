"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Box, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import {
  useCreateSampleFloorPlan,
  useGenerateFlatScene,
  useProjectFlatScenes,
  useProjectFloorPlans,
} from "@/hooks/use3dStudio";
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

const FlatSceneCanvas = dynamic(
  () => import("@/components/three-d/FlatSceneCanvas").then((mod) => mod.FlatSceneCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-md border border-border/50">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export default function ThreeDStudioPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string>("");
  const [floorPlanId, setFloorPlanId] = useState<string>("");

  const { data: floorPlans, isLoading: floorPlansLoading } = useProjectFloorPlans(projectId);
  const { data: scenes, isLoading: scenesLoading } = useProjectFlatScenes(projectId);
  const createSampleFloorPlan = useCreateSampleFloorPlan(projectId);
  const generateScene = useGenerateFlatScene(projectId);

  const latestScene = useMemo(() => (scenes && scenes.length > 0 ? scenes[0] : null), [scenes]);
  const selectedProject = projects?.find((project) => project.id === projectId);

  const hasProject = !!projectId;
  const hasFloorPlans = !!floorPlans?.length;

  async function handleCreateSampleFloorPlan() {
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }

    createSampleFloorPlan.mutate("Sample Flat Layout", {
      onSuccess: (created) => {
        setFloorPlanId(created.id);
        toast.success("Sample floor plan created");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to create floor plan");
      },
    });
  }

  async function handleGenerateScene() {
    if (!projectId) {
      toast.error("Select a project first");
      return;
    }
    if (!floorPlanId) {
      toast.error("Select a floor plan first");
      return;
    }

    generateScene.mutate(
      {
        floorPlanId,
      },
      {
        onSuccess: () => {
          toast.success("3D scene generated");
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to generate scene");
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">3D Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Convert floor plans into interactive 3D flat previews with Babylon.js
          </p>
        </div>
        <Badge className="rounded-md border border-primary/30 bg-primary/15 text-primary">
          Beta
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generation Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <Select
              value={projectId || undefined}
              onValueChange={(value) => {
                setProjectId(value);
                setFloorPlanId("");
              }}
              disabled={projectsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={floorPlanId || undefined}
              onValueChange={setFloorPlanId}
              disabled={!hasProject || floorPlansLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={floorPlansLoading ? "Loading floor plans..." : "Select floor plan"} />
              </SelectTrigger>
              <SelectContent>
                {(floorPlans ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateSampleFloorPlan}
                disabled={!hasProject || createSampleFloorPlan.isPending}
              >
                {createSampleFloorPlan.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Sample Plan
              </Button>
              <Button
                type="button"
                onClick={handleGenerateScene}
                disabled={!hasProject || !hasFloorPlans || !floorPlanId || generateScene.isPending}
              >
                {generateScene.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate 3D
              </Button>
            </div>
          </div>

          {selectedProject && (
            <div className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
              Active project: <span className="font-medium text-foreground">{selectedProject.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Box className="h-4 w-4" />
            Scene Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latestScene && !scenesLoading && (
            <div className="flex h-[460px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60">
              <p className="text-sm text-muted-foreground">No generated scene yet</p>
              <p className="text-xs text-muted-foreground/80">
                Create a sample floor plan, then click Generate 3D
              </p>
            </div>
          )}

          {scenesLoading && (
            <div className="flex h-[460px] items-center justify-center rounded-md border border-border/50">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {latestScene && <FlatSceneCanvas sceneJson={latestScene.sceneJson} />}
        </CardContent>
      </Card>
    </div>
  );
}

