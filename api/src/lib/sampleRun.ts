/**
 * The sample branch a passing Release leaves (ADR-223, ADR-247, ADR-250; MB-182, readings 14 and 22). The release lab
 * keeps Audrey Hepburn's natal report whole; once production has moved, that report less its foundation (the model's
 * internal handoff, never shown) and its usage, and Mira's week moved to the Monday after the release, are one commit on
 * a new `sample/<release-id>` branch from the released commit, and the session opens the pull request that takes them.
 * No key leaves Railway and no one carries a file. Nothing here fails a release: each file's outcome, a skip and its
 * reason included, is a line in the forward step's detail.
 *
 * Mira's week is every fact /timeline shows about her, computed here by the engine from her fixture and committed as
 * data, so the page's browser never runs the engine for it. The engine moves under it whenever the brain changes, so
 * `sampleRun.test.ts` fails on a stale file and rewrites it when run with MIRA_WEEK=write.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CYCLE_WORDS, KNOWN_AGES, calculateNatalChart, factsOf, headlineOf, inEffect, lifeCycles, longitudeAt, natalLongitudes,
  noonLongitudes, offsetAtBirth, skyEvents, speedAt, waves, weekSentence,
  type ContactEvent, type CycleId, type LifeCycle, type SkyBody, type SkyEvent, type Tone,
} from "@workspace/engine";
import type { GithubApi } from "./github.js";

/** The chart /sample shows (ADR-119), one of the five the release lab writes. */
export const SAMPLE_CHART = "audrey-hepburn";

const SAMPLE_DIR = "web/src/site/data/sample";

/** Everything /timeline shows about Mira, in the one file a forwarded Release moves (ADR-250). */
export const MIRA_WEEK_PATH = "web/src/site/data/timeline/mira-week.json";
/** The site's sample account (ADR-112): synthetic, her chart computed like anyone's. */
export const MIRA_FIXTURE = "fixtures/sample-people/mira.json";

export function sampleBranch(releaseId: string): string {
  return `sample/${releaseId}`;
}

export function samplePath(releaseId: string): string {
  return `${SAMPLE_DIR}/${SAMPLE_CHART}.${releaseId}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The report as /sample commits it: the natal output less `foundation` and `meta.usage`, every other key where it
 * stood, as r06's run was cut (`sample.test.ts` digests it the same way). Null for anything that is not a natal report.
 */
export function sampleRun(output: unknown): Record<string, unknown> | null {
  if (!isRecord(output) || !isRecord(output.meta) || output.meta.reportType !== "natal") return null;
  const run = structuredClone(output);
  delete run.foundation;
  delete (run.meta as Record<string, unknown>).usage;
  return run;
}

/** Two-space JSON and a closing newline, as the committed sample is written. */
export function sampleFile(run: Record<string, unknown>): string {
  return `${JSON.stringify(run, null, 2)}\n`;
}

/** "YYYY-MM-DD", one of Mira's own days in her zone (reading 4). */
type Day = string;

/** The slow planets the page's hero plays, Mars to Pluto (reading 18). */
export const MIRA_BODIES: readonly SkyBody[] = ["mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
/** Frames from the Monday on: six months, as Timeline counts them (reading 4). */
export const MIRA_DAYS = 182;
/** The planets the dial draws inside, besides her Ascendant and Midheaven. */
const NATAL_POINTS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"] as const;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export interface MiraBirth {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface MiraContact {
  key: string;
  body: ContactEvent["body"];
  aspect: ContactEvent["aspect"];
  target: ContactEvent["target"];
  orb: number;
  house: number | null;
  tone: Tone;
  headline: string;
  facts: { sky: string; house: string | null };
  /** The window to the minute, from first entering the orb to last leaving it. */
  start: string;
  end: string;
  /**
   * The exact passes, and the runs of days the doctrine's `inEffect` holds it in orb, on her days: a window can span a
   * retrograde that takes the planet out of orb and back, and a day in that gap shows nothing.
   */
  exact: Day[];
  runs: [Day, Day][];
}

/** Something that starts, peaks or eases on her days: a window's ends, an exact pass, an eclipse. */
export interface MiraChange {
  day: Day;
  key: string;
  change: "starts" | "peaks" | "eases";
  headline: string;
  tone: Tone | null;
}

export interface MiraCycle {
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

/** The file's shape, which `web/src/site/data/timeline/mira.ts` reads. */
export interface MiraWeek {
  /** The Monday the week starts: the page's today. */
  week: Day;
  zone: string;
  /** Her birth instant, from which the page counts her age in years. */
  born: string;
  /** Her age that Monday, in whole years. */
  age: number;
  points: { body: string; lon: number; house: number | null }[];
  angles: { ascendant: number; midheaven: number } | null;
  /** Each body at 12:00 UTC on each frame's day, and the runs of frames it moves backwards in. */
  sky: { body: SkyBody; lon: number[]; retrograde: [number, number][] }[];
  contacts: MiraContact[];
  /** `weekSentence`'s, which counts the transits on the week's days rather than its changes (reading 23). */
  sentence: string;
  /** What starts, peaks and eases on the week's days, as the page lists them under the sentence. */
  changes: MiraChange[];
  /** The first three after the Monday, within the six months. */
  next: MiraChange[];
  /** The four known ages' cycles from her chart, birth to 90 (ADR-209). */
  cycles: MiraCycle[];
  /** How far round each known age's body has come since her birth, that Monday. */
  ages: { id: CycleId; label: string; progress: number }[];
  /** Saturn's and Jupiter's monthly distance from their places at her birth, birth to 90. */
  waves: { body: SkyBody; distances: number[] }[];
  /** The finder's own answer for her birth date at midday (reading 21), and each known age's planet's way round that Monday. */
  finder: { cycles: MiraCycle[]; rounds: { id: CycleId; progress: number }[] };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const norm = (deg: number) => ((deg % 360) + 360) % 360;

function partsOf(day: Day): [number, number, number] {
  const [y, m, d] = day.split("-").map(Number);
  return [y, m, d];
}

function addDays(day: Day, n: number): Day {
  const [y, m, d] = partsOf(day);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function noonUtc(day: Day): Date {
  const [y, m, d] = partsOf(day);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** The first Monday after the UTC day of `at`, never that day itself: a release on a Monday moves the week on by seven. */
export function mondayAfter(at: Date): Day {
  const day = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  const ahead = (8 - new Date(day).getUTCDay()) % 7 || 7;
  return new Date(day + ahead * DAY_MS).toISOString().slice(0, 10);
}

function dayIn(at: Date, zone: string): Day {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Whole years between two instants, a birthday counting from the hour of birth. */
function yearsBetween(born: Date, at: Date): number {
  const years = at.getUTCFullYear() - born.getUTCFullYear();
  const birthday = new Date(born.getTime());
  birthday.setUTCFullYear(born.getUTCFullYear() + years);
  return at.getTime() < birthday.getTime() ? years - 1 : years;
}

/** How far round its circle a body has come since birth, 0 to 1; the node moves backwards, so it counts the other way. */
function roundOf(body: SkyBody, home: number, at: Date): number {
  return r3(norm((body === "north_node" ? -1 : 1) * (longitudeAt(body, at) - home)) / 360);
}

function spans(indexes: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const i of indexes) {
    const open = out[out.length - 1];
    if (open && open[1] === i - 1) open[1] = i;
    else out.push([i, i]);
  }
  return out;
}

const CHANGE_ORDER: Record<MiraChange["change"], number> = { starts: 0, peaks: 1, eases: 2 };

/** Each event's moments: a window's start and end and its exact passes, a retrograde's stations, an eclipse. */
function momentsOf(event: SkyEvent): Array<{ at: Date; change: MiraChange["change"] }> {
  switch (event.kind) {
    case "contact":
      return [
        { at: event.window.start, change: "starts" },
        ...event.window.exact.map((at) => ({ at, change: "peaks" as const })),
        { at: event.window.end, change: "eases" },
      ];
    case "retrograde":
      return [{ at: event.start, change: "starts" }, { at: event.end, change: "eases" }];
    case "eclipse":
      return [{ at: event.eclipse.at, change: "peaks" }];
  }
}

function cycleOf(cycle: LifeCycle, zone: string): MiraCycle {
  return {
    key: cycle.key, id: cycle.id, body: cycle.body, name: CYCLE_WORDS[cycle.id].name, word: CYCLE_WORDS[cycle.id].word,
    age: cycle.age, start: dayIn(cycle.window.start, zone), end: dayIn(cycle.window.end, zone),
    exact: cycle.window.exact.map((at) => dayIn(at, zone)), passes: cycle.passes, repeats: cycle.repeats,
  };
}

/**
 * Everything /timeline shows about Mira for the week from `monday`, from her birth data and the engine alone: her
 * points, Mars to Pluto on each of six months of days, the doctrine's contacts with their plain words and the days each
 * holds, the week's sentence, her known ages' cycles and waves, and the finder's answer for her birth date.
 */
export function miraWeek(monday: Day, birth: MiraBirth): MiraWeek {
  // A day the calendar lacks would roll over (30 Feb to 2 Mar) and could land on a Monday, so the day must read back as written.
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(monday) ||
    noonUtc(monday).toISOString().slice(0, 10) !== monday ||
    noonUtc(monday).getUTCDay() !== 1
  ) throw new Error(`${monday} is not a Monday`);
  const zone = birth.timezone;
  const chart = calculateNatalChart(birth.birthDate, birth.birthTime, birth.latitude, birth.longitude, zone, 0);
  const born = new Date(chart.datetimeUtc);
  const first = noonUtc(monday);
  const midnights = new Map<Day, Date>();
  const midnight = (day: Day): Date => {
    let at = midnights.get(day);
    if (!at) {
      const [y, m, d] = partsOf(day);
      at = new Date(Date.UTC(y, m - 1, d) - offsetAtBirth(zone, day, "00:00") * HOUR_MS);
      midnights.set(day, at);
    }
    return at;
  };
  const runsOf = (event: ContactEvent): [Day, Day][] => {
    const runs: [Day, Day][] = [];
    const last = dayIn(event.window.end, zone);
    for (let day = dayIn(event.window.start, zone); day <= last; day = addDays(day, 1)) {
      if (inEffect([event], midnight(day)).length === 0) continue;
      const open = runs[runs.length - 1];
      if (open && open[1] === addDays(day, -1)) open[1] = day;
      else runs.push([day, day]);
    }
    return runs;
  };

  const events = skyEvents(chart, midnight(monday), midnight(addDays(monday, MIRA_DAYS)));
  const contacts = events.filter((event): event is ContactEvent => event.kind === "contact");
  // weekSentence reads seven whole days from the Monday's midnight, so the listed changes use the same edges.
  const weekOpen = midnight(monday).getTime();
  const weekClose = weekOpen + 7 * DAY_MS;
  const moments = events
    .flatMap((event) => momentsOf(event).map(({ at, change }) => ({ at, change, event })))
    .sort((a, b) => a.at.getTime() - b.at.getTime() || CHANGE_ORDER[a.change] - CHANGE_ORDER[b.change]);
  const changeOf = ({ at, change, event }: (typeof moments)[number]): MiraChange =>
    ({ day: dayIn(at, zone), key: event.key, change, headline: headlineOf(event), tone: event.tone });
  const lastDay = midnight(addDays(monday, MIRA_DAYS)).getTime();
  const tuesday = midnight(addDays(monday, 1)).getTime();
  const natal = natalLongitudes(chart);
  const known = KNOWN_AGES.map((age) => age.id);
  const noonNatal = noonLongitudes(birth.birthDate);
  const days = Array.from({ length: MIRA_DAYS }, (_, i) => new Date(first.getTime() + i * DAY_MS));
  const angles = chart.angles ? { ascendant: chart.angles.ascendant.absoluteDegree, midheaven: chart.angles.midheaven.absoluteDegree } : null;

  return {
    week: monday,
    zone,
    born: born.toISOString(),
    age: yearsBetween(born, first),
    points: NATAL_POINTS.map((body) => ({ body, lon: chart.planets[body].absoluteDegree, house: chart.planets[body].house ?? null })),
    angles,
    sky: MIRA_BODIES.map((body) => ({
      body,
      lon: days.map((at) => r2(norm(longitudeAt(body, at)))),
      retrograde: spans(days.flatMap((at, i) => (speedAt(body, at) < 0 ? [i] : []))),
    })),
    contacts: contacts.map((event) => ({
      key: event.key, body: event.body, aspect: event.aspect, target: event.target, orb: event.orb, house: event.house,
      tone: event.tone, headline: headlineOf(event), facts: factsOf(event),
      start: event.window.start.toISOString(), end: event.window.end.toISOString(),
      exact: event.window.exact.map((at) => dayIn(at, zone)), runs: runsOf(event),
    })),
    sentence: weekSentence(events, midnight(monday)),
    changes: moments.filter(({ at }) => at.getTime() >= weekOpen && at.getTime() < weekClose).map(changeOf),
    next: moments.filter(({ at }) => at.getTime() >= tuesday && at.getTime() < lastDay).slice(0, 3).map(changeOf),
    cycles: lifeCycles(natal, born, { ids: known }).map((cycle) => cycleOf(cycle, zone)),
    ages: KNOWN_AGES.map((age) => ({ id: age.id, label: age.label, progress: roundOf(age.body, natal[age.body] ?? 0, first) })),
    waves: waves(natal, born)
      .filter((wave) => wave.body === "saturn" || wave.body === "jupiter")
      .map((wave) => ({ body: wave.body, distances: wave.points.map((point) => point.distance) })),
    finder: {
      cycles: lifeCycles(noonNatal, noonUtc(birth.birthDate), { ids: known }).map((cycle) => cycleOf(cycle, "UTC")),
      rounds: KNOWN_AGES.map((age) => ({ id: age.id, progress: roundOf(age.body, noonNatal[age.body] ?? 0, first) })),
    },
  };
}

/** As committed: one line per point, body, contact and cycle, so a pull request shows what moved. */
export function miraWeekFile(week: MiraWeek): string {
  const lines = Object.entries(week).map(([key, value]) => {
    const json = Array.isArray(value) && value.length
      ? `[\n    ${value.map((item) => JSON.stringify(item)).join(",\n    ")}\n  ]`
      : JSON.stringify(value);
    return `  ${JSON.stringify(key)}: ${json}`;
  });
  return `{\n${lines.join(",\n")}\n}\n`;
}

/** The checkout this process runs in: Railway starts the API in api/, and a test runs anywhere below the root. */
function repoRoot(): string | null {
  for (const dir of [process.cwd(), join(process.cwd(), ".."), join(process.cwd(), "..", "..")]) {
    if (existsSync(join(dir, MIRA_FIXTURE))) return dir;
  }
  return null;
}

/** Where Mira's week comes from, injected so a release rehearsal never runs the engine. */
export interface MiraSource {
  /** The file for the week from a Monday. */
  week(monday: Day): Promise<string>;
  /** The file as this commit holds it, null when it cannot be read: the same week is never pushed twice. */
  current(): Promise<string | null>;
}

export const liveMira: MiraSource = {
  async week(monday) {
    const root = repoRoot();
    if (!root) throw new Error(`no ${MIRA_FIXTURE} beside the process`);
    return miraWeekFile(miraWeek(monday, JSON.parse(await readFile(join(root, MIRA_FIXTURE), "utf8")) as MiraBirth));
  },
  async current() {
    const root = repoRoot();
    return root ? readFile(join(root, MIRA_WEEK_PATH), "utf8").catch(() => null) : null;
  },
};

export interface SamplePush {
  releaseId: string;
  /** The released commit, where the new branch starts. */
  sha: string;
  /** The label whose lab wrote this release's reports, its own or the reused one's; null when no lab ran. */
  label: string | null;
  token: string | undefined;
  github: Pick<GithubApi, "commitFile">;
  /** The sample chart's whole natal output under a label, or null when that lab kept none. */
  read: (label: string) => Promise<unknown>;
  /** When production moved: Mira's week moves to the Monday after it. */
  at: Date;
  mira: MiraSource;
}

const NO_TOKEN = "skipped, no GITHUB_RELEASE_TOKEN to push it with";

function commitMessage(input: SamplePush, paths: string[], monday: Day): string {
  const short = input.sha.slice(0, 7);
  const run = paths.some((path) => path !== MIRA_WEEK_PATH);
  const week = paths.includes(MIRA_WEEK_PATH);
  const subject = run && week
    ? `/sample and Mira's week from release ${input.releaseId}`
    : run ? `/sample: Audrey Hepburn's run from release ${input.releaseId}` : `Mira's week from release ${input.releaseId}`;
  const body = [
    ...(run ? [`/sample: the release lab's ${input.label} run at ${short}, less its foundation and usage (ADR-247).`] : []),
    ...(week ? [`Mira's week: the week of ${monday}, computed by the engine at ${short} (ADR-250).`] : []),
  ];
  return `${subject}\n\n${body.join("\n")}`;
}

/**
 * Pushes the sample branch: /sample's run when this release's lab kept one, and Mira's week whenever it moved, as one
 * commit. Says in a line for each what happened; never throws, so a release never fails on either.
 */
export async function pushSample(input: SamplePush): Promise<string> {
  const token = input.token;
  // The lines are stored on the release and shown in the admin, so a token GitHub or a stub echoes is cut by its value.
  const cut = (text: string) => (token ? text.split(token).join("[token]") : text);
  const why = (err: unknown) => (err instanceof Error ? err.message : String(err));
  const files: { path: string; content: string }[] = [];
  let sample: string | null = null;
  let mira: string | null = null;

  if (!input.label) sample = "skipped, no lab ran for this release (the brain is unchanged), so there is no new run";
  else if (!token) sample = NO_TOKEN;
  else {
    try {
      const run = sampleRun(await input.read(input.label));
      if (run) files.push({ path: samplePath(input.releaseId), content: sampleFile(run) });
      else sample = `skipped, ${input.label} kept no ${SAMPLE_CHART} run`;
    } catch (err) {
      sample = `not pushed, ${why(err)}`;
    }
  }

  const monday = mondayAfter(input.at);
  if (!token) mira = NO_TOKEN;
  else {
    try {
      const content = await input.mira.week(monday);
      if (content === (await input.mira.current().catch(() => null))) mira = `unchanged, the week of ${monday} is already on ${input.sha.slice(0, 7)}`;
      else files.push({ path: MIRA_WEEK_PATH, content });
    } catch (err) {
      mira = `not pushed, ${why(err)}`;
    }
  }

  if (files.length && token) {
    const branch = sampleBranch(input.releaseId);
    try {
      await input.github.commitFile({ branch, parent: input.sha, files, message: commitMessage(input, files.map((f) => f.path), monday) }, token);
      sample ??= `pushed ${samplePath(input.releaseId)} on ${branch}, from ${input.label}`;
      mira ??= `pushed ${MIRA_WEEK_PATH} on ${branch}, the week of ${monday}`;
    } catch (err) {
      sample ??= `not pushed, ${why(err)}`;
      mira ??= `not pushed, ${why(err)}`;
    }
  }
  return cut(`/sample: ${sample}; Mira's week: ${mira}`);
}
