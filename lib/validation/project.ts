/**
 * Project validation shared by the create/edit forms and the API routes.
 * Client-safe: imports nothing server-only.
 */
import { z } from "zod";

export const PROJECT_TYPES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "INTERIOR",
  "LANDSCAPE",
  "INSTITUTIONAL",
] as const;

export const PROJECT_STAGES = [
  "CONCEPT",
  "SCHEMATIC",
  "DESIGN_DEV",
  "WORKING_DRAWINGS",
  "EXECUTION",
  "COMPLETED",
] as const;

export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

/** Accepts "", null, a "YYYY-MM-DD" string or an ISO string; "" / null clear the date. */
const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .transform((v, ctx) => {
    if (v === null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

/** Number input that may arrive as "" (cleared) or a numeric string. */
const optionalPositiveNumber = (label: string) =>
  z
    .union([z.number(), z.string(), z.null()])
    .transform((v, ctx) => {
      if (v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a positive number` });
        return z.NEVER;
      }
      return n;
    });

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .transform((v) => (v === null ? null : v.trim() || null))
    .pipe(z.string().max(max).nullable());

const baseFields = {
  name: z.string().trim().min(1, "Project name is required").max(200),
  type: z.enum(PROJECT_TYPES, { errorMap: () => ({ message: "Choose a project type" }) }),
  description: optionalText(5000).optional(),
  budget: optionalPositiveNumber("Budget").optional(),
  area: optionalPositiveNumber("Area").optional(),
  location: optionalText(200).optional(),
  startDate: optionalDate.optional(),
  deadline: optionalDate.optional(),
};

function deadlineAfterStart(
  v: { startDate?: Date | null; deadline?: Date | null },
  ctx: z.RefinementCtx
) {
  if (v.startDate && v.deadline && v.deadline < v.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deadline"],
      message: "Deadline can't be before the start date",
    });
  }
}

export const projectCreateSchema = z
  .object({
    ...baseFields,
    clientId: z.string().min(1, "Choose a client"),
  })
  .superRefine(deadlineAfterStart);

export const projectUpdateSchema = z
  .object({
    name: baseFields.name.optional(),
    type: baseFields.type.optional(),
    description: baseFields.description,
    budget: baseFields.budget,
    area: baseFields.area,
    location: baseFields.location,
    startDate: baseFields.startDate,
    deadline: baseFields.deadline,
    clientId: z.string().min(1).optional(),
    stage: z.enum(PROJECT_STAGES).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
  })
  .superRefine(deadlineAfterStart);

export type ProjectCreateInput = z.input<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>;

/** First validation message, for toasts and API errors. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/**
 * A project is overdue when its deadline has passed and it isn't finished.
 * Compares calendar days so a deadline of "today" is not yet overdue.
 */
export function isProjectOverdue(
  project: { deadline?: Date | string | null; status: string; stage: string },
  now: Date = new Date()
): boolean {
  if (!project.deadline) return false;
  if (project.status === "COMPLETED" || project.status === "CANCELLED") return false;
  if (project.stage === "COMPLETED") return false;
  const deadline = new Date(project.deadline);
  const endOfDeadlineDay = new Date(deadline);
  endOfDeadlineDay.setHours(23, 59, 59, 999);
  return endOfDeadlineDay < now;
}

/** "YYYY-MM-DD" for <input type="date"> from a Date/ISO value. */
export function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
