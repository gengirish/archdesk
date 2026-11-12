"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only 1–5 star display. Renders nothing when unrated. */
export function StarDisplay({
  rating,
  className,
}: {
  rating: number | null | undefined;
  className?: string;
}) {
  if (!rating) return null;
  return (
    <div
      className={cn("flex items-center gap-0.5 text-primary", className)}
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("h-3 w-3", n <= rating ? "fill-current" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

/** Clickable 1–5 star input; clicking the current rating clears it. */
export function StarInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div id={id} role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value !== null && n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(value === n ? null : n)}
            className="rounded p-1 text-primary transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={cn("h-5 w-5", active ? "fill-current" : "text-muted-foreground/40")} />
          </button>
        );
      })}
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear
        </button>
      ) : (
        <span className="ml-2 text-xs text-muted-foreground">Not rated</span>
      )}
    </div>
  );
}
