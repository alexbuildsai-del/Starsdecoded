/**
 * Level 0 of the lab (ADR-76, ADR-86): every prompt rendered exactly as the
 * engine would send it, tokens counted, the strict schema checked, and no
 * model call. Shared by the Lab page's Dry button and the script's
 * `--dry`, so the panel and a session in this sandbox render the same thing.
 * Timeline's readings and Ask render here too (ADR-210, 213), on the engine's
 * own events and the views the app shows. The injection pass proves a hostile
 * name stays inside its data block in every prompt of every family (ADR-202,
 * security scope 8, acceptance 10).
 */
import { encode } from "gpt-tokenizer";
import { previewSectionPrompt } from "./aiInterpretation.js";
import { previewPairSectionPrompt } from "./pairInterpretation.js";
import {
  calculateNatalChart, dayTone, hasHorizon, lifeCycles, natalLongitudes, readsAs, skyEvents,
  type LifeCycle, type NatalChartData,
} from "./chartCalculation.js";
import { moonOn, passageOf } from "./ask.js";
import type { Lens, PairInput } from "./pairBrief.js";
import type { TokenShape } from "./labRules.js";
import { zoneAt } from "./places.js";
import { resolveSection } from "./promptLoader.js";
import { RANGE_DAYS, dayIn, dayStart, lifeView, nowView, readingTimes, validZone, type ReaderChart, type ReadingStatuses } from "./timeline.js";
import { passagesFor } from "./timelineReadings.js";
import { ALL_SECTIONS, buildBrief, sectionById, sectionsFor, toStrictJsonSchema } from "../prompts/index.js";
import { PAIR_FOUNDATION, pairChapterIds, pairChapterTitle, pairSpecsFor } from "../prompts/pair/index.js";
import { DATA_CLOSE, DATA_LABELS, DATA_OPEN, dataBlock, outsideDataBlocks } from "../prompts/data.js";
import { CHILD_UNDER, READING_KEY, ReadingSchema, readingPrompt, type ReadingEvent, type ReadingInput } from "../prompts/timeline/index.js";
import {
  ASK_KEYS, askAnswerPrompt, askPlanPrompt,
  type AskAnswerCard, type AskAnswerInput, type AskCallKey, type AskContext, type AskEvent, type AskPerson, type AskReport, type AskTurn,
} from "../prompts/ask/index.js";

export interface DryRow {
  fixture: string;
  section: string;
  inputTokens: number;
  baselineInputTokens: number | null;
  schemaOk: boolean;
  error?: string;
  /** Timeline's rows: which of `HELD_KINDS` the event is, so a render is read by eye for the six. */
  holds?: HeldKind[];
}

/** A strict schema is one every object of which closes itself and requires every property. */
export function strictOk(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return true;
  const s = schema as { type?: string; properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean; items?: unknown; anyOf?: unknown[] };
  if (s.type === "object" || s.properties) {
    if (s.additionalProperties !== false) return false;
    const keys = Object.keys(s.properties ?? {});
    if (!keys.every((k) => (s.required ?? []).includes(k))) return false;
    if (!Object.values(s.properties ?? {}).every(strictOk)) return false;
  }
  if (s.items && !strictOk(s.items)) return false;
  if (s.anyOf && !s.anyOf.every(strictOk)) return false;
  return true;
}

export interface DryBase {
  fixture: string;
  chart: NatalChartData;
  subjectName: string;
  foundation: unknown;
  shapes: Record<string, TokenShape>;
}

const tokens = (prompt: { system: string; user: string }): number => encode(prompt.system).length + encode(prompt.user).length;

/** Every natal section's prompt for one base: the foundation alone, the sections against the stored foundation. */
export async function dryNatal(base: DryBase): Promise<DryRow[]> {
  const foundationJson = JSON.stringify(base.foundation, null, 2);
  const out: DryRow[] = [];
  for (const spec of ALL_SECTIONS) {
    const section = spec.key.replace(/^natal:/, "");
    const shape = base.shapes[section];
    const baselineInputTokens = shape ? shape.inputTokens + shape.cachedInputTokens : null;
    try {
      const prompt = await previewSectionPrompt(spec.key, base.chart, base.subjectName, section === "foundation" ? undefined : foundationJson);
      out.push({ fixture: base.fixture, section, inputTokens: tokens(prompt), baselineInputTokens, schemaOk: strictOk(prompt.schema) });
    } catch (err) {
      // A run stored before the horizon status (pre-R05) cannot render; it is named, not hidden (MB-73).
      out.push({ fixture: base.fixture, section, inputTokens: 0, baselineInputTokens, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

/** Every pair section's prompt for one pair under its lens, the foundation first and no allocation yet: zero usage. */
export async function dryPair(fixture: string, input: PairInput): Promise<DryRow[]> {
  const out: DryRow[] = [];
  for (const spec of [PAIR_FOUNDATION, ...pairSpecsFor(input.lens)]) {
    const section = spec.key.replace(/^pair:/, "");
    try {
      const prompt = await previewPairSectionPrompt(spec.key, input);
      out.push({ fixture, section, inputTokens: tokens(prompt), baselineInputTokens: null, schemaOk: strictOk(prompt.schema) });
    } catch (err) {
      out.push({ fixture, section, inputTokens: 0, baselineInputTokens: null, schemaOk: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

/** The pair brief as rendered for one section: what acceptance 2 reads for the age and the now-and-later rule. */
export async function dryPairPrompt(input: PairInput, sectionKey: string): Promise<{ system: string; user: string }> {
  const prompt = await previewPairSectionPrompt(sectionKey, input);
  return { system: prompt.system, user: prompt.user };
}

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const failedRow = (fixture: string, section: string, err: unknown): DryRow =>
  ({ fixture, section, inputTokens: 0, baselineInputTokens: null, schemaOk: false, error: message(err) });

/** Timeline's and Ask's renders read from this day, so a row reads the same whatever day it runs. */
export const DRY_FROM = "2026-10-05";

const READINGS_A_CHART = 5;
const CYCLES_A_CHART = 3;

/** A chart as Timeline and Ask read it (reading 2): computed from birth data now, its days, and the report its readings build on. */
export interface DryReader {
  fixture: string;
  /** The name as typed. */
  name: string;
  chart: NatalChartData;
  /** The reader's days (reading 4). */
  zone: string;
  /** The base's stored run of this chart, when one is on disk: the report a reading builds on and Ask quotes (reading 10). */
  report?: Record<string, unknown> | null;
}

/** Someone the reader can ask about, only through a Compatibility report under this lens (reading 14). */
export interface DryPerson {
  name: string;
  chart: NatalChartData;
  lens: Lens;
}

/** The reader's days when no browser names a zone (reading 4): the one the fixture names, else the one its place lies in, else UTC. */
export function readerZone(f: { timezone?: string; latitude: number; longitude: number }): string {
  return validZone(f.timezone) ?? validZone(zoneAt(f.latitude, f.longitude)) ?? "UTC";
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Halfway through the reader's day: what "that day" is read at, clear of either midnight and of a skipped hour. */
function middayOf(day: string, zone: string): Date {
  return new Date((dayStart(day, zone).getTime() + dayStart(addDays(day, 1), zone).getTime()) / 2);
}

/**
 * What the dry Timeline render must hold per chart, each when the chart's window has one (R19-19; Review 05/10
 * acceptance 11, Review 08/10 §1): a retrograde, an eclipse, the nodes' opposition, a cycle from before 16, a Light
 * reading (tone "easy") and a contact with three passes.
 */
export const HELD_KINDS = ["retrograde", "eclipse", "nodes opposition", "cycle before 16", "light", "three passes"] as const;
export type HeldKind = (typeof HELD_KINDS)[number];


/** Which of the six an event is; a Light eclipse or contact is two of them. */
export function heldKinds(event: ReadingEvent): HeldKind[] {
  if (!("kind" in event)) return [...(event.id === "node-opposition" ? ["nodes opposition" as const] : []), ...(event.age < CHILD_UNDER ? ["cycle before 16" as const] : [])];
  return [
    ...(event.kind === "retrograde" ? ["retrograde" as const] : []),
    ...(event.kind === "eclipse" ? ["eclipse" as const] : []),
    ...(event.tone === "easy" ? ["light" as const] : []),
    ...(event.kind === "contact" && event.passes.length >= 3 ? ["three passes" as const] : []),
  ];
}

/** The six that none of a chart's rows (their `holds`) is, in the order above: what its window did not have. */
export function missingKinds(rows: readonly Pick<DryRow, "holds">[]): HeldKind[] {
  const held = new Set(rows.flatMap((r) => r.holds ?? []));
  return HELD_KINDS.filter((k) => !held.has(k));
}

/**
 * The events a dry reading renders for one chart: the first five that read
 * (reading 7) in the six months from `from` in the reader's days, in the
 * engine's order, then the three life cycles nearest that day, nearest first.
 * Then, for each of the six `HELD_KINDS` those eight leave out, the first
 * event of the window that is one (a cycle: the nearest to that day), so the
 * render needs no luck of the chart; a window without one leaves it out.
 */
export function dryEvents(chart: NatalChartData, zone: string, from = DRY_FROM): ReadingEvent[] {
  const start = dayStart(from, zone);
  const end = dayStart(addDays(from, RANGE_DAYS["six-months"]), zone);
  const reads = skyEvents(chart, start, new Date(end.getTime() - 1)).filter(readsAs);
  const at = start.getTime();
  const away = (cycle: LifeCycle) => Math.max(0, cycle.window.start.getTime() - at, at - cycle.window.end.getTime());
  // The sort is stable, so cycles as near as each other keep the engine's order.
  const all = lifeCycles(natalLongitudes(chart), new Date(chart.datetimeUtc)).sort((x, y) => away(x) - away(y));
  const sky: ReadingEvent[] = reads.slice(0, READINGS_A_CHART);
  const cycles: ReadingEvent[] = all.slice(0, CYCLES_A_CHART);
  for (const kind of HELD_KINDS) {
    if ([...sky, ...cycles].some((e) => heldKinds(e).includes(kind))) continue;
    const [into, pool]: [ReadingEvent[], readonly ReadingEvent[]] = kind === "nodes opposition" || kind === "cycle before 16" ? [cycles, all] : [sky, reads];
    const found = pool.find((e) => heldKinds(e).includes(kind));
    if (found) into.push(found);
  }
  return [...sky, ...cycles];
}

type Prompt = { system: string; user: string };

/** A reading's prompt as its writer sends it: the family's stored rows over its defaults (R16-24). */
async function readingOf(input: ReadingInput): Promise<Prompt> {
  return readingPrompt(input, await resolveSection(READING_KEY));
}

/** One of Ask's prompts as the chat sends it: the call's stored rows over its defaults. The plan reads only the context. */
async function askOf(key: AskCallKey, input: AskAnswerInput) {
  const override = await resolveSection(key);
  return key === ASK_KEYS.plan ? askPlanPrompt(input, override) : askAnswerPrompt(input, override);
}

const ASK_CALLS: readonly AskCallKey[] = [ASK_KEYS.plan, ASK_KEYS.answer];
const callName = (key: AskCallKey): string => key.replace(/^ask:/, "");

/**
 * Timeline's reading prompts for one chart (ADR-210): `dryEvents`' eight, each
 * on the brief and the passages the writer picks from the stored run.
 */
export async function dryTimeline(reader: DryReader, from = DRY_FROM): Promise<DryRow[]> {
  let events: ReadingEvent[];
  try {
    events = dryEvents(reader.chart, reader.zone, from);
  } catch (err) {
    return [failedRow(reader.fixture, "*", err)];
  }
  const brief = buildBrief(reader.chart, reader.name);
  const blind = !hasHorizon(reader.chart);
  const out: DryRow[] = [];
  for (const event of events) {
    try {
      const { excerpts } = passagesFor(event, reader.chart, reader.report);
      const times = readingTimes(viewer(reader.chart, reader.zone), event, dayStart(from, reader.zone));
      const prompt = await readingOf({ event, brief, excerpts, name: reader.name, blind, ...times });
      out.push({ fixture: reader.fixture, section: event.key, inputTokens: tokens(prompt), baselineInputTokens: null, schemaOk: strictOk(toStrictJsonSchema(ReadingSchema)), holds: heldKinds(event) });
    } catch (err) {
      out.push(failedRow(reader.fixture, event.key, err));
    }
  }
  return out;
}

/** Ask's three fixed questions, one thread in this order: a week, a life cycle, and a day with someone in it. */
const ASK_QUESTIONS = [
  { id: "week", text: "What's on my chart this week?" },
  { id: "cycle", text: "When is my next big life cycle?" },
  { id: "friday", text: "I snapped at someone on Friday. What was going on in my chart?" },
] as const;

type AskQuestion = (typeof ASK_QUESTIONS)[number]["id"];

/** Ask's earlier replies as the thread keeps them: model text that names the reader, so it goes back masked (ADR-240). */
const ASK_REPLIES: Readonly<Record<AskQuestion, ((first: string) => string) | null>> = {
  week: (first) => `${first}, a few things touch your chart this week. The cards below show each day.`,
  cycle: (first) => `${first}, your next big cycle is on the card below, with its dates.`,
  friday: null,
};

/** The section the third question quotes from the reader's Personal report. */
const QUOTED = "relationships";

const NO_READINGS: ReadingStatuses = new Map();

/** A chart as R16-23's views read it; the ids name the lab, since the views never look a reader up. */
function viewer(chart: NatalChartData, zone: string): ReaderChart {
  return { userId: "lab", profileId: "lab", reportId: "lab", chart, blind: !hasHorizon(chart), zone, birth: new Date(chart.datetimeUtc), basis: "lab" };
}

/** What touches a chart on the reader's day, as Now and ahead words it, each contact with its orb at midday. */
function dayEvents(reader: ReaderChart, day: string): AskEvent[] {
  const start = dayStart(day, reader.zone).getTime();
  const end = dayStart(addDays(day, 1), reader.zone).getTime();
  const on = (at: Date) => dayIn(at, reader.zone);
  return nowView(reader, "week", reader.zone, NO_READINGS, middayOf(day, reader.zone)).events
    .filter((e) => e.spans.some((s) => s.start.getTime() < end && s.end.getTime() >= start))
    .map((e) => ({
      kind: e.kind, headline: e.headline, sky: e.facts.sky, house: e.facts.house, tone: e.tone,
      from: on(e.start), to: on(e.end), exact: e.exact.map(on), orb: e.orbNow,
    }));
}

function dayCard(id: string, reader: ReaderChart, day: string): AskAnswerCard {
  return { id, kind: "day", date: day, moon: moonOn(day, reader.zone), events: dayEvents(reader, day) };
}

/** Each day's tone over the week from today (reading 17), the window tool's card. */
function weekCard(id: string, reader: ReaderChart, today: string): AskAnswerCard {
  const week = nowView(reader, "week", reader.zone, NO_READINGS, middayOf(today, reader.zone));
  const days = week.days.map(({ date, tones }) => ({ date, tone: dayTone(tones.map((tone) => ({ kind: "contact" as const, tone }))) }));
  return { id, kind: "window", from: week.from, to: week.to, days };
}

/** The reader's next life cycle to end after today, else their last: the cycle tool's card, as Life shows it. */
function cycleCards(id: string, reader: ReaderChart, today: string): AskAnswerCard[] {
  const { cycles } = lifeView(reader, reader.zone, NO_READINGS, middayOf(today, reader.zone));
  const cycle = cycles.find((c) => !c.past) ?? cycles[cycles.length - 1];
  if (!cycle) return [];
  const on = (at: Date) => dayIn(at, reader.zone);
  return [{ id, kind: "cycle", cycle: { name: cycle.name, word: cycle.word, age: cycle.age, from: on(cycle.start), to: on(cycle.end), exact: cycle.exact.map(on), passes: cycle.passes, past: cycle.past } }];
}

/** The Friday before `today`, which the third question asks about. */
function fridayBefore(today: string): string {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  return addDays(today, -((weekday + 2) % 7 || 7));
}

interface AskScene {
  id: AskQuestion;
  /** The answer's input; the plan reads only its context. */
  input: AskAnswerInput;
}

interface SceneInput {
  name: string;
  chart: NatalChartData;
  zone: string;
  person: DryPerson | null;
  /** The quote card's passage from the reader's Personal report, or none when no run is on disk. */
  passage: string | null;
  today: string;
}

/**
 * The thread the three questions make on one chart: each message with the
 * ones before it and Ask's replies, the reader's Personal report and, with a
 * person, the Compatibility report they are read through; then the cards the
 * tools would compute for it, from the engine and R16-23's views.
 */
function askScenes(s: SceneInput): AskScene[] {
  const reader = viewer(s.chart, s.zone);
  const reports: AskReport[] = [{
    id: "r1", kind: "personal", names: [s.name],
    sections: sectionsFor(s.chart.horizon.status).map((spec) => ({ id: spec.key.replace(/^natal:/, ""), title: spec.label })),
  }];
  const people: AskPerson[] = [];
  if (s.person) {
    reports.push({ id: "r2", kind: "compatibility", names: [s.name, s.person.name], sections: pairChapterIds(s.person.lens).map((id) => ({ id, title: pairChapterTitle(id) })) });
    people.push({ id: "p1", name: s.person.name, report: "r2" });
  }
  const friday = fridayBefore(s.today);
  const quoted = sectionById(QUOTED);
  const cards: Record<AskQuestion, () => AskAnswerCard[]> = {
    week: () => [weekCard("c1", reader, s.today), dayCard("c2", reader, s.today)],
    cycle: () => cycleCards("c1", reader, s.today),
    friday: () => [
      dayCard("c1", reader, friday),
      ...(s.passage && quoted ? [{ id: "c2", kind: "quote" as const, report: "r1", section: quoted.label, text: s.passage }] : []),
      ...(s.person ? [{ id: "c3", kind: "person" as const, person: "p1", date: friday, events: dayEvents(viewer(s.person.chart, s.zone), friday) }] : []),
    ],
  };
  const brief = buildBrief(s.chart, s.name);
  const blind = !hasHorizon(s.chart);
  const first = s.name.trim().split(/\s+/)[0] ?? "";
  const history: AskTurn[] = [];
  return ASK_QUESTIONS.map((q) => {
    const context: AskContext = {
      message: q.text, tapped: null, history: [...history], today: s.today, name: s.name, blind, reports, people,
      fromReport: q.id === "friday" ? "r1" : null,
    };
    const reply = ASK_REPLIES[q.id];
    history.push({ role: "reader", text: q.text }, ...(reply ? [{ role: "ask" as const, text: reply(first) }] : []));
    return { id: q.id, input: { ...context, brief, cards: cards[q.id]() } };
  });
}

/**
 * Ask's two prompts for each of the three fixed questions (ADR-213), on one
 * reader's chart, their stored run's words and, when they have one, the
 * person a Compatibility report lets them ask about.
 */
export async function dryAsk(reader: DryReader, person: DryPerson | null = null, today = DRY_FROM): Promise<DryRow[]> {
  let scenes: AskScene[];
  try {
    scenes = askScenes({ name: reader.name, chart: reader.chart, zone: reader.zone, person, passage: passageOf(reader.report?.[QUOTED] ?? null), today });
  } catch (err) {
    return [failedRow(reader.fixture, "*", err)];
  }
  const out: DryRow[] = [];
  for (const scene of scenes) {
    for (const key of ASK_CALLS) {
      const section = `${scene.id} ${callName(key)}`;
      try {
        const prompt = await askOf(key, scene.input);
        out.push({ fixture: reader.fixture, section, inputTokens: tokens(prompt), baselineInputTokens: null, schemaOk: strictOk(toStrictJsonSchema(prompt.schema)) });
      } catch (err) {
        out.push(failedRow(reader.fixture, section, err));
      }
    }
  }
  return out;
}

/** A fixture whose name is built to escape its data block: birth data and that name, nothing else (R-3.1). */
export interface InjectionFixture {
  fixture: string;
  name: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezone?: string;
  birthTimeWindowMinutes?: number;
}

/** What the hostile names are rendered over, since no report was ever written for an injection chart. */
export interface InjectionBase {
  /** A matrix chart's stored run: its foundation stands in, and its name is the plain one every natal prompt is set against. */
  natal: { subjectName: string; foundation: unknown };
  /** curie-winfrey's runs, one input per lens, with their own names; each lens takes a different two hostile names as A and B. */
  pairs: PairInput[];
}

export interface InjectionRow {
  /** The hostile name's fixture, a pair's two as A and B, or Ask's reader with the person they ask about. */
  fixture: string;
  /** "natal", the pair's lens, "timeline" or "ask". */
  set: string;
  section: string;
  /** Data blocks in the prompt that carry a hostile name. */
  blocks: number;
  /** Where the hostile name changed the text outside its blocks, or null. */
  leak: string | null;
  error?: string;
}

/** The renders the injection pass reads; the test wraps one to plant a raw name. Timeline's and Ask's are the live ones when left out. */
export interface InjectionRenderers {
  natal: (sectionKey: string, chart: NatalChartData, name: string, foundationJson?: string) => Promise<Prompt>;
  pair: (sectionKey: string, input: PairInput) => Promise<Prompt>;
  timeline?: (input: ReadingInput) => Promise<Prompt>;
  ask?: (key: AskCallKey, input: AskAnswerInput) => Promise<Prompt>;
}

const LIVE: Required<InjectionRenderers> = {
  natal: previewSectionPrompt,
  pair: (key, input) => previewPairSectionPrompt(key, input),
  timeline: readingOf,
  ask: askOf,
};

const MARKER_LINES: ReadonlySet<string> = new Set([...DATA_LABELS.map(DATA_OPEN), DATA_CLOSE]);

/** The first line outside the blocks where the two renders part, from a little before it, so a leak reads in context. */
function firstDifference(out: string, kept: string): string {
  const a = out.split("\n");
  const b = kept.split("\n");
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length) return "a line the plain name keeps is gone";
  // A block the check could not take out shows its open marker first; the value under it says more.
  const line = MARKER_LINES.has(a[i]) && i + 1 < a.length ? a[i + 1] : a[i];
  const other = b[i] ?? "";
  let p = 0;
  while (p < line.length && line[p] === other[p]) p++;
  return line.slice(Math.max(0, p - 24), p + 76);
}

/**
 * What a hostile render holds outside its blocks that the same prompt with a
 * plain name does not. Two renders are compared rather than the name searched
 * for, so a part of it that was cut, split or reworded is still caught, and a
 * phrase the prompt itself uses is never taken for one.
 */
function leakOf(hostile: Prompt, plain: Prompt): string | null {
  for (const key of ["system", "user"] as const) {
    const out = outsideDataBlocks(hostile[key]);
    const kept = outsideDataBlocks(plain[key]);
    if (out !== kept) return `${key}: ${firstDifference(out, kept)}`;
  }
  return null;
}

async function probe(where: Omit<InjectionRow, "blocks" | "leak">, names: string[], hostile: () => Promise<Prompt>, plain: () => Promise<Prompt>): Promise<InjectionRow> {
  try {
    const h = await hostile();
    const text = `${h.system}\n${h.user}`;
    const blocks = [...new Set(names)].reduce((n, name) => n + text.split(dataBlock("name", name)).length - 1, 0);
    return { ...where, blocks, leak: leakOf(h, await plain()) };
  } catch (err) {
    return { ...where, blocks: 0, leak: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * A passage of the reader's report that names them, as a writer may: the name
 * sits in the text of a quote, the place `quoteBlocks` must find it. Its own
 * words are lower case, so no plain name's spelling can turn up in them.
 */
const namedPassage = (name: string): string => `${name} keeps a list for everything and checks it twice.`;

/** Ask's injection reads the person through a Compatibility report under this lens. */
const ASK_LENS: Lens = "partners";

/**
 * Every natal section's prompt for each hostile name on its own chart,
 * computed now, and every pair prompt with two of them as A and B over
 * curie-winfrey's runs, a different two under each lens so each name is
 * both A and B somewhere. Then each name as the reader of its own chart's
 * Timeline readings, in the brief and a passage, and of Ask's two prompts
 * for the three questions, with the next name as the person they ask about,
 * so each is both somewhere. Each prompt is set against the same prompt with
 * a plain name, and a row is flagged when anything outside the blocks differs.
 */
export async function dryInjection(fixtures: InjectionFixture[], base: InjectionBase, render: InjectionRenderers = LIVE): Promise<InjectionRow[]> {
  const rows: InjectionRow[] = [];
  const foundationJson = JSON.stringify(base.natal.foundation, null, 2);
  const charts = new Map<InjectionFixture, NatalChartData>();
  for (const f of fixtures) {
    let chart: NatalChartData;
    try {
      chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, f.birthTimeWindowMinutes ?? 0);
    } catch (err) {
      rows.push({ fixture: f.fixture, set: "natal", section: "*", blocks: 0, leak: null, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
    charts.set(f, chart);
    for (const spec of ALL_SECTIONS) {
      const section = spec.key.replace(/^natal:/, "");
      const foundation = section === "foundation" ? undefined : foundationJson;
      rows.push(await probe({ fixture: f.fixture, set: "natal", section }, [f.name],
        () => render.natal(spec.key, chart, f.name, foundation),
        () => render.natal(spec.key, chart, base.natal.subjectName, foundation)));
    }
  }
  if (!fixtures.length) return rows;
  // One moment for both renders, so a child's age can never differ between them across midnight.
  const at = new Date();
  for (const [i, given] of base.pairs.entries()) {
    const [fa, fb] = [fixtures[i % fixtures.length], fixtures[(i + 1) % fixtures.length]];
    const plain: PairInput = { ...given, at: given.at ?? at };
    const hostile: PairInput = { ...plain, a: { ...plain.a, name: fa.name }, b: { ...plain.b, name: fb.name } };
    for (const spec of [PAIR_FOUNDATION, ...pairSpecsFor(plain.lens)]) {
      rows.push(await probe({ fixture: `A ${fa.fixture}, B ${fb.fixture}`, set: plain.lens, section: spec.key.replace(/^pair:/, "") }, [fa.name, fb.name],
        () => render.pair(spec.key, hostile),
        () => render.pair(spec.key, plain)));
    }
  }
  rows.push(...await timelineInjection(fixtures, charts, base.natal.subjectName, render.timeline ?? LIVE.timeline));
  rows.push(...await askInjection(fixtures, charts, base.natal.subjectName, render.ask ?? LIVE.ask));
  return rows;
}

/** Each hostile name as the reader of its own chart's readings: in the brief, in a passage, and in the passage's masking. */
async function timelineInjection(fixtures: InjectionFixture[], charts: ReadonlyMap<InjectionFixture, NatalChartData>, plain: string, render: (input: ReadingInput) => Promise<Prompt>): Promise<InjectionRow[]> {
  const rows: InjectionRow[] = [];
  for (const f of fixtures) {
    const chart = charts.get(f);
    if (!chart) continue;
    let events: ReadingEvent[];
    try {
      events = dryEvents(chart, readerZone(f));
    } catch (err) {
      rows.push({ fixture: f.fixture, set: "timeline", section: "*", blocks: 0, leak: null, error: message(err) });
      continue;
    }
    const blind = !hasHorizon(chart);
    const briefs = new Map([f.name, plain].map((name) => [name, buildBrief(chart, name)]));
    const input = (event: ReadingEvent, name: string): ReadingInput =>
      ({ event, brief: briefs.get(name)!, excerpts: [{ source: "Your report", text: namedPassage(name) }], name, blind, ...readingTimes(viewer(chart, readerZone(f)), event, dayStart(DRY_FROM, readerZone(f))) });
    for (const event of events) {
      rows.push(await probe({ fixture: f.fixture, set: "timeline", section: event.key }, [f.name], () => render(input(event, f.name)), () => render(input(event, plain))));
    }
  }
  return rows;
}

/**
 * Each hostile name as Ask's reader on its own chart, with the next as the
 * person, in both prompts of the three questions. One plain name stands for
 * the reader and the person: no scene letters anyone A or B, so whether two
 * names match never moves the text outside their blocks.
 */
async function askInjection(fixtures: InjectionFixture[], charts: ReadonlyMap<InjectionFixture, NatalChartData>, plain: string, render: (key: AskCallKey, input: AskAnswerInput) => Promise<Prompt>): Promise<InjectionRow[]> {
  const rows: InjectionRow[] = [];
  for (const [i, f] of fixtures.entries()) {
    const chart = charts.get(f);
    if (!chart) continue;
    const g = fixtures[(i + 1) % fixtures.length];
    const theirs = charts.get(g);
    const fixture = theirs ? `${f.fixture} with ${g.fixture}` : f.fixture;
    const scenes = (name: string, person: string) => askScenes({
      name, chart, zone: readerZone(f), person: theirs ? { name: person, chart: theirs, lens: ASK_LENS } : null, passage: namedPassage(name), today: DRY_FROM,
    });
    let hostile: AskScene[];
    let kept: AskScene[];
    try {
      hostile = scenes(f.name, g.name);
      kept = scenes(plain, plain);
    } catch (err) {
      rows.push({ fixture, set: "ask", section: "*", blocks: 0, leak: null, error: message(err) });
      continue;
    }
    for (const [n, scene] of hostile.entries()) {
      for (const key of ASK_CALLS) {
        rows.push(await probe({ fixture, set: "ask", section: `${scene.id} ${callName(key)}` }, theirs ? [f.name, g.name] : [f.name],
          () => render(key, scene.input),
          () => render(key, kept[n].input)));
      }
    }
  }
  return rows;
}
