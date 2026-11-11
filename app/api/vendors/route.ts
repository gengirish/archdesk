import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { VendorCategory } from "@prisma/client";
import { vendorCreateSchema } from "@/lib/validation/vendor";
import { fieldErrors, firstIssueMessage } from "@/lib/validation/form-errors";

const VENDOR_CATEGORIES = new Set(Object.values(VendorCategory));

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const categoryParam = request.nextUrl.searchParams.get("category");
    const category =
      categoryParam && VENDOR_CATEGORIES.has(categoryParam as VendorCategory)
        ? (categoryParam as VendorCategory)
        : undefined;
    if (categoryParam && !category) {
      return NextResponse.json({ data: null, error: "Invalid category filter" }, { status: 400 });
    }

    const vendors = await db.vendor.findMany({
      where: {
        firmId: user.firmId,
        ...(category ? { category } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: vendors, error: null });
  } catch (error) {
    console.error("[API_VENDORS_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const parsed = vendorCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: firstIssueMessage(parsed.error), fieldErrors: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }
    // Vendor.city is non-nullable with a default: omit it when blank.
    const { city, ...fields } = parsed.data;

    const vendor = await db.vendor.create({
      data: {
        firmId: user.firmId,
        ...fields,
        ...(city ? { city } : {}),
      },
    });

    return NextResponse.json({ data: vendor, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_VENDORS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
