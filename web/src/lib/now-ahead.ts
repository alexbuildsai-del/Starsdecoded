/**
 * Timeline's own page in words and dates (ADR-207, 209, 210; readings 4, 7, 9, 18, 19): everything Now and ahead and
 * Life print, built from GET /timeline/now and GET /timeline/life alone, so every date and degree on either screen is
 * one the API sent (acceptance 1). Days are the reader's, "YYYY-MM-DD" in the zone the API read them in, printed in
 * their language's order and never with a clock time. Pure, so a node test reads every line both screens print.
 */
import { CYCLE_WORDS, KNOWN_AGES, type CycleId, type Tone } from "@workspace/engine";
import type {
  KnownAge,
  LifeCycleView,
  ReadingStatus,
  TimelineChangeChange,
  TimelineEvent,
  TimelineLife,
  TimelineNow,
  TimelineRange,
  TimelineReading,
} from "@workspace/api-client-react";
import { CHAPTERS } from "@/lib/chapters";
import type { DateOrder } from "@/lib/date-entry";
import { dayWords } from "@/lib/dial";
import { ORDINALS, houseWithWord, houseWord } from "@/lib/evidence-glossary";
import { cycleBody, cycleDay, cycleMark, cycleWhen, type CycleView, type WaveLine } from "@/lib/life-view";
import { PERSONAL_REPORT } from "@/lib/product";
import { dayIn, factsLine, fullDate, lastsLine, listOf, longDay, nearDate, weekdayOf, type ContactView } from "@/lib/timeline-view";

/** Week · Month · 6 months, each from today (reading 4), named as Your week on the dashboard names them (ADR-211). */
export const RANGES: readonly { id: TimelineRange; label: string; ahead: string }[] = [
  { id: "week", label: "Week", ahead: "this week" },
  { id: "month", label: "Month", ahead: "this month" },
  { id: "six-months", label: "6 months", ahead: "in the next 6 months" },
];

export function rangeAhead(range: TimelineRange): string {
  return RANGES.find((r) => r.id === range)?.ahead ?? "";
}

export const QUIET_DAY = "A quiet day for your chart.";
/** An eclipse is one moment, so its card says it lasts the day it falls on. */
export const ONE_DAY = "This day only";
export const BLIND_LINE =
  "Without your birth time, Timeline leaves out your Ascendant, Midheaven, Moon and houses, because we can't place them exactly.";
export const BLIND_FIX = `Add your birth time on your ${PERSONAL_REPORT} to see them.`;

export function comingUpTitle(range: TimelineRange): string {
  return `Coming up ${rangeAhead(range)}`;
}

export function nothingNext(range: TimelineRange): string {
  return `Nothing else starts, peaks or eases ${rangeAhead(range)}.`;
}

/** What gets a reading (reading 7): every contact, a retrograde crossing a known house, an eclipse near a natal point. */
export function reads(event: Pick<TimelineEvent, "kind" | "houses" | "target">): boolean {
  if (event.kind === "contact") return true;
  if (event.kind === "retrograde") return event.houses.length > 0;
  return event.target !== null;
}

/** "1st house (self)", or "8th (depth) and 7th (partnership) houses": a house the page prints carries its word (§9, ADR-98). */
export function housesText(houses: readonly number[]): string | null {
  const known = houses.filter((house) => houseWord(house) !== "");
  if (known.length === 0) return null;
  if (known.length === 1) return `${ORDINALS[known[0] - 1]} house (${houseWord(known[0])})`;
  return `${listOf(known.map(houseWithWord))} houses`;
}

/** Each instant becomes the reader's day once, since a format per call would cost a frame on a phone during Play. */
function dayReader(zone: string): (at: string) => string {
  const seen = new Map<string, string>();
  return (at) => {
    let day = seen.get(at);
    if (day === undefined) {
      day = dayIn(at, zone);
      seen.set(at, day);
    }
    return day;
  };
}

interface Placed {
  event: TimelineEvent;
  /** Its stretches in orb as the reader's days, a gap between two where a retrograde takes it out. */
  spans: { start: string; end: string }[];
  exact: string[];
  start: string;
  end: string;
}

/** One range read once: each event's instants as the reader's days, so moving the dial reads strings, not clocks. */
export interface NowModel {
  now: TimelineNow;
  events: Placed[];
  next: { key: string; date: string; change: TimelineChangeChange }[];
}

export function nowModel(now: TimelineNow): NowModel {
  const day = dayReader(now.zone);
  return {
    now,
    events: now.events.map((event) => ({
      event,
      spans: event.spans.map((span) => ({ start: day(span.start), end: day(span.end) })),
      exact: event.exact.map(day),
      start: day(event.start),
      end: day(event.end),
    })),
    next: now.next.map((change) => ({ key: change.key, date: day(change.at), change: change.change })),
  };
}

/** One event as its card prints it on the day the dial shows. */
export interface EventCard {
  key: string;
  kind: TimelineEvent["kind"];
  /** Null only on an eclipse far from every natal point, whose card shows no tone word. */
  tone: Tone | null;
  headline: string;
  /** The reading's own everyday line once it is written, none before (reading 9). */
  line: string | null;
  lasts: string;
  facts: string;
  reads: boolean;
  reading: ReadingStatus;
}

/** The shared contact card's view, for a card with a tone; a toneless eclipse is drawn without one. */
export function contactOf(card: EventCard): ContactView | null {
  if (card.tone === null) return null;
  const { key, tone, headline, line, lasts, facts } = card;
  return { key, tone, headline, line, lasts, facts };
}

/** "3 Oct to 14 Nov", both with their years when either would be misread without one. */
function spanText(start: string, end: string, today: string, order: DateOrder): string {
  const years = [start, end].some((day) => nearDate(day, today, order) === fullDate(day, order));
  const say = (day: string) => (years ? fullDate(day, order) : nearDate(day, today, order));
  return `${say(start)} to ${say(end)}`;
}

/**
 * A contact lasts to the end of the stretch the day sits in and says when it comes back after a gap. The orb is
 * today's, so it is printed only on today. A retrograde runs station to station and is never exact.
 */
function cardOf(placed: Placed, day: string, now: TimelineNow, order: DateOrder): EventCard {
  const { event } = placed;
  const today = now.from;
  const house = housesText(event.houses);
  let lasts: string;
  let facts: string;
  if (event.kind === "contact") {
    const at = placed.spans.findIndex((span) => span.start <= day && day <= span.end);
    const span = placed.spans[at] ?? { start: placed.start, end: placed.end };
    lasts = lastsLine({ end: span.end, back: at >= 0 ? (placed.spans[at + 1]?.start ?? null) : null }, today, order);
    facts = factsLine({ sky: event.facts.sky, house }, placed.exact, today, order, day === today ? event.orbNow : null);
  } else if (event.kind === "retrograde") {
    lasts = lastsLine({ end: placed.end }, today, order);
    facts = [event.facts.sky, house, spanText(placed.start, placed.end, today, order)].filter(Boolean).join(" · ");
  } else {
    lasts = ONE_DAY;
    facts = [event.facts.sky, house].filter(Boolean).join(" · ");
  }
  return {
    key: event.key,
    kind: event.kind,
    tone: event.tone,
    headline: event.headline,
    line: event.line,
    lasts,
    facts,
    reads: reads(event),
    reading: event.reading,
  };
}

const TONE_RANK: Readonly<Record<Tone, number>> = { intense: 0, mixed: 1, easy: 2 };
const KIND_RANK: Readonly<Record<TimelineEvent["kind"], number>> = { contact: 0, retrograde: 1, eclipse: 2 };
const toneRank = (tone: Tone | null) => (tone === null ? 3 : TONE_RANK[tone]);

/** Something that starts, peaks or eases after the day shown, which a tap moves the dial to. */
export interface NextChange {
  id: string;
  key: string;
  /** Its day's place in the range. */
  index: number;
  date: string;
  /** "Tue 6 Oct". */
  when: string;
  headline: string;
  change: TimelineChangeChange;
}

/** As many as the artifact's list holds, so the cards above stay the screen's first thing. */
export const NEXT_MAX = 6;

function nextAfter(model: NowModel, after: string, order: DateOrder): NextChange[] {
  const { now } = model;
  const headlines = new Map(now.events.map((event) => [event.key, event.headline]));
  const found: NextChange[] = [];
  for (const change of model.next) {
    if (found.length === NEXT_MAX) break;
    const headline = headlines.get(change.key);
    const index = now.days.findIndex((day) => day.date === change.date);
    if (headline === undefined || index < 0 || change.date <= after) continue;
    found.push({
      id: `${change.key}.${change.change}.${change.date}`,
      key: change.key,
      index,
      date: change.date,
      when: `${weekdayOf(change.date)} ${nearDate(change.date, now.from, order)}`,
      headline,
      change: change.change,
    });
  }
  return found;
}

/** The day the dial shows, as the column beside it prints it. */
export interface NowDay {
  index: number;
  date: string;
  /** "Monday 5 October", with its year where the reader could mistake it. */
  title: string;
  today: boolean;
  /** The API's tones for the day, its contacts' alone (reading 17), which the mix bar draws. */
  tones: Tone[];
  /** Everything touching the chart that day, strongest first, then a contact before a retrograde before an eclipse. */
  cards: EventCard[];
  next: NextChange[];
}

export function nowDay(model: NowModel, index: number, order: DateOrder): NowDay {
  const { now } = model;
  const last = Math.max(0, now.days.length - 1);
  const at = Number.isFinite(index) ? Math.min(Math.max(0, Math.round(index)), last) : 0;
  const day = now.days[at];
  const date = day?.date ?? now.from;
  const kept = nearDate(date, now.from, order) === fullDate(date, order);
  const cards = model.events
    .filter((placed) => placed.spans.some((span) => span.start <= date && date <= span.end))
    .sort((a, b) =>
      toneRank(a.event.tone) - toneRank(b.event.tone)
      || KIND_RANK[a.event.kind] - KIND_RANK[b.event.kind]
      || a.start.localeCompare(b.start)
      || a.event.key.localeCompare(b.event.key))
    .map((placed) => cardOf(placed, date, now, order));
  return {
    index: at,
    date,
    title: kept ? dayWords(date, order) : longDay(date, order),
    today: date === now.from,
    tones: day ? [...day.tones] : [],
    cards,
    next: nextAfter(model, date, order),
  };
}

/** "5 Oct to 11 Oct", the range's own first and last day. */
export function rangeSpan(now: Pick<TimelineNow, "from" | "to">, order: DateOrder): string {
  return spanText(now.from, now.to, now.from, order);
}

/** One of the four known ages Life opens on (ADR-209), with the reader's own dates. */
export interface AgeCard {
  id: CycleId;
  /** "29", "every 12", "19 · 37", "early 40s". */
  label: string;
  name: string;
  word: string;
  /** What happens in the sky, in a sentence. */
  about: string;
  /** "Next on 4 Jun 2028, at 37. Last on 19 Jan 2021, at 29.", the API's dates. */
  yours: string;
  progress: number;
  /** Its cycle's reading: the one under way or next, else the last. */
  opens: { key: string; name: string; reading: ReadingStatus } | null;
}

const ABOUT: Readonly<Partial<Record<CycleId, string>>> = {
  "saturn-return": "Saturn comes back to where it was when you were born.",
  "jupiter-return": "Jupiter comes back to where it was when you were born.",
  "node-return": "The Moon's nodes come back to where they were when you were born.",
  "uranus-opposition": "Uranus gets halfway round, opposite where it was when you were born.",
};

const sameInstant = (a: string | null, b: string) => a !== null && Date.parse(a) === Date.parse(b);
const anchorOf = (cycle: Pick<LifeCycleView, "exact" | "start">) => cycle.exact[0] ?? cycle.start;

function ageCardOf(age: KnownAge, cycles: readonly LifeCycleView[], today: string, day: (at: string) => string, order: DateOrder): AgeCard {
  const words = CYCLE_WORDS[age.id];
  const known = KNOWN_AGES.find((k) => k.id === age.id);
  const own = cycles.filter((cycle) => cycle.id === age.id);
  const next = own.find((cycle) => sameInstant(age.next, anchorOf(cycle))) ?? null;
  const last = own.find((cycle) => sameInstant(age.last, anchorOf(cycle))) ?? null;
  const said: string[] = [];
  if (age.next !== null) {
    const under = next !== null && day(next.start) <= today;
    said.push(under ? `Happening now, at ${age.age}.` : `Next on ${fullDate(day(age.next), order)}, at ${age.age}.`);
  }
  if (age.last !== null) {
    const at = last?.age ?? (age.next === null ? age.age : null);
    said.push(`Last on ${fullDate(day(age.last), order)}${at === null ? "" : `, at ${at}`}.`);
  }
  const opens = next ?? last;
  return {
    id: age.id,
    label: known?.label ?? String(age.age),
    name: words.name,
    word: words.word,
    about: ABOUT[age.id] ?? "",
    yours: said.join(" "),
    progress: age.progress,
    opens: opens ? { key: opens.key, name: opens.name, reading: opens.reading } : null,
  };
}

/** Life read once for the screen: its known ages, every cycle as its card shows it, ahead and behind, and the waves. */
export interface LifeModel {
  ages: AgeCard[];
  /** Under way first, then soonest. */
  ahead: CycleView[];
  /** The most recent first, where looking back starts. */
  behind: CycleView[];
  waves: WaveLine[];
  /** The reader's age today, which marks today on the waves. */
  age: number;
  /** Each cycle's reading status by key, for what a tap opens. */
  readings: ReadonlyMap<string, ReadingStatus>;
}

/** How far round each body has come today, from the known ages: the API sends it for the four bodies they name. */
function progressByBody(life: TimelineLife): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  for (const age of life.ages) {
    const body = KNOWN_AGES.find((k) => k.id === age.id)?.body;
    if (body !== undefined) out[body] = age.progress;
  }
  return out;
}

/** Each cycle at its first exact pass on its planet's wave, aged from the reader's own birth (`cycleMark`). */
export function waveLinesOf(life: Pick<TimelineLife, "waves" | "cycles" | "birth">): WaveLine[] {
  return life.waves.map((wave) => ({
    body: wave.body,
    points: wave.points,
    marks: life.cycles
      .filter((cycle) => cycleBody(cycle.id) === wave.body)
      .map((cycle) => cycleMark(cycle.id, anchorOf(cycle), life.birth)),
  }));
}

export function lifeModel(life: TimelineLife, today: string, zone: string, order: DateOrder): LifeModel {
  const day = dayReader(zone);
  const progress = progressByBody(life);
  const byId = new Map<CycleId, LifeCycleView[]>();
  for (const cycle of life.cycles) byId.set(cycle.id, [...(byId.get(cycle.id) ?? []), cycle]);
  for (const list of byId.values()) list.sort((a, b) => Date.parse(anchorOf(a)) - Date.parse(anchorOf(b)));

  const views: CycleView[] = life.cycles.map((cycle) => {
    const same = byId.get(cycle.id) ?? [cycle];
    // A look-back names an occurrence that has happened, so an earlier cycle still to come is skipped (review 05/10 §4).
    const before = same.slice(0, same.indexOf(cycle)).reverse().find((c) => day(anchorOf(c)) < today);
    return {
      key: cycle.key,
      id: cycle.id,
      name: cycle.name,
      word: cycle.word,
      age: cycle.age,
      exact: cycle.exact.map(day),
      start: day(cycle.start),
      end: day(cycle.end),
      repeats: cycle.repeats,
      today,
      progress: progress[cycleBody(cycle.id)] ?? null,
      last: before ? { on: day(anchorOf(before)), age: before.age } : null,
      ages: same.map((c) => c.age),
    };
  });

  return {
    ages: life.ages.map((age) => ageCardOf(age, life.cycles, today, day, order)),
    ahead: views
      .filter((view) => cycleWhen(view, today) !== "past")
      .sort((a, b) => cycleDay(a).localeCompare(cycleDay(b)) || a.key.localeCompare(b.key)),
    behind: views
      .filter((view) => cycleWhen(view, today) === "past")
      .sort((a, b) => cycleDay(b).localeCompare(cycleDay(a)) || a.key.localeCompare(b.key)),
    waves: waveLinesOf(life),
    age: life.age,
    readings: new Map(life.cycles.map((cycle) => [cycle.key, cycle.reading])),
  };
}

/** Where a reading starts in the reader's own report (reading 10), and the chapter the link opens at. */
export function buildsOnText(on: TimelineReading["buildsOn"]): { text: string; chapter: number | null } | null {
  if (!on) return null;
  if (on.kind === "house") {
    const houses = CHAPTERS.findIndex((c) => c.section === "houses");
    const named = houseWord(on.house) ? `${ORDINALS[on.house - 1]} house (${houseWord(on.house)})` : "houses";
    return { text: `This reading starts from what your ${PERSONAL_REPORT} says about your ${named}.`, chapter: houses >= 0 ? houses + 1 : null };
  }
  const at = CHAPTERS.findIndex((c) => c.section === on.chapter);
  if (at < 0) return { text: `This reading starts from your ${PERSONAL_REPORT}.`, chapter: null };
  return { text: `This reading starts from what your ${PERSONAL_REPORT} says in ${CHAPTERS[at].title}.`, chapter: at + 1 };
}

/** A reading's paragraphs, split where it leaves a blank line. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}
