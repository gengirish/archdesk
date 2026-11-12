import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { siteIssueCreateSchema } from "@/lib/validation/site-issue";

function fail(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status });
}

async function firmProject(clerkId: string, projectId: string) {
  const user = await db.user.findUnique({ where: { clerkId }, select: { id: true, firmId: true } });
  if (!user) return { user: null, project: null };
  const project = await db.project.findFirst({
    where: { id: projectId, firmId: user.firmId },
    select: { id: true },
  });
  return { user, project };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Unauthorized", 401);
    const { user, project } = await firmProject(userId, params.id);
    if (!user) return fail("User not found", 404);
    if (!project) return fail("Project not found", 404);

    const issues = await db.siteIssue.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: issues, error: null });
  } catch (error) {
    console.error("[API_PROJECT_SITE_ISSUES_GET]", error);
    return fail("Internal server error", 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Unauthorized", 401);
    const { user, project } = await firmProject(userId, params.id);
    if (!user) return fail("User not found", 404);
    if (!project) return fail("Project not found", 404);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }
    const parsed = siteIssueCreateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);

    const issue = await db.siteIssue.create({
      data: { projectId: params.id, ...parsed.data },
    });
    return NextResponse.json({ data: issue, error: null }, { status: 201 });
  } catch (error) {
    console.error("[API_PROJECT_SITE_ISSUES_POST]", error);
    return fail("Couldn't report the issue. Please try again.", 500);
  }
}
