/**
 * The doctrine on four charts from 2026 to 2028: Marie Curie with her birth
 * time and without it, Audrey Hepburn, and Mira, the page's sample account.
 * Every contact is checked against the planets' own places day by day, so an
 * event the doctrine names is never missed and a day outside its orb never
 * counts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateNatalChart, hasHorizon, type NatalChartData } from "./chartCalculation.js";
import {
  DOCTRINE,
  inEffect,
  readsAs,
  skyEvents,
  type Aspect,
  type ContactBody,
  type ContactEvent,
  type EclipseEvent,
  type NatalTarget,
  type RetrogradeEvent,
  type SkyEvent,
} from "./doctrine.js";
import { toneOf } from "./tone.js";
import { eclipses, longitudeAt, speedAt, stations } from "./transits.js";

interface Fixture {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  timezoneOffset: number;
  birthTimeWindowMinutes?: number;
}

function chartOf(path: string): NatalChartData {
  const f = JSON.parse(readFileSync(new URL(`../../../fixtures/${path}.json`, import.meta.url), "utf8")) as Fixture;
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
}

const CHARTS: Record<string, NatalChartData> = {
  "marie-curie": chartOf("charts/marie-curie"),
  "marie-curie-unknown": chartOf("charts/marie-curie-unknown"),
  "audrey-hepburn": chartOf("charts/audrey-hepburn"),
  mira: chartOf("sample-people/mira"),
};

const DAY = 86_400_000;
const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2028-12-31T23:59:59Z");
const EVENTS: Record<string, SkyEvent[]> = Object.fromEntries(
  Object.entries(CHARTS).map(([name, chart]) => [name, skyEvents(chart, FROM, TO)]),
);

const contactsOf = (events: SkyEvent[]) => events.filter((e): e is ContactEvent => e.kind === "contact");
const retrogradesOf = (events: SkyEvent[]) => events.filter((e): e is RetrogradeEvent => e.kind === "retrograde");
const eclipsesOf = (events: SkyEvent[]) => events.filter((e): e is EclipseEvent => e.kind === "eclipse");

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const sep = (a: number, b: number) => {
  const d = norm(a - b);
  return d > 180 ? 360 - d : d;
};
const signOf = (lon: number) => Math.floor(norm(lon) / 30);
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function natalLon(chart: NatalChartData, target: NatalTarget): number {
  if (target === "ascendant" || target === "midheaven") return chart.angles![target].absoluteDegree;
  return chart.planets[target].absoluteDegree;
}

function targetsOf(chart: NatalChartData): NatalTarget[] {
  const timed: readonly NatalTarget[] = DOCTRINE.horizonTargets;
  return hasHorizon(chart) ? [...DOCTRINE.targets] : DOCTRINE.targets.filter((t) => !timed.includes(t));
}

/** How far the planet is from making the aspect exact, in degrees. */
function offBy(body: ContactBody, aspect: Aspect, natal: number, at: Date): number {
  return Math.abs(sep(longitudeAt(body, at), natal) - DOCTRINE.angles[aspect]);
}

const ymd = (at: Date) => at.toISOString().slice(0, 10).replace(/-/g, "");

for (const [name, chart] of Object.entries(CHARTS)) {
  const events = EVENTS[name];

  test(`${name}: only the doctrine's bodies, aspects, points and orbs, and nothing else`, () => {
    const targets = targetsOf(chart);
    assert.ok(contactsOf(events).length > 0, "some contact in three years");
    for (const event of events) assert.ok(["contact", "retrograde", "eclipse"].includes(event.kind));
    for (const c of contactsOf(events)) {
      assert.ok((DOCTRINE.bodies as readonly string[]).includes(c.body), c.key);
      assert.ok((DOCTRINE.aspects[c.body] as readonly string[]).includes(c.aspect), c.key);
      assert.ok(targets.includes(c.target), c.key);
      assert.equal(c.orb, DOCTRINE.orbs[c.body], c.key);
    }
    for (const r of retrogradesOf(events)) assert.ok((DOCTRINE.retrogrades as readonly string[]).includes(r.body), r.key);
    assert.ok(!JSON.stringify(events).includes("chiron"), "Chiron makes nothing (MB-189)");
    assert.ok(!JSON.stringify(events).includes("sextile"));
  });

  test(`${name}: every window is real, at the orb at its ends and exact at each pass`, () => {
    for (const c of contactsOf(events)) {
      const natal = natalLon(chart, c.target);
      const { start, end, exact } = c.window;
      assert.ok(start < end, c.key);
      assert.ok(start <= TO && end >= FROM, `${c.key} touches the range`);
      assert.ok(Math.abs(offBy(c.body, c.aspect, natal, start) - c.orb) < 0.01, `${c.key} enters at the orb`);
      assert.ok(Math.abs(offBy(c.body, c.aspect, natal, end) - c.orb) < 0.01, `${c.key} leaves at the orb`);
      for (const at of exact) {
        assert.ok(at >= start && at <= end, `${c.key} exact inside its window`);
        assert.ok(offBy(c.body, c.aspect, natal, at) < 0.01, `${c.key} exact at ${at.toISOString()}`);
      }
    }
  });

  test(`${name}: a day is in effect exactly when a planet is within orb of a point`, () => {
    const contacts = contactsOf(events);
    const targets = targetsOf(chart);
    for (let t = FROM.getTime(); t < TO.getTime(); t += DAY) {
      const day = new Date(t);
      const on = new Set(inEffect(contacts, day).map((c) => `${c.body} ${c.aspect} ${c.target}`));
      for (const body of DOCTRINE.bodies) {
        const first = longitudeAt(body, day);
        const last = longitudeAt(body, new Date(t + DAY - 60_000));
        for (const target of targets) {
          const natal = natalLon(chart, target);
          for (const aspect of DOCTRINE.aspects[body]) {
            const angle = DOCTRINE.angles[aspect];
            const off = Math.min(Math.abs(sep(first, natal) - angle), Math.abs(sep(last, natal) - angle));
            const orb = DOCTRINE.orbs[body];
            const label = `${body} ${aspect} ${target}`;
            if (off < orb - 0.01) assert.ok(on.has(label), `${name} ${day.toISOString().slice(0, 10)}: ${label} is on`);
            if (off > orb + 0.01) assert.ok(!on.has(label), `${name} ${day.toISOString().slice(0, 10)}: ${label} is off`);
          }
        }
      }
    }
  });

  test(`${name}: each retrograde runs from a station to the next, with the houses it moves back through`, () => {
    for (const r of retrogradesOf(events)) {
      const mid = new Date((r.start.getTime() + r.end.getTime()) / 2);
      assert.ok(speedAt(r.body, mid) < 0, `${r.key} moves backwards`);
      assert.ok(speedAt(r.body, new Date(r.start.getTime() - DAY)) > 0, `${r.key} was direct before`);
      assert.ok(speedAt(r.body, new Date(r.end.getTime() + DAY)) > 0, `${r.key} is direct after`);
      if (!hasHorizon(chart)) {
        assert.deepEqual(r.houses, [], `${r.key} has no house without a birth time`);
        continue;
      }
      const first = SIGNS.indexOf(chart.angles.ascendant.sign);
      assert.equal(r.houses[0], ((signOf(longitudeAt(r.body, r.start)) - first + 12) % 12) + 1, `${r.key} starts in its house`);
      assert.equal(r.houses.at(-1), ((signOf(longitudeAt(r.body, r.end)) - first + 12) % 12) + 1, `${r.key} ends in its house`);
      r.houses.slice(1).forEach((h, i) => assert.equal(h, ((r.houses[i] + 10) % 12) + 1, `${r.key} steps back a house at a time`));
    }
    for (const body of DOCTRINE.retrogrades) {
      const turns = stations(body, FROM, TO).filter((s) => s.turns === "retrograde");
      for (const s of turns) {
        assert.ok(
          retrogradesOf(events).some((r) => r.body === body && Math.abs(r.start.getTime() - s.at.getTime()) < 60_000),
          `${body} retrograde from ${s.at.toISOString()} is listed`,
        );
      }
    }
  });

  test(`${name}: every eclipse is listed, near a point only within 3°`, () => {
    const listed = eclipsesOf(events);
    assert.equal(listed.length, eclipses(FROM, TO).length);
    const targets = targetsOf(chart);
    for (const e of listed) {
      const closest = targets
        .map((target) => ({ target, orb: sep(e.eclipse.lon, natalLon(chart, target)) }))
        .sort((a, b) => a.orb - b.orb)[0];
      if (closest.orb <= DOCTRINE.eclipseNear) {
        assert.equal(e.near?.target, closest.target, e.key);
        assert.ok(Math.abs((e.near?.orb ?? Infinity) - closest.orb) < 0.006, e.key);
      } else assert.equal(e.near, null, e.key);
      if (hasHorizon(chart)) {
        const first = SIGNS.indexOf(chart.angles.ascendant.sign);
        assert.equal(e.house, ((signOf(e.eclipse.lon) - first + 12) % 12) + 1, e.key);
      } else assert.equal(e.house, null, e.key);
      const today = inEffect([e], new Date(Date.UTC(e.eclipse.at.getUTCFullYear(), e.eclipse.at.getUTCMonth(), e.eclipse.at.getUTCDate())));
      assert.equal(today.length, 1, `${e.key} is in effect on its day`);
    }
  });

  test(`${name}: a contact's house is its natal point's`, () => {
    for (const c of contactsOf(events)) {
      if (!hasHorizon(chart)) {
        assert.equal(c.house, null, c.key);
        continue;
      }
      const first = SIGNS.indexOf(chart.angles.ascendant.sign);
      const expected =
        c.target === "ascendant"
          ? 1
          : c.target === "midheaven"
            ? ((SIGNS.indexOf(chart.angles.midheaven.sign) - first + 12) % 12) + 1
            : chart.planets[c.target].house;
      assert.equal(c.house, expected, c.key);
    }
  });

  test(`${name}: tones from the table, readings as reading 7, keys as reading 5`, () => {
    const keys = new Set<string>();
    for (const event of events) {
      assert.equal(event.tone, toneOf(event), event.key);
      assert.match(event.key, /^(contact|retrograde|eclipse)\.[a-z_]+\.[a-z-]+\.[a-z-]+\.\d{8}$/);
      assert.ok(event.key.length <= 80, event.key);
      assert.ok(!keys.has(event.key), `${event.key} is unique`);
      keys.add(event.key);
      if (event.kind === "contact") {
        assert.equal(readsAs(event), true);
        assert.ok(event.key.endsWith(ymd(event.window.exact[0] ?? event.window.start)), event.key);
      }
      if (event.kind === "retrograde") {
        assert.equal(readsAs(event), event.houses.length > 0, event.key);
        assert.ok(event.key.endsWith(ymd(event.start)), event.key);
      }
      if (event.kind === "eclipse") {
        assert.equal(readsAs(event), event.near !== null, event.key);
        assert.equal(event.tone, event.near ? "intense" : null, event.key);
        assert.ok(event.key.endsWith(ymd(event.eclipse.at)), event.key);
      }
    }
  });
}

test("a chart without a birth time has no Ascendant, Midheaven or Moon contact and no house", () => {
  const events = EVENTS["marie-curie-unknown"];
  const targets = new Set(contactsOf(events).map((c) => c.target));
  for (const timed of DOCTRINE.horizonTargets) assert.ok(!targets.has(timed), timed);
  assert.ok(contactsOf(events).every((c) => c.house === null));
  assert.ok(retrogradesOf(events).every((r) => r.houses.length === 0 && !readsAs(r)));
  const timed: readonly string[] = DOCTRINE.horizonTargets;
  assert.ok(eclipsesOf(events).every((e) => e.house === null && (e.near === null || !timed.includes(e.near.target))));
  const withTime = new Set(contactsOf(EVENTS["marie-curie"]).map((c) => c.target));
  assert.ok([...withTime].some((t) => timed.includes(t)), "the same birth with its time has some");
});

const spanOf = (e: SkyEvent): number[] =>
  e.kind === "contact"
    ? [e.window.start, e.window.end, ...e.window.exact].map((d) => d.getTime())
    : e.kind === "retrograde"
      ? [e.start.getTime(), e.end.getTime()]
      : [e.eclipse.at.getTime()];

test("two overlapping ranges give the same events, keys and windows where they meet", () => {
  for (const chart of [CHARTS["mira"], CHARTS["audrey-hepburn"], CHARTS["marie-curie-unknown"]]) {
    const first = skyEvents(chart, new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T23:59:59Z"));
    const second = skyEvents(chart, new Date("2026-07-01T00:00:00Z"), new Date("2027-06-30T23:59:59Z"));
    const shared = skyEvents(chart, new Date("2026-07-01T00:00:00Z"), new Date("2026-12-31T23:59:59Z"));
    assert.ok(shared.length > 0);
    for (const event of shared) {
      for (const range of [first, second]) {
        const twin = range.find((e) => e.key === event.key);
        assert.ok(twin, `${event.key} is in both ranges`);
        assert.deepEqual(spanOf(twin), spanOf(event), `${event.key} has the same window and passes`);
      }
    }
    for (const event of first) {
      const twin = second.find((e) => e.key === event.key);
      if (twin) assert.deepEqual(spanOf(twin), spanOf(event), `${event.key} is the same event from both`);
    }
  }
});

test("a range lists a contact only while its planet is within orb, never in a gap between passes", () => {
  const chart = CHARTS["mira"];
  const isSquare = (e: SkyEvent) => e.kind === "contact" && e.body === "saturn" && e.aspect === "square" && e.target === "midheaven";
  const week = skyEvents(chart, new Date("2026-10-05T00:00:00Z"), new Date("2026-10-11T23:59:59Z"));
  assert.ok(!week.some(isSquare), "Saturn is out of orb of her Midheaven all week");
  const half = skyEvents(chart, new Date("2026-10-05T00:00:00Z"), new Date("2027-04-04T23:59:59Z"));
  const square = half.find(isSquare);
  assert.ok(square && square.kind === "contact", "it comes back within orb by December");
  assert.ok(square.window.start < new Date("2026-10-05T00:00:00Z"), "and the window is whole, from its first pass");
  for (const name of Object.keys(CHARTS)) {
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 9, 5 + i)));
    const listed = skyEvents(CHARTS[name], days[0], new Date(days[6].getTime() + DAY - 1)).map((e) => e.key).sort();
    const onSomeDay = [...new Set(days.flatMap((day) => inEffect(EVENTS[name], day).map((e) => e.key)))].sort();
    assert.deepEqual(listed, onSomeDay, `${name}: the week lists what is in effect on one of its days`);
  }
});

test("Mira's snapshot week: the contacts the page shows, with their tones", () => {
  const chart = CHARTS["mira"];
  const week = skyEvents(chart, new Date("2026-10-05T00:00:00Z"), new Date("2026-10-11T23:59:59Z"));
  const onMonday = inEffect(week, new Date("2026-10-05T00:00:00Z"))
    .filter((e): e is ContactEvent => e.kind === "contact")
    .map((c) => `${c.body} ${c.aspect} ${c.target} ${c.tone}`)
    .sort();
  assert.deepEqual(onMonday, [
    "mars conjunction jupiter mixed",
    "mars opposition saturn intense",
    "neptune trine jupiter easy",
    "pluto conjunction saturn intense",
    "pluto opposition jupiter intense",
    "saturn conjunction ascendant intense",
  ]);
  const saturn = contactsOf(week).find((c) => c.body === "saturn" && c.target === "ascendant");
  assert.ok(saturn);
  assert.equal(saturn.house, 1);
  assert.equal(saturn.window.exact.length, 3, "Saturn crosses her Ascendant three times");
  const gap = new Date("2026-12-15T00:00:00Z");
  assert.ok(gap > saturn.window.start && gap < saturn.window.end, "mid-December is inside the window");
  assert.equal(inEffect([saturn], gap).length, 0, "but between passes, out of orb, so not in effect");
});
