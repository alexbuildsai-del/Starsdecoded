import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANSWER, PART_CENTRES, WINDOW_ABOUT, WINDOW_EXACT, WINDOW_PART, WINDOW_UNKNOWN,
  fromValue, readout, risingReadout, timeOfBirthLabel, toValue,
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

describe("the readout", () => {
  it("reads the fixture's three cases", () => {
    expect(risingReadout(fact({}))).toBe("Capricorn · holds from 11:12 to 12:58");
    expect(risingReadout(fact({ holds: false, values: ["Sagittarius", "Capricorn", "Aquarius"], flipsAt: ["11:12", "12:58"] })))
      .toBe("3 possible: Sagittarius, Capricorn, Aquarius · flips at 11:12, 12:58");
    expect(risingReadout(fact({ value: "Aries", holds: false, values: ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini"], flipsAt: ["12:58", "14:06", "14:56", "15:46", "16:54"] })))
      .toBe("6 possible: Capricorn, Aquarius, Pisces, Aries, Taurus, Gemini · flips at 12:58, 14:06, 14:56, 15:46, 16:54");
  });

  it("says whether the horizon is drawn", () => {
    expect(readout(horizon("known", fact({}))).line).toMatch(/The horizon is drawn/);
    expect(readout(horizon("approximate", fact({}))).line).toMatch(/holds across your window/);
    expect(readout(horizon("unknown", fact({ holds: false, values: ["A", "B"], flipsAt: ["12:58"] }))).line).toMatch(/not drawn; the report reads the date/);
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
