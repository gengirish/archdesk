/**
 * Lead validation shared by the leads UI and the /api/leads routes.
 * Client-safe: imports nothing server-only.
 */
import { z } from "zod";
import { indianMobileSchema } from "./common";

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;
export type LeadStageValue = (typeof LEAD_STAGES)[number];

/** Active pipeline columns, in order. WON / LOST are terminal sections. */
export const PIPELINE_STAGES = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "PROPOSAL_SENT",
  "NEGOTIATION",
] as const satisfies readonly LeadStageValue[];

export const LEAD_SOURCES = [
  "REFERRAL",
  "INSTAGRAM",
  "FACEBOOK",
  "WALKIN",
  "WEBSITE",
  "HOUZZ",
  "PHONE",
  "OTHER",
] as const;

export const LEAD_PROJECT_TYPES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "INTERIOR",
  "LANDSCAPE",
  "INSTITUTIONAL",
] as const;

/** Activity types staff can log by hand (STAGE_CHANGE is system-generated). */
export const MANUAL_ACTIVITY_TYPES = [
  "CALL",
  "NOTE",
  "MEETING",
  "WHATSAPP",
  "EMAIL",
  "SITE_VISIT",
  "PROPOSAL",
] as const;

export const LEAD_STAGE_LABELS: Record<LeadStageValue, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT: "Site Visit",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const LEAD_SOURCE_LABELS: Record<(typeof LEAD_SOURCES)[number], string> = {
  REFERRAL: "Referral",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WALKIN: "Walk-in",
  WEBSITE: "Website",
  HOUZZ: "Houzz",
  PHONE: "Phone call",
  OTHER: "Other",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  NOTE: "Note",
  MEETING: "Meeting",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  SITE_VISIT: "Site visit",
  PROPOSAL: "Proposal",
  STAGE_CHANGE: "Stage change",
};

export function leadStageLabel(stage: string): string {
  return LEAD_STAGE_LABELS[stage as LeadStageValue] ?? stage;
}

export function leadSourceLabel(source: string): string {
  return LEAD_SOURCE_LABELS[source as (typeof LEAD_SOURCES)[number]] ?? source;
}

export { normalizeIndianMobile } from "./common";
const phoneSchema = indianMobileSchema;

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .transform((v) => (v === null ? null : v.trim() || null))
    .pipe(z.string().max(max).nullable());

const optionalEmail = z
  .union([z.string(), z.null()])
  .transform((v) => (v === null ? null : v.trim() || null))
  .pipe(z.string().email("Enter a valid email address").max(200).nullable());

const optionalNonNegative = (label: string) =>
  z.union([z.number(), z.string(), z.null()]).transform((v, ctx) => {
    if (v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a positive number` });
      return z.NEVER;
    }
    return n;
  });

const optionalDate = z.union([z.string(), z.date(), z.null()]).transform((v, ctx) => {
  if (v === null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid follow-up date" });
    return z.NEVER;
  }
  return d;
});

/** "" or null → null, so a cleared select clears the field. */
const optionalProjectType = z
  .union([z.enum(LEAD_PROJECT_TYPES), z.literal(""), z.null()])
  .transform((v) => (v === "" ? null : v));

const fields = {
  name: z.string().trim().min(1, "Lead name is required").max(200),
  phone: phoneSchema,
  email: optionalEmail.optional(),
  address: optionalText(500).optional(),
  projectType: optionalProjectType.optional(),
  budget: optionalNonNegative("Budget").optional(),
  area: optionalNonNegative("Area").optional(),
  source: z.enum(LEAD_SOURCES, { errorMap: () => ({ message: "Choose a lead source" }) }),
  notes: optionalText(5000).optional(),
  followUpAt: optionalDate.optional(),
};

export const leadCreateSchema = z.object(fields);

export const leadUpdateSchema = z
  .object({
    name: fields.name.optional(),
    phone: fields.phone.optional(),
    email: fields.email,
    address: fields.address,
    projectType: fields.projectType,
    budget: fields.budget,
    area: fields.area,
    source: fields.source.optional(),
    notes: fields.notes,
    followUpAt: fields.followUpAt,
    stage: z.enum(LEAD_STAGES, { errorMap: () => ({ message: "Invalid lead stage" }) }).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Nothing to update" });

export const leadActivitySchema = z.object({
  type: z.enum(MANUAL_ACTIVITY_TYPES, { errorMap: () => ({ message: "Choose an activity type" }) }),
  note: z.string().trim().min(1, "Add a note for this activity").max(2000),
});

export type LeadCreateInput = z.input<typeof leadCreateSchema>;
export type LeadUpdateInput = z.input<typeof leadUpdateSchema>;
export type LeadActivityInput = z.input<typeof leadActivitySchema>;

export function firstLeadIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/** Human note for STAGE_CHANGE activities, e.g. "Site Visit → Proposal Sent". */
export function stageChangeNote(from: string, to: string): string {
  return `${leadStageLabel(from)} → ${leadStageLabel(to)}`;
}

/** Sum of budgets for leads still in the active pipeline. */
export function pipelineValue(leads: { stage: string; budget: number | null }[]): number {
  const active = new Set<string>(PIPELINE_STAGES);
  return leads.reduce((sum, l) => (active.has(l.stage) ? sum + (l.budget ?? 0) : sum), 0);
}
