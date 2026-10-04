/**
 * The Saturn-return finder at its edges (R16-16; timeline-page §3, acceptance 2; ADR-251): a birth date the field takes
 * and one it does not, the oldest and newest dates, a leap day, and the shape every answer keeps. `finder.test.ts` holds
 * the engine agreement per fixture.
 */
import { describe, expect, it } from "vitest";
import { CYCLE_WORDS } from "@workspace/engine";
import type { CycleView } from "@/lib/life-view";
import { FINDER_CARDS, finderCards, saturnLines, saturnRing } from "@/site/components/CycleFinder";
import { FINDER_IDS, findCycles } from "./finder";

const NOW = new Date("2026-10-05T12:00:00Z");
const TODAY = "2026-10-05";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

describe("a date the field would not send", () => {
  it("is a RangeError, never a made-up answer", () => {
    for (const bad of ["", "garbage", "2026-02-30", "2026-13-01", "2026-00-10", "2026-1-1", "20260101", "01/01/2026", "2026-01-01T00:00:00Z", " 2026-01-01", "2026-04-31", "2027-02-29"]) {
      expect(() => findCycles(bad, TODAY, NOW), JSON.stringify(bad)).toThrow(RangeError);
    }
  });
});

describe("the dates the field takes, at its edges", () => {
  it("answers on the oldest date the field allows and on the reader's own day", () => {
    for (const birth of ["1900-01-01", "1900-12-31", TODAY, "2026-10-04"]) {
      const found = findCycles(birth, TODAY, NOW);
      expect(found.length, birth).toBeGreaterThan(0);
      for (const cycle of found) {
        expect(Number.isFinite(cycle.progress ?? 0), `${birth} ${cycle.key}`).toBe(true);
        expect(cycle.progress ?? 0).toBeGreaterThanOrEqual(0);
        expect(cycle.progress ?? 0).toBeLessThanOrEqual(1);
      }
    }
  });

  it("answers a leap-day birth and a birth on the first or last day of a year", () => {
    for (const birth of ["2000-02-29", "1996-02-29", "1900-01-01", "1999-12-31", "2000-01-01"]) {
      const found = findCycles(birth, TODAY, NOW);
      expect(new Set(found.map((c) => c.id))).toEqual(new Set(FINDER_IDS));
      for (const cycle of found) for (const day of [...cycle.exact, cycle.start, cycle.end]) expect(day, `${birth} ${cycle.key}`).toMatch(DAY);
    }
  });

  it("does not throw for a date after the reader's day, which the field refuses before it gets here", () => {
    const found = findCycles("2030-01-01", TODAY, NOW);
    expect(found.length).toBeGreaterThan(0);
    for (const cycle of found) expect(cycle.progress ?? 0).toBeGreaterThanOrEqual(0);
  });
});

describe("the shape every answer keeps", () => {
  const BIRTHS = ["1991-03-14", "1900-01-01", "1975-07-04", "2000-02-29", "1960-12-31"];

  it("holds the four kinds, oldest first, each as often as its planet comes round by 90", () => {
    for (const birth of BIRTHS) {
      const found = findCycles(birth, TODAY, NOW);
      expect([...new Set(found.map((c) => c.id))].sort(), birth).toEqual([...FINDER_IDS].sort());
      for (const id of FINDER_IDS) {
        const of = found.filter((c) => c.id === id);
        expect(of.length, `${birth} ${id}`).toBeGreaterThan(0);
        expect(of.map((c) => c.age), `${birth} ${id}: oldest first`).toEqual([...of.map((c) => c.age)].sort((a, b) => a - b));
        expect(new Set(of.map((c) => c.age)).size, `${birth} ${id}: an age once`).toBe(of.length);
        of.forEach((cycle, i) => {
          expect(cycle.ages).toEqual(of.map((c) => c.age));
          expect(cycle.last).toEqual(i === 0 ? null : { on: expect.stringMatching(DAY), age: of[i - 1].age });
        });
      }
    }
  });

  it("keeps its days in order inside a cycle: it opens, it is exact, it closes", () => {
    for (const birth of BIRTHS) {
      for (const cycle of findCycles(birth, TODAY, NOW)) {
        const what = `${birth} ${cycle.key}`;
        expect(cycle.start <= cycle.end, what).toBe(true);
        for (const day of cycle.exact) {
          expect(day, what).toMatch(DAY);
          expect(day >= cycle.start && day <= cycle.end, `${what}: ${day} is inside the window`).toBe(true);
        }
        expect([...cycle.exact].sort(), what).toEqual(cycle.exact);
        expect(cycle.name, what).toBe(CYCLE_WORDS[cycle.id].name);
        expect(cycle.word, what).toBe(CYCLE_WORDS[cycle.id].word);
        expect(cycle.why, what).toBeNull();
        expect(cycle.today, what).toBe(TODAY);
        expect(cycle.age, what).toBeGreaterThan(0);
        expect(cycle.age, what).toBeLessThanOrEqual(90 + 10);
      }
    }
  });

  it("gives the same answer twice, and is not changed by the reader's zone", () => {
    const first = findCycles("1991-03-14", TODAY, NOW);
    expect(findCycles("1991-03-14", TODAY, NOW)).toEqual(first);
    const was = process.env.TZ;
    try {
      for (const zone of ["Pacific/Kiritimati", "America/Los_Angeles", "Asia/Kolkata"]) {
        process.env.TZ = zone;
        expect(findCycles("1991-03-14", TODAY, NOW), zone).toEqual(first);
      }
    } finally {
      if (was === undefined) delete process.env.TZ;
      else process.env.TZ = was;
    }
  });

  it("counts the way round from the reader's now, not the clock: the same date at a later now has gone further", () => {
    const early = findCycles("1991-03-14", TODAY, NOW);
    const later = findCycles("1991-03-14", "2026-12-05", new Date("2026-12-05T12:00:00Z"));
    for (const id of FINDER_IDS) {
      const [a, b] = [early, later].map((cycles) => cycles.find((c) => c.id === id)!.progress!);
      expect(b, id).not.toBe(a);
    }
    expect(later[0].today).toBe("2026-12-05");
  });
});

describe("what the ring and the cards do with an answer that is short", () => {
  const made = (id: CycleView["id"], over: Partial<CycleView> = {}): CycleView => ({
    key: `cycle.${id}.20000101`, id, name: CYCLE_WORDS[id].name, word: CYCLE_WORDS[id].word, age: 29,
    exact: ["2020-06-01"], start: "2020-01-01", end: "2020-12-31", repeats: true, today: "2026-10-05", progress: 0.5, last: null, ages: [29], why: null, ...over,
  });

  it("has no ring and no card for no cycles", () => {
    expect(saturnRing([])).toBeNull();
    expect(saturnLines([])).toEqual([]);
    expect(finderCards([])).toEqual([]);
  });

  it("cards only the kinds it has, in the page's order", () => {
    const cards = finderCards([made("uranus-opposition"), made("saturn-return")]);
    expect(cards.map((c) => c.id)).toEqual(["saturn-return", "uranus-opposition"]);
    expect(finderCards([made("jupiter-return")]).map((c) => c.id)).toEqual(["jupiter-return"]);
  });

  it("draws a ring at nothing when Saturn's way round is unknown", () => {
    expect(saturnRing([made("saturn-return", { progress: null })])).toMatchObject({ age: 29, progress: 0 });
  });

  it("says a Saturn return is now on the day it opens and the day it closes, and behind the day after", () => {
    const at = (today: string) => saturnRing([made("saturn-return", { today })])!.label;
    expect(at("2019-12-31")).toBe("at your Saturn return");
    expect(at("2020-01-01")).toBe("your Saturn return is now");
    expect(at("2020-12-31")).toBe("your Saturn return is now");
    expect(at("2021-01-01")).toBe("at your last Saturn return");
  });

  it("cards each kind with the locked why line and every age its kind comes at", () => {
    const cycles = [made("saturn-return", { age: 29 }), made("saturn-return", { age: 58, key: "cycle.saturn-return.20300101" })];
    const [card] = finderCards(cycles);
    expect(card.why).toBe(FINDER_CARDS[0].why);
    expect(card.ages).toEqual([29, 58]);
    expect(card.age).toBe(29);
  });
});
