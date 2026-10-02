/**
 * The section says only what is so: its line, placement and action are the sample's stored run, word for word,
 * where her report prints them (ADR-18).
 */
import { describe, expect, it } from "vitest";
import { isItemKey } from "@/lib/workbook";
import { DIFFERENCES } from "./differences";
import { SAMPLE } from "./sample";

const relationships = SAMPLE.run.relationships;

describe("A personality report, not a horoscope", () => {
  it("quotes the relationships chapter's first claim with a placement, byte for byte", () => {
    expect(DIFFERENCES.line).toBe("You love with a quiet, steady loyalty that proves itself in what you build behind closed doors.");
    expect(relationships?.howYouLove.startsWith(DIFFERENCES.line)).toBe(true);
    expect(relationships?.claims.some((c) => c.quote === DIFFERENCES.line)).toBe(true);
  });

  it("prints that claim's placement as the report's evidence does", () => {
    expect(DIFFERENCES.placement).toEqual({ kind: "placement", label: "Sun 13.1° Taurus, 4th house" });
    const claim = relationships?.claims.find((c) => c.quote === DIFFERENCES.line);
    expect(claim?.evidence.some((e) => e.ref.kind === "placement" && e.label === DIFFERENCES.placement.label)).toBe(true);
  });

  it("offers the chapter's first action with its own why, under the key her report ticks it by", () => {
    const first = relationships?.actions[0];
    expect(DIFFERENCES.action.action).toBe("Ask direct questions the moment you feel yourself guessing.");
    expect(DIFFERENCES.action.key).toBe("relationships.actions.0");
    expect(isItemKey(DIFFERENCES.action.key)).toBe(true);
    expect(first).toEqual({ action: DIFFERENCES.action.action, why: DIFFERENCES.action.why });
    expect(DIFFERENCES.action.why).toBeTruthy();
  });
});
