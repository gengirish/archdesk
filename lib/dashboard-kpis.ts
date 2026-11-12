/**
 * Dashboard KPI maths. Pure and client-safe, so it can be unit-tested.
 * Money follows lib/billing-metrics.ts: amounts include GST, and a PAID
 * milestone counts as paidAmount ?? its total.
 */
import { milestoneTotal, type MilestoneMoneyInput } from "@/lib/billing-metrics";

const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30, no DST

/** "YYYY-MM" of the calendar month in India for this instant. */
export function istMonthKey(date: Date | string): string {
  const d = new Date(new Date(date).getTime() + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The IST month before `now`, as "YYYY-MM". */
export function previousIstMonthKey(now: Date): string {
  const d = new Date(now.getTime() + IST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based; previous month is m-1
  return m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, "0")}`;
}

/** Start of the previous IST month, as a UTC instant (for DB filters). */
export function startOfPreviousIstMonth(now: Date): Date {
  const [y, m] = previousIstMonthKey(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1) - IST_OFFSET_MS);
}

export type PaidMilestoneInput = MilestoneMoneyInput & { paidAt?: Date | string | null };

export type MonthlyRevenue = {
  thisMonth: number;
  lastMonth: number;
  /** % change vs last month, one decimal; null when last month was ₹0. */
  momPercent: number | null;
};

export function computeMonthlyRevenue(
  milestones: PaidMilestoneInput[],
  now: Date = new Date()
): MonthlyRevenue {
  const cur = istMonthKey(now);
  const prev = previousIstMonthKey(now);
  let thisMonth = 0;
  let lastMonth = 0;
  for (const m of milestones) {
    if (m.status !== "PAID" || !m.paidAt) continue;
    const key = istMonthKey(m.paidAt);
    const amount = Math.round(m.paidAmount ?? milestoneTotal(m));
    if (key === cur) thisMonth += amount;
    else if (key === prev) lastMonth += amount;
  }
  const momPercent =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null;
  return { thisMonth, lastMonth, momPercent };
}

/** Label for the MoM change: "+12.5%", "-4%", "New" (from ₹0) or "—" (both ₹0). */
export function formatMomChange(r: MonthlyRevenue): string {
  if (r.momPercent === null) return r.thisMonth > 0 ? "New" : "—";
  const v = r.momPercent.toFixed(1).replace(/\.0$/, "");
  return r.momPercent > 0 ? `+${v}%` : `${v}%`;
}
