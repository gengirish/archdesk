import { auth } from "@clerk/nextjs/server";
import { DrawingStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { DRAWING_DETAIL_INCLUDE, findFirmDrawing } from "@/lib/drawing-storage";

type Params = { params: { id: string; drawingId: string } };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

    const { drawing } = await findFirmDrawing({
      clerkId: userId,
      projectId: params.id,
      drawingId: params.drawingId,
    });
    if (!drawing) {
      return NextResponse.json({ data: null, error: "Drawing not found" }, { status: 404 });
    }

    const detail = await db.drawing.findUnique({
      where: { id: drawing.id },
      include: DRAWING_DETAIL_INCLUDE,
    });
    return NextResponse.json({ data: detail, error: null });
  } catch (error) {
    console.error("[API_DRAWING_GET]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z
  .object({
    status: z.nativeEnum(DrawingStatus).optional(),
    name: z.string().trim().min(1).max(200).optional(),
  })
  .refine((v) => v.status !== undefined || v.name !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const { drawing } = await findFirmDrawing({
      clerkId: userId,
      projectId: params.id,
      drawingId: params.drawingId,
    });
    if (!drawing) {
      return NextResponse.json({ data: null, error: "Drawing not found" }, { status: 404 });
    }

    const updated = await db.drawing.update({
      where: { id: drawing.id },
      data: parsed.data,
      include: DRAWING_DETAIL_INCLUDE,
    });
    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error("[API_DRAWING_PATCH]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
