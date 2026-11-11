import { describe, expect, it } from "vitest";
import {
  isProjectOverdue,
  projectCreateSchema,
  projectUpdateSchema,
  toDateInputValue,
} from "@/lib/validation/project";

const base = {
  name: "QA-Sharma Residence",
  clientId: "client_1",
  type: "RESIDENTIAL",
};

describe("projectCreateSchema", () => {
  it("accepts form strings and normalises them", () => {
    const r = projectCreateSchema.parse({
      ...base,
      budget: "4500000",
      area: "2400",
      location: "  Hubballi ",
      startDate: "2026-11-01",
      deadline: "2027-06-30",
    });
    expect(r.budget).toBe(4_500_000);
    expect(r.area).toBe(2400);
    expect(r.location).toBe("Hubballi");
    expect(r.startDate).toBeInstanceOf(Date);
    expect(r.deadline).toBeInstanceOf(Date);
  });

  it("treats empty optional fields as null", () => {
    const r = projectCreateSchema.parse({ ...base, budget: "", location: "", deadline: "" });
    expect(r.budget).toBeNull();
    expect(r.location).toBeNull();
    expect(r.deadline).toBeNull();
  });

  it("requires name, client and a valid type", () => {
    expect(projectCreateSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ ...base, clientId: "" }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ ...base, type: "CASTLE" }).success).toBe(false);
  });

  it("rejects negative budget and garbage dates", () => {
    expect(projectCreateSchema.safeParse({ ...base, budget: "-5" }).success).toBe(false);
    expect(projectCreateSchema.safeParse({ ...base, startDate: "not-a-date" }).success).toBe(false);
  });

  it("rejects a deadline before the start date", () => {
    const r = projectCreateSchema.safeParse({
      ...base,
      startDate: "2027-01-10",
      deadline: "2027-01-01",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["deadline"]);
  });
});

describe("projectUpdateSchema", () => {
  it("allows partial updates such as a stage change", () => {
    expect(projectUpdateSchema.parse({ stage: "SCHEMATIC" })).toEqual({ stage: "SCHEMATIC" });
  });

  it("rejects unknown stages and statuses", () => {
    expect(projectUpdateSchema.safeParse({ stage: "DEMOLISHED" }).success).toBe(false);
    expect(projectUpdateSchema.safeParse({ status: "PAUSED" }).success).toBe(false);
  });

  it("can clear a deadline", () => {
    expect(projectUpdateSchema.parse({ deadline: "" }).deadline).toBeNull();
  });
});

describe("isProjectOverdue", () => {
  const now = new Date("2026-11-11T10:00:00");

  it("is overdue once the deadline day has passed", () => {
    expect(
      isProjectOverdue({ deadline: "2026-11-10T00:00:00", status: "ACTIVE", stage: "EXECUTION" }, now)
    ).toBe(true);
  });

  it("is not overdue on the deadline day itself", () => {
    expect(
      isProjectOverdue({ deadline: "2026-11-11T00:00:00", status: "ACTIVE", stage: "EXECUTION" }, now)
    ).toBe(false);
  });

  it("ignores projects without a deadline or that are finished", () => {
    const past = "2026-01-01T00:00:00";
    expect(isProjectOverdue({ deadline: null, status: "ACTIVE", stage: "CONCEPT" }, now)).toBe(false);
    expect(isProjectOverdue({ deadline: past, status: "COMPLETED", stage: "EXECUTION" }, now)).toBe(false);
    expect(isProjectOverdue({ deadline: past, status: "CANCELLED", stage: "CONCEPT" }, now)).toBe(false);
    expect(isProjectOverdue({ deadline: past, status: "ACTIVE", stage: "COMPLETED" }, now)).toBe(false);
  });

  it("still flags on-hold projects past their deadline", () => {
    expect(
      isProjectOverdue({ deadline: "2026-11-01T00:00:00", status: "ON_HOLD", stage: "SCHEMATIC" }, now)
    ).toBe(true);
  });
});

describe("toDateInputValue", () => {
  it("formats for <input type=date>", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue("garbage")).toBe("");
  });
});
