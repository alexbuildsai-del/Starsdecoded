/**
 * The Compatibility report's loading story (compatibility-loading-story): the step table's times, two plates never
 * joined, no word that says what the charts mean, a plate with no birth time drawn without horizon or house, and
 * the facts the story states for Mira and Tomás. The charts are the engine's, computed here from the sample people's
 * birth data; the expected rows are the artifact's, which the engine computed on 2026-10-06.
 */
import { describe, expect, it } from "vitest";
import { chartOf } from "@/site/lib/chart";
import { HOUSES } from "@/lib/houses";
import type { Progress } from "@/lib/progress";
import { SIGN_ORDER } from "@/components/chart/wheel-geometry";
import {
  HOUSE_S, PAIR_STAGE, PAIR_STEPS_S, PAIR_STILL_S, bornLater, kmApart, pairFrameAt, pairView,
  type PairFrame, type PairInput, type PairPlate, type PairView,
} from "@/lib/pair-story";
import mira from "../../../fixtures/sample-people/mira.json";
import tomas from "../../../fixtures/sample-people/tomas.json";

type Fixture = typeof mira;

function storyOf(f: Fixture, place: string, time: string | null, rough?: number): PairInput["a"] {
  const chart = chartOf({
    birthDate: f.birthDate,
    birthTime: time ?? "12:00",
    latitude: f.latitude,
    longitude: f.longitude,
    timezone: f.timezone,
    timezoneOffset: f.timezoneOffset,
    // An unknown time is kept at noon with the whole day's window, as the app stores it.
    birthTimeWindowMinutes: rough ?? (time === null ? 720 : 0),
  });
  return { chart, birth: { lat: f.latitude, lon: f.longitude, place, date: f.birthDate, time, ...(rough ? { rough: true } : {}) } };
}

const MIRA = storyOf(mira, "Lisbon, Portugal", "07:40");
const KNOWN: PairInput = { a: MIRA, b: storyOf(tomas, "Madrid, Spain", "22:15"), names: [mira.name, tomas.name] };
const BLIND: PairInput = { a: MIRA, b: storyOf(tomas, "Madrid, Spain", null), names: [mira.name, tomas.name] };
// A time given with a 120-minute window reaches the story as no time, marked rough (MB-235).
const ROUGH: PairInput = { a: MIRA, b: storyOf(tomas, "Madrid, Spain", null, 120), names: [mira.name, tomas.name] };

const progress = (over: Partial<Progress> = {}): Progress => ({
  real: 30, shown: 31, label: "Writing your report", next: 40, door: false, complete: false, failed: false, ...over,
});
const WRITING = progress();
const DOOR = progress({ real: 70, shown: 70, next: 80, door: true });
const DONE = progress({ real: 100, shown: 100, label: "Ready", next: 100, door: true, complete: true });
const FAILED = progress({ failed: true });

const TIMES = Array.from({ length: 401 }, (_, i) => i * 0.25);
const VIEWS: readonly PairView[] = ["phone", "desktop"];
const CASES = { "both times known": KNOWN, "Tomás's time not known": BLIND } as const;

const framesOf = (input: PairInput, view: PairView, p: Progress = WRITING): PairFrame[] => TIMES.map((t) => pairFrameAt(t, input, p, view));
const ALL = Object.entries(CASES).flatMap(([name, input]) => VIEWS.map((view) => ({ name, input, view, frames: framesOf(input, view) })));

const at = (t: number, input: PairInput = KNOWN, p: Progress = WRITING) => pairFrameAt(t, input, p);
const plateOf = (f: PairFrame, person: 0 | 1): PairPlate | undefined => f.stage.plates.find((p) => p.person === person);
const litSigns = (p: PairPlate | undefined) => (p ? p.sectors.filter((s) => s.lit).map((s) => s.sign) : []);
const ascSign = (input: PairInput["a"]) => SIGN_ORDER.indexOf(input.chart.angles!.ascendant.sign as (typeof SIGN_ORDER)[number]);

/** Every point a plate's paths, ticks, bodies and marker reach, in the stage's units. */
function pointsOf(p: PairPlate): [number, number][] {
  const pairs = (d: string) => {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    return Array.from({ length: n.length / 2 }, (_, i): [number, number] => [n[2 * i], n[2 * i + 1]]);
  };
  return [
    ...p.sectors.flatMap((s) => pairs(s.d)),
    ...p.sectors.map((s): [number, number] => [s.x, s.y]),
    ...p.ticks.flatMap((t): [number, number][] => [[t.x1, t.y1], [t.x2, t.y2]]),
    ...p.bodies.flatMap((b) => (b.kind === "arc" ? pairs(b.d) : [[b.x, b.y] as [number, number]])),
    ...(p.marker ? [[p.marker.x - p.marker.tail, p.marker.y] as [number, number], [p.marker.x, p.marker.y] as [number, number]] : []),
  ];
}

/** Every word a frame shows; path data carries none. */
function wordsOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => wordsOf(v, out));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) if (key !== "d" && key !== "grid" && key !== "land") wordsOf(v, out);
  }
  return out;
}

const FORBIDDEN = ["easy", "tension", "comes naturally", "challenge"] as const;
/** Anywhere in a line, in any case: a word after a name or a comma counts as much as one that opens it (R16-21). */
const interpreting = (line: string): string[] => FORBIDDEN.filter((w) => line.toLowerCase().includes(w));

describe("the step table", () => {
  it("starts each step at its second and holds the last", () => {
    expect(PAIR_STEPS_S).toEqual([0, 13, 17, 24, 30, 96]);
    expect(HOUSE_S).toBe(5.5);
    PAIR_STEPS_S.forEach((s, i) => {
      expect(at(s).step).toBe(i);
      if (i > 0) expect(at(s - 0.01).step).toBe(i - 1);
    });
    expect(PAIR_STEPS_S.map((s) => at(s).id)).toEqual(["places", "first-sky", "second-sky", "side-by-side", "houses", "writing"]);
  });

  it("titles each step as the table does, one at a time", () => {
    const settled = PAIR_STEPS_S.map((s) => at(s + 1.5).caption);
    expect(settled.map((c) => c.title)).toEqual([
      "Where you were each born",
      "The sky when Tomás was born",
      "The sky when Mira was born",
      "Your two charts, side by side",
      "Reading your houses, side by side",
      "Now writing your report",
    ]);
    expect(settled.map((c) => c.counter)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `Step ${n} of 6`));
    expect(settled.every((c) => c.opacity === 1)).toBe(true);
    // The old title fades out before the new one comes in.
    expect(at(17.2).caption).toMatchObject({ title: "The sky when Tomás was born", counter: "Step 2 of 6" });
    expect(at(17.2).caption.opacity).toBeLessThan(1);
  });

  it("lights houses 1 to 12 together on both plates, 5.5 s each, from 30 to 96", () => {
    for (let j = 0; j < 12; j++) {
      const f = at(PAIR_STEPS_S[4] + j * HOUSE_S + HOUSE_S / 2);
      expect(litSigns(plateOf(f, 0))).toEqual([(ascSign(KNOWN.a) + j) % 12]);
      expect(litSigns(plateOf(f, 1))).toEqual([(ascSign(KNOWN.b) + j) % 12]);
      const { n, word, object } = HOUSES[j];
      expect(f.detail).toMatchObject({ kind: "house", house: n, word, object, label: `House ${n} · ${object}` });
    }
    expect(at(30.5).detail).toMatchObject({ rows: ["Mira: Aries · Mercury and Venus", "Tomás: Gemini · no planets"] });
    expect(at(38).detail).toMatchObject({ rows: ["Mira: Taurus · no planets", "Tomás: Cancer · Jupiter"] });
    expect(at(49).detail).toMatchObject({ rows: ["Mira: Cancer · no planets", "Tomás: Virgo · Mercury"] });
    expect(at(55).detail).toMatchObject({ rows: ["Mira: Leo · Jupiter", "Tomás: Libra · Sun and Mars"] });
    expect(at(95.9).detail).toMatchObject({ house: 12 });
  });

  it("keeps all twelve words quiet on each plate, the lit one in full", () => {
    const f = at(40);
    for (const plate of f.stage.plates) {
      expect(plate.sectors).toHaveLength(12);
      for (const s of plate.sectors) {
        expect(s.words).toHaveLength(1);
        expect(s.words[0].opacity).toBe(s.lit ? 1 : 0.62);
      }
    }
    expect(plateOf(f, 0)!.sectors.map((s) => s.words[0].text).sort()).toEqual(HOUSES.map((h) => h.word).sort());
  });

  it("holds still once played, its words following the report", () => {
    const still = at(PAIR_STILL_S);
    for (const t of [PAIR_STILL_S + 0.5, 120, 600, Infinity]) expect(at(t)).toEqual(still);
    expect(still.caption).toMatchObject({ title: "Now writing your report", subtitle: "It opens here when it's ready.", opacity: 1 });
    expect(still.detail).toBeNull();
    expect(still.stage.plates.flatMap((p) => p.sectors).some((s) => s.lit)).toBe(false);
    expect(at(PAIR_STILL_S, KNOWN, DOOR).caption.subtitle).toBe("The first chapters are in.");
    expect(at(PAIR_STILL_S, KNOWN, DONE).caption).toMatchObject({ title: "Your report is ready", subtitle: "Tap Start reading to open it." });
    expect(at(PAIR_STILL_S, KNOWN, FAILED).caption).toMatchObject({ title: "Your two charts, side by side", subtitle: null });
  });
});

describe.each(ALL)("$name on the $view view", ({ input, view, frames }) => {
  it("draws in its view's stage box", () => {
    expect(frames.every((f) => f.stage.w === PAIR_STAGE[view].w && f.stage.h === PAIR_STAGE[view].h)).toBe(true);
  });

  // About two hundred thousand points are checked per view, so the faults are gathered and asserted once.
  it("never joins the two plates: no plate shared, no mark of one inside the other, one horizon through both", () => {
    const joins: string[] = [];
    frames.forEach((f, k) => {
      const when = `${TIMES[k]} s`;
      // The stage holds plates, one horizon, the point on it, the globe and text: there is no kind of mark that links.
      const kinds = Object.keys(f.stage).sort().join(" ");
      if (kinds !== "centre globe h horizon plates texts w") joins.push(`${when}: the stage holds ${kinds}`);
      const plates = f.stage.plates;
      if (new Set(plates.map((p) => p.person)).size !== plates.length) joins.push(`${when}: one person has two plates`);
      for (const p of plates) {
        for (const q of plates) {
          if (p === q) continue;
          if (Math.hypot(p.cx - q.cx, p.cy - q.cy) <= p.r + q.r) joins.push(`${when}: the plates touch`);
          const inside = pointsOf(p).filter(([x, y]) => Math.hypot(x - q.cx, y - q.cy) <= q.r).length;
          if (inside > 0) joins.push(`${when}: ${inside} of plate ${p.person}'s points inside plate ${q.person}`);
        }
      }
      const horizon = f.stage.horizon;
      if (horizon && plates.some((p) => p.cy !== horizon.y)) joins.push(`${when}: a plate off the horizon`);
      if (f.stage.globe && plates.length > 1) joins.push(`${when}: the globe over two plates`);
    });
    expect(joins).toEqual([]);
  });

  it("says nothing about what the charts mean, anywhere in a line", () => {
    const writing = [WRITING, DOOR, DONE, FAILED].map((p) => pairFrameAt(PAIR_STILL_S, input, p, view));
    const lines = [...frames, ...writing].flatMap((f) => wordsOf(f));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((line) => interpreting(line).length > 0)).toEqual([]);
  });

  it("draws a plate with no birth time without horizon or house", () => {
    for (const f of frames) {
      for (const p of f.stage.plates) {
        const chart = p.person === 0 ? input.a.chart : input.b.chart;
        if (chart.angles) continue;
        expect(p.marker).toBeNull();
        expect(p.shade).toBeNull();
        expect(p.overHorizon).toBe(true);
        for (const s of p.sectors) for (const w of s.words) expect(SIGN_ORDER).toContain(w.text);
      }
    }
  });
});

describe("Tomás with no birth time", () => {
  const blind = (t: number) => pairFrameAt(t, BLIND, WRITING);

  it("reads signs, not houses, on both plates", () => {
    const f = blind(40);
    expect(f.caption).toMatchObject({
      title: "Reading your signs, side by side",
      subtitle: "One sign at a time, on both charts. Tomás has no birth time, so we read signs, not houses.",
    });
    expect(f.detail).toMatchObject({ kind: "house", house: null, object: null, label: "Sign 2 of 12", word: "Taurus" });
    expect(f.detail).toMatchObject({ rows: ["Mira: Taurus · no planets", "Tomás: Taurus · no planets"] });
    expect(litSigns(plateOf(f, 0))).toEqual([1]);
    expect(litSigns(plateOf(f, 1))).toEqual([1]);
    const scorpio = blind(30 + 7 * HOUSE_S + 1).detail;
    expect(scorpio).toMatchObject({ word: "Scorpio", rows: ["Mira: Scorpio · Pluto", "Tomás: Scorpio · Moon, Venus and Pluto"] });
  });

  it("draws his Moon as its day's arc, and Mira's plate keeps its horizon", () => {
    const f = blind(PAIR_STILL_S);
    expect(plateOf(f, 1)!.bodies.find((b) => b.key === "moon")).toMatchObject({ kind: "arc" });
    expect(plateOf(f, 0)!.marker).not.toBeNull();
    expect(f.stage.horizon).not.toBeNull();
    expect(f.stage.texts.map((x) => x.text)).toContain("Rising Not drawn");
    expect(blind(26.5).caption.subtitle).toBe("Mira's chart turns to its rising sign. Tomás has no birth time, so no horizon.");
  });
});

describe("Tomás with a rough birth time", () => {
  const rough = (t: number) => pairFrameAt(t, ROUGH, WRITING);

  it("says the time is rough, and that we skip the rising sign, then that we read signs", () => {
    expect(rough(26.5).caption.subtitle).toBe("Mira's chart turns to its rising sign. Tomás's birth time is rough, so we skip the rising sign.");
    expect(rough(40).caption.subtitle).toBe("One sign at a time, on both charts. Tomás's birth time is rough, so we read signs, not houses.");
  });

  it("leaves a time nobody gave as it was", () => {
    expect(BLIND.b.birth.rough).toBeUndefined();
    expect(pairFrameAt(26.5, BLIND, WRITING).caption.subtitle).toContain("Tomás has no birth time, so no horizon.");
  });
});

describe("the facts for Mira and Tomás", () => {
  it("measures the distance on the great circle in whole km", () => {
    expect(kmApart(KNOWN.a.birth, KNOWN.b.birth)).toBe(502);
    expect(kmApart(KNOWN.b.birth, KNOWN.a.birth)).toBe(502);
    expect(at(5).caption.subtitle).toBe("Two places, 502 km apart.");
    const g = at(10.5);
    expect(g.detail).toMatchObject({ kind: "lines", lines: [
      { text: "Madrid · 2 October 1989 · Tomás", role: "place" },
      { text: "Lisbon · 14 March 1991 · Mira", role: "place" },
      { text: "502 km apart", role: "distance" },
    ] });
    expect(g.stage.globe?.places).toHaveLength(2);
    expect(g.stage.texts).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Lisbon", anchor: "end" }),
      expect.objectContaining({ text: "Madrid", anchor: "start" }),
    ]));
  });

  it("counts the gap between the birthdays in calendar years, months and days", () => {
    expect(bornLater("1989-10-02", "1991-03-14")).toEqual({ years: 1, months: 5, days: 12 });
    expect(bornLater("1991-03-14", "1989-10-02")).toEqual({ years: 1, months: 5, days: 12 });
    expect(at(20).caption.title).toBe("The sky when Mira was born");
    expect(at(20).caption.subtitle).toBe("Mira was born 1 year, 5 months and 12 days later.");
  });

  it("counts on real dates only, never a rolled-over one (R16-05)", () => {
    expect(bornLater("2000-01-31", "2000-03-01")).toEqual({ years: 0, months: 1, days: 1 });
    expect(bornLater("2001-01-31", "2001-02-28")).toEqual({ years: 0, months: 1, days: 0 });
    expect(bornLater("2000-02-29", "2001-02-28")).toEqual({ years: 1, months: 0, days: 0 });
    expect(bornLater("2000-03-31", "2000-04-29")).toEqual({ years: 0, months: 0, days: 29 });
    expect(bornLater("1999-12-31", "2000-01-01")).toEqual({ years: 0, months: 0, days: 1 });
    expect(() => bornLater("1991-02-30", "1991-03-14")).toThrow(RangeError);
    expect(() => bornLater("1991-02-29", "1991-03-14")).toThrow(RangeError);
    const unreal = { ...KNOWN, a: { ...KNOWN.a, birth: { ...KNOWN.a.birth, date: "1991-02-30" } } };
    expect(at(20, unreal).caption.subtitle).toBeNull();
  });

  it("says when two people share a place and a day", () => {
    const twin = storyOf(mira, "Lisbon, Portugal", "07:52");
    const twins: PairInput = { a: twin, b: MIRA, names: ["Ana Costa", mira.name] };
    expect(at(5, twins).caption.subtitle).toBe("You were both born in Lisbon.");
    expect(at(15, twins).caption.title).toBe("The sky when Mira was born");
    expect(at(20, twins).caption).toMatchObject({ title: "The sky when Ana was born", subtitle: "You were both born on the same day." });
    expect(at(10.5, twins).detail).toMatchObject({ lines: [{ role: "place" }, { role: "place" }] });
  });

  it("settles the first sky on the first-born's own plate, then fades the second in on the other", () => {
    const first = at(14.5);
    expect(first.stage.plates.map((p) => p.person)).toEqual([1]);
    expect(first.stage.plates[0].cx).toBe(PAIR_STAGE.phone.w / 2);
    const settled = at(20);
    expect(settled.stage.plates.map((p) => [p.person, p.cx])).toEqual([[1, 270]]);
    expect(at(23).stage.plates.map((p) => [p.person, p.cx])).toEqual([[0, 90], [1, 270]]);
  });
});

it("picks the desktop layout for a stage more than twice as wide as it is tall", () => {
  expect(pairView(358, 354)).toBe("phone");
  expect(pairView(736, 430)).toBe("phone");
  expect(pairView(968, 378)).toBe("desktop");
});
