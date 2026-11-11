import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { milestoneTotal } from "@/lib/billing-metrics";
import { milestoneUpdateSchema } from "@/lib/validation/milestone";

type Params = { params: { id: string; milestoneId: string } };

/**
 * Edit a milestone or move its status (Upcoming → Due → Paid …).
 * Marking Paid records paidAmount (incl. GST, defaults to the full total) and
 * paidAt (defaults to now) and settles the latest open invoice. Moving away
 * from Paid clears the payment so metrics stay correct.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const parsed = milestoneUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid milestone" },
        { status: 400 }
      );
    }
    const input = parsed.data;

    const existing = await db.milestone.findFirst({
      where: { id: params.milestoneId, projectId: params.id, project: { firmId: user.firmId } },
    });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Milestone not found" }, { status: 404 });
    }

    const { paidAmount, paidAt, ...rest } = input;
    const data: Prisma.MilestoneUncheckedUpdateInput = { ...rest };
    const nextStatus = input.status ?? existing.status;
    const amount = input.amount ?? existing.amount;
    const gst = input.gstPercent ?? existing.gstPercent;

    if (nextStatus === "PAID") {
      const total = milestoneTotal({ amount, gstPercent: gst });
      const received = paidAmount ?? existing.paidAmount ?? total;
      if (received > total * 1.5) {
        return NextResponse.json(
          { data: null, error: "Amount received looks too high for this milestone" },
          { status: 400 }
        );
      }
      data.paidAmount = received;
      data.paidAt = paidAt ?? existing.paidAt ?? new Date();
    } else if (input.status !== undefined && existing.status === "PAID") {
      data.paidAmount = null;
      data.paidAt = null;
    }

    const milestone = await db.$transaction(async (tx) => {
      const updated = await tx.milestone.update({
        where: { id: existing.id },
        data,
        include: { invoices: { orderBy: { createdAt: "desc" } } },
      });
      if (nextStatus === "PAID" && existing.status !== "PAID") {
        const openInvoice = updated.invoices.find((i) => i.status !== "PAID" && i.status !== "CANCELLED");
        if (openInvoice) {
          await tx.invoice.update({
            where: { id: openInvoice.id },
            data: { status: "PAID", paidAt: data.paidAt as Date },
          });
        }
      }
      return updated;
    });

    return NextResponse.json({ data: milestone, error: null });
  } catch (error) {
    console.error("[API_MILESTONE_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
