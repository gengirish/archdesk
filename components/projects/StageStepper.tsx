"use client";

import { Check } from "lucide-react";
import { cn, STAGE_LABELS } from "@/lib/utils";
import { PROJECT_STAGES } from "@/lib/validation/project";

type Props = {
  stage: string;
  disabled?: boolean;
  onChange: (stage: (typeof PROJECT_STAGES)[number]) => void;
};

/** Clickable stage timeline: Concept → … → Completed. */
export function StageStepper({ stage, disabled, onChange }: Props) {
  const currentIndex = PROJECT_STAGES.indexOf(stage as (typeof PROJECT_STAGES)[number]);

  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Project stage">
      {PROJECT_STAGES.map((s, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={s}>
            <button
              type="button"
              disabled={disabled || current}
              onClick={() => onChange(s)}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                "disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                current && "border-primary bg-primary/10 font-medium text-foreground",
                done && "border-border/60 text-foreground hover:bg-secondary/40",
                !current && !done && "border-dashed border-border/60 text-muted-foreground hover:bg-secondary/40"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                  current && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary/60 text-primary"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="leading-tight">{STAGE_LABELS[s]}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
