/**
 * Timeline's server views. Every date and degree in them is checked against the engine computed here on its own
 * (acceptance 1's server half), a chart without a birth time has no angle, house or Moon contact (acceptance 3), a
 * quiet week has nothing in it, and a key names a sky event only while the app can show it. The reader's own chart is
 * found on a scratch Postgres when WALK_DATABASE_URL names a bootstrapped one, and that test skips, saying why,
 * without it.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only a database handed over for this: without one the pool points nowhere and nothing queries it.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const T = await import("./timeline.js");
const { chartForProfile } = await import("./profiles.js");
const { TIMELINE_PROMPT_VERSION } = await import("../prompts/timeline/index.js");
const E = await import("@workspace/engine");

type ReaderRow = import("./timeline.js").ReaderRow;
type ReaderChart = import("./timeline.js").ReaderChart;
type SkyEvent = import("@workspace/engine").SkyEvent;
type ContactEvent = import("@workspace/engine").ContactEvent;
type LifeCycle = import("@workspace/engine").LifeCycle;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIRA = "fixtures/sample-people/mira.json";
const BLIND = "fixtures/charts/marie-curie-unknown.json";
const OPRAH = "fixtures/charts/oprah-winfrey.json";
/** Mira's Monday on /timeline, 10:00 in Lisbon. */
const NOW = new Date("2026-10-05T09:00:00Z");
const DAY_MS = 86_400_000;

interface Birth {
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezone?: string;
}

function rowOf(path: string, over: { report?: Partial<ReaderRow["report"]>; profile?: Partial<ReaderRow["profile"]> } = {}): ReaderRow {
  const f = JSON.parse(readFileSync(join(ROOT, path), "utf8")) as Birth;
  return {
    report: { id: "report-1", status: "complete", sessionId: "s-reader", createdAt: new Date("2026-09-01T10:00:00Z"), ...over.report },
    profile: {
      id: "profile-1",
      userId: "user_reader",
      sessionId: "s-reader",
      claimedByUserId: null,
      isSelf: true,
      claimedAsSelf: false,
      birthDate: f.birthDate,
      birthTime: f.birthTime,
      birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0,
      latitude: f.latitude,
      longitude: f.longitude,
      timezoneOffset: f.timezoneOffset,
      timezone: f.timezone ?? null,
      chartData: null,
      ...over.profile,
    },
  };
}

const readers = new Map<string, ReaderChart>();
function readerFrom(path: string): ReaderChart {
  let reader = readers.get(path);
  if (!reader) {
    const row = rowOf(path);
    reader = T.readerOf("user_reader", row, chartForProfile(row.profile));
    readers.set(path, reader);
  }
  return reader;
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const arc = (a: number, b: number) => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};
const ms = (at: Date) => at.getTime();

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Local midnight as Mira's week computes it (`sampleRun.ts`), from the engine's offset at a wall-clock time. */
function midnight(day: string, zone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - E.offsetAtBirth(zone, day, "00:00") * 3_600_000);
}

/** The engine's own events over a view's days, computed without the module under test. */
function engineEvents(reader: ReaderChart, from: string, to: string, zone: string): SkyEvent[] {
  return E.skyEvents(reader.chart, midnight(from, zone), new Date(ms(midnight(addDays(to, 1), zone)) - 1));
}

/** The places a contact perfects, the doctrine's natal point turned each way by the aspect. */
function aspectPlaces(reader: ReaderChart, event: ContactEvent): number[] {
  const { chart } = reader;
  const base = event.target === "ascendant" ? chart.angles!.ascendant.absoluteDegree
    : event.target === "midheaven" ? chart.angles!.midheaven.absoluteDegree
    : chart.planets[event.target].absoluteDegree;
  const angle = E.DOCTRINE.angles[event.aspect];
  return [norm(base + angle), norm(base - angle)];
}

const separation = (event: ContactEvent, places: number[], at: Date) =>
  Math.min(...places.map((p) => Math.abs(arc(E.longitudeAt(event.body, at), p))));

function momentsOf(event: SkyEvent): number[] {
  switch (event.kind) {
    case "contact":
      return [ms(event.window.start), ...event.window.exact.map(ms), ms(event.window.end)];
    case "retrograde":
      return [ms(event.start), ms(event.end)];
    case "eclipse":
      return [ms(event.eclipse.at)];
  }
}

const rank = { intense: 0, mixed: 1, easy: 2 } as const;

test("Now and ahead: every date, degree, tone and word is the engine's (acceptance 1)", () => {
  const reader = readerFrom(MIRA);
  const view = T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), NOW);
  assert.equal(view.zone, "Europe/Lisbon");
  assert.equal(view.from, "2026-10-05");
  assert.equal(view.to, "2027-04-04");
  assert.equal(view.blind, false);

  const events = engineEvents(reader, view.from, view.to, view.zone);
  assert.ok(events.length > 5, "Mira's six months hold contacts, retrogrades and eclipses");
  assert.deepEqual(view.events.map((e) => e.key), events.map((e) => e.key));
  view.events.forEach((shown, i) => {
    const event = events[i];
    assert.equal(shown.kind, event.kind);
    assert.equal(shown.tone, event.tone);
    assert.equal(shown.headline, E.headlineOf(event));
    assert.deepEqual(shown.facts, E.factsOf(event));
    assert.ok(shown.key.length <= 80 && /^[a-z0-9._-]+$/.test(shown.key), shown.key);
    if (event.kind === "contact") {
      assert.deepEqual([shown.body, shown.aspect, shown.target], [event.body, event.aspect, event.target]);
      assert.deepEqual(shown.houses, event.house === null ? [] : [event.house]);
      assert.equal(ms(shown.start), ms(event.window.start));
      assert.equal(ms(shown.end), ms(event.window.end));
      assert.deepEqual(shown.exact.map(ms), event.window.exact.map(ms));
    } else if (event.kind === "retrograde") {
      assert.deepEqual(shown.houses, event.houses);
      assert.deepEqual([ms(shown.start), ms(shown.end)], [ms(event.start), ms(event.end)]);
      assert.deepEqual(shown.exact, []);
      assert.equal(shown.orbNow, null);
    } else {
      assert.equal(shown.body, event.eclipse.kind === "solar" ? "sun" : "moon");
      assert.equal(shown.target, event.near?.target ?? null);
      assert.deepEqual([ms(shown.start), ms(shown.end), ...shown.exact.map(ms)], [ms(event.eclipse.at), ms(event.eclipse.at), ms(event.eclipse.at)]);
    }
  });

  const drawn = reader.chart.angles!;
  assert.deepEqual(view.angles, { ascendant: drawn.ascendant.absoluteDegree, midheaven: drawn.midheaven.absoluteDegree });
  assert.deepEqual(view.natal.map((p) => p.body), ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);
  for (const point of view.natal) {
    assert.equal(point.lon, reader.chart.planets[point.body].absoluteDegree);
    assert.equal(point.house, reader.chart.planets[point.body].house);
  }

  const contacts = events.filter((e): e is ContactEvent => e.kind === "contact");
  assert.equal(view.days.length, 182);
  view.days.forEach((day, i) => {
    assert.equal(day.date, addDays(view.from, i));
    const tones = E.inEffect(contacts, midnight(day.date, view.zone)).map((e) => e.tone).sort((a, b) => rank[a] - rank[b]);
    assert.deepEqual(day.tones, tones, day.date);
  });

  const close = ms(midnight(addDays(view.to, 1), view.zone));
  const moments = new Map(events.map((e) => [e.key, momentsOf(e)]));
  assert.ok(view.next.length > 0);
  view.next.forEach((change, i) => {
    assert.ok(moments.get(change.key)?.includes(ms(change.at)), `${change.key} ${change.change} at ${change.at.toISOString()}`);
    assert.ok(ms(change.at) > ms(NOW) && ms(change.at) < close);
    if (i > 0) assert.ok(ms(change.at) >= ms(view.next[i - 1].at));
  });
});

test("a contact's spans are where the engine has it within orb, cut at its own edge crossings", () => {
  const reader = readerFrom(MIRA);
  const view = T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), NOW);
  const events = engineEvents(reader, view.from, view.to, view.zone);
  let gaps = 0;
  view.events.forEach((shown, i) => {
    const event = events[i];
    if (event.kind !== "contact") {
      assert.deepEqual(shown.spans.map((s) => [ms(s.start), ms(s.end)]), [[ms(shown.start), ms(shown.end)]]);
      return;
    }
    const places = aspectPlaces(reader, event);
    const spans = shown.spans;
    assert.equal(ms(spans[0].start), ms(event.window.start));
    assert.equal(ms(spans[spans.length - 1].end), ms(event.window.end));
    spans.forEach((span, k) => {
      assert.ok(ms(span.start) < ms(span.end));
      const middle = new Date((ms(span.start) + ms(span.end)) / 2);
      assert.ok(separation(event, places, middle) <= event.orb, `${event.key} is in orb inside its span`);
      if (k === 0) return;
      gaps++;
      const gap = new Date((ms(spans[k - 1].end) + ms(span.start)) / 2);
      assert.ok(separation(event, places, gap) > event.orb, `${event.key} is out of orb between two spans`);
      for (const edge of [spans[k - 1].end, span.start]) {
        assert.ok(Math.abs(separation(event, places, edge) - event.orb) < 0.01, `${event.key} crosses its orb's edge at ${edge.toISOString()}`);
      }
    });
    for (const at of event.window.exact) assert.ok(spans.some((s) => ms(s.start) <= ms(at) && ms(at) <= ms(s.end)));
    // A day is in effect, by the doctrine's own rule, exactly when one of its spans meets it.
    view.days.forEach(({ date }) => {
      const open = ms(midnight(date, view.zone));
      const met = spans.some((s) => ms(s.start) < open + DAY_MS && ms(s.end) >= open);
      assert.equal(met, E.inEffect([event], new Date(open)).length > 0, `${event.key} on ${date}`);
    });
  });
  assert.ok(gaps > 0, "Mira's six months hold a contact a retrograde takes out of orb and back");

  const saturn = view.events.find((e) => e.key === "contact.saturn.conjunction.ascendant.20260530");
  assert.ok(saturn, "Saturn on Mira's Ascendant is in her six months");
  assert.equal(saturn.spans.length, 3);
  assert.equal(saturn.exact.length, 3);
});

test("orbNow is a contact's distance from exact while it is within orb, and null otherwise", () => {
  const reader = readerFrom(MIRA);
  const view = T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), NOW);
  const events = engineEvents(reader, view.from, view.to, view.zone);
  let measured = 0;
  view.events.forEach((shown, i) => {
    const event = events[i];
    if (event.kind !== "contact") return assert.equal(shown.orbNow, null);
    const orb = separation(event, aspectPlaces(reader, event), NOW);
    const inside = ms(NOW) >= ms(event.window.start) && ms(NOW) <= ms(event.window.end) && orb <= event.orb;
    if (!inside) return assert.equal(shown.orbNow, null, event.key);
    measured++;
    assert.equal(shown.orbNow, Math.round(orb * 100) / 100, event.key);
  });
  assert.ok(measured > 0);
});

test("Life: the cycles, waves and known ages are the engine's, dated from the reader's birth", () => {
  const reader = readerFrom(MIRA);
  const life = T.lifeView(reader, "Europe/Lisbon", new Map(), NOW);
  const natal = E.natalLongitudes(reader.chart);
  const birth = new Date(reader.chart.datetimeUtc);
  const cycles = E.lifeCycles(natal, birth);
  assert.equal(ms(life.birth), ms(birth));
  assert.equal(Math.floor(life.age), E.ageAt(birth, NOW));
  assert.ok(life.age > 35.5 && life.age < 35.6, `Mira is 35 and a half on her Monday, not ${life.age}`);

  assert.deepEqual(life.cycles.map((c) => c.key), cycles.map((c) => c.key));
  life.cycles.forEach((shown, i) => {
    const cycle = cycles[i];
    assert.deepEqual([shown.id, shown.body, shown.age, shown.passes, shown.repeats], [cycle.id, cycle.body, cycle.age, cycle.passes, cycle.repeats]);
    assert.deepEqual([shown.name, shown.word], [E.CYCLE_WORDS[cycle.id].name, E.CYCLE_WORDS[cycle.id].word]);
    assert.deepEqual([ms(shown.start), ms(shown.end), ...shown.exact.map(ms)], [ms(cycle.window.start), ms(cycle.window.end), ...cycle.window.exact.map(ms)]);
    assert.equal(shown.past, T.dayIn(cycle.window.end, "Europe/Lisbon") < "2026-10-05");
    assert.equal(shown.reading, "none");
  });

  assert.deepEqual(life.waves, E.waves(natal, birth).map((w) => ({ body: w.body, points: w.points })));

  assert.deepEqual(life.ages.map((a) => a.id), E.KNOWN_AGES.map((a) => a.id));
  for (const known of life.ages) {
    const body = E.KNOWN_AGES.find((a) => a.id === known.id)!.body;
    const of = cycles.filter((c) => c.id === known.id);
    const anchor = (c: LifeCycle) => ms(c.window.exact[0] ?? c.window.start);
    const focus = of.find((c) => T.dayIn(c.window.end, "Europe/Lisbon") >= "2026-10-05");
    const before = focus ? of[of.indexOf(focus) - 1] : of[of.length - 1];
    assert.equal(known.next === null ? null : ms(known.next), focus ? anchor(focus) : null, known.id);
    assert.equal(known.last === null ? null : ms(known.last), before ? anchor(before) : null, known.id);
    assert.equal(known.age, (focus ?? before)!.age);
    assert.equal(known.progress, Math.round(E.roundProgress(body, natal[body]!, NOW) * 1000) / 1000);
  }
  const saturn = life.ages.find((a) => a.id === "saturn-return")!;
  assert.equal(saturn.age, 58, "Mira's first Saturn return is behind her at 35, so the next is her second");
  assert.equal(saturn.last?.toISOString().slice(0, 10), "2021-01-18", "her first, the January 2021 the page looks back to");
});

test("the teaser: the Saturn ring's age and the four big cycles, from the reader's chart, soonest first", () => {
  const reader = readerFrom(MIRA);
  const teaser = T.teaserView(reader, NOW);
  assert.ok(teaser);
  const natal = E.natalLongitudes(reader.chart);
  const cycles = E.lifeCycles(natal, new Date(reader.chart.datetimeUtc));
  const today = T.dayIn(NOW, reader.zone);
  // The ring is her first Saturn return, behind her, as the dashboard artifact's ring is; the list carries her next.
  assert.equal(teaser.saturn.age, cycles.find((c) => c.id === "saturn-return")!.age);
  assert.equal(teaser.saturn.age, 29);
  assert.deepEqual(teaser.cycles.find((c) => c.id === "saturn-return"), {
    id: "saturn-return", name: "Saturn return", word: "A reset", age: 58, on: "2050-02-22",
  });
  assert.deepEqual(teaser.cycles.map((c) => c.age), [37, 44, 47, 58], "her next big cycle is at 37");
  assert.equal(teaser.saturn.progress, Math.round(E.roundProgress("saturn", natal.saturn!, NOW) * 1000) / 1000);
  assert.deepEqual([...teaser.cycles.map((c) => c.id)].sort(), E.KNOWN_AGES.map((a) => a.id).sort());
  for (const shown of teaser.cycles) {
    const cycle = cycles.find((c) => c.id === shown.id && T.dayIn(c.window.exact[0] ?? c.window.start, reader.zone) === shown.on);
    assert.ok(cycle, `${shown.id} on ${shown.on} is one of the engine's cycles`);
    assert.equal(shown.age, cycle.age);
    assert.deepEqual([shown.name, shown.word], [E.CYCLE_WORDS[shown.id].name, E.CYCLE_WORDS[shown.id].word]);
    assert.ok(shown.on >= today || T.dayIn(cycle.window.end, reader.zone) >= today, `${shown.id} is still to come or under way`);
  }
  const days = teaser.cycles.map((c) => c.on);
  assert.deepEqual(days, [...days].sort());
});

test("Your week: seven of the reader's days, the engine's sentence, and what touches the chart, today's first", () => {
  const reader = readerFrom(MIRA);
  const week = T.weekView(reader, "Europe/Lisbon", NOW);
  const now = T.nowView(reader, "week", "Europe/Lisbon", new Map(), NOW);
  assert.deepEqual(week.days, now.days);
  assert.deepEqual(week.days.map((d) => d.date), Array.from({ length: 7 }, (_, i) => addDays("2026-10-05", i)));
  const events = engineEvents(reader, now.from, now.to, now.zone);
  assert.equal(week.headline, E.weekSentence(events, midnight(now.from, now.zone)));
  assert.deepEqual([...week.on.map((e) => e.key)].sort(), events.map((e) => e.key).sort());
  const onToday = new Set(E.inEffect(events, midnight(now.from, now.zone)).map((e) => e.key));
  const order = week.on.map((e) => [onToday.has(e.key) ? 0 : 1, e.tone === null ? 3 : rank[e.tone]]);
  assert.deepEqual(order, [...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  assert.ok(onToday.size > 0 && onToday.has(week.on[0].key), "what is on her today comes first");
  assert.ok(week.on.every((e) => e.reading === "none" && e.line === null));
  assert.deepEqual(week.natal, now.natal);
  assert.deepEqual(week.angles, now.angles);
});

test("without a birth time: no angle, no house and no Moon contact (acceptance 3)", () => {
  const reader = readerFrom(BLIND);
  assert.equal(reader.blind, true);
  const view = T.nowView(reader, "six-months", null, new Map(), NOW);
  assert.equal(view.blind, true);
  assert.equal(view.angles, null);
  assert.ok(view.events.length > 0);
  for (const event of view.events) {
    assert.ok(!["moon", "ascendant", "midheaven"].includes(event.target ?? ""), event.key);
    assert.deepEqual(event.houses, []);
    assert.equal(event.facts.house, null);
  }
  assert.ok(!view.natal.some((p) => p.body === "moon"), "the natal Moon is too loose to place without a time");
  assert.ok(view.natal.every((p) => p.house === null));
  // A retrograde crossing no known house gets no reading, so a status passed for it changes nothing.
  const retrograde = view.events.find((e) => e.kind === "retrograde");
  assert.ok(retrograde);
  const marked = T.nowView(reader, "six-months", null, new Map([[retrograde.key, { status: "ready" as const, line: "A line" }]]), NOW);
  const same = marked.events.find((e) => e.key === retrograde.key)!;
  assert.deepEqual([same.reading, same.line], ["none", null]);
  assert.equal(T.eventByKey(reader, retrograde.key, NOW), null);

  const life = T.lifeView(reader, null, new Map(), NOW);
  assert.ok(life.age > 158, "Marie Curie's chart reads past 90 too");
  assert.ok(life.ages.every((a) => a.next === null && a.last !== null), "every known age is behind a chart born in 1867");
  assert.ok(life.cycles.every((c) => c.past));
  const teaser = T.teaserView(reader, NOW);
  assert.equal(teaser?.cycles.length, 4);
  assert.ok(teaser.cycles.every((c) => c.on < "1958-01-01"), "a life past 90 has every big cycle behind it");
});

test("a quiet week has no event, no tone, nothing next and nothing to write (acceptance 3)", () => {
  const reader = readerFrom(OPRAH);
  // Found by scanning her weeks with the engine: nothing the doctrine names touches her chart from 14 Dec 2026 to 3 Jan 2027.
  const now = new Date("2026-12-22T15:00:00Z");
  const view = T.nowView(reader, "week", "America/Chicago", new Map(), now);
  assert.deepEqual([view.from, view.to], ["2026-12-22", "2026-12-28"]);
  assert.deepEqual(view.events, []);
  assert.deepEqual(view.next, []);
  assert.ok(view.days.every((d) => d.tones.length === 0));
  const week = T.weekView(reader, "America/Chicago", now);
  assert.deepEqual(week.on, []);
  assert.equal(week.headline, "A quiet week for your chart");
});

test("days are the reader's: the zone their browser names, else their birth place's", () => {
  const reader = readerFrom(MIRA);
  const at = new Date("2026-10-05T11:30:00Z");
  assert.equal(T.nowView(reader, "week", "Pacific/Kiritimati", new Map(), at).from, "2026-10-06");
  assert.equal(T.nowView(reader, "week", "Pacific/Pago_Pago", new Map(), at).from, "2026-10-05");
  for (const tz of ["Mars/Olympus_Mons", "../../etc/passwd", "", "Europe/Lisbon; drop", undefined, null]) {
    assert.equal(T.nowView(reader, "week", tz, new Map(), at).zone, "Europe/Lisbon", String(tz));
  }
  assert.equal(T.validZone("europe/lisbon"), "Europe/Lisbon");
  assert.equal(T.validZone(42), null);
  // Where clocks skip midnight the day begins at the first second it has; elsewhere at its own midnight.
  for (const [day, zone, start] of [
    ["2026-09-06", "America/Santiago", "2026-09-06T04:00:00.000Z"],
    ["2026-03-29", "Asia/Beirut", "2026-03-28T22:00:00.000Z"],
    ["2026-03-08", "America/Havana", "2026-03-08T05:00:00.000Z"],
    ["2026-10-25", "Europe/Lisbon", "2026-10-24T23:00:00.000Z"],
    ["2026-10-06", "Pacific/Kiritimati", "2026-10-05T10:00:00.000Z"],
    ["2026-10-04", "Australia/Lord_Howe", "2026-10-03T13:30:00.000Z"],
  ]) {
    const begins = T.dayStart(day, zone);
    assert.equal(begins.toISOString(), start, `${day} in ${zone}`);
    assert.equal(T.dayIn(begins, zone), day);
    assert.notEqual(T.dayIn(new Date(begins.getTime() - 1000), zone), day);
  }
  // A day the clocks change on is still one day, begun at its own midnight.
  const autumn = T.nowView(reader, "month", "Europe/Lisbon", new Map(), new Date("2026-10-20T12:00:00Z"));
  assert.ok(autumn.days.some((d) => d.date === "2026-10-25"));
  assert.equal(new Set(autumn.days.map((d) => d.date)).size, 30);
  assert.throws(() => T.nowView(reader, "year" as "week", null, new Map(), at), RangeError);
});

test("readings: a ready one lends its line, a failed one does not, and an event that reads shows where it stands", () => {
  const reader = readerFrom(MIRA);
  const plain = T.nowView(reader, "six-months", null, new Map(), NOW);
  const [ready, writing, failed] = plain.events.filter((e) => e.kind === "contact").map((e) => e.key);
  const statuses = new Map<string, import("./timeline.js").ReadingState>([
    [ready, { status: "ready", line: "You think more about how you come across." }],
    [writing, "writing"],
    [failed, { status: "failed", line: "We couldn't write this one. Try again soon." }],
  ]);
  const view = T.nowView(reader, "six-months", null, statuses, NOW);
  const of = (key: string) => view.events.find((e) => e.key === key)!;
  assert.deepEqual([of(ready).reading, of(ready).line], ["ready", "You think more about how you come across."]);
  assert.deepEqual([of(writing).reading, of(writing).line], ["writing", null]);
  assert.deepEqual([of(failed).reading, of(failed).line], ["failed", null]);
  assert.ok(view.events.filter((e) => ![ready, writing, failed].includes(e.key)).every((e) => e.reading === "none" && e.line === null));

  const life = T.lifeView(reader, null, new Map([["cycle.saturn-return.20210118", "ready" as const]]), NOW);
  assert.deepEqual(life.cycles.filter((c) => c.reading !== "none").map((c) => [c.key, c.reading]), [["cycle.saturn-return.20210118", "ready"]]);
});

test("every key a view shows names its event again, and a key nothing carries names none", () => {
  const reader = readerFrom(MIRA);
  const view = T.nowView(reader, "six-months", null, new Map(), NOW);
  for (const shown of view.events) {
    const found = T.eventByKey(reader, shown.key, NOW);
    const reads = shown.kind === "contact"
      || (shown.kind === "retrograde" && shown.houses.length > 0)
      || (shown.kind === "eclipse" && shown.tone !== null);
    if (!reads) {
      assert.equal(found, null, shown.key);
      continue;
    }
    assert.ok(found && found.kind === "sky", shown.key);
    assert.equal(found.event.key, shown.key);
    assert.deepEqual([ms(found.view.start), ms(found.view.end), ...found.view.exact.map(ms)], [ms(shown.start), ms(shown.end), ...shown.exact.map(ms)]);
    assert.deepEqual(found.view.spans, shown.spans);
  }
  const life = T.lifeView(reader, null, new Map(), NOW);
  for (const cycle of life.cycles.slice(0, 6)) {
    const found = T.eventByKey(reader, cycle.key, NOW);
    assert.ok(found && found.kind === "cycle");
    assert.equal(found.cycle.key, cycle.key);
    assert.deepEqual(found.view, cycle);
  }
  for (const key of [
    "contact.saturn.conjunction.ascendant.20261301",
    "contact.saturn.conjunction.ascendant.20260230",
    "contact.saturn.conjunction.ascendant.20260531",
    "contact.saturn.conjunction.ascendant.18900530",
    "cycle.saturn-return.20210101",
    "cycle.nothing.20210101",
    `contact.${"x".repeat(80)}.-.-.20261005`,
    "retrograde.venus.-.-.2026-10-03",
    "",
  ]) {
    assert.equal(T.eventByKey(reader, key, NOW), null, key);
  }
});

test("a sky event's key opens only while the app can show it, in whole UTC days from 31 back to 182 ahead, and every Life cycle opens (MB-219)", () => {
  const reader = readerFrom(MIRA);
  const dayOf = (at: number) => Math.floor(at / DAY_MS);
  const noonOf = (day: number) => new Date(day * DAY_MS + DAY_MS / 2);
  const today = dayOf(ms(NOW));
  // A real event on her chart a year out: the engine finds it, and no view of today could show it.
  const yearOut = E.skyEvents(reader.chart, noonOf(today + 365), noonOf(today + 395))
    .filter(E.readsAs)
    .find((event) => dayOf(momentsOf(event)[0]) >= today + 365);
  assert.ok(yearOut, "an event that starts a year out");
  assert.equal(T.eventByKey(reader, yearOut.key, NOW), null, "a key a year out names no reading");
  const starts = dayOf(momentsOf(yearOut)[0]);
  const ends = dayOf(momentsOf(yearOut).at(-1)!);
  assert.ok(T.eventByKey(reader, yearOut.key, noonOf(starts - 182)), "it opens from the 182nd day before it starts");
  assert.equal(T.eventByKey(reader, yearOut.key, noonOf(starts - 183)), null, "and not the 183rd");
  assert.ok(T.eventByKey(reader, yearOut.key, noonOf(ends + 31)), "it still opens 31 days after it ends");
  assert.equal(T.eventByKey(reader, yearOut.key, noonOf(ends + 32)), null, "and not 32");

  // A contact counts by its whole window: one the six months show opens wherever its key's day falls.
  const keyDay = (key: string) => dayOf(Date.parse(`${key.slice(-8, -4)}-${key.slice(-4, -2)}-${key.slice(-2)}T00:00:00Z`));
  const far = T.nowView(reader, "six-months", null, new Map(), NOW).events
    .filter((e) => e.kind === "contact" && (keyDay(e.key) < today - 31 || keyDay(e.key) > today + 182));
  assert.ok(far.some((e) => keyDay(e.key) < today - 31) && far.some((e) => keyDay(e.key) > today + 182), far.map((e) => e.key).join(", "));
  for (const event of far) assert.ok(T.eventByKey(reader, event.key, NOW), event.key);

  // Life shows every cycle from birth to 90, so each opens on any day, the past ones too.
  const life = T.lifeView(reader, null, new Map(), NOW);
  assert.ok(life.cycles.some((c) => c.past) && life.cycles.some((c) => !c.past));
  for (const cycle of life.cycles) assert.ok(T.eventByKey(reader, cycle.key, NOW), cycle.key);
});

test("the reader is the newest finished Personal report of their own chart that they can read", () => {
  const viewer = { userId: "user_reader", sessionId: "s-other" };
  const none = new Set<string>();
  const older = rowOf(MIRA, { report: { id: "report-old", createdAt: new Date("2026-01-01T00:00:00Z") } });
  const newer = rowOf(MIRA, { report: { id: "report-new", createdAt: new Date("2026-09-01T00:00:00Z") } });
  const revising = rowOf(MIRA, { report: { id: "report-revising", status: "revising", createdAt: new Date("2026-09-02T00:00:00Z") } });
  const pending = rowOf(MIRA, { report: { id: "report-pending", status: "interpreting", createdAt: new Date("2026-09-03T00:00:00Z") } });
  const failed = rowOf(MIRA, { report: { id: "report-failed", status: "failed", createdAt: new Date("2026-09-04T00:00:00Z") } });
  assert.equal(T.readerReportOf(viewer, [older, newer], none)?.report.id, "report-new");
  assert.equal(T.readerReportOf(viewer, [older, newer, revising, pending, failed], none)?.report.id, "report-revising");
  assert.equal(T.readerReportOf(viewer, [pending, failed], none), null);

  // Their own chart sent to them by its writer and claimed as them reads as theirs.
  const claimed = rowOf(MIRA, { profile: { userId: "user_writer", sessionId: "s-writer", claimedByUserId: "user_reader", isSelf: false, claimedAsSelf: true } });
  assert.equal(T.readerReportOf(viewer, [claimed], none)?.report.id, "report-1");
  // Someone else's chart is never theirs: one they wrote, one its subject claimed, one shared with them (R-3.6).
  const written = rowOf(MIRA, { profile: { isSelf: false } });
  const takenBack = rowOf(MIRA, { profile: { claimedByUserId: "user_subject" } });
  const shared = rowOf(MIRA, { profile: { userId: "user_sharer", sessionId: "s-sharer" } });
  assert.equal(T.readerReportOf(viewer, [written], none), null);
  assert.equal(T.readerReportOf(viewer, [takenBack], none), null);
  assert.equal(T.readerReportOf(viewer, [shared], new Set(["profile-1"])), null);
});

test("the reader's zone, birth and basis come from their own profile and chart", () => {
  const mira = readerFrom(MIRA);
  assert.equal(mira.zone, "Europe/Lisbon");
  assert.equal(ms(mira.birth), ms(new Date(mira.chart.datetimeUtc)));
  assert.equal(mira.basis, `${E.CHART_VERSION}:07:40:0:${TIMELINE_PROMPT_VERSION}`);
  assert.deepEqual([mira.userId, mira.profileId, mira.reportId], ["user_reader", "profile-1", "report-1"]);

  const curie = readerFrom(BLIND);
  assert.equal(curie.zone, "Europe/Warsaw", "a profile with no zone reads its birth place's");
  assert.equal(curie.basis, `${E.CHART_VERSION}:none:720:${TIMELINE_PROMPT_VERSION}`);
  assert.equal(T.basisOf("09:15", 180), `${E.CHART_VERSION}:09:15:180:${TIMELINE_PROMPT_VERSION}`);

  assert.equal(T.chartIsStale(null), true);
  assert.equal(T.chartIsStale({ chartVersion: E.CHART_VERSION - 1 }), true);
  assert.equal(T.chartIsStale(mira.chart), false);
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the reader's rows are read on a scratch Postgres";

test("readerChart finds the signed-in reader's own chart, brings an old one up to the engine, and finds none without a report", { skip: NO_DB }, async () => {
  const { db, pool, profilesTable, reportsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  after(() => pool.end());
  const run = randomUUID().slice(0, 8);
  const userId = `user_r1623_${run}`;
  const row = rowOf(MIRA);
  const stale = { ...chartForProfile(row.profile), chartVersion: E.CHART_VERSION - 1 };
  const profileId = `r1623-${run}-profile`;
  await db.insert(profilesTable).values({
    ...row.profile, id: profileId, userId, sessionId: `s-${run}`, birthPlace: "Lisbon, Portugal", name: "Mira Costa", chartData: stale,
  });
  const viewer = { userId, sessionId: `s-elsewhere-${run}` };
  assert.equal(await T.readerChart({ userId: null, sessionId: `s-${run}` }), null);
  assert.equal(await T.readerChart(viewer), null, "no Personal report yet");

  await db.insert(reportsTable).values({ id: `r1623-${run}-pending`, profileId, sessionId: `s-${run}`, type: "natal", status: "interpreting" });
  assert.equal(await T.readerChart(viewer), null, "a report still being written is not finished");

  await db.insert(reportsTable).values({ id: `r1623-${run}-done`, profileId, sessionId: `s-${run}`, type: "natal", status: "complete" });
  const reader = await T.readerChart(viewer);
  assert.ok(reader);
  assert.deepEqual([reader.userId, reader.profileId, reader.reportId, reader.zone], [userId, profileId, `r1623-${run}-done`, "Europe/Lisbon"]);
  assert.equal(reader.chart.chartVersion, E.CHART_VERSION);
  const [kept] = await db.select({ chartData: profilesTable.chartData }).from(profilesTable).where(eq(profilesTable.id, profileId));
  assert.equal((kept.chartData as { chartVersion: number }).chartVersion, E.CHART_VERSION, "the recomputed chart is kept on the profile (R-4.5)");

  await db.delete(reportsTable).where(eq(reportsTable.profileId, profileId));
  await db.delete(profilesTable).where(eq(profilesTable.id, profileId));
});
