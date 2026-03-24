import { auth } from "@clerk/nextjs/server";
import { InvoiceStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateGST, generateInvoiceNumber } from "@/lib/utils";

function firmInvoicePrefix(firmName: string): string {
  const alpha = firmName.replace(/[^a-zA-Z]/g, "");
  if (alpha.length >= 3) return alpha.slice(0, 3);
  const padded = (firmName.replace(/\s/g, "") + "XXX").slice(0, 3);
  return padded;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });
    }

    const firmId = user.firmId;

    const body = (await request.json()) as { milestoneId?: string; notes?: string };
    if (!body.milestoneId || typeof body.milestoneId !== "string") {
      return NextResponse.json({ data: null, error: "milestoneId is required" }, { status: 400 });
    }

    const [milestone, firm, invoiceCount] = await Promise.all([
      db.milestone.findFirst({
        where: { id: body.milestoneId, project: { firmId } },
        include: {
          project: {
            include: { client: true },
          },
        },
      }),
      db.firm.findUnique({ where: { id: firmId } }),
      db.invoice.count({
        where: { milestone: { project: { firmId } } },
      }),
    ]);

    if (!firm) {
      return NextResponse.json({ data: null, error: "Firm not found" }, { status: 404 });
    }

    if (!milestone) {
      return NextResponse.json({ data: null, error: "Milestone not found" }, { status: 404 });
    }

    const prefix = firmInvoicePrefix(firm.name);
    const invoiceNo = generateInvoiceNumber(prefix, invoiceCount + 1);
    const { baseAmount, gstAmount, totalAmount } = calculateGST(
      milestone.amount,
      milestone.gstPercent,
    );

    const invoice = await db.invoice.create({
      data: {
        milestoneId: milestone.id,
        invoiceNo,
        baseAmount,
        gstAmount,
        totalAmount,
        notes: body.notes ?? null,
        status: InvoiceStatus.DRAFT,
      },
    });

    const { project } = milestone;
    const { client } = project;

    return NextResponse.json({
      data: {
        invoice,
        firm,
        client,
        project,
        milestone,
      },
      error: null,
    });
  } catch (error) {
    console.error("[API_INVOICES_GENERATE_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
