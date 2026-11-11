/**
 * Small fixed-window rate limiter kept in module memory.
 *
 * Limits are per running instance (Vercel reuses instances, but a burst can
 * spread across several), so this throttles casual abuse and token guessing,
 * not a distributed attack. For a hard global limit, back this with a shared
 * store such as Upstash Redis (needs a new service, so not added here).
 */
type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();
const MAX_KEYS = 10_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      // Drop expired windows; if still full, drop the oldest entry.
      buckets.forEach((w, k) => {
        if (w.resetAt <= now) buckets.delete(k);
      });
      if (buckets.size >= MAX_KEYS) {
        const oldest = buckets.keys().next().value;
        if (oldest !== undefined) buckets.delete(oldest);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Test helper. */
export function __resetRateLimits() {
  buckets.clear();
}
