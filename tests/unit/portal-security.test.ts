import { beforeEach, describe, expect, it } from "vitest";
import { generatePortalToken, isPlausiblePortalToken } from "@/lib/portal-token";
import { __resetRateLimits, clientIp, rateLimit } from "@/lib/rate-limit";

describe("portal tokens", () => {
  it("are 43-char base64url strings from 32 random bytes", () => {
    const t = generatePortalToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(t, "base64url")).toHaveLength(32);
  });

  it("don't repeat and share no common prefix with each other", () => {
    const tokens = Array.from({ length: 200 }, generatePortalToken);
    expect(new Set(tokens).size).toBe(200);
    const sharedPrefix = tokens.filter((t) => t.slice(0, 6) === tokens[0].slice(0, 6)).length;
    expect(sharedPrefix).toBeLessThan(3);
  });

  it("plausibility check accepts new and legacy tokens, rejects junk", () => {
    expect(isPlausiblePortalToken(generatePortalToken())).toBe(true);
    expect(isPlausiblePortalToken("cmwbs1fiw000613ihl6jmenyj")).toBe(true);
    expect(isPlausiblePortalToken("fake-token")).toBe(false);
    expect(isPlausiblePortalToken("../../etc/passwd")).toBe(false);
    expect(isPlausiblePortalToken("x".repeat(200))).toBe(false);
  });
});

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimits());

  it("allows up to the limit then blocks with Retry-After", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 60_000, now).ok).toBe(true);
    const blocked = rateLimit("k", 3, 60_000, now + 1000);
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 59 });
  });

  it("resets after the window and keeps keys separate", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000, now);
    expect(rateLimit("a", 3, 60_000, now).ok).toBe(false);
    expect(rateLimit("b", 3, 60_000, now).ok).toBe(true);
    expect(rateLimit("a", 3, 60_000, now + 60_001).ok).toBe(true);
  });

  it("reads the client IP from proxy headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
