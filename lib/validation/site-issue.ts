/**
 * Site issue validation and status rules, shared by the site tracker UI and
 * the /api/projects/[id]/site-issues routes. Client-safe.
 */
import { z } from "zod";

export const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssueSeverityValue = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type IssueStatusValue = (typeof ISSUE_STATUSES)[number];

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverityValue, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/** Badge classes. Always shown with the text label, never colour alone. */
export const ISSUE_SEVERITY_STYLES: Record<IssueSeverityValue, string> = {
  LOW: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  HIGH: "bg-orange-50 text-orange-800 ring-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-900",
  CRITICAL: "bg-red-50 text-red-800 ring-red-300 dark:bg-red-950 dark:text-red-200 dark:ring-red-900",
};

/** Left-border accent for issue cards. */
export const ISSUE_SEVERITY_BORDER: Record<IssueSeverityValue, string> = {
  LOW: "border-l-slate-400",
  MEDIUM: "border-l-amber-500",
  HIGH: "border-l-orange-500",
  CRITICAL: "border-l-red-600",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatusValue, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

/** Sort weight: most severe first. */
export const ISSUE_SEVERITY_RANK: Record<IssueSeverityValue, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Allowed status moves. The main flow is Open → In Progress → Resolved;
 * an in-progress issue can be put back to Open, and a resolved or closed
 * issue can be reopened.
 */
const TRANSITIONS: Record<IssueStatusValue, readonly IssueStatusValue[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED", "OPEN"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function allowedNextStatuses(from: IssueStatusValue): readonly IssueStatusValue[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: IssueStatusValue, to: IssueStatusValue): boolean {
  return from === to || allowedNextStatuses(from).includes(to);
}

/** The forward step offered as the primary button, or null at the end of the flow. */
export function nextForwardStatus(from: IssueStatusValue): IssueStatusValue | null {
  if (from === "OPEN") return "IN_PROGRESS";
  if (from === "IN_PROGRESS") return "RESOLVED";
  return null;
}

export const FORWARD_ACTION_LABELS: Partial<Record<IssueStatusValue, string>> = {
  IN_PROGRESS: "Start work",
  RESOLVED: "Mark resolved",
};

/**
 * resolvedAt after a status change: set when an issue becomes Resolved,
 * cleared when it is reopened, kept otherwise (e.g. Resolved → Closed).
 */
export function resolvedAtAfter(
  from: IssueStatusValue,
  to: IssueStatusValue,
  current: Date | null,
  now: Date = new Date()
): Date | null {
  if (to === "RESOLVED") return from === "RESOLVED" && current ? current : now;
  if (to === "OPEN" || to === "IN_PROGRESS") return null;
  return current;
}

export function isActiveIssue(status: IssueStatusValue): boolean {
  return status === "OPEN" || status === "IN_PROGRESS";
}

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null ? null : v.trim() || null))
    .pipe(z.string().max(max, `Keep this under ${max} characters`).nullable());

export const siteIssueCreateSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(200, "Keep the title under 200 characters"),
  description: optionalText(5000),
  severity: z.enum(ISSUE_SEVERITIES).default("MEDIUM"),
  assignedTo: optionalText(120),
});
export type SiteIssueCreateInput = z.input<typeof siteIssueCreateSchema>;

export const siteIssueUpdateSchema = z
  .object({
    status: z.enum(ISSUE_STATUSES).optional(),
    title: siteIssueCreateSchema.shape.title.optional(),
    description: optionalText(5000).optional(),
    severity: z.enum(ISSUE_SEVERITIES).optional(),
    assignedTo: optionalText(120).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Nothing to update",
  });
export type SiteIssueUpdateInput = z.input<typeof siteIssueUpdateSchema>;
