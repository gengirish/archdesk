import { auth } from "@clerk/nextjs/server";
import { InvoiceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { splitGst } from "@/lib/gst";
import {
  claimInvoiceSequence,
  firmInvoicePrefix,
  formatInvoiceNumber,
} from "@/lib/invoice-number";

const bodySchema = z.object({
  milestoneId: z.string().min(1, "milestoneId is required"),
  notes: z.string().trim().max(1000).optional(),
  /** Issue a fresh number even if the milestone already has an open invoice. */
  reissue: z.boolean().optional(),
});

/**
 * Creates (or returns the existing) tax invoice for a milestone and returns
 * everything the client needs to render the PDF, including the GST split.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    const firmId = user.firmId;

    const [milestone, firm] = await Promise.all([
      db.milestone.findFirst({
        where: { id: parsed.data.milestoneId, project: { firmId } },
        include: {
          project: { include: { client: true } },
          invoices: { orderBy: { createdAt: "desc" } },
        },
      }),
      db.firm.findUnique({ where: { id: firmId } }),
    ]);
    if (!firm) return NextResponse.json({ data: null, error: "Firm not found" }, { status: 404 });
    if (!milestone) {
      return NextResponse.json({ data: null, error: "Milestone not found" }, { status: 404 });
    }

    const { project } = milestone;
    const { client } = project;
    const split = splitGst({
      baseAmount: milestone.amount,
      gstPercent: milestone.gstPercent,
      supplierState: firm.state,
      supplierGstin: firm.gstNumber,
      recipientState: client.state,
    });

    const existing = milestone.invoices.find((i) => i.status !== InvoiceStatus.CANCELLED);
    let invoice = existing && !parsed.data.reissue ? existing : null;
    let created = false;

    if (!invoice) {
      const year = new Date().getFullYear();
      const prefix = firmInvoicePrefix(firm.name);
      invoice = await db.$transaction(async (tx) => {
        const seq = await claimInvoiceSequence(tx, firmId, year);
        if (existing && parsed.data.reissue) {
          await tx.invoice.update({
            where: { id: existing.id },
            data: { status: InvoiceStatus.CANCELLED },
          });
        }
        return tx.invoice.create({
          data: {
            firmId,
            milestoneId: milestone.id,
            invoiceNo: formatInvoiceNumber(prefix, year, seq),
            baseAmount: split.baseAmount,
            gstAmount: split.gstAmount,
            totalAmount: split.totalAmount,
            notes: parsed.data.notes || null,
            status: milestone.status === "PAID" ? InvoiceStatus.PAID : InvoiceStatus.UNPAID,
            paidAt: milestone.status === "PAID" ? milestone.paidAt : null,
          },
        });
      });
      created = true;
    }

    // Don't leak the portal token or other internals into the PDF payload.
    const { invoices: _invoices, project: _project, ...milestoneFields } = milestone;
    const { clientToken: _token, client: _client, ...projectFields } = project;

    return NextResponse.json(
      {
        data: {
          invoice,
          created,
          gst: split,
          firm,
          client,
          project: projectFields,
          milestone: milestoneFields,
        },
        error: null,
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    console.error("[API_INVOICES_GENERATE_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
