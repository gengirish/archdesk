import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 });

    const search = request.nextUrl.searchParams.get("search")?.trim();

    const clients = await db.client.findMany({
      where: {
        firmId: user.firmId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { projects: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: clients, error: null });
  } catch (error) {
    console.error("[API_CLIENTS_GET]", error);
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
    const { name, phone, email, address, city, state, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ data: null, error: "Name and phone are required" }, { status: 400 });
    }

    const client = await db.client.create({
      data: {
        firmId: user.firmId,
        name,
        phone,
        email,
        address,
        city,
        state: typeof state === "string" && state.trim() ? state.trim().slice(0, 60) : undefined,
        notes,
      },
      include: { _count: { select: { projects: true } } },
    });

    return NextResponse.json({ data: client, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_CLIENTS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
