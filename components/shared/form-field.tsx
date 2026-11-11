"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label + control + inline error / hint. The control should set aria-describedby={`${id}-msg`}. */
export function FormField({ id, label, error, hint, required, className, children }: Props) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
