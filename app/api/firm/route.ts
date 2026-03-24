import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

const ALLOWED_PATCH_KEYS = [
  "name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "gstNumber",
  "website",
  "brandColor",
  "logo",
] as const;

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

    const body = await request.json();
    const data: Record<string, unknown> = {};

    for (const key of ALLOWED_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ data: null, error: "No valid fields to update" }, { status: 400 });
    }

    const firm = await db.firm.update({
      where: { id: user.firmId },
      data: data as Prisma.FirmUpdateInput,
    });

    return NextResponse.json({ data: firm, error: null });
  } catch (error) {
    console.error("[API_FIRM_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
