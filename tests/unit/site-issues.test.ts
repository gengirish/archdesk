import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  canTransition,
  ISSUE_SEVERITY_LABELS,
  nextForwardStatus,
  resolvedAtAfter,
  siteIssueCreateSchema,
  siteIssueUpdateSchema,
} from "@/lib/validation/site-issue";
import {
  MAX_SITE_PHOTOS,
  siteUpdateFieldsSchema,
  sniffImageType,
  validateSitePhotos,
} from "@/lib/validation/site-update";

describe("siteIssueCreateSchema", () => {
  it("requires a title and defaults severity to Medium", () => {
    const r = siteIssueCreateSchema.parse({ title: "  QA-Seepage in basement  ", description: "" });
    expect(r).toEqual({ title: "QA-Seepage in basement", description: null, severity: "MEDIUM", assignedTo: null });
    expect(siteIssueCreateSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(siteIssueCreateSchema.safeParse({}).success).toBe(false);
  });

  it("caps the title at 200 chars and accepts every severity", () => {
    expect(siteIssueCreateSchema.safeParse({ title: "x".repeat(201) }).success).toBe(false);
    for (const severity of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) {
      expect(siteIssueCreateSchema.parse({ title: "QA-x", severity }).severity).toBe(severity);
    }
    expect(siteIssueCreateSchema.safeParse({ title: "QA-x", severity: "URGENT" }).success).toBe(false);
    expect(ISSUE_SEVERITY_LABELS.CRITICAL).toBe("Critical");
  });

  it("update needs at least one field and validates status", () => {
    expect(siteIssueUpdateSchema.safeParse({}).success).toBe(false);
    expect(siteIssueUpdateSchema.parse({ status: "IN_PROGRESS" }).status).toBe("IN_PROGRESS");
    expect(siteIssueUpdateSchema.safeParse({ status: "DONE" }).success).toBe(false);
  });
});

describe("issue status flow", () => {
  it("goes Open → In Progress → Resolved", () => {
    expect(nextForwardStatus("OPEN")).toBe("IN_PROGRESS");
    expect(nextForwardStatus("IN_PROGRESS")).toBe("RESOLVED");
    expect(nextForwardStatus("RESOLVED")).toBeNull();
    expect(canTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
  });

  it("doesn't skip steps", () => {
    expect(canTransition("OPEN", "RESOLVED")).toBe(false);
    expect(canTransition("OPEN", "CLOSED")).toBe(false);
  });

  it("allows reopening and stepping back", () => {
    expect(canTransition("RESOLVED", "OPEN")).toBe(true);
    expect(canTransition("CLOSED", "OPEN")).toBe(true);
    expect(canTransition("IN_PROGRESS", "OPEN")).toBe(true);
    expect(allowedNextStatuses("RESOLVED")).toContain("CLOSED");
  });

  it("sets resolvedAt on resolve, clears it on reopen, keeps it on close", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    const earlier = new Date("2026-11-01T10:00:00Z");
    expect(resolvedAtAfter("IN_PROGRESS", "RESOLVED", null, now)).toEqual(now);
    expect(resolvedAtAfter("RESOLVED", "OPEN", earlier, now)).toBeNull();
    expect(resolvedAtAfter("RESOLVED", "CLOSED", earlier, now)).toEqual(earlier);
    expect(resolvedAtAfter("OPEN", "IN_PROGRESS", null, now)).toBeNull();
  });
});

describe("site update validation", () => {
  it("normalises text fields and the stage", () => {
    expect(siteUpdateFieldsSchema.parse({ note: " QA-Slab cast ", weather: "", milestone: "" })).toEqual({
      note: "QA-Slab cast",
      weather: null,
      milestone: null,
    });
    expect(siteUpdateFieldsSchema.parse({ milestone: "EXECUTION" }).milestone).toBe("EXECUTION");
    expect(siteUpdateFieldsSchema.safeParse({ milestone: "BOGUS" }).success).toBe(false);
  });

  it("limits photo count, type and total size", () => {
    const photo = (size = 500_000, type = "image/jpeg") => ({ name: "p.jpg", size, type });
    expect(validateSitePhotos([photo(), photo()])).toBeNull();
    expect(validateSitePhotos(Array.from({ length: MAX_SITE_PHOTOS + 1 }, () => photo()))).toMatch(/up to 6/);
    expect(validateSitePhotos([photo(500, "application/pdf")])).toMatch(/isn't a JPG/);
    expect(validateSitePhotos([photo(3_000_000), photo(2_000_000)])).toMatch(/too large/);
  });

  it("sniffs real image bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
  });
});
