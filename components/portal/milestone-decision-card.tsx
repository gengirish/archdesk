"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateGST, formatINR, STAGE_LABELS } from "@/lib/utils";

interface PendingMilestoneDecision {
  id: string;
  name: string;
  amount: number;
  gstPercent: number;
  dueDate: Date | null;
  stage: string;
  description: string | null;
}

interface MilestoneDecisionCardProps {
  token: string;
  milestone: PendingMilestoneDecision;
}

type DecisionOutcome = "APPROVED" | "REJECTED";

export function MilestoneDecisionCard({ token, milestone }: MilestoneDecisionCardProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { totalAmount } = calculateGST(milestone.amount, milestone.gstPercent);

  async function submitDecision(outcome: DecisionOutcome) {
    if (!comment.trim()) {
      setError("Please add a short comment before submitting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const idempotencyKey = `milestone-${milestone.id}-${outcome}-${Date.now()}`;
      const response = await fetch(`/api/portal/${encodeURIComponent(token)}/decisions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          milestoneId: milestone.id,
          outcome,
          comment: comment.trim(),
          respondentName: respondentName.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { data: unknown; error: string | null };
      if (!response.ok) {
        setError(payload.error || "Unable to submit your decision right now.");
        return;
      }

      setComment("");
      router.refresh();
    } catch (requestError) {
      console.error("[MILESTONE_DECISION_SUBMIT]", requestError);
      setError("Unable to submit your decision right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <p className="font-medium text-slate-900">{milestone.name}</p>
        <p className="text-xs text-slate-500">
          {STAGE_LABELS[milestone.stage] ?? milestone.stage} · {formatINR(totalAmount)}
        </p>
        {milestone.description && <p className="text-sm text-slate-600">{milestone.description}</p>}
      </div>

      <div className="mt-3 space-y-2">
        <input
          value={respondentName}
          onChange={(event) => setRespondentName(event.target.value)}
          placeholder="Your name (optional)"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-400"
          maxLength={120}
          disabled={isSubmitting}
        />
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add your decision note (required)"
          className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-400"
          maxLength={2000}
          disabled={isSubmitting}
        />
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submitDecision("APPROVED")}
            disabled={isSubmitting}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => submitDecision("REJECTED")}
            disabled={isSubmitting}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Reject"}
          </button>
        </div>
      </div>
    </li>
  );
}
