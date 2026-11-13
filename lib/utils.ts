import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merge ──────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Indian currency formatter ─────────────────────────────────
// ALWAYS use this — never use toLocaleString('en-US') for amounts
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Short format: ₹3.5L, ₹1.5Cr, ₹2L (never ".0", never "K").
// Below one lakh the full amount is shown with Indian grouping: ₹85,000.
export function formatINRShort(amount: number): string {
  if (!Number.isFinite(amount)) return formatINR(0);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const short = (n: number, unit: string) => {
    const rounded = Math.round(n * 10) / 10;
    return `${sign}₹${rounded.toFixed(1).replace(/\.0$/, "")}${unit}`;
  };
  // Round first so ₹99,96,000 reads ₹1Cr rather than ₹100L.
  if (Math.round((abs / 10_000_000) * 10) / 10 >= 1) return short(abs / 10_000_000, "Cr");
  if (Math.round((abs / 100_000) * 10) / 10 >= 1 && abs >= 99_950) return short(abs / 100_000, "L");
  return `${sign}${formatINR(abs)}`;
}

// ── Date formatting ──────────────────────────────────────────
// Always "11 Nov 2026" (DD MMM YYYY) in India time. Month names are our own:
// Intl's en-IN locale prints "Sept", and numeric dates like 11/11/2026 are
// ambiguous.
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const IST_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Calendar parts of a date in India time. */
export function istParts(date: Date | string) {
  const parts = Object.fromEntries(
    IST_PARTS.formatToParts(new Date(date)).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month), // 1–12
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function validDate(date: Date | string | null | undefined): Date | null {
  if (date == null || date === "") return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "11 Nov 2026". Returns "" for empty/invalid input. */
export function formatDate(date: Date | string | null | undefined): string {
  const d = validDate(date);
  if (!d) return "";
  const p = istParts(d);
  return `${String(p.day).padStart(2, "0")} ${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

/** "11 November 2026". */
export function formatDateLong(date: Date | string | null | undefined): string {
  const d = validDate(date);
  if (!d) return "";
  const p = istParts(d);
  return `${p.day} ${MONTHS_LONG[p.month - 1]} ${p.year}`;
}

/** "11 Nov 2026, 3:05 pm" in India time. */
export function formatDateTime(date: Date | string | null | undefined): string {
  const d = validDate(date);
  if (!d) return "";
  const p = istParts(d);
  const h12 = p.hour % 12 || 12;
  return `${formatDate(d)}, ${h12}:${String(p.minute).padStart(2, "0")} ${p.hour < 12 ? "am" : "pm"}`;
}

/** "Sep 2026" for chart axes. Takes a Date, or a year and 1-based month. */
export function formatMonthYear(dateOrYear: Date | string | number, month?: number): string {
  if (typeof dateOrYear === "number" && month) return `${MONTHS_SHORT[month - 1]} ${dateOrYear}`;
  const p = istParts(dateOrYear as Date | string);
  return `${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

export function isOverdue(date: Date | string): boolean {
  return new Date(date) < new Date();
}

// ── GST Calculator ────────────────────────────────────────────
export function calculateGST(baseAmount: number, gstPercent = 18) {
  const gstAmount = (baseAmount * gstPercent) / 100;
  return {
    baseAmount,
    gstAmount: Math.round(gstAmount),
    totalAmount: Math.round(baseAmount + gstAmount),
    gstPercent,
  };
}

// ── Invoice number generator ──────────────────────────────────
export function generateInvoiceNumber(firmPrefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(3, "0");
  return `${firmPrefix.toUpperCase().slice(0, 3)}-${year}-${seq}`;
}

// ── File size formatter ───────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Project stage label ───────────────────────────────────────
export const STAGE_LABELS: Record<string, string> = {
  CONCEPT: "Concept",
  SCHEMATIC: "Schematic Design",
  DESIGN_DEV: "Design Development",
  WORKING_DRAWINGS: "Working Drawings",
  EXECUTION: "Execution",
  COMPLETED: "Completed",
};

export const STAGE_COLORS: Record<string, string> = {
  CONCEPT: "#8891A8",
  SCHEMATIC: "#9B72FF",
  DESIGN_DEV: "#4A8EFF",
  WORKING_DRAWINGS: "#E8A045",
  EXECUTION: "#3DD68C",
  COMPLETED: "#4A5068",
};

// ── Drawing status ────────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "#E8A045",
  APPROVED: "#3DD68C",
  REVISION_REQUESTED: "#F25757",
};
