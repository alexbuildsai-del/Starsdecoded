/**
 * The dashboard's teaser (R16-31; acceptance 1; reading 26): the teaser is built here as the server's `teaserView`
 * builds it (`api/src/lib/timeline.ts`, which the web cannot import), from Mira's fixture through the engine on chosen
 * days of her life, so every age and date in it is computed. Then what the section prints, and when Not now lets it
 * come back.
 */
import { describe, expect, it } from "vitest";
import {
  CYCLE_WORDS, KNOWN_AGES, calculateNatalChart, lifeCycles, natalLongitudes, roundProgress,
  type CycleId, type LifeCycle, type NatalChartData,
} from "@workspace/engine";
import type { Teaser } from "@workspace/api-client-react";
import { cycleAges, cycleChip, cycleDates } from "./life-view";
import {
  NOT_NOW_KEY, NOW_TITLE, PAST_TITLE, RING_LABEL, START_TIMELINE, cameBack, planPriceLine, keepNotNow, notNowPressed, parseNotNow, readNotNow, serializeNotNow,
  teaserModel, teaserShows, teaserStatuses, yearsOn, type NotNow, type NotNowStore,
} from "./teaser-view";
import { dayIn } from "./timeline-view";
import fixture from "../../../fixtures/sample-people/mira.json";

const ZONE = fixture.timezone;
const chart = calculateNatalChart(fixture.birthDate, fixture.birthTime, fixture.latitude, fixture.longitude, ZONE, 0);

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const anchorOf = (cycle: LifeCycle) => cycle.window.exact[0] ?? cycle.window.start;

/** The server's `teaserView`, in the birth place's days: the first Saturn return on the ring, the four known ages listed. */
function teaserOf(at: string, birthChart: NatalChartData = chart): Teaser {
  const now = new Date(`${at}T09:00:00Z`);
  const natal = natalLongitudes(birthChart);
  const cycles = lifeCycles(natal, new Date(birthChart.datetimeUtc));
  const today = dayIn(now, ZONE);
  const past = (cycle: LifeCycle) => dayIn(cycle.window.end, ZONE) < today;
  const picked = KNOWN_AGES.flatMap(({ id }) => {
    const own = cycles.filter((cycle) => cycle.id === id);
    const at = own.findIndex((cycle) => !past(cycle));
    const cycle = at < 0 ? own[own.length - 1] : own[at];
    return cycle ? [{ cycle, ahead: at >= 0 }] : [];
  }).sort((x, y) => Number(y.ahead) - Number(x.ahead) || anchorOf(x.cycle).getTime() - anchorOf(y.cycle).getTime());
  const first = cycles.find((cycle) => cycle.id === "saturn-return")!;
  return {
    saturn: { age: first.age, progress: r3(roundProgress("saturn", natal.saturn!, now)) },
    cycles: picked.map(({ cycle }) => ({
      id: cycle.id,
      name: CYCLE_WORDS[cycle.id].name,
      word: CYCLE_WORDS[cycle.id].word,
      age: cycle.age,
      on: dayIn(anchorOf(cycle), ZONE),
    })),
  };
}

/** Mira's day, "YYYY-MM-DD", as the teaser and the section read it. */
const day = (at: string) => dayIn(new Date(`${at}T09:00:00Z`), ZONE);
const chips = (teaser: Teaser, at: string) => teaserModel(teaser, day(at)).cycles.map((cycle) => cycleChip(cycle, cycle.today));
/** The day the teaser sends for one of her cycles, as it stands on `at`. */
const onOf = (at: string, id: CycleId) => teaserOf(at).cycles.find((cycle) => cycle.id === id)!.on;

function addDays(at: string, n: number): string {
  const [y, m, d] = at.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

describe("what the teaser prints", () => {
  it("rings her first Saturn return and lists the four known ages, the next first: her nodal return at 37", () => {
    const teaser = teaserOf("2026-10-05");
    const model = teaserModel(teaser, day("2026-10-05"));
    expect(model.ring).toEqual({ age: 29, progress: teaser.saturn.progress, label: RING_LABEL });
    expect(model.title).toBe("Your next big cycle is at 37");
    expect(model.cycles.map((cycle) => [cycle.id, cycle.age])).toEqual([
      ["node-return", 37], ["uranus-opposition", 44], ["jupiter-return", 47], ["saturn-return", 58],
    ]);
    expect(teaserStatuses(teaser.cycles, day("2026-10-05"))).toEqual(["ahead", "ahead", "ahead", "ahead"]);
  });

  it("dates each card from the API's day alone, its head the age it comes at, Saturn's ring the only one with a round", () => {
    const teaser = teaserOf("2026-10-05");
    const today = day("2026-10-05");
    const model = teaserModel(teaser, today);
    model.cycles.forEach((cycle, i) => {
      const sent = teaser.cycles[i];
      expect(cycle).toMatchObject({ key: sent.id, id: sent.id, name: sent.name, word: sent.word, age: sent.age, today });
      expect(cycle.exact).toEqual([sent.on]);
      expect(cycleDates(cycle, "dmy")).not.toContain(" to ");
      expect(cycleAges(cycle)).toBe(`At ${sent.age}`);
      expect(cycle.progress).toBe(sent.id === "saturn-return" ? teaser.saturn.progress : null);
    });
    const years = teaser.cycles.map((c) => Math.round((Date.parse(c.on) - Date.parse(today)) / (365.25 * 86_400_000)));
    expect(chips(teaser, "2026-10-05")).toEqual(years.map((n) => `In ${n} years`));
  });

  it("says a cycle is happening once its first pass has come and while its window is open, and is next before", () => {
    const before = teaserOf("2020-10-01");
    expect(before.cycles[0]).toMatchObject({ id: "saturn-return", on: "2021-01-18" });
    expect(teaserModel(before, day("2020-10-01")).title).toBe("Your next big cycle is at 29");
    expect(chips(before, "2020-10-01")[0]).toBe("Within a year");

    const during = teaserOf("2021-01-25");
    expect(teaserStatuses(during.cycles, day("2021-01-25"))).toEqual(["now", "ahead", "ahead", "ahead"]);
    expect(teaserModel(during, day("2021-01-25")).title).toBe(NOW_TITLE);
    expect(chips(during, "2021-01-25")[0]).toBe("Happening now");
  });

  it("puts a cycle behind her after those to come, once its window has closed", () => {
    const during = teaserOf("2036-01-01");
    expect(during.cycles[0].id).toBe("uranus-opposition");
    expect(chips(during, "2036-01-01")[0]).toBe("Happening now");

    const after = teaserOf("2037-01-01");
    expect(after.cycles.map((cycle) => cycle.id)).toEqual(["jupiter-return", "node-return", "saturn-return", "uranus-opposition"]);
    expect(teaserStatuses(after.cycles, day("2037-01-01"))).toEqual(["ahead", "ahead", "ahead", "past"]);
    expect(chips(after, "2037-01-01")[3]).toBe("Behind you");
    expect(teaserModel(after, day("2037-01-01")).title).toBe("Your next big cycle is at 47");
  });

  it("knows the last return of a long life is under way, and when every cycle is behind her", () => {
    const last = teaserOf("2079-06-01");
    expect(teaserStatuses(last.cycles, day("2079-06-01"))).toEqual(["now", "past", "past", "past"]);
    expect(teaserModel(last, day("2079-06-01")).title).toBe(NOW_TITLE);

    const all = teaserOf("2081-01-01");
    expect(teaserStatuses(all.cycles, day("2081-01-01"))).toEqual(["past", "past", "past", "past"]);
    expect(teaserModel(all, day("2081-01-01")).title).toBe(PAST_TITLE);
    expect(chips(all, "2081-01-01")).toEqual(["Behind you", "Behind you", "Behind you", "Behind you"]);
  });
});

describe("what the teaser sells", () => {
  it("names both plans at the catalogue's price, the month first, and the button that starts one", () => {
    expect(planPriceLine()).toBe("€9.99 a month or €69.99 a year");
    expect(START_TIMELINE).toBe("Start Timeline");
  });
});

describe("Not now", () => {
  const first = notNowPressed(null, "2026-10-05");

  // Her nodal return at 37, in June 2028: a year away in June 2027, under a year the day after.
  const nodal = onOf("2026-10-05", "node-return");
  const yearBefore = yearsOn(nodal, -1);
  const nodalNear = addDays(yearBefore, 1);

  it("hides the teaser until a cycle a year or more away that day is under a year away (reading 26)", () => {
    expect(first).toEqual({ day: "2026-10-05", back: false, final: false });
    expect(nodal.startsWith("2028-06")).toBe(true);
    expect(teaserShows(teaserOf("2026-10-05"), null, day("2026-10-05"))).toBe(true);
    expect(teaserShows(teaserOf("2026-10-05"), first, day("2026-10-05"))).toBe(false);
    expect(teaserShows(teaserOf(yearBefore), first, yearBefore)).toBe(false);
    expect(teaserShows(teaserOf(nodalNear), first, nodalNear)).toBe(true);
  });

  it("does not come back for a cycle already under a year away when the reader chose it", () => {
    const late = notNowPressed(null, "2027-08-01");
    expect(teaserShows(teaserOf("2028-01-01"), late, "2028-01-01")).toBe(false);
    // The next after it is her Uranus opposition at 44, in August 2035.
    const uranus = onOf("2034-01-01", "uranus-opposition");
    expect(uranus.startsWith("2035-08")).toBe(true);
    const before = yearsOn(uranus, -1);
    expect(teaserShows(teaserOf(before), late, before)).toBe(false);
    expect(teaserShows(teaserOf(addDays(before, 1)), late, addDays(before, 1))).toBe(true);
  });

  it("comes back once and stays, though the cycle that brought it back has passed", () => {
    const shows = teaserShows(teaserOf(nodalNear), first, nodalNear);
    const back = cameBack(first, shows);
    expect(back).toEqual({ day: "2026-10-05", back: true, final: false });
    expect(cameBack(back, true)).toBeNull();
    expect(cameBack(first, false)).toBeNull();
    expect(teaserShows(teaserOf("2028-07-01"), first, "2028-07-01")).toBe(false);
    expect(teaserShows(teaserOf("2028-07-01"), back, "2028-07-01")).toBe(true);
  });

  it("hides it for good when chosen again after it came back", () => {
    const again = notNowPressed({ day: "2026-10-05", back: true, final: false }, "2028-07-01");
    expect(again).toEqual({ day: "2028-07-01", back: false, final: true });
    expect(cameBack(again, true)).toBeNull();
    for (const at of ["2028-07-02", "2034-08-17", "2049-06-01"]) expect(teaserShows(teaserOf(at), again, at)).toBe(false);
  });

  it("keeps the day and its two flags under one key, and reads anything else as never chosen", () => {
    expect(NOT_NOW_KEY).toBe("sd.timeline.notnow");
    const cases: NotNow[] = [first, { day: nodalNear, back: true, final: false }, { day: "2028-07-01", back: false, final: true }];
    for (const kept of cases) expect(parseNotNow(serializeNotNow(kept))).toEqual(kept);
    expect(serializeNotNow(first)).toBe('{"day":"2026-10-05"}');
    for (const raw of [null, "", "{", "[]", "null", '"2026-10-05"', '{"day":"soon"}', '{"back":true}']) expect(parseNotNow(raw)).toBeNull();
  });

  it("reads and keeps it through the browser's storage, and shows the teaser where storage refuses", () => {
    const held = new Map<string, string>();
    const store: NotNowStore = { getItem: (key) => held.get(key) ?? null, setItem: (key, value) => void held.set(key, value) };
    expect(readNotNow(store)).toBeNull();
    keepNotNow(first, store);
    expect(held.get(NOT_NOW_KEY)).toBe('{"day":"2026-10-05"}');
    expect(readNotNow(store)).toEqual(first);
    const refusing: NotNowStore = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readNotNow(refusing)).toBeNull();
    expect(() => keepNotNow(first, refusing)).not.toThrow();
    expect(readNotNow(null)).toBeNull();
  });

  it("counts a year on the calendar, a 29 February landing on the 28th", () => {
    expect(yearsOn("2026-10-05", 1)).toBe("2027-10-05");
    expect(yearsOn("2028-02-29", 1)).toBe("2029-02-28");
    expect(yearsOn("2024-02-29", 4)).toBe("2028-02-29");
    expect(yearsOn("2026-10-05", -1)).toBe("2025-10-05");
  });
});

describe("Not now's return, at its edges", () => {
  // Only `on` matters to the rule; these are days, not placements.
  const cyclesOn = (...days: string[]) => ({ cycles: days.map((on) => ({ on })) });
  const pressed = notNowPressed(null, "2027-03-10");

  it("counts a cycle exactly a year away on the day it was pressed as a year away, and exactly a year away today as not yet under a year", () => {
    const teaser = cyclesOn("2028-03-10");
    expect(teaserShows(teaser, pressed, "2027-03-10")).toBe(false);
    expect(teaserShows(teaser, pressed, "2027-03-11")).toBe(true);
  });

  it("never brings it back for a cycle that was a day under a year away when it was pressed", () => {
    const teaser = cyclesOn("2028-03-09");
    for (const today of ["2027-03-10", "2027-09-01", "2028-03-08"]) expect(teaserShows(teaser, pressed, today), today).toBe(false);
  });

  it("is brought back by any one of the cycles, not only the first", () => {
    expect(teaserShows(cyclesOn("2026-01-01", "2034-01-01", "2028-03-20"), pressed, "2027-03-25")).toBe(true);
    expect(teaserShows(cyclesOn("2026-01-01", "2034-01-01", "2040-03-20"), pressed, "2027-03-25")).toBe(false);
  });

  it("hides it where the API lists no cycle, and while the reader's clock reads a day before they pressed", () => {
    expect(teaserShows(cyclesOn(), pressed, "2030-01-01")).toBe(false);
    expect(teaserShows(cyclesOn("2028-03-20"), pressed, "2027-03-09")).toBe(false);
    expect(teaserShows(cyclesOn(), null, "2030-01-01")).toBe(true);
  });

  it("keeps a final Not now hidden whatever the cycles and the day, and a come-back one shown", () => {
    const soon = cyclesOn("2027-04-01");
    expect(teaserShows(soon, { day: "2027-03-10", back: true, final: true }, "2027-03-20")).toBe(false);
    expect(teaserShows(cyclesOn(), { day: "2027-03-10", back: true, final: false }, "2027-03-20")).toBe(true);
  });

  it("walks the whole rule: shown, Not now, hidden, back once, Not now again, hidden for good", () => {
    let kept: NotNow | null = null;
    const teaser = cyclesOn("2028-06-01", "2035-08-01");
    expect(teaserShows(teaser, kept, "2026-10-05")).toBe(true);
    kept = notNowPressed(kept, "2026-10-05");
    expect(teaserShows(teaser, kept, "2027-05-31")).toBe(false);
    const shows = teaserShows(teaser, kept, "2027-06-02");
    expect(shows).toBe(true);
    kept = cameBack(kept, shows) ?? kept;
    expect(kept.back).toBe(true);
    expect(teaserShows(teaser, kept, "2030-01-01")).toBe(true);
    kept = notNowPressed(kept, "2030-01-01");
    expect(kept).toEqual({ day: "2030-01-01", back: false, final: true });
    expect(teaserShows(teaser, kept, "2035-01-01")).toBe(false);
  });

  it("keeps a day and two flags and nothing else, even handed more: no chart data, name, age or date of birth reaches the key", () => {
    const loaded = { ...pressed, name: "Mira", birthDate: "1991-03-14", saturn: { age: 29 }, cycles: [{ on: "2028-06-01" }] } as NotNow;
    const raw = serializeNotNow(loaded);
    expect(raw).toBe('{"day":"2027-03-10"}');
    expect(Object.keys(JSON.parse(serializeNotNow({ day: "2027-03-10", back: true, final: true })))).toEqual(["day", "back", "final"]);
    const parsed = parseNotNow('{"day":"2027-03-10","back":true,"name":"Mira","birthDate":"1991-03-14"}');
    expect(parsed).toEqual({ day: "2027-03-10", back: true, final: false });
  });

  it("reads a flag only when it is the boolean true", () => {
    for (const bad of ['"true"', "1", "null", '"yes"']) {
      expect(parseNotNow(`{"day":"2027-03-10","back":${bad},"final":${bad}}`)).toEqual({ day: "2027-03-10", back: false, final: false });
    }
  });

  it("has a status for no cycles at all, and the past title where all are past", () => {
    expect(teaserStatuses([], "2027-03-10")).toEqual([]);
    expect(teaserStatuses([{ on: "2027-03-10" }], "2027-03-10")).toEqual(["now"]);
    expect(teaserStatuses([{ on: "2027-03-11" }], "2027-03-10")).toEqual(["ahead"]);
    expect(teaserStatuses([{ on: "2027-03-09" }], "2027-03-10")).toEqual(["past"]);
  });
});
