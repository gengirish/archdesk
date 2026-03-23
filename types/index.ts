// ArchDesk — Shared TypeScript Types
// These augment Prisma-generated types with UI-specific shapes

import type {
  Firm, User, Client, Project, Drawing, Milestone,
  Invoice, Lead, Vendor, SiteUpdate,
  ProjectType, ProjectStage, ProjectStatus,
  DrawingType, DrawingStatus,
  MilestoneStatus, InvoiceStatus,
  LeadSource, LeadStage,
  UserRole, VendorCategory,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export type {
  Firm, User, Client, Project, Drawing, Milestone,
  Invoice, Lead, Vendor, SiteUpdate,
  ProjectType, ProjectStage, ProjectStatus,
  DrawingType, DrawingStatus,
  MilestoneStatus, InvoiceStatus,
  LeadSource, LeadStage,
  UserRole, VendorCategory,
};

// ── Extended types (with relations) ──────────────────────────

export type ProjectWithRelations = Project & {
  client: Client;
  team: { user: User; role: string }[];
  _count: { drawings: number; milestones: number; siteUpdates: number };
};

export type DrawingWithVersions = Drawing & {
  versions: { version: number; fileUrl: string; createdAt: Date }[];
  comments: { id: string; content: string; isClient: boolean; clientName?: string | null; createdAt: Date }[];
};

export type MilestoneWithInvoice = Milestone & {
  invoices: Invoice[];
};

export type LeadWithActivities = Lead & {
  activities: { type: string; note?: string | null; createdAt: Date }[];
};

// ── API response types ────────────────────────────────────────

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string };

// ── Form types ────────────────────────────────────────────────

export type CreateProjectInput = {
  name: string;
  clientId: string;
  type: ProjectType;
  budget?: number;
  area?: number;
  location?: string;
  startDate?: Date;
  deadline?: Date;
  description?: string;
};

export type CreateClientInput = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
};

export type CreateLeadInput = {
  name: string;
  phone: string;
  email?: string;
  projectType?: ProjectType;
  budget?: number;
  source: LeadSource;
  notes?: string;
};

export type CreateMilestoneInput = {
  name: string;
  stage: ProjectStage;
  amount: number;
  dueDate?: Date;
  description?: string;
};

// ── UI types ─────────────────────────────────────────────────

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
};

export type DashboardStats = {
  activeProjects: number;
  overdueProjects: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  pendingApprovals: number;
  leadsCount: number;
  leadsPipelineValue: number;
};
