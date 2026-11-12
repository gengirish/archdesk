import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { clientCreateSchema } from "@/lib/validation/client";
import { fieldErrors, firstIssueMessage } from "@/lib/validation/form-errors";
import { clientSearchWhere } from "@/lib/client-search";

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
        ...(search ? clientSearchWhere(search) : {}),
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

    const parsed = clientCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: firstIssueMessage(parsed.error), fieldErrors: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }

    const client = await db.client.create({
      data: {
        firmId: user.firmId,
        ...parsed.data,
      },
      include: { _count: { select: { projects: true } } },
    });

    return NextResponse.json({ data: client, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_CLIENTS_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
