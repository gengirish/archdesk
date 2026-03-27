export type DecisionSlaState = "HEALTHY" | "AT_RISK" | "BREACHED";

export function hoursSince(date: Date, now = new Date()): number {
  const diffMs = now.getTime() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
}

export function classifyDecisionSla(
  openedAt: Date | null,
  now = new Date(),
  breachHours = 48,
): { state: DecisionSlaState; ageHours: number } {
  if (!openedAt) return { state: "HEALTHY", ageHours: 0 };

  const ageHours = hoursSince(openedAt, now);
  if (ageHours >= breachHours) return { state: "BREACHED", ageHours };
  if (ageHours >= breachHours * 0.75) return { state: "AT_RISK", ageHours };
  return { state: "HEALTHY", ageHours };
}

export function isNudgeCooldownComplete(
  lastNudgedAt: Date | null,
  now = new Date(),
  cooldownHours = 24,
): boolean {
  if (!lastNudgedAt) return true;
  return hoursSince(lastNudgedAt, now) >= cooldownHours;
}
