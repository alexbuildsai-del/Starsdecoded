/**
 * The Saturn-return finder (R16-16; timeline-page §3, acceptance 2 and 4; Timeline acceptance 8). From a birth date
 * at midday the finder gives the engine's own cycles for every fixture, and Mira's answer exactly as the build worked
 * it out for the page to open on; then what the big ring and the four cards pick from them, read from the component's
 * pure parts without rendering it (MB-47). No date or age the engine computes is typed here.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CYCLE_WORDS,
  KNOWN_AGES,
  calculateNatalChart,
  lifeCycles,
  natalLongitudes,
  noonLongitudes,
  noonOf,
  roundProgress,
} from "@workspace/engine";
import { FINDER_CARDS, finderCards, saturnLines, saturnRing } from "@/site/components/CycleFinder";
import { MIRA, MIRA_WEEK } from "@/site/data/timeline/mira";
import type { CycleView } from "@/lib/life-view";
import { FINDER_IDS, findCycles } from "./finder";

interface Fixture {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
}

const FIXTURES = ["charts", "sample-people"].flatMap((folder) =>
  readdirSync(new URL(`../../../../fixtures/${folder}/`, import.meta.url))
    .filter((file) => file.endsWith(".json"))
    .map((file) => `${folder}/${file.slice(0, -".json".length)}`),
);
const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../../../../fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

const DAY_MS = 86_400_000;
const SLOW = 120_000;
const utcDay = (at: Date) => at.toISOString().slice(0, 10);
const noon = (day: string) => new Date(`${day}T12:00:00Z`);
const shift = (day: string, days: number) => utcDay(new Date(noon(day).getTime() + days * DAY_MS));
const seen = (cycles: readonly CycleView[], today: string): CycleView[] => cycles.map((cycle) => ({ ...cycle, today }));

// The page's own day for Mira, so the answers below are the ones her example shows.
const TODAY = MIRA_WEEK.week;
const NOW = noon(TODAY);

describe("the finder's answer is the engine's, from midday on the birth date", () => {
  it("names the four known ages, in Life's order, and a card for each", () => {
    expect(FINDER_IDS).toEqual(KNOWN_AGES.map((age) => age.id));
    expect(FINDER_CARDS.map((card) => card.id)).toEqual([...FINDER_IDS]);
    for (const card of FINDER_CARDS) expect(card.why.length).toBeGreaterThan(0);
  });

  it("gives every cycle lifeCycles finds, with its days, ages, passes and words, for every fixture", () => {
    expect(FIXTURES.length).toBeGreaterThan(5);
    for (const name of FIXTURES) {
      const { birthDate } = fixture(name);
      const natal = noonLongitudes(birthDate);
      const engine = lifeCycles(natal, noonOf(birthDate), { ids: [...FINDER_IDS] });
      const found = findCycles(birthDate, TODAY, NOW);
      expect(found.map((c) => c.key), name).toEqual(engine.map((c) => c.key));
      found.forEach((cycle, i) => {
        const truth = engine[i];
        const what = `${name} ${truth.key}`;
        expect(cycle.id, what).toBe(truth.id);
        expect(cycle.age, what).toBe(truth.age);
        expect(cycle.exact, what).toEqual(truth.window.exact.map(utcDay));
        expect([cycle.start, cycle.end], what).toEqual([utcDay(truth.window.start), utcDay(truth.window.end)]);
        expect(cycle.repeats, what).toBe(truth.repeats);
        expect({ name: cycle.name, word: cycle.word }, what).toEqual(CYCLE_WORDS[truth.id]);
        expect(cycle.today, what).toBe(TODAY);
        const same = engine.filter((c) => c.id === truth.id);
        expect(cycle.ages, what).toEqual(same.map((c) => c.age));
        const before = same[same.indexOf(truth) - 1];
        expect(cycle.last, what).toEqual(before ? { on: utcDay(before.window.exact[0] ?? before.window.start), age: before.age } : null);
        const body = KNOWN_AGES.find((age) => age.id === truth.id)!.body;
        expect(Math.abs(cycle.progress! - roundProgress(body, natal[body]!, NOW)), what).toBeLessThanOrEqual(0.0005);
      });
    }
  }, SLOW);

  it("dates each cycle in the month the full chart does, so a birth date alone says what Timeline would", () => {
    for (const name of FIXTURES) {
      const f = fixture(name);
      const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
      const full = lifeCycles(natalLongitudes(chart), new Date(chart.datetimeUtc), { ids: [...FINDER_IDS] });
      const found = findCycles(f.birthDate, TODAY, NOW);
      expect(found.map((c) => [c.id, c.exact.length]), name).toEqual(full.map((c) => [c.id, c.window.exact.length]));
      found.forEach((cycle, i) => {
        cycle.exact.forEach((day, k) => {
          const off = Math.abs(noon(day).getTime() - full[i].window.exact[k].getTime()) / DAY_MS;
          expect(off, `${name} ${full[i].key}: pass ${k + 1} is ${off.toFixed(1)} days off`).toBeLessThanOrEqual(31);
        });
      });
    }
  }, SLOW);

  it("gives Mira's answer exactly as the build worked it out, so typing her date shows what the page opened on", () => {
    expect(findCycles(MIRA.finder.birthDate, TODAY, NOW)).toEqual(MIRA.finder.cycles);
  });

  it("counts from the reader's day and puts each planet where it is now", () => {
    const later = new Date(NOW.getTime() + 400 * DAY_MS);
    const day = utcDay(later);
    const found = findCycles(MIRA.finder.birthDate, day, later);
    const natal = noonLongitudes(MIRA.finder.birthDate);
    for (const cycle of found) {
      expect(cycle.today).toBe(day);
      const body = KNOWN_AGES.find((age) => age.id === cycle.id)!.body;
      expect(Math.abs(cycle.progress! - roundProgress(body, natal[body]!, later))).toBeLessThanOrEqual(0.0005);
    }
  });
});

describe("what the finder shows from an answer", () => {
  const cycles = MIRA.finder.cycles;
  const returns = cycles.filter((c) => c.id === "saturn-return");
  const [first, second] = returns;
  const last = returns[returns.length - 1];

  it("rings the first Saturn return while it is ahead, and says when it is under way", () => {
    const young = saturnRing(seen(cycles, shift(first.start, -1)))!;
    expect(young).toMatchObject({ age: first.age, label: "at your Saturn return" });
    expect(saturnRing(seen(cycles, first.start))).toMatchObject({ age: first.age, label: "your Saturn return is now" });
    expect(saturnRing(seen(cycles, first.end))).toMatchObject({ age: first.age, label: "your Saturn return is now" });
  });

  it("rings the next one once the first is behind, and the last when none is left", () => {
    expect(saturnRing(seen(cycles, shift(first.end, 1)))).toMatchObject({ age: second.age, label: "at your next Saturn return" });
    expect(saturnRing(seen(cycles, shift(last.end, 1)))).toMatchObject({ age: last.age, label: "at your last Saturn return" });
  });

  it("draws the ring with Saturn's way round today", () => {
    const ring = saturnRing(cycles)!;
    expect(ring.progress).toBe(returns[0].progress);
    expect(ring.progress).toBeGreaterThan(0);
    expect(ring.progress).toBeLessThan(1);
  });

  it("dates the first two Saturn returns under the ring", () => {
    expect(saturnLines(cycles).map((c) => c.key)).toEqual(returns.slice(0, 2).map((c) => c.key));
  });

  it("has nothing to ring for an answer with no Saturn return", () => {
    expect(saturnRing(cycles.filter((c) => c.id !== "saturn-return"))).toBeNull();
  });

  it("cards the first Saturn return and the one Uranus opposition, and the next Jupiter and nodal returns", () => {
    const cards = finderCards(cycles);
    expect(cards.map((c) => c.id)).toEqual(FINDER_CARDS.map((card) => card.id));
    const of = (id: string) => cycles.filter((c) => c.id === id);
    expect(cards[0].key).toBe(of("saturn-return")[0].key);
    expect(cards[3].key).toBe(of("uranus-opposition")[0].key);
    for (const [i, id] of [[1, "jupiter-return"], [2, "node-return"]] as const) {
      const next = of(id).find((c) => c.end >= c.today);
      expect(cards[i].key, id).toBe((next ?? of(id)[of(id).length - 1]).key);
      expect(cards[i].end >= cards[i].today, `${id} is under way or ahead on her day`).toBe(true);
    }
    cards.forEach((card, i) => {
      expect(card.why).toBe(FINDER_CARDS[i].why);
      expect(card.ages).toEqual(of(card.id).map((c) => c.age));
    });
  });

  it("cards the last Jupiter and nodal returns once every one is behind", () => {
    const after = shift(cycles.reduce((end, c) => (c.end > end ? c.end : end), ""), 1);
    const cards = finderCards(seen(cycles, after));
    for (const id of ["jupiter-return", "node-return"]) {
      const of = cycles.filter((c) => c.id === id);
      expect(cards.find((c) => c.id === id)!.key, id).toBe(of[of.length - 1].key);
    }
  });
});

describe("the engine runs only once a full date is typed", () => {
  it("is fetched by the finder when a date comes in, never imported for its first render", () => {
    const source = readFileSync(new URL("../components/CycleFinder.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/^import [^;]*from "(@\/site\/lib\/finder|\.\.\/lib\/finder)";$/m);
    expect(source.match(/import\("@\/site\/lib\/finder"\)/g)).toHaveLength(1);
    const engine = [...source.matchAll(/^import (type )?[^;]*from "@workspace\/engine";$/gm)];
    expect(engine.length).toBe(1);
    expect(engine[0][1]).toBe("type ");
  });
});
