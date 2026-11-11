import type { LeadStageValue } from "@/lib/validation/lead";

export const LEAD_STAGE_COLORS: Record<LeadStageValue, string> = {
  NEW: "#8891A8",
  CONTACTED: "#4A8EFF",
  SITE_VISIT: "#9B72FF",
  PROPOSAL_SENT: "#E8A045",
  NEGOTIATION: "#FF8A4A",
  WON: "#3DD68C",
  LOST: "#F25757",
};

export function projectTypeLabel(t: string | null | undefined): string {
  if (!t) return "";
  return t.charAt(0) + t.slice(1).toLowerCase();
}

/** "11 Nov 2026, 3:05 pm" */
export function formatDateTime(value: Date | string): string {
  const d = new Date(value);
  const date = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${date}, ${time}`;
}

/** "11 Nov 2026" */
export function formatDay(value: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/** Whole-day comparison so "today" counts as due, not overdue. */
export function isFollowUpOverdue(value: Date | string | null | undefined, now = new Date()): boolean {
  if (!value) return false;
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d < now;
}

/** "+91 98765 43210" for a stored 10-digit mobile; leaves other formats as-is. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}
