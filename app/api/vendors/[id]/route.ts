import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { vendorUpdateSchema } from "@/lib/validation/vendor";
import { fieldErrors, firstIssueMessage } from "@/lib/validation/form-errors";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId }, select: { firmId: true } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const parsed = vendorUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: firstIssueMessage(parsed.error), fieldErrors: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }

    const existing = await db.vendor.findFirst({
      where: { id: params.id, firmId: user.firmId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Vendor not found" }, { status: 404 });
    }

    // Vendor.city is non-nullable in the schema: clearing it keeps the old value.
    const { city, ...rest } = parsed.data;
    const vendor = await db.vendor.update({
      where: { id: existing.id },
      data: { ...rest, ...(city ? { city } : {}) },
    });
    return NextResponse.json({ data: vendor, error: null });
  } catch (error) {
    console.error("[API_VENDORS_ID_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
