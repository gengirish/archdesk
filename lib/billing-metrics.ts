/**
 * The single definition of billing money metrics, used by Billing, Dashboard
 * and Analytics so the three pages can never disagree again.
 *
 * Definitions (all amounts INCLUDE GST, rounded to whole rupees):
 * - billed       = every milestone's total (base + GST), whatever its status.
 *                  Milestones are the fee schedule agreed with the client, so
 *                  "billed" means contracted, not just invoiced.
 * - collected    = PAID milestones, using the recorded paidAmount when present
 *                  (it is captured incl. GST), else the milestone total.
 * - outstanding  = every NOT-paid milestone's total (UPCOMING, DUE, UNPAID,
 *                  OVERDUE). The old Billing card skipped UPCOMING (₹0 bug) and
 *                  the old Dashboard figure was ex-GST; both are replaced.
 * - dueNow       = the part of outstanding that is DUE / UNPAID / OVERDUE, or
 *                  whose due date has passed.
 * - overdue      = status OVERDUE, or not paid and the due date is before today.
 * - collectionRate = collected ÷ billed, as a whole percentage.
 *
 * Client-safe: no server imports.
 */
import { calculateGST } from "@/lib/utils";

export type MilestoneMoneyInput = {
  amount: number;
  gstPercent: number;
  status: string;
  paidAmount?: number | null;
  dueDate?: Date | string | null;
};

export type BillingSummary = {
  billed: number;
  collected: number;
  outstanding: number;
  dueNow: number;
  overdue: number;
  collectionRate: number;
  count: { total: number; paid: number; outstanding: number; overdue: number };
};

const DUE_STATUSES = new Set(["DUE", "UNPAID", "OVERDUE"]);

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function milestoneTotal(m: Pick<MilestoneMoneyInput, "amount" | "gstPercent">): number {
  return calculateGST(m.amount, m.gstPercent).totalAmount;
}

export function isMilestoneOverdue(m: MilestoneMoneyInput, now: Date = new Date()): boolean {
  if (m.status === "PAID") return false;
  if (m.status === "OVERDUE") return true;
  return !!m.dueDate && new Date(m.dueDate) < startOfToday(now);
}

export function computeBillingSummary(
  milestones: MilestoneMoneyInput[],
  now: Date = new Date()
): BillingSummary {
  const s: BillingSummary = {
    billed: 0,
    collected: 0,
    outstanding: 0,
    dueNow: 0,
    overdue: 0,
    collectionRate: 0,
    count: { total: milestones.length, paid: 0, outstanding: 0, overdue: 0 },
  };

  for (const m of milestones) {
    const total = milestoneTotal(m);
    s.billed += total;
    if (m.status === "PAID") {
      s.collected += Math.round(m.paidAmount ?? total);
      s.count.paid += 1;
      continue;
    }
    s.outstanding += total;
    s.count.outstanding += 1;
    const overdue = isMilestoneOverdue(m, now);
    if (overdue) {
      s.overdue += total;
      s.count.overdue += 1;
    }
    if (overdue || DUE_STATUSES.has(m.status)) s.dueNow += total;
  }

  s.collectionRate = s.billed > 0 ? Math.round((s.collected / s.billed) * 100) : 0;
  return s;
}
