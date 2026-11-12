import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { clientUpdateSchema } from "@/lib/validation/client";
import { fieldErrors, firstIssueMessage } from "@/lib/validation/form-errors";

async function firmIdForRequest() {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 }) };
  const user = await db.user.findUnique({ where: { clerkId: userId }, select: { firmId: true } });
  if (!user) return { error: NextResponse.json({ data: null, error: "User not found" }, { status: 404 }) };
  return { firmId: user.firmId };
}

const notFound = () => NextResponse.json({ data: null, error: "Client not found" }, { status: 404 });

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await firmIdForRequest();
    if ("error" in ctx) return ctx.error;
    const client = await db.client.findFirst({
      where: { id: params.id, firmId: ctx.firmId },
      include: {
        _count: { select: { projects: true } },
        projects: { select: { id: true, name: true, stage: true, status: true }, orderBy: { updatedAt: "desc" } },
      },
    });
    if (!client) return notFound();
    return NextResponse.json({ data: client, error: null });
  } catch (error) {
    console.error("[API_CLIENTS_ID_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await firmIdForRequest();
    if ("error" in ctx) return ctx.error;

    const parsed = clientUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: firstIssueMessage(parsed.error), fieldErrors: fieldErrors(parsed.error) },
        { status: 400 }
      );
    }

    const existing = await db.client.findFirst({
      where: { id: params.id, firmId: ctx.firmId },
      select: { id: true },
    });
    if (!existing) return notFound();

    const client = await db.client.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { _count: { select: { projects: true } } },
    });
    return NextResponse.json({ data: client, error: null });
  } catch (error) {
    console.error("[API_CLIENTS_ID_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
