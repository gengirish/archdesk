import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { VendorCategory } from "@prisma/client";

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

    const body = await request.json();
    const { name, category, phone, email, address, city, gst, notes, rating } = body;

    if (!name || !category || !phone) {
      return NextResponse.json({ data: null, error: "Name, category, and phone are required" }, { status: 400 });
    }
    if (!VENDOR_CATEGORIES.has(category)) {
      return NextResponse.json({ data: null, error: "Invalid vendor category" }, { status: 400 });
    }
    if (rating !== undefined && rating !== null && (typeof rating !== "number" || rating < 1 || rating > 5)) {
      return NextResponse.json({ data: null, error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const vendor = await db.vendor.create({
      data: {
        firmId: user.firmId,
        name,
        category,
        phone,
        email,
        address,
        city,
        gst,
        notes,
        rating,
      },
    });

    return NextResponse.json({ data: vendor, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_VENDORS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
