import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { firmUpdateSchema } from "@/lib/validation/firm";
import { fieldErrors, firstIssueMessage } from "@/lib/validation/form-errors";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const firm = await db.firm.findUnique({ where: { id: user.firmId } });
    if (!firm) {
      return NextResponse.json({ data: null, error: "Firm not found" }, { status: 404 });
    }

    return NextResponse.json({ data: firm, error: null });
  } catch (error) {
    console.error("[API_FIRM_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const existing = await db.firm.findUnique({ where: { id: user.firmId } });
    if (!existing) {
      return NextResponse.json({ data: null, error: "Firm not found" }, { status: 404 });
    }

    const parsed = firmUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: firstIssueMessage(parsed.error), fieldErrors: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }
    // city / state are non-nullable with defaults: a blank value keeps the old one.
    const { city, state, ...rest } = parsed.data;
    const data = { ...rest, ...(city ? { city } : {}), ...(state ? { state } : {}) };

    const firm = await db.firm.update({
      where: { id: user.firmId },
      data,
    });

    return NextResponse.json({ data: firm, error: null });
  } catch (error) {
    console.error("[API_FIRM_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
