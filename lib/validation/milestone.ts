/** Milestone validation shared by the billing forms and API routes. Client-safe. */
import { z } from "zod";
import { PROJECT_STAGES } from "@/lib/validation/project";

export const MILESTONE_STATUSES = ["UPCOMING", "DUE", "UNPAID", "PAID", "OVERDUE"] as const;

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Upcoming",
  DUE: "Due",
  UNPAID: "Unpaid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

const money = (label: string) =>
  z
    .union([z.number(), z.string()])
    .transform((v, ctx) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(/[₹,\s]/g, ""));
      if (!Number.isFinite(n) || n <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be more than ₹0` });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    });

const gstPercent = z
  .union([z.number(), z.string()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 28) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "GST % must be between 0 and 28" });
      return z.NEVER;
    }
    return n;
  });

const optionalDate = z.union([z.string(), z.null()]).transform((v, ctx) => {
  if (v === null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
    return z.NEVER;
  }
  return d;
});

export const milestoneCreateSchema = z.object({
  name: z.string().trim().min(1, "Milestone name is required").max(200),
  stage: z.enum(PROJECT_STAGES, { errorMap: () => ({ message: "Choose a stage" }) }),
  amount: money("Base amount"),
  gstPercent: gstPercent.default(18),
  dueDate: optionalDate.optional(),
  description: z
    .union([z.string(), z.null()])
    .transform((v) => (v === null ? null : v.trim() || null))
    .optional(),
});

export const milestoneUpdateSchema = z
  .object({
    name: milestoneCreateSchema.shape.name.optional(),
    stage: milestoneCreateSchema.shape.stage.optional(),
    amount: money("Base amount").optional(),
    gstPercent: gstPercent.optional(),
    dueDate: optionalDate.optional(),
    description: milestoneCreateSchema.shape.description,
    status: z.enum(MILESTONE_STATUSES).optional(),
    /** Amount received incl. GST; required context when marking Paid. */
    paidAmount: money("Amount received").nullable().optional(),
    paidAt: optionalDate.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type MilestoneCreateInput = z.input<typeof milestoneCreateSchema>;
export type MilestoneUpdateInput = z.input<typeof milestoneUpdateSchema>;
