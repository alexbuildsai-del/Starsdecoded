/**
 * Setting up Timeline (Review 05/10 §5, report-loading-story §2; readings 8 and 9; ADR-302, 320, 362): the screen a
 * buyer lands on back from Stripe while their readings are written, and once more when the next six months are. Here
 * are its script, its six ticks, its words at each moment and whether the page shows it at all. Every place on the dial
 * and every gold line is the engine's, worked out in the browser; every count a tick or a line ends on is the server's.
 * Pure, so the whole script reads the same without a browser.
 */
import { DOCTRINE, type SkyBody } from "@workspace/engine";
import type { GetTimelineSetupParams, TimelineSetup, TimelineSetupStepId } from "@workspace/api-client-react";
import { SIGN_ORDER, degreesMinutes, houseOf, norm360 } from "@/components/chart/wheel-geometry";
import type { DateOrder } from "@/lib/date-entry";
import { DIAL_ORDER, contactKey, framesFor, type DialFrame, type DialNatal, type DialStage } from "@/lib/dial";
import { rangeSpan } from "@/lib/now-ahead";
import { fullDate } from "@/lib/timeline-view";
import { PLANET_LABELS, isDrawn, type ChartData } from "@/types/chart";

/** Timeline in the app, where a plan's checkout lands and the setup screen shows (reading 8). */
export const TIMELINE_APP = "/dashboard/timeline";

/** What every read of the setup sends: the zone the browser names, else nothing, so the server reads the birth place's. */
export function setupParams(zone: string | undefined): GetTimelineSetupParams {
  return zone ? { tz: zone } : {};
}

/** How often the screen reads the setup while it writes: a tick lands within a few seconds of its readings. */
export const SETUP_POLL_MS = 3000;
/** "Almost there" waits this long on the screen, with the week written (reading 8). */
export const ALMOST_MS = 60_000;
/**
 * With the week still unwritten this long, a paused day or a stalled queue say, or with no chart come to draw, the
 * screen offers the way in anyway, so no reader is held on it; the cards keep the engine's own lines meanwhile.
 */
export const STUCK_MS = 120_000;

export type SetupScreen = "setup" | "replay";

/**
 * The screen a setup as read calls for (readings 8 and 9): the setup's own while it writes, unless the reader already
 * went in to this one from this tab; the drawing once more while the next six months wait to be seen; else none, and
 * Timeline as it is. A setup that never started answers "start", for the catch-up to start it first.
 */
export function screenOf(setup: TimelineSetup, wentIn: string | null): SetupScreen | "start" | null {
  if (setup.state === "none") return "start";
  if (setup.state === "writing") return setup.from !== null && setup.from === wentIn ? null : "setup";
  return setup.replay ? "replay" : null;
}

/** The days the screen draws: the next six months for a replay, else the setup's own; null before it has started. */
export function spanOf(setup: TimelineSetup, screen: SetupScreen): { from: string; to: string } | null {
  if (screen === "replay" && setup.replay) return setup.replay;
  return setup.from && setup.to ? { from: setup.from, to: setup.to } : null;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** How many days run from `from` to `to`, both counted. */
export function daysFrom(from: string, to: string): number {
  return Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1);
}

/**
 * The chart as the dial draws it when Your week hasn't carried it: the doctrine's natal planets and the angles, the Moon
 * left out without a birth time, as the API's own Timeline views send them (R-4.6).
 */
export function natalOfChart(chart: ChartData): DialNatal {
  const drawn = isDrawn(chart);
  const timed: readonly string[] = DOCTRINE.horizonTargets;
  const points = DOCTRINE.targets
    .filter((target) => target !== "ascendant" && target !== "midheaven" && (drawn || !timed.includes(target)))
    .flatMap((body) => (chart.planets[body] ? [{ body, lon: chart.planets[body].absoluteDegree }] : []));
  return {
    points,
    angles: drawn ? { ascendant: chart.angles.ascendant.absoluteDegree, midheaven: chart.angles.midheaven.absoluteDegree } : null,
  };
}

/** The drawing's beats in seconds, the setup player's own (Round start 4): the planets, then the six months, then held. */
export const SCRIPT = { planets: 2.2, months: 8.2, end: 23.5 } as const;
/** Saturn and Jupiter first, then outwards in, as the setup player lands them. */
export const DRAW_ORDER: readonly SkyBody[] = ["saturn", "jupiter", "pluto", "neptune", "uranus", "mars", "venus", "mercury"];

const CHART_IN = [0.1, 1.6] as const;
const STEP_S = 0.55;
const TRACK_LEAD_S = 0.3;
const TRACK_S = 0.6;
const LAND_LEAD_S = 0.8;
const LAND_S = 0.4;
// The date eases out of its run half a second before the drawing ends, so the last day holds before the words change.
const RUN_TAIL_S = 0.5;
// Lines already in effect on the first day grow together as the date starts to run; a later one over its first days.
const FIRST_LINES_S = 1.6;
const GROW_DAYS = 6;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
// The setup player's curve: quick to start, slow to settle.
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 4;

/** Where the date stands at `t`, an index into the run's days: it eases into its run from where the planets landed. */
export function dayAt(t: number, last: number): number {
  const u = clamp01((t - SCRIPT.months) / (SCRIPT.end - SCRIPT.months - RUN_TAIL_S));
  return (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)) * last;
}

/** The frames and what the script reads of them, worked out once for the days drawn. */
export interface SetupRun {
  frames: readonly DialFrame[];
  /** Each day, the first day of the stretch each of its contacts has been in effect, by `contactKey`. */
  since: readonly ReadonlyMap<string, number>[];
  /** How many transits have begun by each day: a contact from its first day, a retrograde from its station. */
  begun: readonly number[];
  /** The house a gold line to each natal point lights; empty without a birth time. */
  houses: ReadonlyMap<string, number>;
}

export function runOf(natal: DialNatal, from: string, to: string): SetupRun {
  const frames = framesFor(natal, from, daysFrom(from, to), DIAL_ORDER);
  const seen = new Set<string>();
  const turning: readonly string[] = natal.angles ? DOCTRINE.retrogrades : [];
  const since: Map<string, number>[] = [];
  const begun: number[] = [];
  let count = 0;
  frames.forEach((frame, day) => {
    const before = since[day - 1];
    const now = new Map<string, number>();
    for (const contact of frame.contacts) {
      const key = contactKey(contact);
      now.set(key, before?.get(key) ?? day);
      if (!seen.has(key)) {
        seen.add(key);
        count += 1;
      }
    }
    // A retrograde reads only where it crosses a known house (reading 7), so a chart with no birth time counts none.
    for (const body of frame.bodies) {
      const back = turning.includes(body.body) && body.retrograde;
      if (back && !frames[day - 1]?.bodies.find((b) => b.body === body.body)?.retrograde) count += 1;
    }
    since.push(now);
    begun.push(count);
  });
  const houses = new Map<string, number>();
  if (natal.angles) {
    const asc = natal.angles.ascendant;
    houses.set("ascendant", 1);
    houses.set("midheaven", houseOf(natal.angles.midheaven, asc));
    for (const point of natal.points) houses.set(point.body, houseOf(point.lon, asc));
  }
  return { frames, since, begun, houses };
}

/**
 * How far each part of the dial has come at `t`. `finished` is reduced motion's still picture: every line grown and
 * every house it reaches lit, on the last day.
 */
export function stageAt(t: number, run: SetupRun, finished = false): DialStage {
  const last = Math.max(0, run.frames.length - 1);
  const at = finished ? last : dayAt(t, last);
  const tracks: Record<string, number> = {};
  const bodies: Record<string, number> = {};
  DRAW_ORDER.forEach((body, i) => {
    const lead = SCRIPT.planets + i * STEP_S;
    const track = finished ? 1 : easeOut(seg(t, lead + TRACK_LEAD_S, lead + TRACK_LEAD_S + TRACK_S));
    if (track > 0) tracks[body] = track;
    const land = finished ? 1 : seg(t, lead + LAND_LEAD_S, lead + LAND_LEAD_S + LAND_S);
    if (land > 0) bodies[body] = land;
  });
  const lines = new Map<string, number>();
  const houses = new Map<number, number>();
  if (finished || t >= SCRIPT.months) {
    const day = Math.min(last, Math.max(0, Math.round(at)));
    for (const contact of run.frames[day]?.contacts ?? []) {
      const key = contactKey(contact);
      const first = run.since[day]?.get(key) ?? day;
      const grown = finished ? 1
        : first === 0 ? easeOut(seg(t, SCRIPT.months, SCRIPT.months + FIRST_LINES_S))
        : easeOut((at - first) / GROW_DAYS);
      if (grown <= 0) continue;
      lines.set(key, grown);
      const house = run.houses.get(contact.target);
      if (house !== undefined) houses.set(house, Math.max(houses.get(house) ?? 0, grown));
    }
  }
  return { chart: finished ? 1 : easeOut(seg(t, CHART_IN[0], CHART_IN[1])), tracks, bodies, at, lines, houses };
}

/**
 * The transits begun by the day the date shows, ending on the server's count: the engine's contacts and retrogrades
 * time each step, and the server's count, which also holds the eclipses near a natal point, is where it lands.
 */
export function transitsAt(run: SetupRun, at: number, server: number | null): number {
  const last = run.begun.length - 1;
  if (last < 0) return server ?? 0;
  const day = Math.min(last, Math.max(0, Math.round(at)));
  const begun = run.begun[day];
  if (server === null) return begun;
  const total = run.begun[last];
  if (total === 0) return Math.round((server * day) / Math.max(1, last));
  return Math.round((server * begun) / total);
}

export function transitWords(n: number): string {
  return `${n} transit${n === 1 ? "" : "s"}`;
}

export function cycleWords(n: number): string {
  return `${n} cycle${n === 1 ? "" : "s"}`;
}

/**
 * The line under the dial: the first day and each planet's degree as it lands, then the day the date shows and the
 * transits begun by it. Null before the planets come in.
 */
export function dateLineAt(t: number, run: SetupRun, order: DateOrder, transits: number, finished = false): string | null {
  const first = run.frames[0];
  if (!first || (!finished && t < SCRIPT.planets)) return null;
  if (!finished && t < SCRIPT.months) {
    const k = Math.min(DRAW_ORDER.length - 1, Math.max(0, Math.floor((t - SCRIPT.planets - TRACK_LEAD_S) / STEP_S)));
    const body = DRAW_ORDER[k];
    const place = first.bodies.find((b) => b.body === body);
    if (!place) return fullDate(first.date, order);
    const lon = norm360(place.lon);
    const sign = SIGN_ORDER[Math.floor(lon / 30) % 12];
    return `${fullDate(first.date, order)} · ${PLANET_LABELS[body] ?? body} ${degreesMinutes(lon % 30)} ${sign}`;
  }
  const last = run.frames.length - 1;
  const day = run.frames[finished ? last : Math.min(last, Math.max(0, Math.round(dayAt(t, last))))];
  return `${fullDate(day.date, order)} · ${transitWords(transits)}`;
}

export type TickState = "done" | "live" | "waiting";

export interface SetupTick {
  id: TimelineSetupStepId;
  name: string;
  /** The small line under the name: the week's and the month's days, the transits as the date runs, the cycles. */
  note: string;
  state: TickState;
}

const TICK_NAMES: Readonly<Record<TimelineSetupStepId, string>> = {
  chart: "Your chart",
  planets: "The planets",
  week: "This week",
  month: "This month",
  months: "The next six months",
  cycles: "Life cycles, birth to 90",
};

/**
 * The soonest each tick may land, the setup player's own moments: the chart once it is in, the planets once all have
 * landed, the week and the month as the date passes them, the six months once it has run them.
 */
const TICK_AT: Readonly<Record<TimelineSetupStepId, number>> = { chart: 2, planets: 7, week: 10.5, month: 14, months: 24, cycles: 30 };
/** The last moment the script waits for: past it the ticks follow the server alone. */
export const TICKS_END = 30;
const TICK_ORDER: readonly TimelineSetupStepId[] = ["chart", "planets", "week", "month", "months", "cycles"];

/**
 * The six ticks in order (Review 05/10 §5): each lands once the server has its readings and the drawing has reached it,
 * never before the one above it. The chart and the planets write nothing, so they wait on the drawing alone.
 */
export function ticksAt(t: number, setup: TimelineSetup, from: string, order: DateOrder, transits: number | null): SetupTick[] {
  let above = true;
  return TICK_ORDER.map((id) => {
    const step = setup.steps.find((s) => s.id === id);
    const written = id === "chart" || id === "planets" || setup.state === "ready" || step?.done === true;
    const done = above && written && t >= TICK_AT[id];
    const state: TickState = done ? "done" : above ? "live" : "waiting";
    above = done;
    let note = "";
    if (id === "planets") note = `${DIAL_ORDER.length} tracks`;
    else if (id === "week") note = rangeSpan({ from, to: addDays(from, 6) }, order);
    else if (id === "month") note = rangeSpan({ from, to: addDays(from, 29) }, order);
    else if (id === "months") note = transits === null ? "" : transitWords(transits);
    else if (id === "cycles") note = step?.count == null ? "" : cycleWords(step.count);
    return { id, name: TICK_NAMES[id], note, state };
  });
}

export const SETUP_LINES = {
  counter: "Setting up Timeline",
  chart: { title: "Your chart, from your report", subtitle: "It's already made. We start from here." },
  planets: { title: "The planets, one by one", subtitle: "Each gets its own track. Saturn and Jupiter first." },
  months: {
    title: "Your next six months",
    subtitle: "A gold line means a planet touches your chart. R means it looks like it's moving backwards.",
  },
  almost: { title: "Almost there", subtitle: "You can start reading this week now. The rest keeps writing." },
  ready: { title: "Your Timeline is ready" },
  readWeek: "Read this week",
  open: "Open Timeline",
} as const;

const WRITING_WORDS: Readonly<Record<"week" | "month" | "months" | "cycles", string>> = {
  week: "writing this week",
  month: "writing this month",
  months: "writing the next six months",
  cycles: "writing your life cycles",
};
const READING_STEPS = ["week", "month", "months", "cycles"] as const;

/**
 * The loading bar (ADR-393, 394, reading 29), moved by the readings that have landed and nothing else: the four
 * writing steps' readings landed over their readings counted, so each step weighs what it holds. The chart and the
 * planets write none and weigh none. Rounded down, so 100 shows only with the last reading. A server that sends no
 * `landed` has a done step count in full. The line names the first step still being written.
 */
export function setupProgress(setup: TimelineSetup): { pct: number; line: string } {
  let landed = 0;
  let total = 0;
  let writing: (typeof READING_STEPS)[number] | null = null;
  for (const id of READING_STEPS) {
    const step = setup.steps.find((s) => s.id === id);
    const count = step?.count ?? 0;
    const here = setup.state === "ready" || step?.done ? count : Math.min(count, Math.max(0, step?.landed ?? 0));
    landed += here;
    total += count;
    if (writing === null && here < count) writing = id;
  }
  const over = setup.state === "ready" || (total > 0 && landed >= total);
  const pct = over ? 100 : total > 0 ? Math.min(99, Math.floor((100 * landed) / total)) : 0;
  const words = over ? "ready" : writing ? WRITING_WORDS[writing] : "getting started";
  return { pct, line: `${pct}% · ${words}` };
}

/** The bar never moves back: a read that shows less than the screen already showed leaves what it showed. */
export function holdProgress(
  held: { pct: number; line: string } | null,
  next: { pct: number; line: string },
): { pct: number; line: string } {
  return held && held.pct > next.pct ? held : next;
}

/** "16 transits in the next six months, and 42 cycles across your life." */
export function readyLine(transits: number, cycles: number | null): string {
  const months = `${transitWords(transits)} in the next six months`;
  return cycles === null ? `${months}.` : `${months}, and ${cycleWords(cycles)} across your life.`;
}

/** Reading 9's line: "Your next six months are ready, 5 Apr to 3 Oct". */
export function replayLine(span: { from: string; to: string }, order: DateOrder): string {
  return `Your next six months are ready, ${rangeSpan(span, order)}`;
}

export interface SetupWords {
  title: string;
  subtitle: string;
  /** The way in, once there is one; `focus` takes focus to it as it shows (R14-12). */
  door: { label: string; focus: boolean } | null;
  /** What a screen reader hears as the screen lets the reader in; empty until then. */
  announce: string;
}

export interface WordsInput {
  t: number;
  screen: SetupScreen;
  ticks: readonly SetupTick[];
  /** How long the screen has shown, against the minute "Almost there" waits and the stall it gives way to. */
  waitedMs: number;
  /** The server's counts the ready line ends on. */
  transits: number;
  cycles: number | null;
  /** Reading 9's line, for a replay. */
  replay: string | null;
}

/**
 * What the screen says at `t` (report-loading-story §2): the step the drawing is on, then "Almost there" with "Read this
 * week" once the week is written and a minute has passed, then "Your Timeline is ready" with Open Timeline once every
 * tick has landed. A replay says its line throughout and lets the reader in when its drawing ends.
 */
export function wordsAt({ t, screen, ticks, waitedMs, transits, cycles, replay }: WordsInput): SetupWords {
  const ended = t >= SCRIPT.end;
  // Whatever step the drawing is held on: a drawing that never started, its chart unread, still lets the reader in.
  const stuck = waitedMs >= STUCK_MS ? { label: SETUP_LINES.open, focus: false } : null;
  if (screen === "replay") {
    return {
      title: replay ?? SETUP_LINES.ready.title,
      subtitle: ended ? readyLine(transits, cycles) : SETUP_LINES.months.subtitle,
      door: ended ? { label: SETUP_LINES.open, focus: true } : stuck,
      announce: ended ? `${replay ?? SETUP_LINES.ready.title}. ${readyLine(transits, cycles)}` : "",
    };
  }
  if (ticks.length > 0 && ticks.every((tick) => tick.state === "done")) {
    const line = readyLine(transits, cycles);
    return { title: SETUP_LINES.ready.title, subtitle: line, door: { label: SETUP_LINES.open, focus: true }, announce: `${SETUP_LINES.ready.title}. ${line}` };
  }
  if (t < SCRIPT.planets) return { ...SETUP_LINES.chart, door: stuck, announce: "" };
  if (t < SCRIPT.months) return { ...SETUP_LINES.planets, door: stuck, announce: "" };
  const week = ticks.find((tick) => tick.id === "week");
  if (ended && week?.state === "done" && waitedMs >= ALMOST_MS) {
    const { title, subtitle } = SETUP_LINES.almost;
    return { title, subtitle, door: { label: SETUP_LINES.readWeek, focus: false }, announce: `${title}. ${subtitle}` };
  }
  return { ...SETUP_LINES.months, door: stuck, announce: "" };
}
