import { db } from "@/lib/db";
import { computeBillingSummary, type BillingSummary } from "@/lib/billing-metrics";

/** Loads a firm's milestones and applies the shared billing definitions. */
export async function getFirmBillingSummary(firmId: string): Promise<BillingSummary> {
  const milestones = await db.milestone.findMany({
    where: { project: { firmId } },
    select: { amount: true, gstPercent: true, status: true, paidAmount: true, dueDate: true },
  });
  return computeBillingSummary(milestones);
}
