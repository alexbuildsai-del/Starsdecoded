/**
 * Mira on /timeline (timeline-page §1 to 3; ADR-112, 250, 256; readings 9, 18, 22): everything the page shows about the
 * site's sample account. Every fact comes from `mira-week.json`, which the engine computed from her fixture
 * (`api/src/lib/sampleRun.ts`) and each forwarded Release moves to the Monday after it, so the browser gets plain data
 * and never runs the engine for her. Her sample words are templates whose dates, pass counts and houses come from that
 * file; a week they no longer fit throws here, which fails the prerender and `mira.test.ts`, so the session that merges
 * the Release's pull request rewrites them.
 */
import type { ContactEvent, CycleId, NatalTarget, SkyBody, Tone } from "@workspace/engine";
import { CHAPTERS } from "@/lib/chapters";
import { DEFAULT_ENTRY, type DateOrder } from "@/lib/date-entry";
import type { DialAngles, DialFrame, DialPoint } from "@/lib/dial";
import { cycleDay, type CycleView, type WaveLine } from "@/lib/life-view";
import { contactView, fullDate, type ContactView, type DayView } from "@/lib/timeline-view";
import fixture from "../../../../../fixtures/sample-people/mira.json";
import file from "./mira-week.json";

/** "YYYY-MM-DD", one of Mira's own days (reading 4). */
type Day = string;

export interface MiraWeekContact {
  key: string;
  body: ContactEvent["body"];
  aspect: ContactEvent["aspect"];
  target: ContactEvent["target"];
  orb: number;
  house: number | null;
  tone: Tone;
  headline: string;
  facts: { sky: string; house: string | null };
  /** The window, from first entering the orb to last leaving it. */
  start: string;
  end: string;
  exact: Day[];
  /** The days the doctrine holds it in orb: a retrograde can take a planet out of orb and back inside one window. */
  runs: [Day, Day][];
}

/** Something that starts, peaks or eases, counted as the week's sentence counts it. */
export interface MiraChange {
  day: Day;
  key: string;
  change: "starts" | "peaks" | "eases";
  headline: string;
  tone: Tone | null;
}

interface MiraWeekCycle {
  key: string;
  id: CycleId;
  body: SkyBody;
  name: string;
  word: string;
  age: number;
  start: Day;
  end: Day;
  exact: Day[];
  passes: number;
  repeats: boolean;
}

/** `mira-week.json`, as `api/src/lib/sampleRun.ts` writes it. */
export interface MiraWeekFile {
  week: Day;
  zone: string;
  born: string;
  age: number;
  points: { body: string; lon: number; house: number | null }[];
  angles: DialAngles | null;
  /** Mars to Pluto at 12:00 UTC on each frame's day, and the runs of frames each moves backwards in. */
  sky: { body: SkyBody; lon: number[]; retrograde: [number, number][] }[];
  contacts: MiraWeekContact[];
  sentence: string;
  changes: MiraChange[];
  next: MiraChange[];
  cycles: MiraWeekCycle[];
  ages: { id: CycleId; label: string; progress: number }[];
  waves: { body: SkyBody; distances: number[] }[];
  finder: { cycles: MiraWeekCycle[]; rounds: { id: CycleId; progress: number }[] };
}

export interface MiraSample {
  /** What the page marks each of these with (acceptance 5). */
  tag: string;
  /** Her everyday lines by `{planet}.{aspect}.{point}`: what a reading's own line will say once Timeline writes one. */
  everyday: Readonly<Record<string, string>>;
  /** A line from her report's 1st house, and where it comes from. */
  reportLine: { source: string; text: string };
  /** The reading that builds on that line, its quote marked: `before`, `quote` and `after` read as one paragraph. */
  reading: { headline: string; tone: Tone; bridge: string; before: string; quote: string; after: string; link: string };
  /** Three questions for Ask, built from her chart. */
  questions: string[];
  /** The Monday email's subject. */
  subject: string;
}

export interface Mira {
  /** Her seven planets, the dial's inside, each with its whole-sign house. */
  points: (DialPoint & { house: number | null })[];
  angles: DialAngles | null;
  /** The week the page shows, Monday to Sunday, her age then, and what starts, peaks and eases on its days. */
  week: { from: Day; to: Day; age: number; changes: MiraChange[] };
  /** Six months of the dial from the Monday, Mars to Pluto (reading 18). */
  frames: DialFrame[];
  /** What is in orb on the Monday, as its cards show it: intense first, then a point on an angle, then the longest. */
  contacts: ContactView[];
  /** What starts, peaks or eases next after the Monday, soonest first. */
  next: MiraChange[];
  /** The week's seven days, each with the tone of everything in orb on it. */
  days: DayView[];
  /** "Two things ease and nothing new starts this week". */
  sentence: string;
  /** Her four known ages' cycles, birth to 90, oldest first, each counted from the Monday. */
  cycles: CycleView[];
  /** The four known ages in Life's order, each with its cycle under way or next, or the last when none is left. */
  ages: { id: CycleId; label: string; progress: number; cycle: CycleView }[];
  /** Saturn's and Jupiter's waves, birth to 90, and her age in years that Monday. */
  wave: { lines: WaveLine[]; today: number };
  /** The finder's own answer for her birth date at midday, which it opens on as the example (reading 21). */
  finder: { birthDate: Day; cycles: CycleView[] };
  sample: MiraSample;
}

const DAY_MS = 86_400_000;
const YEAR_MS = 365.2425 * DAY_MS;
const TONE_RANK: Readonly<Record<Tone, number>> = { intense: 0, mixed: 1, easy: 2 };
// framesFor orders a frame's contacts the same way, from the doctrine's lists; dial.ts loads the engine, this module never does.
const SLOWEST_FIRST: readonly SkyBody[] = ["pluto", "neptune", "uranus", "saturn", "jupiter", "mars", "venus", "mercury"];
const TARGET_ORDER: readonly NatalTarget[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "ascendant", "midheaven"];
const stronger = (a: Tone | null, b: Tone): Tone => (a !== null && TONE_RANK[a] <= TONE_RANK[b] ? a : b);
const ANGLES: readonly NatalTarget[] = ["ascendant", "midheaven"];

function addDays(day: Day, n: number): Day {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const pairOf = (c: Pick<MiraWeekContact, "body" | "aspect" | "target">) => `${c.body}.${c.aspect}.${c.target}`;
const runOn = (c: MiraWeekContact, day: Day) => c.runs.findIndex(([from, to]) => from <= day && day <= to);
const inOrbOn = (c: MiraWeekContact, day: Day) => runOn(c, day) >= 0;
const runDays = ([from, to]: [Day, Day]) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;

/** On every line written for Mira rather than computed (acceptance 5). */
export const SAMPLE_WORDS = "Sample words";

/**
 * Her everyday lines (reading 9), sample words in the house voice from the page's artifact. None holds a date, a count
 * or a house; the two that say how long ("a few days", "a few months") are held to the contact's days by the test.
 */
export const EVERYDAY: Readonly<Record<string, string>> = {
  "saturn.conjunction.ascendant": "For a few months you think more about how you come across and what you take on.",
  "pluto.conjunction.saturn": "The way you organise your life may need a real change, not a small fix.",
  "pluto.opposition.jupiter": "A good time to look at your plans again and keep the ones that still matter.",
  "neptune.trine.jupiter": "Ideas come easily and you feel more generous.",
  "mars.opposition.saturn": "You have energy, but things move slowly. Patience runs short.",
  "mars.conjunction.jupiter": "You feel like doing more. It's easy to take on too much.",
  "uranus.trine.saturn": "Small changes to how you run your days feel natural.",
  "jupiter.trine.venus": "Being kind and generous feels easy.",
  "saturn.square.midheaven": "Questions about your job and where it's going come up more.",
  "mars.opposition.moon": "Feelings run hot for a few days.",
  "jupiter.opposition.moon": "Emotions feel bigger than usual, the good ones and the hard ones.",
  "neptune.conjunction.mercury": "Ideas flow, details slip.",
};

/** The contact her Readings example reads: Saturn on her Ascendant, where her 1st house starts (timeline-page §2). */
export const ANCHOR = "saturn.conjunction.ascendant";
/** A line from her report's 1st house: sample words until Timeline writes her readings. */
const REPORT_LINE = "You arrive fast and decide faster. People see you as confident before you feel it.";
const QUOTE = "you arrive fast and decide faster";
export const ORDINALS = ["first", "second", "third", "fourth", "fifth"] as const;
export const COUNTS = ["no", "one", "two", "three", "four", "five"] as const;

function rewrite(week: MiraWeekFile, why: string): never {
  throw new Error(`Mira's week of ${week.week}: ${why}. Rewrite her sample words in web/src/site/data/timeline/mira.ts for this week.`);
}

/**
 * The dial's frames from the week's facts, as `framesFor` draws them (strongest tone first, then the slowest planet,
 * then the doctrine's order of points, up to three headlines): a contact is on a frame only on the days the doctrine
 * holds it in orb, so a day inside a window but in a retrograde's gap draws no line. Her days are Lisbon's (reading 4).
 */
function heroFrames(week: MiraWeekFile): DialFrame[] {
  return Array.from({ length: week.sky[0]?.lon.length ?? 0 }, (_, i) => {
    const date = addDays(week.week, i);
    const on = week.contacts
      .filter((c) => inOrbOn(c, date))
      .sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || SLOWEST_FIRST.indexOf(a.body) - SLOWEST_FIRST.indexOf(b.body)
        || TARGET_ORDER.indexOf(a.target) - TARGET_ORDER.indexOf(b.target));
    const headlines: string[] = [];
    for (const c of on) if (headlines.length < 3 && !headlines.includes(c.headline)) headlines.push(c.headline);
    return {
      date,
      bodies: week.sky.map(({ body, lon, retrograde }) => ({
        body,
        lon: lon[i],
        retrograde: retrograde.some(([from, to]) => from <= i && i <= to),
        tone: on.filter((c) => c.body === body).reduce<Tone | null>((tone, c) => stronger(tone, c.tone), null),
      })),
      contacts: on.map(({ body, target, aspect }) => ({ body, target, aspect })),
      headlines,
    };
  });
}

/** The Monday's contacts as its cards show them: intense first, then a point on an angle, then the longest run. */
function mondayCards(week: MiraWeekFile, order: DateOrder): ContactView[] {
  const today = week.week;
  return week.contacts
    .filter((c) => inOrbOn(c, today))
    .sort((a, b) =>
      TONE_RANK[a.tone] - TONE_RANK[b.tone]
      || Number(ANGLES.includes(b.target)) - Number(ANGLES.includes(a.target))
      || runDays(b.runs[runOn(b, today)]) - runDays(a.runs[runOn(a, today)]))
    .map((c) => {
      const run = runOn(c, today);
      const input = { key: c.key, tone: c.tone, headline: c.headline, line: EVERYDAY[pairOf(c)] ?? null, exact: c.exact, facts: c.facts };
      return contactView({ ...input, end: c.runs[run][1], back: c.runs[run + 1]?.[0] ?? null }, today, order);
    });
}

function cycleViews(cycles: readonly MiraWeekCycle[], rounds: readonly { id: CycleId; progress: number }[], today: Day): CycleView[] {
  return cycles.map((c) => {
    const same = cycles.filter((o) => o.id === c.id);
    const before = same.filter((o) => cycleDay(o) < cycleDay(c)).pop();
    return {
      key: c.key, id: c.id, name: c.name, word: c.word, age: c.age, exact: c.exact, start: c.start, end: c.end, repeats: c.repeats,
      today, progress: rounds.find((r) => r.id === c.id)?.progress ?? null,
      last: before ? { on: cycleDay(before), age: before.age } : null, ages: same.map((o) => o.age), why: null,
    };
  });
}

function sampleOf(week: MiraWeekFile, order: DateOrder): MiraSample {
  const anchor = week.contacts.find((c) => pairOf(c) === ANCHOR && inOrbOn(c, week.week));
  if (!anchor) rewrite(week, "Saturn is not on her Ascendant, which her reading and her Ask questions are about");
  const house = anchor.facts.house ?? rewrite(week, "Saturn on her Ascendant has no house");
  const behind = anchor.exact.filter((day) => day <= week.week).length;
  const count = anchor.exact.length;
  if (behind < 1 || behind >= count || count >= COUNTS.length) {
    rewrite(week, `her reading counts passes behind her and ahead, and this week ${behind} of ${count} are behind`);
  }
  if (!/ this week$/.test(week.sentence)) rewrite(week, `a quiet week sends no Monday email ("${week.sentence}")`);
  const said = week.sentence.replace(/ this week$/, "");
  const houses = CHAPTERS.find((c) => c.section === "houses")?.title ?? rewrite(week, "the report has no House by House chapter");
  return {
    tag: SAMPLE_WORDS,
    everyday: EVERYDAY,
    reportLine: { source: `From her report · ${houses} · ${house}`, text: REPORT_LINE },
    reading: {
      headline: anchor.headline,
      tone: anchor.tone,
      bridge: "Saturn reaches her Ascendant. Timeline starts from that line.",
      before: "Your report says ",
      quote: QUOTE,
      after: `. Astrology reads ${anchor.facts.sky} as a slower time. ${EVERYDAY[ANCHOR]} It's the ${ORDINALS[behind - 1]} of ${COUNTS[count]} passes. The first was on ${fullDate(anchor.exact[0], order)} and the last is on ${fullDate(anchor.exact[count - 1], order)}.`,
      link: `Read your ${house} again ›`,
    },
    questions: [
      `What does ${anchor.facts.sky.replace(" your ", " my ")} mean for me?`,
      "When does it ease?",
      `How does this fit my report's ${house}?`,
    ],
    subject: `Your week: ${said.charAt(0).toLowerCase()}${said.slice(1)}`,
  };
}

/** Everything the page shows about Mira from one week's file; throws on a week her sample words no longer fit. */
export function miraOf(week: MiraWeekFile, order: DateOrder = DEFAULT_ENTRY.order): Mira {
  const today = week.week;
  const cycles = cycleViews(week.cycles, week.ages, today);
  return {
    points: week.points.map(({ body, lon, house }) => ({ body, lon, house })),
    angles: week.angles,
    week: { from: today, to: addDays(today, 6), age: week.age, changes: week.changes },
    frames: heroFrames(week),
    contacts: mondayCards(week, order),
    next: week.next,
    days: Array.from({ length: 7 }, (_, d) => {
      const date = addDays(today, d);
      const tones = week.contacts.filter((c) => inOrbOn(c, date)).map((c) => c.tone);
      return { date, tones: tones.sort((a, b) => TONE_RANK[a] - TONE_RANK[b]) };
    }),
    sentence: week.sentence,
    cycles,
    ages: week.ages.map(({ id, label, progress }) => {
      const of = cycles.filter((c) => c.id === id);
      const cycle = of.find((c) => c.end >= today) ?? of[of.length - 1] ?? rewrite(week, `she has no ${id} from birth to 90`);
      return { id, label, progress, cycle };
    }),
    wave: {
      lines: week.waves.map(({ body, distances }) => ({
        body,
        points: distances.map((distance, month) => ({ age: Math.round((month / 12) * 1000) / 1000, distance })),
      })),
      today: Math.round(((Date.parse(`${today}T12:00:00Z`) - Date.parse(week.born)) / YEAR_MS) * 100) / 100,
    },
    finder: { birthDate: fixture.birthDate, cycles: cycleViews(week.finder.cycles, week.finder.rounds, today) },
    sample: sampleOf(week, order),
  };
}

/** The committed week, as the engine computed it. */
export const MIRA_WEEK = file as unknown as MiraWeekFile;

/** Mira as the prerender and the first paint draw her, dates in the site's DD/MM order. */
export const MIRA: Mira = miraOf(MIRA_WEEK);

/** The Monday's cards in a reader's own date order, for a page that redraws them in the browser's once it has hydrated. */
export function contactsIn(order: DateOrder): ContactView[] {
  return mondayCards(MIRA_WEEK, order);
}
