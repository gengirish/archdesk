import { create } from "zustand";
import type { ProjectWithRelations, ProjectStage } from "@/types";

interface ProjectStore {
  // Selected project for detail views
  selectedProject: ProjectWithRelations | null;
  setSelectedProject: (project: ProjectWithRelations | null) => void;

  // Kanban drag state
  draggingProjectId: string | null;
  setDraggingProjectId: (id: string | null) => void;

  // Filter state
  filterType: string;
  setFilterType: (type: string) => void;

  filterStage: ProjectStage | "ALL";
  setFilterStage: (stage: ProjectStage | "ALL") => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // New project sheet
  newProjectOpen: boolean;
  setNewProjectOpen: (open: boolean) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),

  draggingProjectId: null,
  setDraggingProjectId: (id) => set({ draggingProjectId: id }),

  filterType: "ALL",
  setFilterType: (type) => set({ filterType: type }),

  filterStage: "ALL",
  setFilterStage: (stage) => set({ filterStage: stage }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  newProjectOpen: false,
  setNewProjectOpen: (open) => set({ newProjectOpen: open }),
}));
