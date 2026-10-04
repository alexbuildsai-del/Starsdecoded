/**
 * Timeline's server views at their edges (R16-23; ADR-207, 209, 211, 212; readings 4 to 9; R-4.5, R-4.6). Every date and
 * degree is checked against the engine computed here on its own; no database is read. `timeline.test.ts` holds the
 * main cases and the scratch-database one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Only a handed-over database is ever queried: without one the pool points nowhere and nothing here reads it.
process.env.DATABASE_URL = process.env.WALK_DATABASE_URL ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const T = await import("./timeline.js");
const { chartForProfile } = await import("./profiles.js");
const { TIMELINE_PROMPT_VERSION } = await import("../prompts/timeline/index.js");
const E = await import("@workspace/engine");

type ReaderRow = import("./timeline.js").ReaderRow;
type ReaderChart = import("./timeline.js").ReaderChart;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MIRA = "fixtures/sample-people/mira.json";
const BLIND = "fixtures/charts/marie-curie-unknown.json";
const OPRAH = "fixtures/charts/oprah-winfrey.json";
const NOW = new Date("2026-10-05T09:00:00Z");
const DAY_MS = 86_400_000;
const ms = (at: Date) => at.getTime();

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

const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const rank = { intense: 0, mixed: 1, easy: 2 } as const;

test("a range is 7, 30 or 182 of the reader's days, and a shorter range's events are all in a longer one's", () => {
  const reader = readerFrom(MIRA);
  const views = (["week", "month", "six-months"] as const).map((range) => T.nowView(reader, range, "Europe/Lisbon", new Map(), NOW));
  assert.deepEqual(views.map((v) => v.days.length), [7, 30, 182]);
  assert.deepEqual(views.map((v) => T.RANGE_DAYS[v.range]), [7, 30, 182]);
  assert.deepEqual(views.map((v) => v.range), ["week", "month", "six-months"]);
  assert.ok(views.every((v) => v.from === "2026-10-05"), "all start on the reader's today");
  assert.deepEqual(views.map((v) => v.to), ["2026-10-11", "2026-11-03", "2027-04-04"]);
  const keys = views.map((v) => new Set(v.events.map((e) => e.key)));
  for (const key of keys[0]) assert.ok(keys[1].has(key), `${key} is in the week and the month`);
  for (const key of keys[1]) assert.ok(keys[2].has(key), `${key} is in the month and the six months`);
  assert.ok(keys[2].size > keys[0].size);
  views[2].days.slice(0, 30).forEach((d, i) => assert.deepEqual(d, views[1].days[i]), "the first 30 days agree");
  views[1].days.slice(0, 7).forEach((d, i) => assert.deepEqual(d, views[0].days[i]), "and the first 7");
});

test("a range the contract lacks is a RangeError, whatever name it borrows from an object", () => {
  const reader = readerFrom(MIRA);
  for (const range of ["year", "", "Week", "WEEK", "weeks", "constructor", "toString", "__proto__", "hasOwnProperty", undefined, null, 7]) {
    assert.throws(() => T.nowView(reader, range as never, null, new Map(), NOW), RangeError, String(range));
  }
});

test("the reader's day turns over at their midnight: the last second of a day and the first of the next", () => {
  const reader = readerFrom(MIRA);
  const from = (at: string, tz: string) => T.nowView(reader, "week", tz, new Map(), new Date(at)).from;
  assert.equal(from("2026-10-05T22:59:59.999Z", "Europe/Lisbon"), "2026-10-05", "23:59:59.999 in Lisbon in summer time");
  assert.equal(from("2026-10-05T23:00:00.000Z", "Europe/Lisbon"), "2026-10-06");
  assert.equal(from("2026-10-25T23:59:59.999Z", "Europe/Lisbon"), "2026-10-25", "the night the clocks go back, a 25-hour day");
  assert.equal(from("2026-10-25T00:30:00.000Z", "Europe/Lisbon"), "2026-10-25", "the hour that is lived twice");
  assert.equal(from("2026-10-25T01:30:00.000Z", "Europe/Lisbon"), "2026-10-25");
  assert.equal(from("2026-10-26T00:00:00.000Z", "Europe/Lisbon"), "2026-10-26");
  assert.equal(from("2026-03-28T23:59:59.999Z", "Europe/Lisbon"), "2026-03-28");
  assert.equal(from("2026-03-29T00:00:00.000Z", "Europe/Lisbon"), "2026-03-29");
  assert.equal(from("2026-10-05T23:59:59.999Z", "UTC"), "2026-10-05");
  assert.equal(from("2026-10-06T00:00:00.000Z", "UTC"), "2026-10-06");
  assert.equal(from("2026-10-05T05:29:59.999Z", "Asia/Kolkata"), "2026-10-05");
  assert.equal(from("2026-10-05T18:29:59.999Z", "Asia/Kolkata"), "2026-10-05");
  assert.equal(from("2026-10-05T18:30:00.000Z", "Asia/Kolkata"), "2026-10-06", "a half-hour zone");
});

test("a zone the server cannot read falls back to the birth place's, never to an error or a guess", () => {
  const reader = readerFrom(MIRA);
  const bad = ["Mars/Olympus", "../../etc/passwd", "UTC; drop table", "a".repeat(65), "Europe/Lisbon\n", " Europe/Lisbon", "Europe/Lisbón", "\u0000", "{}", "Europe//Lisbon/..", 5, {}, [], true];
  for (const tz of bad) assert.equal(T.nowView(reader, "week", tz as never, new Map(), NOW).zone, reader.zone, JSON.stringify(tz));
  for (const tz of ["UTC", "Etc/GMT+5", "America/Argentina/Buenos_Aires", "Asia/Kolkata", "Pacific/Chatham"]) assert.equal(T.nowView(reader, "week", tz, new Map(), NOW).zone, T.validZone(tz), tz);
  assert.equal(T.validZone("utc"), "UTC");
  assert.equal(T.validZone("asia/kolkata"), T.validZone("Asia/Kolkata"), "case does not make a zone another");
  assert.ok(T.validZone("Asia/Kolkata"));
  assert.equal(T.validZone(" UTC"), null);
  assert.equal(T.validZone("UTC "), null);
  assert.equal(T.validZone("x".repeat(64)), null);
  assert.equal(T.validZone(null), null);
  assert.equal(T.validZone(undefined), null);
  // The same fallback in Life and the week, and the teaser which only ever uses the birth place's.
  assert.equal(T.weekView(reader, "Nope/Nope", NOW).days[0].date, T.weekView(reader, null, NOW).days[0].date);
  assert.equal(T.lifeView(reader, "Nope/Nope", new Map(), NOW).age, T.lifeView(reader, null, new Map(), NOW).age);
});

test("the birth place's zone is the profile's own when the runtime knows it, else the one its coordinates lie in, never an unreadable one", () => {
  const f = JSON.parse(readFileSync(join(ROOT, MIRA), "utf8")) as Birth;
  // The chart is computed from the birth as recorded; only the zone the profile names is changed.
  const chart = chartForProfile(rowOf(MIRA).profile);
  const zoneOf = (profile: Partial<ReaderRow["profile"]>) => T.readerOf("user_reader", rowOf(MIRA, { profile }), chart).zone;
  assert.equal(zoneOf({ timezone: "Asia/Tokyo" }), "Asia/Tokyo");
  assert.equal(zoneOf({ timezone: "asia/tokyo" }), "Asia/Tokyo", "named in its canonical form");
  assert.equal(zoneOf({ timezone: "Mars/Olympus" }), "Europe/Lisbon", "an unreadable zone falls to the coordinates");
  assert.equal(zoneOf({ timezone: null }), "Europe/Lisbon");
  assert.equal(zoneOf({ timezone: "" }), "Europe/Lisbon");
  for (const [latitude, longitude] of [[0, -30], [-60, 150], [89.9, 0]]) {
    const zone = zoneOf({ timezone: null, latitude, longitude });
    assert.ok(T.validZone(zone), `${latitude},${longitude} gives a zone the runtime reads, not ${zone}`);
  }
});

test("a day starts exactly once and at the first second it has, in every zone, on every day of a year", () => {
  for (const zone of ["Europe/Lisbon", "America/Santiago", "Asia/Beirut", "America/Havana", "Australia/Lord_Howe", "Pacific/Apia", "Asia/Kolkata", "UTC"]) {
    let day = "2026-01-01";
    let previous = -Infinity;
    for (let i = 0; i < 365; i++, day = nextDay(day)) {
      const begins = T.dayStart(day, zone);
      assert.equal(T.dayIn(begins, zone), day, `${day} in ${zone}`);
      assert.notEqual(T.dayIn(new Date(ms(begins) - 1000), zone), day, `${day} in ${zone}: a second earlier is another day`);
      assert.ok(ms(begins) > previous, `${day} in ${zone}: days run forward`);
      assert.ok(ms(begins) - previous <= 25 * 3_600_000 + 1 || previous === -Infinity, `${day} in ${zone}: a day is never longer than 25 hours`);
      previous = ms(begins);
    }
  }
});

test("a day's tones are the contacts whose spans meet that calendar day, across zones, clock changes and charts", () => {
  const cases: Array<[string, string, string, Date]> = [
    [MIRA, "Europe/Lisbon", "six-months", NOW],
    [MIRA, "Pacific/Kiritimati", "six-months", NOW],
    [MIRA, "America/Los_Angeles", "six-months", NOW],
    [MIRA, "Australia/Lord_Howe", "month", new Date("2026-09-25T00:00:00Z")],
    [BLIND, "Europe/Warsaw", "six-months", NOW],
    [OPRAH, "America/Chicago", "six-months", NOW],
  ];
  let gapped = 0;
  for (const [path, zone, range, now] of cases) {
    const reader = readerFrom(path);
    const view = T.nowView(reader, range as "month", zone, new Map(), now);
    const contacts = view.events.filter((e) => e.kind === "contact");
    view.days.forEach((d) => {
      const open = ms(T.dayStart(d.date, zone));
      const close = ms(T.dayStart(nextDay(d.date), zone));
      const expected = contacts.filter((e) => e.spans.some((s) => ms(s.start) < close && ms(s.end) >= open)).map((e) => e.tone!).sort((a, b) => rank[a] - rank[b]);
      assert.deepEqual(d.tones, expected, `${path} ${zone} ${d.date}`);
    });
    for (const e of contacts) {
      if (e.spans.length > 1) gapped++;
      e.spans.forEach((s, i) => {
        assert.ok(ms(s.start) < ms(s.end), `${e.key}: a span has length`);
        if (i > 0) assert.ok(ms(s.start) > ms(e.spans[i - 1].end), `${e.key}: spans run forward with a gap between`);
      });
      assert.equal(ms(e.spans[0].start), ms(e.start));
      assert.equal(ms(e.spans[e.spans.length - 1].end), ms(e.end));
    }
  }
  assert.ok(gapped > 0, "some contact is taken out of orb and back by a retrograde");
});

test("a retrograde and an eclipse are one span, and an eclipse is one moment", () => {
  const view = T.nowView(readerFrom(MIRA), "six-months", "Europe/Lisbon", new Map(), NOW);
  const others = view.events.filter((e) => e.kind !== "contact");
  assert.ok(others.some((e) => e.kind === "retrograde") && others.some((e) => e.kind === "eclipse"));
  for (const e of others) {
    assert.equal(e.spans.length, 1, e.key);
    assert.deepEqual([ms(e.spans[0].start), ms(e.spans[0].end)], [ms(e.start), ms(e.end)], e.key);
    if (e.kind === "eclipse") assert.equal(ms(e.start), ms(e.end), `${e.key} is one moment`);
    assert.equal(e.orbNow, null);
    assert.equal(e.aspect, null);
  }
});

test("a view is a copy: changing what it returns changes nothing the next read finds", () => {
  const reader = readerFrom(MIRA);
  const read = () => JSON.stringify([
    T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), NOW),
    T.weekView(reader, "Europe/Lisbon", NOW),
    T.lifeView(reader, "Europe/Lisbon", new Map(), NOW),
    T.teaserView(reader, NOW),
  ]);
  const before = read();
  const now = T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), NOW);
  const week = T.weekView(reader, "Europe/Lisbon", NOW);
  const life = T.lifeView(reader, "Europe/Lisbon", new Map(), NOW);
  const teaser = T.teaserView(reader, NOW)!;
  for (const e of [...now.events, ...week.on]) {
    e.start.setTime(0);
    e.end.setTime(0);
    e.exact.forEach((at) => at.setTime(0));
    e.spans.forEach((s) => { s.start.setTime(0); s.end.setTime(0); });
    e.houses.push(99);
    e.facts.sky = "changed";
  }
  for (const d of [...now.days, ...week.days]) d.tones.push("intense");
  now.natal.forEach((p) => { p.lon = -1; });
  now.next.forEach((n) => n.at.setTime(0));
  life.birth.setTime(0);
  life.cycles.forEach((c) => { c.start.setTime(0); c.exact.forEach((at) => at.setTime(0)); });
  life.ages.forEach((a) => { a.next?.setTime(0); a.last?.setTime(0); });
  life.waves.forEach((w) => w.points.splice(0));
  teaser.cycles.splice(0);
  assert.equal(read(), before);
  assert.equal(ms(reader.birth), ms(new Date(reader.chart.datetimeUtc)), "the reader's birth is untouched");
});

test("what is next comes strictly after now and before the range closes, in order, with starts before peaks before eases at one instant", () => {
  const reader = readerFrom(MIRA);
  const view = T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), NOW);
  const first = view.next[0];
  const at = (d: Date) => T.nowView(reader, "six-months", "Europe/Lisbon", new Map(), d);
  assert.ok(at(new Date(ms(first.at) - 1)).next.some((n) => n.key === first.key && ms(n.at) === ms(first.at)), "a moment before it, it is next");
  assert.ok(!at(first.at).next.some((n) => n.key === first.key && n.change === first.change && ms(n.at) === ms(first.at)), "at its own instant it has happened");
  const order = { starts: 0, peaks: 1, eases: 2 } as const;
  view.next.forEach((n, i) => {
    if (i === 0) return;
    const p = view.next[i - 1];
    assert.ok(ms(n.at) >= ms(p.at));
    if (ms(n.at) === ms(p.at)) assert.ok(order[n.change] >= order[p.change] || n.key >= p.key);
  });
  const close = ms(T.dayStart(nextDay(view.to), view.zone));
  assert.ok(view.next.every((n) => ms(n.at) < close));
  assert.ok(T.nowView(reader, "week", "Europe/Lisbon", new Map(), NOW).next.every((n) => ms(n.at) < ms(T.dayStart("2026-10-12", "Europe/Lisbon"))), "the week's next stops at the week's end");
});

test("an event's reading status comes from the map by its key, and a key the view lacks changes nothing", () => {
  const reader = readerFrom(MIRA);
  const plain = T.nowView(reader, "month", null, new Map(), NOW);
  const target = plain.events.find((e) => e.kind === "contact")!;
  const stray = new Map<string, import("./timeline.js").ReadingState>([
    ["contact.pluto.square.sun.19000101", "ready"],
    ["", { status: "ready", line: "nothing" }],
  ]);
  assert.deepEqual(T.nowView(reader, "month", null, stray, NOW), plain);
  const noLine = T.nowView(reader, "month", null, new Map([[target.key, { status: "ready" as const }]]), NOW).events.find((e) => e.key === target.key)!;
  assert.deepEqual([noLine.reading, noLine.line], ["ready", null], "a ready reading with no line lends none");
  const bare = T.nowView(reader, "month", null, new Map([[target.key, "failed" as const]]), NOW).events.find((e) => e.key === target.key)!;
  assert.deepEqual([bare.reading, bare.line], ["failed", null]);
  const week = T.weekView(reader, null, NOW);
  assert.ok(week.on.every((e) => e.reading === "none"), "the dashboard looks up no reading");
});

test("a chart with no birth time has no angle, house or Moon contact in the week, the teaser or a key, in every view", () => {
  const reader = readerFrom(BLIND);
  const week = T.weekView(reader, null, NOW);
  assert.equal(week.angles, null);
  assert.ok(!week.natal.some((p) => p.body === "moon"));
  assert.ok(week.natal.every((p) => p.house === null));
  for (const e of week.on) {
    assert.ok(!["moon", "ascendant", "midheaven"].includes(e.target ?? ""), e.key);
    assert.deepEqual(e.houses, []);
    assert.equal(e.facts.house, null);
  }
  const life = T.lifeView(reader, null, new Map(), NOW);
  assert.ok(life.cycles.every((c) => c.body !== "moon"));
  const view = T.nowView(reader, "six-months", null, new Map(), NOW);
  assert.ok(view.events.every((e) => e.body !== "moon" || e.kind === "eclipse"), "the Moon is a body in no contact; only an eclipse names it");
  // A key an angle carried on a drawn chart names nothing here.
  const drawn = T.nowView(readerFrom(MIRA), "six-months", null, new Map(), NOW).events.find((e) => e.target === "ascendant");
  assert.ok(drawn);
  assert.equal(T.eventByKey(reader, drawn.key, NOW), null);
});

test("a drawn chart's week and Now agree on the dial: the same natal points, angles and days", () => {
  const reader = readerFrom(OPRAH);
  const now = T.nowView(reader, "week", "America/Chicago", new Map(), NOW);
  const week = T.weekView(reader, "America/Chicago", NOW);
  assert.deepEqual(week.natal, now.natal);
  assert.deepEqual(week.angles, now.angles);
  assert.deepEqual(week.days, now.days);
  assert.deepEqual([...week.on.map((e) => e.key)].sort(), now.events.map((e) => e.key).sort());
  assert.ok(now.natal.every((p) => p.house !== null && p.house >= 1 && p.house <= 12));
  assert.ok(now.angles && now.angles.ascendant >= 0 && now.angles.ascendant < 360 && now.angles.midheaven >= 0 && now.angles.midheaven < 360);
});

test("a cycle is past from the day after its window closes, in the reader's zone, and no sooner", () => {
  const reader = readerFrom(MIRA);
  const cycle = E.lifeCycles(E.natalLongitudes(reader.chart), reader.birth).find((c) => c.id === "saturn-return")!;
  const zone = "Europe/Lisbon";
  const lastDay = T.dayIn(cycle.window.end, zone);
  const pastAt = (now: Date) => T.lifeView(reader, zone, new Map(), now).cycles.find((c) => c.key === cycle.key)!.past;
  assert.equal(pastAt(cycle.window.end), false, "on the day it closes it is still on");
  assert.equal(pastAt(new Date(ms(T.dayStart(nextDay(lastDay), zone)) - 1)), false, "its last millisecond of that day");
  assert.equal(pastAt(T.dayStart(nextDay(lastDay), zone)), true, "the next day's first moment");
  assert.equal(pastAt(cycle.window.start), false);
});

test("the known ages move from next to last at the same boundary, and the age shown is the one under way or the last", () => {
  const reader = readerFrom(MIRA);
  const zone = "Europe/Lisbon";
  const cycles = E.lifeCycles(E.natalLongitudes(reader.chart), reader.birth).filter((c) => c.id === "saturn-return");
  const first = cycles[0];
  const lastDay = T.dayIn(first.window.end, zone);
  const saturn = (now: Date) => T.lifeView(reader, zone, new Map(), now).ages.find((a) => a.id === "saturn-return")!;
  const during = saturn(first.window.end);
  assert.equal(during.age, first.age);
  assert.equal(ms(during.next!), ms(first.window.exact[0] ?? first.window.start));
  assert.equal(during.last, null, "nothing came before a first return");
  const after = saturn(T.dayStart(nextDay(lastDay), zone));
  assert.equal(ms(after.last!), ms(first.window.exact[0] ?? first.window.start));
  assert.equal(after.age, cycles[1].age, "the next return's age is the one shown");
  assert.equal(ms(after.next!), ms(cycles[1].window.exact[0] ?? cycles[1].window.start));
});

test("the teaser keeps the Saturn return's ring and puts what is under way or ahead first, in the birth place's days", () => {
  const reader = readerFrom(MIRA);
  const returns = E.lifeCycles(E.natalLongitudes(reader.chart), reader.birth).filter((c) => c.id === "saturn-return");
  const mid = returns[0].window.exact[0];
  const during = T.teaserView(reader, mid)!;
  assert.equal(during.saturn.age, returns[0].age, "the ring names the first return");
  assert.deepEqual(during.cycles.find((c) => c.id === "saturn-return"), {
    id: "saturn-return", name: "Saturn return", word: "A reset", age: returns[0].age, on: T.dayIn(mid, reader.zone),
  });
  const after = T.teaserView(reader, new Date(ms(returns[0].window.end) + 2 * DAY_MS))!;
  assert.equal(after.saturn.age, returns[0].age, "the ring stays on the first return once it is behind");
  assert.equal(after.cycles.find((c) => c.id === "saturn-return")!.age, returns[1].age, "the list moves on to the second");
  assert.equal(during.cycles.length, 4);
  assert.equal(after.cycles.length, 4);
  for (const t of [during, after]) {
    assert.ok(t.saturn.progress >= 0 && t.saturn.progress <= 1, String(t.saturn.progress));
    for (const c of t.cycles) assert.match(c.on, /^\d{4}-\d{2}-\d{2}$/);
  }
  // The teaser reads no zone from a browser: the same instant is the same answer.
  assert.deepEqual(T.teaserView(reader, NOW), T.teaserView(reader, new Date(ms(NOW))));
});

test("the reader's age counts whole years as birthdays fall, and never reads a birthday before it comes", () => {
  const reader = readerFrom(MIRA);
  const b = reader.birth;
  const birthday = (years: number) => {
    const at = new Date(b);
    at.setUTCFullYear(b.getUTCFullYear() + years);
    return at;
  };
  const age = (now: Date) => T.lifeView(reader, null, new Map(), now).age;
  assert.equal(age(birthday(30)), 30);
  assert.equal(age(new Date(ms(birthday(30)) + 1)), 30);
  assert.equal(age(b), 0);
  const half = new Date((ms(birthday(30)) + ms(birthday(31))) / 2);
  assert.ok(Math.abs(age(half) - 30.5) < 0.002, String(age(half)));
  let last = -1;
  for (let day = 0; day < 800; day += 7) {
    const now = new Date(ms(birthday(30)) - 100 * DAY_MS + day * DAY_MS);
    const a = age(now);
    assert.ok(a >= last, "age never goes back");
    last = a;
  }
});

// R16-23 says Life gives "the reader's age today", and the engine's `ageAt` is the whole years a birthday has made. Rounding
// to a thousandth of a year makes the last four hours before a birthday read as the birthday's age.
test("the reader's age is under the next whole year until the birthday itself", () => {
  const reader = readerFrom(MIRA);
  const b = reader.birth;
  const thirtieth = new Date(b);
  thirtieth.setUTCFullYear(b.getUTCFullYear() + 30);
  const justBefore = new Date(ms(thirtieth) - 3_600_000);
  const life = T.lifeView(reader, null, new Map(), justBefore);
  assert.equal(E.ageAt(b, justBefore), 29);
  assert.ok(life.age < 30, `an hour before the thirtieth birthday the age reads ${life.age}`);
  assert.equal(Math.floor(life.age), E.ageAt(b, justBefore));
});

test("a reader's basis changes with anything that makes a reading stale, and not with what does not", () => {
  const basis = T.basisOf;
  assert.notEqual(basis("09:15", 0), basis("09:16", 0), "a new birth time");
  assert.notEqual(basis("09:15", 0), basis("09:15", 30), "a new window");
  assert.equal(basis("09:15", 0), basis("09:15", 0));
  assert.match(basis("09:15", 0), new RegExp(`:${TIMELINE_PROMPT_VERSION}$`), "the prompt's version closes it");
  assert.equal(basis("09:15", 719), `${E.CHART_VERSION}:09:15:719:${TIMELINE_PROMPT_VERSION}`, "719 minutes is still a time");
  assert.equal(basis("09:15", 720), `${E.CHART_VERSION}:none:720:${TIMELINE_PROMPT_VERSION}`, "720 is no birth time");
  assert.equal(basis("09:15", 721), `${E.CHART_VERSION}:none:721:${TIMELINE_PROMPT_VERSION}`);
  assert.equal(basis("12:00", 720), basis("00:00", 720), "with no time, the clock the profile happens to hold is no basis");
});

test("a stored chart is stale unless it carries the engine's own version or a newer one", () => {
  for (const stored of [null, undefined, {}, [], "5", 0, { chartVersion: "6" }, { chartVersion: null }, { chartVersion: E.CHART_VERSION - 1 }, { chartVersion: 0 }, 7, "x"]) {
    assert.equal(T.chartIsStale(stored), true, JSON.stringify(stored));
  }
  assert.equal(T.chartIsStale({ chartVersion: E.CHART_VERSION }), false);
  assert.equal(T.chartIsStale({ chartVersion: E.CHART_VERSION + 1 }), false, "a chart from a newer engine is not rewritten by an older one");
});

test("of equal reports the later one is the reader's, then the greater id, and a shared or taken-over chart is nobody's", () => {
  const viewer = { userId: "user_reader", sessionId: "s-other" };
  const same = new Date("2026-09-01T00:00:00Z");
  const a = rowOf(MIRA, { report: { id: "report-a", createdAt: same } });
  const b = rowOf(MIRA, { report: { id: "report-b", createdAt: same } });
  assert.equal(T.readerReportOf(viewer, [a, b], new Set())?.report.id, "report-b");
  assert.equal(T.readerReportOf(viewer, [b, a], new Set())?.report.id, "report-b", "the order of the rows does not decide");
  assert.equal(T.readerReportOf(viewer, [], new Set()), null);
  const status = (s: string) => rowOf(MIRA, { report: { id: `report-${s}`, status: s } });
  for (const s of ["pending", "interpreting", "failed", "queued", "", "COMPLETE"]) assert.equal(T.readerReportOf(viewer, [status(s)], new Set()), null, s);
  assert.equal(T.readerReportOf(viewer, [status("complete")], new Set())?.report.id, "report-complete");
  assert.equal(T.readerReportOf(viewer, [status("revising")], new Set())?.report.id, "report-revising");
  const other = { userId: "user_stranger", sessionId: "s-stranger" };
  assert.equal(T.readerReportOf(other, [a], new Set()), null, "a stranger is nobody's reader");
});

test("an event key names a sky event only on the day it carries, in the chart's own life, and never one with an impossible date", () => {
  const reader = readerFrom(MIRA);
  const view = T.nowView(reader, "six-months", null, new Map(), NOW);
  const contact = view.events.find((e) => e.kind === "contact")!;
  const key = contact.key;
  assert.ok(T.eventByKey(reader, key, NOW));
  const [head, date] = [key.slice(0, -8), key.slice(-8)];
  const shifted = (days: number) => `${head}${new Date(Date.parse(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10).replace(/-/g, "")}`;
  assert.equal(T.eventByKey(reader, shifted(3000), NOW), null, "years from its day");
  for (const bad of [`${head}00000000`, `${head}20261340`, `${head}2026-1-1`, `${head}`, `${key}0`, `${key.toUpperCase()}`, `${key} `, ` ${key}`, key.replace(/\./g, "/"), `x${key}`]) {
    assert.equal(T.eventByKey(reader, bad, NOW), null, JSON.stringify(bad));
  }
  for (const key of [null, undefined, 5, {}, []]) assert.equal(T.eventByKey(reader, key as never, NOW), null);
  assert.equal(T.eventByKey(reader, `cycle.saturn-return.${"9".repeat(8)}`, NOW), null);
});

test("the reader's age is cut at a thousandth of a year, never rounded up, on every hour of the two days before a birthday", () => {
  const reader = readerFrom(MIRA);
  const b = reader.birth;
  const thirtieth = new Date(b);
  thirtieth.setUTCFullYear(b.getUTCFullYear() + 30);
  const age = (now: Date) => T.lifeView(reader, null, new Map(), now).age;
  for (let hours = 48; hours >= 1; hours -= 1) {
    const now = new Date(ms(thirtieth) - hours * 3_600_000);
    const a = age(now);
    assert.equal(Math.floor(a), E.ageAt(b, now), `${hours} hours before: ${a}`);
    assert.equal(Number(a.toFixed(3)), a, "three decimals, as stored");
  }
  assert.equal(age(new Date(ms(thirtieth) - 1)), 29.999, "the last millisecond before is still 29");
  assert.equal(age(thirtieth), 30, "the birthday itself is 30");
});
