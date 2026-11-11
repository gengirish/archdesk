import { describe, expect, it } from "vitest";
import {
  leadActivitySchema,
  leadCreateSchema,
  leadSourceLabel,
  leadUpdateSchema,
  normalizeIndianMobile,
  pipelineValue,
  stageChangeNote,
} from "@/lib/validation/lead";

describe("normalizeIndianMobile", () => {
  it.each([
    ["+91 98765 43210", "9876543210"],
    ["098765 43210", "9876543210"],
    ["9876543210", "9876543210"],
    ["91-98765-43210", "9876543210"],
    ["(+91) 6123456789", "6123456789"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each(["12345", "5876543210", "98765432101", "", "abcdefghij"])("rejects %s", (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

const base = { name: "QA-Lead Patil", phone: "+91 98765 43210", source: "INSTAGRAM" };

describe("leadCreateSchema", () => {
  it("normalises phone and form strings", () => {
    const r = leadCreateSchema.parse({
      ...base,
      email: " gen.girish+qa@gmail.com ",
      budget: "30,00,000",
      area: "",
      projectType: "RESIDENTIAL",
      followUpAt: "2026-11-20",
    });
    expect(r.phone).toBe("9876543210");
    expect(r.email).toBe("gen.girish+qa@gmail.com");
    expect(r.budget).toBe(3_000_000);
    expect(r.area).toBeNull();
    expect(r.followUpAt).toBeInstanceOf(Date);
  });

  it("clears an unset project type", () => {
    expect(leadCreateSchema.parse({ ...base, projectType: "" }).projectType).toBeNull();
  });

  it("rejects invalid phone, email, budget and follow-up date", () => {
    expect(leadCreateSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...base, budget: "-1" }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...base, followUpAt: "someday" }).success).toBe(false);
  });

  it("requires a name and a known source", () => {
    expect(leadCreateSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(leadCreateSchema.safeParse({ ...base, source: "TELEPATHY" }).success).toBe(false);
  });
});

describe("leadUpdateSchema", () => {
  it("accepts a stage-only change", () => {
    expect(leadUpdateSchema.parse({ stage: "PROPOSAL_SENT" })).toEqual({ stage: "PROPOSAL_SENT" });
  });

  it("rejects empty and unknown-stage updates", () => {
    expect(leadUpdateSchema.safeParse({}).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ stage: "MAYBE" }).success).toBe(false);
  });
});

describe("leadActivitySchema", () => {
  it("accepts call / note / meeting with a note", () => {
    for (const type of ["CALL", "NOTE", "MEETING"]) {
      expect(leadActivitySchema.safeParse({ type, note: "Spoke to client" }).success).toBe(true);
    }
  });

  it("rejects STAGE_CHANGE (system only) and empty notes", () => {
    expect(leadActivitySchema.safeParse({ type: "STAGE_CHANGE", note: "x" }).success).toBe(false);
    expect(leadActivitySchema.safeParse({ type: "CALL", note: "  " }).success).toBe(false);
  });
});

describe("labels and pipeline", () => {
  it("shows Walk-in, not Walkin", () => {
    expect(leadSourceLabel("WALKIN")).toBe("Walk-in");
  });

  it("writes human stage-change notes", () => {
    expect(stageChangeNote("SITE_VISIT", "PROPOSAL_SENT")).toBe("Site Visit → Proposal Sent");
  });

  it("sums budgets only for active pipeline stages", () => {
    expect(
      pipelineValue([
        { stage: "NEW", budget: 100 },
        { stage: "NEGOTIATION", budget: 200 },
        { stage: "WON", budget: 1000 },
        { stage: "LOST", budget: 1000 },
        { stage: "CONTACTED", budget: null },
      ])
    ).toBe(300);
  });
});
