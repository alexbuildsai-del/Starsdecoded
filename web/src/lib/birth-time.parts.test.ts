import { describe, expect, it } from "vitest";
import { PART_CENTRES, PART_LABELS, WINDOW_PART, partLabels, toValue, type PartOfDay } from "./birth-time";
import { clockWords } from "./date-entry";

const PARTS = Object.keys(PART_CENTRES) as PartOfDay[];
const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

describe("the parts of the day on each clock (reading 7)", () => {
  it("is the 24-hour set for 24 and the same four parts for 12", () => {
    expect(partLabels(24)).toBe(PART_LABELS);
    expect(Object.keys(partLabels(12))).toEqual(Object.keys(PART_LABELS));
  });

  it("names the same six hours on both clocks, each part's centre and its half-width apart", () => {
    for (const part of PARTS) {
      const [h, m] = PART_CENTRES[part].split(":").map(Number);
      const from = (h * 60 + m - WINDOW_PART + 1440) % 1440;
      const to = from + 2 * WINDOW_PART;
      const words = (minutes: number) => (minutes % 1440 === 720 ? "noon" : minutes % 1440 === 0 ? "midnight" : clockWords(hhmm(minutes), 12));
      const name = `${part[0].toUpperCase()}${part.slice(1)}`;
      expect(partLabels(12)[part], part).toBe(`${name}, ${words(from)} to ${words(to)}`);
    }
  });

  it("never splits an hour from its am or pm with a plain space", () => {
    for (const label of Object.values(partLabels(12))) expect(label).not.toMatch(/\d (am|pm)/);
  });

  it("maps a part to its centre and a window of 180 minutes, the same whatever its label says", () => {
    for (const part of PARTS) {
      expect(toValue({ mode: "roughly", kind: "part", part, time: "", })).toEqual({ birthTime: PART_CENTRES[part], birthTimeWindowMinutes: WINDOW_PART });
    }
  });
});
