import { describe, expect, it } from "vitest";
import { annexRow, groupBySection, rateLabel } from "./failureCounts";

const c = (section: string, rule: string, count: number, flagged: boolean) => ({ section, rule, cls: "warn", count, lastAt: "2026-09-25T00:00:00.000Z", rate: flagged ? 0.15 : 0.05, flagged });

describe("failureCounts", () => {
  it("groups by section, flagged first, and orders rules inside", () => {
    const out = groupBySection([c("natal:mind", "chk-04", 9, false), c("pair:partners02", "chk-23", 2, false), c("pair:partners02", "chk-19", 3, true)]);
    expect(out.map((s) => s.section)).toEqual(["pair:partners02", "natal:mind"]);
    expect(out[0].rules.map((r) => r.rule)).toEqual(["chk-19", "chk-23"]);
    expect(out[0].flagged).toBe(1);
    expect(out[0].total).toBe(5);
  });

  it("reads the rate as a count of the last 20 writes, and names a rule's annex row", () => {
    expect(rateLabel(0.15)).toBe("3 of 20");
    expect(rateLabel(0)).toBe("0 of 20");
    expect(annexRow("chk-21a")).toBe(21);
    expect(annexRow("chk-00-json")).toBe(0);
    expect(annexRow("pass")).toBeNull();
  });
});
