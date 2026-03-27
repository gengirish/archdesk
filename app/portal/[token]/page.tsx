import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, MapPin, CalendarDays, Camera, CheckCircle2, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { formatINR, formatDate, calculateGST, STAGE_LABELS, isOverdue } from "@/lib/utils";
import type { MilestoneStatus, ProjectStage } from "@prisma/client";
import { MilestoneDecisionCard } from "@/components/portal/milestone-decision-card";

const STAGE_ORDER: ProjectStage[] = [
  "CONCEPT",
  "SCHEMATIC",
  "DESIGN_DEV",
  "WORKING_DRAWINGS",
  "EXECUTION",
  "COMPLETED",
];

function milestonePaymentLabel(
  status: MilestoneStatus,
  dueDate: Date | null | undefined
): { label: "Paid" | "Upcoming" | "Overdue"; className: string } {
  if (status === "PAID") {
    return { label: "Paid", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" };
  }
  const late =
    status === "OVERDUE" ||
    (!!dueDate && isOverdue(dueDate));
  if (late) {
    return { label: "Overdue", className: "bg-red-50 text-red-800 ring-red-200" };
  }
  return { label: "Upcoming", className: "bg-slate-50 text-slate-700 ring-slate-200" };
}

export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const token = params.token?.trim();
  if (!token) notFound();

  const project = await db.project.findUnique({
    where: { clientToken: token },
    include: {
      firm: true,
      client: true,
      milestones: {
        orderBy: { createdAt: "asc" },
        include: { invoices: true },
      },
      drawings: {
        where: { status: "APPROVED" },
        orderBy: { updatedAt: "desc" },
      },
      siteUpdates: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project) notFound();

  const { firm, client, milestones, drawings, siteUpdates } = project;
  const canUseClientDecisions = firm.plan === "enterprise";
  const [pendingMilestoneDecisions, recentClientDecisions] = await Promise.all([
    canUseClientDecisions
      ? db.milestone.findMany({
          where: {
            projectId: project.id,
            clientDecisionOpen: true,
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            amount: true,
            gstPercent: true,
            dueDate: true,
            stage: true,
            description: true,
          },
        })
      : Promise.resolve([]),
    canUseClientDecisions
      ? db.clientDecision.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            milestone: {
              select: { name: true, stage: true },
            },
          },
        })
      : Promise.resolve([]),
  ]);
  const accent = firm.brandColor || "#E8A045";

  const timelineLabel =
    project.startDate || project.deadline
      ? [project.startDate ? formatDate(project.startDate) : "TBD", project.deadline ? formatDate(project.deadline) : "TBD"].join(
          " — "
        )
      : "Timeline to be confirmed";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header
        className="border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75"
        style={{ borderBottomColor: `${accent}33` }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {firm.logo ? (
              <Image
                src={firm.logo}
                alt={firm.name}
                width={160}
                height={48}
                className="h-12 w-auto max-w-[200px] object-contain"
                priority
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-semibold text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                {firm.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{firm.name}</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Client portal</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
              <MapPin className="h-3.5 w-3.5" style={{ color: accent }} />
              {project.location ?? "Location TBD"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-12 px-6 py-10">
        <section className="space-y-2">
          <p className="text-sm font-medium text-slate-500">Project</p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{project.name}</h2>
          <p className="text-slate-600">
            Client: <span className="font-medium text-slate-900">{client.name}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ring-1"
              style={{
                color: accent,
                backgroundColor: `${accent}14`,
                borderColor: `${accent}40`,
              }}
            >
              <Circle className="h-3 w-3 fill-current" />
              Stage: {STAGE_LABELS[project.stage] ?? project.stage}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-slate-700 ring-1 ring-slate-200">
              <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
              {timelineLabel}
            </span>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-900">Project journey</h3>
          <p className="text-sm text-slate-600">Current phase highlighted — aligned to your contract stages.</p>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {STAGE_ORDER.map((stage) => {
              const active = project.stage === stage;
              const idx = STAGE_ORDER.indexOf(project.stage);
              const past = STAGE_ORDER.indexOf(stage) < idx;
              return (
                <li
                  key={stage}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                  style={
                    active
                      ? {
                          borderColor: accent,
                          boxShadow: `0 0 0 1px ${accent}40`,
                          backgroundColor: `${accent}0d`,
                        }
                      : undefined
                  }
                >
                  {past || active ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  )}
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-slate-900" : "text-slate-700"}`}>
                      {STAGE_LABELS[stage]}
                    </p>
                    {active && <p className="text-xs font-medium text-slate-600">You are here</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {canUseClientDecisions && (
          <>
            <section>
              <h3 className="text-lg font-semibold text-slate-900">Decisions awaiting your approval</h3>
              <p className="text-sm text-slate-600">Approve or reject milestone requests shared by your architect.</p>
              <ul className="mt-6 space-y-4">
                {pendingMilestoneDecisions.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No decisions pending right now.
                  </li>
                )}
                {pendingMilestoneDecisions.map((milestone) => (
                  <MilestoneDecisionCard key={milestone.id} token={token} milestone={milestone} />
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900">Recent decisions</h3>
              <p className="text-sm text-slate-600">Latest approval responses submitted from this portal.</p>
              <ul className="mt-6 space-y-3">
                {recentClientDecisions.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No decisions recorded yet.
                  </li>
                )}
                {recentClientDecisions.map((decision) => (
                  <li key={decision.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <p className="font-medium text-slate-900">
                      {decision.milestone.name} · {decision.outcome === "APPROVED" ? "Approved" : "Rejected"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {STAGE_LABELS[decision.milestone.stage] ?? decision.milestone.stage} · {formatDate(decision.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{decision.comment}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <section>
          <h3 className="text-lg font-semibold text-slate-900">Milestones & payments</h3>
          <p className="text-sm text-slate-600">Amounts include GST at each milestone&apos;s configured rate.</p>
          <ul className="mt-6 space-y-4">
            {milestones.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No milestones published yet.
              </li>
            )}
            {milestones.map((m) => {
              const { totalAmount } = calculateGST(m.amount, m.gstPercent);
              const badge = milestonePaymentLabel(m.status, m.dueDate);
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{m.name}</p>
                    <p className="text-xs text-slate-500">
                      {STAGE_LABELS[m.stage]} · Due {m.dueDate ? formatDate(m.dueDate) : "TBD"}
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums text-slate-900">{formatINR(totalAmount)}</p>
                    <p className="text-xs text-slate-500">
                      Base {formatINR(m.amount)} + {m.gstPercent}% GST
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {m.razorpayLinkUrl && m.status !== "PAID" && (
                      <Link
                        href={m.razorpayLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold underline-offset-4 hover:underline"
                        style={{ color: accent }}
                      >
                        Pay now
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-900">Approved drawings</h3>
          <p className="text-sm text-slate-600">Latest approved set shared with you.</p>
          <ul className="mt-6 space-y-3">
            {drawings.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No approved drawings yet.
              </li>
            )}
            {drawings.map((d) => (
              <li key={d.id}>
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-slate-300 hover:shadow"
                >
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <FileText className="h-4 w-4" style={{ color: accent }} />
                    {d.name}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{d.type.replace(/_/g, " ")}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-900">Recent site updates</h3>
          <p className="text-sm text-slate-600">Last ten updates from your site team.</p>
          <ul className="mt-6 space-y-6">
            {siteUpdates.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No site photos yet.
              </li>
            )}
            {siteUpdates.map((u) => (
              <li key={u.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Camera className="h-3.5 w-3.5" style={{ color: accent }} />
                  <time dateTime={u.createdAt.toISOString()}>{formatDate(u.createdAt)}</time>
                  {u.milestone && (
                    <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                      {STAGE_LABELS[u.milestone] ?? u.milestone}
                    </span>
                  )}
                </div>
                {u.note && <p className="mt-2 text-sm text-slate-800">{u.note}</p>}
                {u.photos?.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {u.photos.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-200 ring-1 ring-slate-200"
                      >
                        <Image src={url} alt="Site photo" fill className="object-cover" sizes="(max-width:768px) 50vw, 200px" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        Shared securely via ArchDesk · Questions? Reach {firm.name} at {firm.email} or {firm.phone}.
      </footer>
    </div>
  );
}
