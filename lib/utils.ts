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

// Short format: ₹1.2L, ₹4.5Cr
export function formatINRShort(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K`;
  return formatINR(amount);
}

// ── Date formatting (Indian style) ───────────────────────────
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
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
