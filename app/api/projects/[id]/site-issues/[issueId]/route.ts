import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  canTransition,
  ISSUE_STATUS_LABELS,
  resolvedAtAfter,
  siteIssueUpdateSchema,
  type IssueStatusValue,
} from "@/lib/validation/site-issue";

function fail(error: string, status: number) {
  return NextResponse.json({ data: null, error }, { status });
}

/** Edit an issue or move it along Open → In Progress → Resolved (or reopen). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; issueId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Unauthorized", 401);
    const user = await db.user.findUnique({ where: { clerkId: userId }, select: { firmId: true } });
    if (!user) return fail("User not found", 404);

    const issue = await db.siteIssue.findFirst({
      where: { id: params.issueId, projectId: params.id, project: { firmId: user.firmId } },
    });
    if (!issue) return fail("Issue not found", 404);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }
    const parsed = siteIssueUpdateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    const { status, ...fields } = parsed.data;

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) data[k] = v;

    if (status && status !== issue.status) {
      const from = issue.status as IssueStatusValue;
      if (!canTransition(from, status)) {
        return fail(
          `An issue that is ${ISSUE_STATUS_LABELS[from]} can't move to ${ISSUE_STATUS_LABELS[status]}`,
          409
        );
      }
      data.status = status;
      data.resolvedAt = resolvedAtAfter(from, status, issue.resolvedAt);
    }

    // Guard on the status we validated against, so two people moving the same
    // issue at once can't skip a step.
    const { count } = await db.siteIssue.updateMany({
      where: { id: issue.id, status: issue.status },
      data,
    });
    if (count === 0) return fail("This issue was just changed by someone else. Refresh and try again.", 409);
    const updated = await db.siteIssue.findUnique({ where: { id: issue.id } });
    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error("[API_PROJECT_SITE_ISSUE_PATCH]", error);
    return fail("Couldn't update the issue. Please try again.", 500);
  }
}
