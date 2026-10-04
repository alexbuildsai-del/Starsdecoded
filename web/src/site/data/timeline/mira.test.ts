/**
 * Mira on /timeline (timeline-page acceptance 1 and 5, reading 22): every fact the page shows about her is the
 * engine's, recomputed here from her fixture; every sample line is a template whose dates, pass counts and houses are
 * those facts, so a line the engine no longer bears out fails here; and the page gets plain data, never an engine call.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  KNOWN_AGES, calculateNatalChart, factsOf, headlineOf, inEffect, lifeCycles, longitudeAt, natalLongitudes, noonLongitudes,
  offsetAtBirth, roundProgress, skyEvents, speedAt, waves, weekSentence,
  type ContactEvent, type LifeCycle, type SkyEvent, type Tone,
} from "@workspace/engine";
import { fullDate, nearDate } from "@/lib/timeline-view";
import fixture from "../../../../../fixtures/sample-people/mira.json";
import { ANCHOR, COUNTS, EVERYDAY, MIRA, MIRA_WEEK, ORDINALS, SAMPLE_WORDS, contactsIn, miraOf, pairOf, type MiraWeekFile } from "./mira";

const ZONE = fixture.timezone;
const WEEK = MIRA_WEEK.week;
const FRAMES = 182;
const HERO = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const RANK: Record<Tone, number> = { intense: 0, mixed: 1, easy: 2 };
const SLOW = 120_000;

const chart = calculateNatalChart(fixture.birthDate, fixture.birthTime, fixture.latitude, fixture.longitude, ZONE, 0);
const born = new Date(chart.datetimeUtc);

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function midnight(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - offsetAtBirth(ZONE, day, "00:00") * 3_600_000);
}
function dayIn(at: Date, zone = ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const noon = (day: string) => new Date(`${day}T12:00:00Z`);
const r2 = (n: number) => Math.round(n * 100) / 100;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

const events: SkyEvent[] = skyEvents(chart, midnight(WEEK), midnight(addDays(WEEK, FRAMES)));
const contacts = events.filter((e): e is ContactEvent => e.kind === "contact");
const onDay = (day: string) => inEffect(contacts, midnight(day));
const known = KNOWN_AGES.map((a) => a.id);

describe("Mira's facts are the engine's, from her fixture", () => {
  it("names the week the Release moved it to, a Monday, and her age then", () => {
    expect(noon(WEEK).getUTCDay()).toBe(1);
    expect(MIRA.week).toMatchObject({ from: WEEK, to: addDays(WEEK, 6) });
    const birthday = new Date(born.getTime());
    birthday.setUTCFullYear(noon(WEEK).getUTCFullYear());
    expect(MIRA.week.age).toBe(noon(WEEK).getUTCFullYear() - born.getUTCFullYear() - (noon(WEEK) < birthday ? 1 : 0));
  });

  it("draws her own chart inside the dial: her planets and houses, her Ascendant and Midheaven", () => {
    expect(MIRA.points).toEqual(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].map((body) => ({
      body, lon: chart.planets[body].absoluteDegree, house: chart.planets[body].house ?? null,
    })));
    expect(MIRA.angles).toEqual({ ascendant: chart.angles!.ascendant.absoluteDegree, midheaven: chart.angles!.midheaven.absoluteDegree });
  });

  it("plays six months, Mars to Pluto, each planet where the engine puts it at noon and each day's contacts the doctrine's", () => {
    expect(MIRA.frames).toHaveLength(FRAMES);
    MIRA.frames.forEach((frame, i) => {
      const date = addDays(WEEK, i);
      expect(frame.date).toBe(date);
      expect(frame.bodies.map((b) => b.body)).toEqual(HERO);
      const on = onDay(date);
      for (const b of frame.bodies) {
        const at = noon(date);
        expect(Math.abs(b.lon - r2(norm(longitudeAt(b.body, at))))).toBeLessThanOrEqual(0.0101);
        expect(b.retrograde, `${b.body} on ${date}`).toBe(speedAt(b.body, at) < 0);
        const tones = on.filter((c) => c.body === b.body).map((c) => c.tone).sort((x, y) => RANK[x] - RANK[y]);
        expect(b.tone, `${b.body}'s tone on ${date}`).toBe(tones[0] ?? null);
      }
      const pairs = (list: readonly { body: string; aspect: string; target: string }[]) => list.map((c) => `${c.body}.${c.aspect}.${c.target}`).sort();
      expect(pairs(frame.contacts), `contacts on ${date}`).toEqual(pairs(on));
      expect(frame.headlines.length).toBe(Math.min(3, new Set(on.map((c) => headlineOf(c))).size));
      for (const line of frame.headlines) expect(on.map((c) => headlineOf(c))).toContain(line);
      if (on.some((c) => c.tone === "intense")) expect(on.filter((c) => c.tone === "intense").map((c) => headlineOf(c))).toContain(frame.headlines[0]);
    });
  }, SLOW);

  it("lists the Monday's contacts in orb, with the engine's words, when each leaves its orb and when it comes back", () => {
    const today = onDay(WEEK);
    expect(MIRA.contacts.map((c) => c.key).sort()).toEqual(today.map((c) => c.key).sort());
    expect(MIRA.contacts.map((c) => RANK[c.tone])).toEqual([...MIRA.contacts.map((c) => RANK[c.tone])].sort((a, b) => a - b));
    for (const card of MIRA.contacts) {
      const event = today.find((c) => c.key === card.key)!;
      expect(card.headline).toBe(headlineOf(event));
      expect(card.facts.startsWith([factsOf(event).sky, factsOf(event).house].filter(Boolean).join(" · "))).toBe(true);
      let last = WEEK;
      while (inEffect([event], midnight(addDays(last, 1))).length) last = addDays(last, 1);
      expect(card.lasts.startsWith(last === WEEK ? "Eases today" : `Until ${nearDate(last, WEEK, "dmy")}`), `${card.key}: ${card.lasts}`).toBe(true);
      expect(card.line, `${card.key} has an everyday line`).toBe(EVERYDAY[pairOf(event)]);
    }
  }, SLOW);

  it("counts the week as the engine does: its sentence, each day's tones, and what starts, peaks and eases", () => {
    expect(MIRA.sentence).toBe(weekSentence(events, midnight(WEEK)));
    MIRA.days.forEach((day, d) => {
      expect(day.date).toBe(addDays(WEEK, d));
      expect(day.tones).toEqual(onDay(day.date).map((c) => c.tone).sort((a, b) => RANK[a] - RANK[b]));
    });
    const open = midnight(WEEK).getTime();
    const moments = events.flatMap((e) => (e.kind === "contact"
      ? [[e.window.start, "starts"], ...e.window.exact.map((at) => [at, "peaks"]), [e.window.end, "eases"]]
      : e.kind === "retrograde" ? [[e.start, "starts"], [e.end, "eases"]] : [[e.eclipse.at, "peaks"]]).map(([at, change]) => ({ at: at as Date, change: change as string, key: e.key })));
    const inWeek = moments.filter(({ at }) => at.getTime() >= open && at.getTime() < open + 7 * 86_400_000);
    expect(MIRA.week.changes.map((c) => `${c.day} ${c.key} ${c.change}`).sort()).toEqual(inWeek.map((m) => `${dayIn(m.at)} ${m.key} ${m.change}`).sort());
    for (const change of [...MIRA.week.changes, ...MIRA.next]) {
      expect(change.headline).toBe(headlineOf(events.find((e) => e.key === change.key)!));
    }
    const after = moments.filter(({ at }) => at.getTime() >= midnight(addDays(WEEK, 1)).getTime()).sort((a, b) => a.at.getTime() - b.at.getTime());
    expect(MIRA.next.map((c) => c.day)).toEqual(after.slice(0, 3).map((m) => dayIn(m.at)));
  });

  it("gives her known ages' cycles, birth to 90, how far round each planet is, her waves and the finder's own answer", () => {
    const natal = natalLongitudes(chart);
    const asDays = (cycles: LifeCycle[], zone: string) => cycles.map((c) => ({ key: c.key, age: c.age, start: dayIn(c.window.start, zone), exact: c.window.exact.map((at) => dayIn(at, zone)) }));
    const mine = (list: typeof MIRA.cycles) => list.map((c) => ({ key: c.key, age: c.age, start: c.start, exact: [...c.exact] }));
    expect(mine(MIRA.cycles)).toEqual(asDays(lifeCycles(natal, born, { ids: known }), ZONE));
    expect(MIRA.ages.map((a) => a.id)).toEqual(known);
    for (const age of MIRA.ages) {
      const body = KNOWN_AGES.find((k) => k.id === age.id)!.body;
      expect(Math.abs(age.progress - roundProgress(body, natal[body]!, noon(WEEK)))).toBeLessThan(0.0011);
      expect(age.cycle.id).toBe(age.id);
    }
    const lines = waves(natal, born).filter((w) => w.body === "saturn" || w.body === "jupiter");
    expect(MIRA.wave.lines.map((l) => l.body)).toEqual(lines.map((l) => l.body));
    MIRA.wave.lines.forEach((line, i) => {
      expect(line.points.map((p) => p.age)).toEqual(lines[i].points.map((p) => p.age));
      line.points.forEach((p, j) => expect(Math.abs(p.distance - lines[i].points[j].distance)).toBeLessThanOrEqual(0.0101));
    });
    expect(Math.floor(MIRA.wave.today)).toBe(MIRA.week.age);
    const finder = lifeCycles(noonLongitudes(fixture.birthDate), noon(fixture.birthDate), { ids: known });
    expect(MIRA.finder.birthDate).toBe(fixture.birthDate);
    expect(mine(MIRA.finder.cycles)).toEqual(asDays(finder, "UTC"));
  }, SLOW);
});

describe("her sample words are templates the engine fills (acceptance 5)", () => {
  const anchor = onDay(WEEK).find((c) => pairOf(c) === ANCHOR);
  const exact = anchor ? anchor.window.exact.map((at) => dayIn(at)) : [];
  const { sample } = MIRA;

  it("reads Saturn on her Ascendant, in orb that Monday, with the engine's house, passes and dates", () => {
    expect(anchor, "the contact her reading and questions are about").toBeDefined();
    const facts = factsOf(anchor!);
    const behind = exact.filter((day) => day <= WEEK).length;
    expect(sample.tag).toBe(SAMPLE_WORDS);
    expect(sample.reading.headline).toBe(headlineOf(anchor!));
    expect(sample.reading.tone).toBe(anchor!.tone);
    expect(sample.reading.after).toContain(`Astrology reads ${facts.sky} as`);
    expect(sample.reading.after).toContain(`It's the ${ORDINALS[behind - 1]} of ${COUNTS[exact.length]} passes.`);
    expect(sample.reading.after).toContain(`The first was on ${fullDate(exact[0], "dmy")} and the last is on ${fullDate(exact[exact.length - 1], "dmy")}.`);
    expect(sample.reportLine.source).toBe(`From her report · House by House · ${facts.house}`);
    expect(sample.reading.link).toBe(`Read your ${facts.house} again ›`);
    expect(sample.questions).toEqual([`What does ${facts.sky.replace(" your ", " my ")} mean for me?`, "When does it ease?", `How does this fit my report's ${facts.house}?`]);
    expect(`${sample.reading.before}${sample.reading.quote}`).toBe(`Your report says ${sample.reading.quote}`);
    expect(sample.reportLine.text.toLowerCase()).toContain(sample.reading.quote);
  });

  it("subjects the Monday email with the week's own sentence", () => {
    const said = weekSentence(events, midnight(WEEK)).replace(/ this week$/, "");
    expect(sample.subject).toBe(`Your week: ${said.charAt(0).toLowerCase()}${said.slice(1)}`);
  });

  it("holds no date, number or house the engine did not give", () => {
    const facts = factsOf(anchor!);
    const given = [...exact.map((day) => fullDate(day, "dmy")), facts.house ?? ""].filter(Boolean);
    const lines = [...Object.values(sample.everyday), sample.reportLine.text, sample.reading.bridge, sample.reading.before, sample.reading.quote, sample.reading.after, sample.reading.link, ...sample.questions, sample.subject];
    for (const line of lines) {
      const rest = given.reduce((text, fact) => text.split(fact).join(""), line);
      expect(rest, line).not.toMatch(/\d/);
    }
  });

  it("says how long only where the contact lasts that long: each pass a few days, or a few months in all", () => {
    for (const c of contacts) {
      const line = EVERYDAY[pairOf(c)];
      if (!line) continue;
      if (/a few days/.test(line)) {
        // A retrograde can bring a fast planet back for a second short pass inside one window, so each pass is counted.
        let run = 0;
        for (let day = dayIn(c.window.start); day <= dayIn(c.window.end); day = addDays(day, 1)) {
          run = inEffect([c], midnight(day)).length ? run + 1 : 0;
          expect(run, `${c.key}: ${line}`).toBeLessThanOrEqual(10);
        }
      }
      if (/a few months/.test(line)) expect((c.window.end.getTime() - c.window.start.getTime()) / 86_400_000, `${c.key}: ${line}`).toBeGreaterThanOrEqual(60);
    }
    expect((anchor!.window.end.getTime() - anchor!.window.start.getTime()) / 86_400_000, "the reading's few months").toBeGreaterThanOrEqual(60);
  }, SLOW);

  it("fails a week the words no longer fit, naming the file to rewrite", () => {
    const without = { ...MIRA_WEEK, contacts: MIRA_WEEK.contacts.filter((c) => pairOf(c) !== ANCHOR) };
    expect(() => miraOf(without)).toThrow(/Saturn is not on her Ascendant.*Rewrite her sample words in web\/src\/site\/data\/timeline\/mira\.ts/);
    const quiet: MiraWeekFile = { ...MIRA_WEEK, sentence: "A quiet week for your chart" };
    expect(() => miraOf(quiet)).toThrow(/a quiet week sends no Monday email/);
    const late: MiraWeekFile = { ...MIRA_WEEK, contacts: MIRA_WEEK.contacts.map((c) => (pairOf(c) === ANCHOR ? { ...c, exact: c.exact.filter((day) => day <= WEEK) } : c)) };
    expect(() => miraOf(late)).toThrow(/passes behind her and ahead/);
  });
});

describe("the page gets plain data", () => {
  it("is the same after a JSON round trip: no Date, no function", () => {
    expect(JSON.parse(JSON.stringify(MIRA))).toEqual(MIRA);
  });

  it("imports nothing that loads the engine, the engine itself or the dial's module, but its types", () => {
    const source = readFileSync(new URL("./mira.ts", import.meta.url), "utf8");
    const engine = [...source.matchAll(/^import (type )?[^;]*from "(@workspace\/engine|@\/lib\/dial)";$/gm)];
    expect(engine.length).toBe(2);
    expect(engine.every((m) => m[1] === "type ")).toBe(true);
  });

  it("redraws the Monday's cards in a reader's own date order", () => {
    const us = contactsIn("mdy");
    expect(us.map((c) => c.key)).toEqual(MIRA.contacts.map((c) => c.key));
    const first = MIRA.contacts.find((c) => c.lasts.startsWith("Until "));
    if (first) expect(us.find((c) => c.key === first.key)!.lasts).toMatch(/^Until [A-Z][a-z]{2} \d/);
  });
});
