import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findFirmDrawing } from "@/lib/drawing-storage";

const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; drawingId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

    const parsed = commentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const { user, drawing } = await findFirmDrawing({
      clerkId: userId,
      projectId: params.id,
      drawingId: params.drawingId,
    });
    if (!user || !drawing) {
      return NextResponse.json({ data: null, error: "Drawing not found" }, { status: 404 });
    }

    const comment = await db.drawingComment.create({
      data: { drawingId: drawing.id, userId: user.id, content: parsed.data.content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return NextResponse.json({ data: comment, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_DRAWING_COMMENT_POST]", error);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
