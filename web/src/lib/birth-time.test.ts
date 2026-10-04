import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANSWER, PART_CENTRES, PART_LABELS, WINDOW_ABOUT, WINDOW_EXACT, WINDOW_PART, WINDOW_UNKNOWN,
  fromValue, partLabels, readout, risingReadout, timeOfBirthLabel, toValue,
  type PartOfDay,
} from "./birth-time";
import { hintFor, ELSEWHERE } from "./birth-record-hints";
import type { Horizon, HorizonFact } from "@/types/chart";

const fact = (over: Partial<HorizonFact>): HorizonFact => ({ value: "Capricorn", holds: true, flipsAt: [], values: ["Capricorn"], holdsFrom: "11:12", holdsTo: "12:58", ...over });
const horizon = (status: Horizon["status"], ascendant: HorizonFact): Horizon => ({ status, ascendant, midheaven: fact({}), sect: fact({ value: "day" }), moonSign: fact({ value: "Pisces" }), sunSign: fact({ value: "Scorpio" }) });

describe("the three modes map to one representation", () => {
  it("I know it: the time exact, window 0", () => {
    expect(toValue({ ...DEFAULT_ANSWER, mode: "known", time: "12:00" })).toEqual({ birthTime: "12:00", birthTimeWindowMinutes: WINDOW_EXACT });
    expect(toValue({ ...DEFAULT_ANSWER, mode: "known", time: "" })).toBeNull();
    expect(toValue({ ...DEFAULT_ANSWER, mode: "known", time: "25:00" })).toBeNull();
  });

  it("Roughly: a part of the day is its centre and 180, give or take an hour is the time and 60", () => {
    expect(toValue({ ...DEFAULT_ANSWER, mode: "roughly", kind: "part", part: "afternoon" })).toEqual({ birthTime: "15:00", birthTimeWindowMinutes: WINDOW_PART });
    expect(toValue({ ...DEFAULT_ANSWER, mode: "roughly", kind: "part", part: "night" })).toEqual({ birthTime: "03:00", birthTimeWindowMinutes: 180 });
    expect(toValue({ ...DEFAULT_ANSWER, mode: "roughly", kind: "about", time: "12:00" })).toEqual({ birthTime: "12:00", birthTimeWindowMinutes: WINDOW_ABOUT });
    expect(PART_CENTRES).toEqual({ morning: "09:00", afternoon: "15:00", evening: "21:00", night: "03:00" });
  });

  it("I don't know: noon and 720, a centre and never a birth time", () => {
    expect(toValue({ ...DEFAULT_ANSWER, mode: "unknown" })).toEqual({ birthTime: "12:00", birthTimeWindowMinutes: WINDOW_UNKNOWN });
  });

  it("reads a stored value back into the answer it came from", () => {
    for (const a of [
      { ...DEFAULT_ANSWER, mode: "known" as const, time: "04:30" },
      { ...DEFAULT_ANSWER, mode: "roughly" as const, kind: "part" as const, part: "evening" as const },
      { ...DEFAULT_ANSWER, mode: "roughly" as const, kind: "about" as const, time: "08:15" },
      { ...DEFAULT_ANSWER, mode: "unknown" as const },
    ]) {
      const v = toValue(a)!;
      expect(toValue(fromValue(v))).toEqual(v);
    }
  });
});

describe("the parts of the day in the reader's clock", () => {
  it("are PART_LABELS on the 24-hour clock, each its centre three hours either way, 24:00 ending the day", () => {
    expect(partLabels(24)).toBe(PART_LABELS);
    const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    for (const part of Object.keys(PART_CENTRES) as PartOfDay[]) {
      const [h, m] = PART_CENTRES[part].split(":").map(Number);
      const from = (h * 60 + m - WINDOW_PART + 1440) % 1440;
      expect(PART_LABELS[part]).toBe(`${part[0].toUpperCase()}${part.slice(1)}, ${hhmm(from)} to ${hhmm(from + 2 * WINDOW_PART)}`);
    }
    expect(PART_LABELS.evening).toBe("Evening, 18:00 to 24:00");
  });

  it("keep the site's 12-hour words, each hour and its half of the day held together by a no-break space", () => {
    expect(partLabels(12)).toEqual({
      morning: "Morning, 6\u00a0am to noon",
      afternoon: "Afternoon, noon to 6\u00a0pm",
      evening: "Evening, 6\u00a0pm to midnight",
      night: "Night, midnight to 6\u00a0am",
    });
  });
});

describe("the readout", () => {
  it("reads the fixture's three cases", () => {
    expect(risingReadout(fact({}))).toBe("Capricorn · holds from 11:12 to 12:58");
    expect(risingReadout(fact({ holds: false, values: ["Sagittarius", "Capricorn", "Aquarius"], flipsAt: ["11:12", "12:58"] })))
      .toBe("3 possible: Sagittarius, Capricorn, Aquarius · flips at 11:12, 12:58");
    expect(risingReadout(fact({ value: "Aries", holds: false, values: ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"], flipsAt: ["12:58", "14:06", "14:56", "15:46", "16:54"] })))
      .toBe("6 possible: Capricorn, Aquarius, Pisces, Aries, Taurus, Gemini · flips at 12:58, 14:06, 14:56, 15:46, 16:54");
  });

  it("reads the run on the reader's clock, the day's edges as midnight on the 12-hour one (MB-178)", () => {
    expect(risingReadout(fact({}), 12)).toBe("Capricorn · holds from 11:12\u00a0am to 12:58\u00a0pm");
    expect(risingReadout(fact({ holds: false, values: ["Sagittarius", "Capricorn", "Aquarius"], flipsAt: ["11:12", "12:58"] }), 12))
      .toBe("3 possible: Sagittarius, Capricorn, Aquarius · flips at 11:12\u00a0am, 12:58\u00a0pm");
    expect(risingReadout(fact({ holdsFrom: "22:40", holdsTo: "24:00" }), 12)).toBe("Capricorn · holds from 10:40\u00a0pm to midnight");
    expect(risingReadout(fact({ holdsFrom: "00:00", holdsTo: "01:12" }), 12)).toBe("Capricorn · holds from midnight to 1:12\u00a0am");
    expect(risingReadout(fact({ holdsFrom: "22:40", holdsTo: "24:00" }), 24)).toBe("Capricorn · holds from 22:40 to 24:00");
    expect(readout(horizon("known", fact({})), 12)).toEqual({
      status: "known",
      rising: "Capricorn · holds from 11:12\u00a0am to 12:58\u00a0pm",
      line: "Rising sign Capricorn · holds from 11:12\u00a0am to 12:58\u00a0pm. Your houses are set.",
    });
    expect(readout(horizon("known", fact({})))).toEqual(readout(horizon("known", fact({})), 24));
  });

  it("says whether your rising sign and houses are set", () => {
    expect(readout(horizon("known", fact({}))).line).toMatch(/\. Your houses are set\.$/);
    expect(readout(horizon("approximate", fact({}))).line).toMatch(/\. It's the same across your time range, so your houses are set\.$/);
    expect(readout(horizon("unknown", fact({ holds: false, values: ["A", "B"], flipsAt: ["12:58"] }))).line).toMatch(/We can't tell your rising sign without a time. The report uses your birth date/);
  });

  it("labels the corner of the plate", () => {
    expect(timeOfBirthLabel({ birthTime: "12:00", birthTimeWindowMinutes: 720 })).toBe("not recorded");
    expect(timeOfBirthLabel({ birthTime: "15:00", birthTimeWindowMinutes: 180 })).toBe("approximate");
    expect(timeOfBirthLabel({ birthTime: "04:30", birthTimeWindowMinutes: 0 })).toBe("04:30");
  });
});

describe("where to find it", () => {
  it("keys the hint by country and falls back to elsewhere when unverified or unknown", () => {
    expect(hintFor("France").verified).toBe(true);
    expect(hintFor("France").text).toMatch(/copie intégrale/);
    expect(hintFor("United Kingdom").text).toMatch(/Scotland/);
    expect(hintFor("Atlantis")).toEqual(ELSEWHERE);
    expect(hintFor(undefined)).toEqual(ELSEWHERE);
    expect(hintFor("Brazil")).toEqual(ELSEWHERE);
  });
});

describe("the readout's clock at noon and midnight (MB-178)", () => {
  it("noon is 12 pm, never midnight, and a minute either side of it keeps its own half", () => {
    expect(risingReadout(fact({ holdsFrom: "11:59", holdsTo: "12:00" }), 12)).toBe("Capricorn · holds from 11:59 am to 12 pm");
    expect(risingReadout(fact({ holdsFrom: "12:00", holdsTo: "12:01" }), 12)).toBe("Capricorn · holds from 12 pm to 12:01 pm");
    expect(risingReadout(fact({ holdsFrom: "00:01", holdsTo: "23:59" }), 12)).toBe("Capricorn · holds from 12:01 am to 11:59 pm");
  });

  it("a flip at either edge of the day reads midnight on the 12-hour clock and stays as stored on the 24-hour one", () => {
    const edges = fact({ holds: false, values: ["Pisces", "Aries", "Taurus"], flipsAt: ["00:00", "24:00"] });
    expect(risingReadout(edges, 12)).toBe("3 possible: Pisces, Aries, Taurus · flips at midnight, midnight");
    expect(risingReadout(edges, 24)).toBe("3 possible: Pisces, Aries, Taurus · flips at 00:00, 24:00");
    expect(risingReadout(edges)).toBe(risingReadout(edges, 24));
  });

  it("every status's line carries the 12-hour run when asked for it", () => {
    for (const status of ["known", "approximate"] as const) {
      expect(readout(horizon(status, fact({})), 12).line, status).toContain("11:12 am");
    }
  });
});
