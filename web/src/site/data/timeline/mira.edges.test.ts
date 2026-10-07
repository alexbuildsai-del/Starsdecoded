/**
 * Mira's file and her page data at their edges (R16-05, readings 9, 18, 22; acceptance 5): the committed week's own
 * shape held to what the page needs of it, whoever wrote it; every guard that turns a week her sample words no longer
 * fit into an error naming the file to rewrite; and the cards, days and frames the page draws from it, in the order the
 * spec gives. `mira.test.ts` recomputes every fact from her fixture with the engine.
 */
import { describe, expect, it } from "vitest";
import { fullDate } from "@/lib/timeline-view";
import fixture from "../../../../../fixtures/sample-people/mira.json";
import {
  ANCHOR, COUNTS, EVERYDAY, MIRA, MIRA_WEEK, ORDINALS, contactsIn, miraOf, pairOf, type MiraWeekContact, type MiraWeekFile,
} from "./mira";

const WEEK = MIRA_WEEK.week;
const DAY = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const clone = (): MiraWeekFile => structuredClone(MIRA_WEEK);
const anchorOf = (week: MiraWeekFile): MiraWeekContact => week.contacts.find((c) => pairOf(c) === ANCHOR)!;
const rank = { intense: 0, mixed: 1, easy: 2 } as const;

/** Her week with Saturn's passes over her Ascendant replaced, the first `behind` of them on or before the Monday. */
function withPasses(behind: number, count: number): MiraWeekFile {
  const week = clone();
  const anchor = anchorOf(week);
  anchor.runs = [anchor.runs.find(([a, b]) => a <= WEEK && WEEK <= b)!];
  const before = Array.from({ length: behind }, (_, i) => addDays(WEEK, -(behind - i) * 3));
  const after = Array.from({ length: count - behind }, (_, i) => addDays(WEEK, 2 + i));
  anchor.exact = [...before, ...after];
  return week;
}

describe("the committed week is a file the page can draw", () => {
  it("is a Monday, 182 days of six slow planets, every place on the circle and every backward run inside the frames", () => {
    expect(new Date(`${WEEK}T12:00:00Z`).getUTCDay()).toBe(1);
    expect(MIRA_WEEK.sky.map((s) => s.body)).toEqual(["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]);
    for (const s of MIRA_WEEK.sky) {
      expect(s.lon).toHaveLength(182);
      expect(s.lon.every((lon) => Number.isFinite(lon) && lon >= 0 && lon <= 360), s.body).toBe(true);
      let end = -2;
      for (const [a, b] of s.retrograde) {
        expect(a, s.body).toBeGreaterThanOrEqual(0);
        expect(a, `${s.body}: two runs touching are one`).toBeGreaterThan(end + 1);
        expect(a).toBeLessThanOrEqual(b);
        expect(b).toBeLessThan(182);
        end = b;
      }
    }
    expect(MIRA.frames).toHaveLength(182);
    expect(MIRA.frames[0].date).toBe(WEEK);
    expect(MIRA.frames[181].date).toBe(addDays(WEEK, 181));
  });

  it("holds her seven planets and two angles, and a house for each planet because she has a birth time", () => {
    expect(MIRA_WEEK.points.map((p) => p.body)).toEqual(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);
    for (const p of MIRA_WEEK.points) {
      expect(p.lon).toBeGreaterThanOrEqual(0);
      expect(p.lon).toBeLessThan(360);
      expect(Number.isInteger(p.house) && p.house! >= 1 && p.house! <= 12, p.body).toBe(true);
    }
    expect(MIRA_WEEK.angles).not.toBeNull();
    expect(MIRA_WEEK.angles!.ascendant).toBeGreaterThanOrEqual(0);
    expect(MIRA_WEEK.angles!.midheaven).toBeLessThan(360);
  });

  it("keeps each contact's runs in order and apart, inside its window, with every exact pass in a run", () => {
    expect(MIRA_WEEK.contacts.length).toBeGreaterThan(5);
    for (const c of MIRA_WEEK.contacts) {
      expect(c.runs.length, c.key).toBeGreaterThan(0);
      let last = "";
      for (const [a, b] of c.runs) {
        expect(a <= b, c.key).toBe(true);
        expect(a > last, `${c.key}: runs in order`).toBe(true);
        expect(addDays(last || a, 1) <= a || last === "", `${c.key}: two runs touching are one`).toBe(true);
        last = b;
      }
      expect(c.runs[0][0] >= addDays(c.start.slice(0, 10), -1), c.key).toBe(true);
      expect(c.runs.at(-1)![1] <= addDays(c.end.slice(0, 10), 1), c.key).toBe(true);
      for (const day of c.exact) expect(c.runs.some(([a, b]) => a <= day && day <= b), `${c.key}: ${day}`).toBe(true);
      expect([...c.exact].sort()).toEqual(c.exact);
      expect(c.key).toMatch(/^contact\.[a-z]+\.[a-z]+\.[a-z]+\.\d{8}$/);
      expect(c.headline.length).toBeGreaterThan(0);
      expect(c.facts.sky.length).toBeGreaterThan(0);
    }
    expect(new Set(MIRA_WEEK.contacts.map((c) => c.key)).size).toBe(MIRA_WEEK.contacts.length);
  });

  it("lists the week's changes and the next three in order, in the right days, with the sentence the page quotes", () => {
    const days = MIRA_WEEK.changes.map((c) => c.day);
    expect([...days].sort()).toEqual(days);
    for (const c of MIRA_WEEK.changes) {
      expect(c.day >= WEEK && c.day <= addDays(WEEK, 6), `${c.key} ${c.day}`).toBe(true);
      expect(["starts", "peaks", "eases"]).toContain(c.change);
    }
    expect(MIRA_WEEK.next.length).toBeLessThanOrEqual(3);
    expect(MIRA_WEEK.next.length).toBeGreaterThan(0);
    const nextDays = MIRA_WEEK.next.map((c) => c.day);
    expect([...nextDays].sort()).toEqual(nextDays);
    for (const c of MIRA_WEEK.next) expect(c.day >= addDays(WEEK, 1) && c.day <= addDays(WEEK, 182), `${c.key} ${c.day}`).toBe(true);
    expect(MIRA_WEEK.sentence).toMatch(/ this week$/);
    expect(MIRA_WEEK.sentence).toMatch(/^[A-Z]/);
  });

  it("holds her known ages' cycles oldest first, each age's progress inside 0 to 1, and two waves of a life", () => {
    expect(MIRA_WEEK.ages.map((a) => a.id)).toEqual(["saturn-return", "jupiter-return", "node-return", "uranus-opposition"]);
    for (const a of MIRA_WEEK.ages) expect(a.progress >= 0 && a.progress < 1, a.id).toBe(true);
    const starts = MIRA_WEEK.cycles.map((c) => c.start);
    expect([...starts].sort()).toEqual(starts);
    for (const c of [...MIRA_WEEK.cycles, ...MIRA_WEEK.finder.cycles]) {
      expect(c.start <= c.end, c.key).toBe(true);
      expect(c.passes, c.key).toBe(c.exact.length);
      expect(c.age).toBeGreaterThanOrEqual(0);
    }
    expect(MIRA_WEEK.waves.map((w) => [w.body, w.distances.length])).toEqual([["jupiter", 1081], ["saturn", 1081]]);
    for (const w of MIRA_WEEK.waves) expect(w.distances.every((d) => d >= 0 && d <= 180), w.body).toBe(true);
  });

  it("has nothing in it but data: strings, numbers, booleans, arrays and objects", () => {
    expect(JSON.parse(JSON.stringify(MIRA_WEEK))).toEqual(MIRA_WEEK);
    expect(Object.keys(MIRA_WEEK)).toEqual(["week", "zone", "born", "age", "points", "angles", "sky", "contacts", "sentence", "changes", "next", "cycles", "ages", "waves", "finder"]);
  });
});

describe("the page's frames, days and cards come from the file in the spec's order", () => {
  it("draws on a frame exactly the contacts in a run that day, and none from the gap between a retrograde's passes", () => {
    let gaps = 0;
    MIRA.frames.forEach((frame, i) => {
      const day = addDays(WEEK, i);
      const expected = MIRA_WEEK.contacts.filter((c) => c.runs.some(([a, b]) => a <= day && day <= b)).map((c) => `${c.body}.${c.aspect}.${c.target}`).sort();
      expect(frame.contacts.map((c) => `${c.body}.${c.aspect}.${c.target}`).sort(), day).toEqual(expected);
    });
    for (const c of MIRA_WEEK.contacts) {
      for (let r = 1; r < c.runs.length; r++) {
        const gap = addDays(c.runs[r - 1][1], 1);
        const i = Math.round((Date.parse(gap) - Date.parse(WEEK)) / DAY);
        if (i < 0 || i >= 182) continue;
        gaps++;
        expect(MIRA.frames[i].contacts.some((x) => `${x.body}.${x.aspect}.${x.target}` === pairOf(c)), `${c.key} on ${gap}`).toBe(false);
      }
    }
    expect(gaps).toBeGreaterThan(0);
  });

  it("fills each planet by its strongest contact that day, with up to three plain lines, each once", () => {
    MIRA.frames.forEach((frame, i) => {
      const day = addDays(WEEK, i);
      const on = MIRA_WEEK.contacts.filter((c) => c.runs.some(([a, b]) => a <= day && day <= b));
      for (const b of frame.bodies) {
        const mine = on.filter((c) => c.body === b.body).map((c) => rank[c.tone]);
        expect(b.tone === null ? null : rank[b.tone], `${day} ${b.body}`).toBe(mine.length ? Math.min(...mine) : null);
      }
      expect(frame.headlines.length).toBeLessThanOrEqual(3);
      expect(new Set(frame.headlines).size).toBe(frame.headlines.length);
      expect(frame.headlines.every((h) => on.some((c) => c.headline === h))).toBe(true);
    });
  });

  it("marks a planet retrograde on the frames its file runs say", () => {
    for (const s of MIRA_WEEK.sky) {
      MIRA.frames.forEach((frame, i) => {
        const should = s.retrograde.some(([a, b]) => a <= i && i <= b);
        expect(frame.bodies.find((b) => b.body === s.body)!.retrograde, `${s.body} ${i}`).toBe(should);
        expect(frame.bodies.find((b) => b.body === s.body)!.lon).toBe(s.lon[i]);
      });
    }
  });

  it("gives the week's seven days with a tone for each contact in orb, intense first, and her cards in the order the page lists them", () => {
    expect(MIRA.days.map((d) => d.date)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(WEEK, i)));
    for (const d of MIRA.days) {
      const on = MIRA_WEEK.contacts.filter((c) => c.runs.some(([a, b]) => a <= d.date && d.date <= b));
      expect(d.tones.length, d.date).toBe(on.length);
      expect(d.tones.map((t) => rank[t])).toEqual([...d.tones.map((t) => rank[t])].sort((a, b) => a - b));
      expect([...d.tones].sort()).toEqual(on.map((c) => c.tone).sort());
    }
    const onMonday = MIRA_WEEK.contacts.filter((c) => c.runs.some(([a, b]) => a <= WEEK && WEEK <= b));
    expect(MIRA.contacts.map((c) => c.key).sort()).toEqual(onMonday.map((c) => c.key).sort());
    const by = new Map(MIRA_WEEK.contacts.map((c) => [c.key, c]));
    const runDays = (c: MiraWeekContact) => {
      const [a, b] = c.runs.find(([x, y]) => x <= WEEK && WEEK <= y)!;
      return Math.round((Date.parse(b) - Date.parse(a)) / DAY) + 1;
    };
    for (let i = 1; i < MIRA.contacts.length; i++) {
      const a = by.get(MIRA.contacts[i - 1].key)!;
      const b = by.get(MIRA.contacts[i].key)!;
      const angle = (c: MiraWeekContact) => (c.target === "ascendant" || c.target === "midheaven" ? 0 : 1);
      const order = rank[a.tone] - rank[b.tone] || angle(a) - angle(b) || runDays(b) - runDays(a);
      expect(order, `${a.key} before ${b.key}`).toBeLessThanOrEqual(0);
    }
  });

  it("gives each card its everyday line only where she has one, and never a reading before one is written", () => {
    for (const card of MIRA.contacts) {
      const c = MIRA_WEEK.contacts.find((x) => x.key === card.key)!;
      expect(card.line).toBe(EVERYDAY[pairOf(c)] ?? null);
      expect(card.headline).toBe(c.headline);
      expect(card.tone).toBe(c.tone);
    }
  });

  it("counts her age as a person does on the Monday, and her four ages each with a cycle under way or next, else the last", () => {
    const born = new Date(MIRA_WEEK.born);
    const monday = new Date(`${WEEK}T12:00:00Z`);
    const birthday = new Date(born);
    birthday.setUTCFullYear(monday.getUTCFullYear());
    expect(MIRA.week.age).toBe(monday.getUTCFullYear() - born.getUTCFullYear() - (monday < birthday ? 1 : 0));
    expect(MIRA.wave.today).toBeCloseTo((monday.getTime() - born.getTime()) / (365.2425 * DAY), 2);
    expect(MIRA.ages.map((a) => a.id)).toEqual(MIRA_WEEK.ages.map((a) => a.id));
    for (const a of MIRA.ages) {
      const same = MIRA.cycles.filter((c) => c.id === a.id);
      expect(a.cycle).toBe(same.find((c) => c.end >= WEEK) ?? same.at(-1));
      expect(a.cycle.today).toBe(WEEK);
    }
    expect(MIRA.finder.birthDate).toBe(fixture.birthDate);
    expect(MIRA.finder.cycles.every((c) => c.today === WEEK)).toBe(true);
  });

  it("looks back from each repeating cycle to the latest one of its own kind before her week, and from the first to none", () => {
    for (const id of ["saturn-return", "jupiter-return", "node-return"] as const) {
      const same = MIRA.cycles.filter((c) => c.id === id);
      expect(same.length, id).toBeGreaterThan(1);
      expect(same[0].last, id).toBeNull();
      same.slice(1).forEach((c, i) => {
        const before = same.slice(0, i + 1).filter((o) => (o.exact[0] ?? o.start) < WEEK).pop();
        expect(c.last, c.key).toEqual(before ? { on: before.exact[0] ?? before.start, age: before.age } : null);
      });
      expect(same.every((c) => c.ages!.join() === same.map((o) => o.age).join()), id).toBe(true);
    }
    for (const c of MIRA.cycles.filter((x) => x.id === "uranus-opposition")) expect(c.repeats).toBe(false);
  });
});

describe("a week her words do not fit is an error that names the file to rewrite", () => {
  const rewrite = /Rewrite her sample words in web\/src\/site\/data\/timeline\/mira\.ts for this week\.$/;

  it("starts the error with the week, so the session that merges the Release knows which one", () => {
    const week = clone();
    week.sentence = "A quiet week for your chart";
    expect(() => miraOf(week)).toThrow(new RegExp(`^Mira's week of ${WEEK}: `));
    expect(() => miraOf(week)).toThrow(rewrite);
  });

  it("accepts up to five passes over her Ascendant with some behind her and some ahead, and says which one it is", () => {
    for (const [behind, count] of [[1, 2], [1, 5], [2, 5], [4, 5], [3, 4]] as const) {
      const sample = miraOf(withPasses(behind, count)).sample;
      expect(sample.reading.after, `${behind} of ${count}`).toContain(`It's the ${ORDINALS[behind - 1]} of ${COUNTS[count]} passes.`);
    }
  });

  it("refuses no pass behind her, all behind her, no passes at all, and six or more", () => {
    expect(() => miraOf(withPasses(0, 3)), "none behind").toThrow(/this week 0 of 3 are behind/);
    expect(() => miraOf(withPasses(3, 3)), "all behind").toThrow(/this week 3 of 3 are behind/);
    expect(() => miraOf(withPasses(1, 6)), "six").toThrow(/this week 1 of 6 are behind/);
    expect(() => miraOf(withPasses(2, 9)), "nine").toThrow(rewrite);
    const none = withPasses(1, 2);
    anchorOf(none).exact = [];
    expect(() => miraOf(none), "none").toThrow(/this week 0 of 0 are behind/);
  });

  it("refuses a week Saturn is not on her Ascendant, though its window may be open: she needs it in orb that Monday", () => {
    const gap = clone();
    anchorOf(gap).runs = [[addDays(WEEK, 20), addDays(WEEK, 30)]];
    expect(() => miraOf(gap)).toThrow(/Saturn is not on her Ascendant/);
    const gone = clone();
    gone.contacts = [];
    expect(() => miraOf(gone)).toThrow(/Saturn is not on her Ascendant/);
    const early = clone();
    anchorOf(early).runs = [[addDays(WEEK, -30), addDays(WEEK, -1)]];
    expect(() => miraOf(early)).toThrow(/Saturn is not on her Ascendant/);
  });

  it("refuses a Saturn on her Ascendant that has no house, since her report line is the 1st house's", () => {
    const week = clone();
    anchorOf(week).facts = { sky: anchorOf(week).facts.sky, house: null };
    expect(() => miraOf(week)).toThrow(/Saturn on her Ascendant has no house/);
  });

  it("refuses a quiet week for the Monday email, and a sentence without 'this week' on the end", () => {
    for (const sentence of ["A quiet week for your chart", "Two things ease", "", "this week is long"]) {
      const week = clone();
      week.sentence = sentence;
      expect(() => miraOf(week), sentence).toThrow(/a quiet week sends no Monday email/);
    }
  });

  it("refuses a known age she has no cycle for", () => {
    const week = clone();
    week.cycles = week.cycles.filter((c) => c.id !== "node-return");
    expect(() => miraOf(week)).toThrow(/she has no node-return from birth to 90/);
  });

  it("does not change the file it is given", () => {
    const week = clone();
    const before = JSON.stringify(week);
    miraOf(week);
    miraOf(week, "mdy");
    expect(JSON.stringify(week)).toBe(before);
  });
});

describe("her words in a reader's date order", () => {
  it("writes the first and last pass in the order asked, and nothing else in her sample changes", () => {
    const anchor = anchorOf(MIRA_WEEK);
    for (const order of ["dmy", "mdy", "ymd"] as const) {
      const sample = miraOf(MIRA_WEEK, order).sample;
      expect(sample.reading.after).toContain(`The first was on ${fullDate(anchor.exact[0], order)} and the last is on ${fullDate(anchor.exact.at(-1)!, order)}.`);
      expect(sample.questions).toEqual(MIRA.sample.questions);
      expect(sample.subject).toBe(MIRA.sample.subject);
      expect(sample.reportLine).toEqual(MIRA.sample.reportLine);
    }
  });

  it("redraws the cards in the order asked and no other field of them", () => {
    for (const order of ["mdy", "ymd"] as const) {
      const cards = contactsIn(order);
      expect(cards.map((c) => [c.key, c.tone, c.headline, c.line])).toEqual(MIRA.contacts.map((c) => [c.key, c.tone, c.headline, c.line]));
    }
  });
});
