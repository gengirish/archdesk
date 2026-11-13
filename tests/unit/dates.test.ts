import { describe, expect, it } from "vitest";
import { formatDate, formatDateLong, formatDateTime, formatMonthYear } from "@/lib/utils";

describe("dates (DD MMM YYYY, India time)", () => {
  it("formats as DD MMM YYYY", () => {
    expect(formatDate("2026-11-11T10:00:00Z")).toBe("11 Nov 2026");
    expect(formatDate(new Date("2026-03-05T00:00:00Z"))).toBe("05 Mar 2026");
  });
  it('uses "Sep", never "Sept"', () => {
    expect(formatDate("2026-09-15T06:00:00Z")).toBe("15 Sep 2026");
    expect(formatMonthYear("2026-09-15T06:00:00Z")).toBe("Sep 2026");
    expect(formatMonthYear(2026, 9)).toBe("Sep 2026");
  });
  it("uses India time at day boundaries", () => {
    // 20:00 UTC on 10 Nov is 01:30 IST on 11 Nov
    expect(formatDate("2026-11-10T20:00:00Z")).toBe("11 Nov 2026");
    // a date-only value stored as UTC midnight keeps its day
    expect(formatDate("2026-11-11")).toBe("11 Nov 2026");
  });
  it("long and date-time forms", () => {
    expect(formatDateLong("2026-09-01T06:00:00Z")).toBe("1 September 2026");
    expect(formatDateTime("2026-11-11T09:35:00Z")).toBe("11 Nov 2026, 3:05 pm");
    expect(formatDateTime("2026-11-10T18:45:00Z")).toBe("11 Nov 2026, 12:15 am");
  });
  it("empty or invalid input gives an empty string", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate("")).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});
