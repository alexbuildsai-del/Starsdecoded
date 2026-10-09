/**
 * Setting up Timeline (Review 05/10 §5, report-loading-story §2; readings 8 and 9; ADR-302, 320, 351, 362): back from
 * Stripe the buyer lands here while the readings payment started are written. One screen on the loading grid: the
 * Timeline dial drawn in by the setup's script, the six ticks as their readings land, one progress bar moved by the
 * readings landed alone (ADR-394), "Almost there" with a way in once the week is written and a minute has passed, and
 * Open Timeline, focused, once every reading has landed. The next six months, once written ahead, play the same drawing
 * from its third step, once, with no bar. Reduced motion shows the finished dial and the ticks. The Did you know card
 * sits under the screen.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetReportQueryKey,
  getGetTimelineSetupQueryKey,
  useGetReport,
  useGetTimelineSetup,
  useMarkTimelineReplaySeen,
  useStartTimelineSetup,
  type TimelineSetup as SetupState,
  type Week,
} from "@workspace/api-client-react";
import { DidYouKnow } from "@/components/loading/DidYouKnow";
import { LoadingFrame } from "@/components/loading/LoadingFrame";
import { ProgressBar } from "@/components/loading/ProgressBar";
import { Dial } from "@/components/timeline/Dial";
import { RetrogradeLine } from "@/components/timeline/RetrogradeLine";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { anyRetrograde, type DialNatal } from "@/lib/dial";
import {
  SCRIPT,
  SETUP_LINES,
  SETUP_POLL_MS,
  ALMOST_MS,
  STUCK_MS,
  TICKS_END,
  dateLineAt,
  holdProgress,
  natalOfChart,
  replayLine,
  runOf,
  screenOf,
  setupParams,
  setupProgress,
  spanOf,
  stageAt,
  ticksAt,
  transitsAt,
  wordsAt,
  type SetupRun,
  type SetupScreen,
  type SetupTick,
} from "@/lib/timeline-setup";
import type { ChartData } from "@/types/chart";
import { cn } from "@/lib/utils";

// The reader went in to this setup from this tab, so coming back while it still writes opens Timeline, not the screen.
const WENT_IN_KEY = "sd.timeline_in";

function wentInTo(): string | null {
  try {
    return window.sessionStorage.getItem(WENT_IN_KEY);
  } catch {
    return null;
  }
}

function rememberWentIn(from: string): void {
  try {
    window.sessionStorage.setItem(WENT_IN_KEY, from);
  } catch {
    // A tab that keeps nothing shows the screen again on its next visit while the setup writes.
  }
}

export interface SetupGate {
  /** What the page shows: nothing yet while the setup is read, the screen, or Timeline as it is. */
  view: "wait" | "timeline" | SetupScreen;
  setup: SetupState | null;
  /** The setup writes the readings, so an open card waits on its job instead of writing (reading 11). */
  setUp: boolean;
  /** The reader takes the way in: Timeline as it is, for the rest of the page's life. */
  goIn: () => void;
  /** The replay has played, so it is not drawn again (reading 9). */
  seen: () => void;
}

/**
 * Whether Timeline opens on the setup screen (readings 8 and 9). A setup that never started, one a payment missed, is
 * started by the catch-up first; one that still reads none after it, as the QA pair's always does, opens Timeline as
 * today, and so does a read that fails, so the page never waits on the setup. Once chosen the screen stays until the
 * reader goes in, whatever later reads say.
 */
export function useTimelineSetupGate(enabled: boolean, zone: string | undefined): SetupGate {
  const client = useQueryClient();
  const [view, setView] = useState<SetupGate["view"]>("wait");
  const [wentIn] = useState(wentInTo);
  const params = setupParams(zone);
  const query = useGetTimelineSetup(params, {
    query: {
      queryKey: getGetTimelineSetupQueryKey(params),
      enabled,
      retry: 1,
      // Only the screen follows the writing; Timeline itself never needs the setup read again.
      refetchInterval: (q) => (view === "setup" && q.state.data?.state === "writing" ? SETUP_POLL_MS : false),
    },
  });
  const start = useStartTimelineSetup();
  const mark = useMarkTimelineReplaySeen();

  const read = query.data;
  const readFailed = query.isError;
  const { mutate: startSetup, data: started, isError: startFailed, isIdle: notAsked } = start;
  useEffect(() => {
    if (!enabled || view !== "wait") return;
    if (readFailed) {
      setView("timeline");
      return;
    }
    if (!read) return;
    const first = screenOf(read, wentIn);
    if (first !== "start") {
      setView(first ?? "timeline");
      return;
    }
    if (startFailed) {
      setView("timeline");
      return;
    }
    if (!started) {
      if (notAsked) startSetup({ params: setupParams(zone) });
      return;
    }
    const next = screenOf(started, wentIn);
    if (next === "start" || next === null) {
      setView("timeline");
      return;
    }
    client.setQueryData(getGetTimelineSetupQueryKey(setupParams(zone)), started);
    setView(next);
  }, [enabled, view, read, readFailed, started, startFailed, notAsked, startSetup, wentIn, zone, client]);

  const setup = read ?? started ?? null;
  const from = setup?.from ?? null;
  const goIn = useCallback(() => {
    if (view === "setup" && from) rememberWentIn(from);
    setView("timeline");
  }, [view, from]);

  const { mutate: markSeen } = mark;
  const seen = useCallback(() => {
    markSeen(undefined, {
      onSuccess: () =>
        client.setQueryData<SetupState>(getGetTimelineSetupQueryKey(setupParams(zone)), (old) => (old ? { ...old, replay: null } : old)),
    });
  }, [markSeen, client, zone]);

  return { view, setup, setUp: setup !== null && setup.state !== "none", goIn, seen };
}

/** One step of the script a frame, from where the screen starts, held still under reduced motion. */
function useScriptClock(from: number, running: boolean, still: boolean): number {
  const [t, setT] = useState(from);
  const now = useRef(from);
  useEffect(() => {
    if (still || !running) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (ms: number) => {
      // A frame that comes late, from a tab in the background say, moves the script on by one step and not by the gap.
      now.current = Math.min(TICKS_END, now.current + Math.min(0.05, Math.max(0, ms - last) / 1000));
      last = ms;
      setT(now.current);
      if (now.current < TICKS_END) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, still]);
  return still ? TICKS_END : t;
}

/**
 * Six months of frames take a moment on a phone, so they are worked out once the screen has painted, and the chart comes
 * in as they are ready. Reduced motion has nothing to come in: its finished dial is worked out before the first paint.
 */
function useSetupRun(natal: DialNatal | null, span: { from: string; to: string } | null, now: boolean): SetupRun | null {
  const from = span?.from ?? null;
  const to = span?.to ?? null;
  const key = natal && from && to
    ? `${from}:${to}:${natal.angles?.ascendant ?? "-"}:${natal.points.map((p) => `${p.body}${p.lon}`).join(",")}`
    : "";
  const direct = useMemo(() => (now && key && natal && from && to ? runOf(natal, from, to) : null), [now, key, natal, from, to]);
  const [made, setMade] = useState<{ key: string; run: SetupRun } | null>(null);
  useEffect(() => {
    if (now || !key || !natal || !from || !to) return undefined;
    const timer = window.setTimeout(() => setMade({ key, run: runOf(natal, from, to) }), 0);
    return () => window.clearTimeout(timer);
  }, [now, key, natal, from, to]);
  return direct ?? (made && made.key === key ? made.run : null);
}

/** How long the screen has shown, in the two steps the words wait on. */
function useWaited(): number {
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    const almost = window.setTimeout(() => setWaited(ALMOST_MS), ALMOST_MS);
    const stuck = window.setTimeout(() => setWaited(STUCK_MS), STUCK_MS);
    return () => {
      window.clearTimeout(almost);
      window.clearTimeout(stuck);
    };
  }, []);
  return waited;
}

function Ticks({ ticks, labelledBy }: { ticks: readonly SetupTick[]; labelledBy?: string }) {
  return (
    <ul
      aria-labelledby={labelledBy}
      className="m-0 grid w-full max-w-[420px] list-none grid-flow-col grid-cols-2 grid-rows-3 gap-x-4 gap-y-[min(8px,0.8cqh)] p-0 text-left"
    >
      {ticks.map((tick) => (
        <li key={tick.id} className="flex min-w-0 items-start gap-2" data-tick={tick.id} data-state={tick.state}>
          <i
            aria-hidden
            className={cn(
              "mt-[0.3em] block h-2 w-2 flex-none rounded-full border transition-colors duration-300 motion-reduce:transition-none",
              tick.state === "done" ? "border-[#9FA8DA] bg-[#9FA8DA]" : tick.state === "live" ? "border-[#9FA8DA]" : "border-[#3A4356]",
            )}
          />
          <span className="grid min-w-0 leading-[1.15]">
            <span
              className={cn("truncate text-[length:min(13px,2.2cqh)]", tick.state === "waiting" ? "text-[#7E889A]" : "text-[#E8EBF2]")}
            >
              {tick.name}
              {tick.state === "done" ? <span className="sr-only">, done</span> : null}
            </span>
            {tick.note ? (
              <span className="truncate font-numeric text-[length:min(11px,1.85cqh)] text-[#7E889A]">{tick.note}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

const DOOR =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(92,107,192,.55)] bg-[rgba(92,107,192,.22)] px-[22px] font-label text-[12px] font-medium uppercase tracking-[.22em] text-[#E8EBF2] transition-colors hover:bg-[#5C6BC0] focus-visible:bg-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9FA8DA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080C] motion-reduce:transition-none";
const noDay = () => undefined;

export interface TimelineSetupProps {
  setup: SetupState;
  screen: SetupScreen;
  /** Your week from the home answer, whose chart the dial draws at once; the report's chart stands in without it. */
  week: Week | null | undefined;
  /** The reader's own Personal report: its chart draws the Did you know card. */
  reportId: string | null;
  onIn: () => void;
  onSeen: () => void;
}

interface SetupFrameProps {
  setup: SetupState;
  screen: SetupScreen;
  natal: DialNatal | null;
  run: SetupRun | null;
  span: { from: string; to: string } | null;
  ids: { counter: string; title: string };
  onIn: () => void;
  onSeen: () => void;
  /** Once, as the date starts to run: from then a planet may be seen going backwards. */
  onMoving: () => void;
}

/** The screen on the grid, redrawn each frame of the script on its own, apart from the reads the page waits on. */
function SetupFrame({ setup, screen, natal, run, span, ids, onIn, onSeen, onMoving }: SetupFrameProps) {
  const { order } = useEntryFormat();
  const still = useReducedMotion();
  const t = useScriptClock(screen === "replay" ? SCRIPT.months : 0, run !== null, still);
  const waited = useWaited();

  const months = setup.steps.find((s) => s.id === "months")?.count ?? null;
  const cycles = setup.steps.find((s) => s.id === "cycles")?.count ?? null;
  const stage = useMemo(() => (run ? stageAt(t, run, still) : null), [run, t, still]);
  const transits = run && stage ? transitsAt(run, stage.at, months) : (months ?? 0);
  const moving = still || t >= SCRIPT.months;
  const ticks = span ? ticksAt(t, setup, span.from, order, moving ? transits : null) : [];
  const words = wordsAt({
    t,
    screen,
    ticks,
    waitedMs: waited,
    transits: months ?? transits,
    cycles,
    replay: screen === "replay" && span ? replayLine(span, order) : null,
  });
  const line = run ? dateLineAt(t, run, order, transits, still) : null;
  // A read that shows less than the screen already showed leaves the bar where it was, so it never moves back.
  const held = useRef<{ pct: number; line: string } | null>(null);
  const bar = screen === "setup" ? holdProgress(held.current, setupProgress(setup)) : null;
  held.current = bar;

  useEffect(() => {
    if (moving) onMoving();
  }, [moving, onMoving]);

  const door = useRef<HTMLButtonElement>(null);
  const focusDoor = words.door?.focus === true;
  useEffect(() => {
    if (focusDoor) door.current?.focus();
  }, [focusDoor]);

  const ended = t >= SCRIPT.end;
  const told = useRef(false);
  useEffect(() => {
    if (screen !== "replay" || !ended || told.current) return;
    told.current = true;
    onSeen();
  }, [screen, ended, onSeen]);

  return (
    <>
      <div className="h-[calc(100dvh-3.5rem)] min-h-[32rem]">
        <LoadingFrame
          counter={screen === "setup" ? <span id={ids.counter}>{SETUP_LINES.counter}</span> : undefined}
          title={<span id={ids.title}>{words.title}</span>}
          subtitle={words.subtitle}
          stage={
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
              {/* The dial takes what the stage leaves after the line under it, so the line is never cut. */}
              <div className="max-w-full" style={{ width: "min(100%, calc(42cqh - 30px))" }}>
                {run && stage && natal ? (
                  <Dial
                    points={natal.points}
                    angles={natal.angles}
                    frames={run.frames}
                    day={0}
                    onDay={noDay}
                    playable={false}
                    stage={stage}
                    label="Your chart"
                  />
                ) : (
                  <div className="aspect-square w-full" />
                )}
              </div>
              <p className="min-h-[1.4em] font-numeric text-[length:min(12px,1.9cqh)] text-[#AEB6C6]" aria-hidden>
                {line}
              </p>
            </div>
          }
          detail={<Ticks ticks={ticks} labelledBy={screen === "setup" ? ids.counter : ids.title} />}
          pct={bar ? <ProgressBar {...bar} /> : undefined}
          door={
            words.door ? (
              <button ref={door} type="button" onClick={onIn} className={DOOR}>
                {words.door.label}
              </button>
            ) : undefined
          }
        />
      </div>
      <p role="status" className="sr-only">
        {words.announce}
      </p>
    </>
  );
}

export function TimelineSetup({ setup, screen, week, reportId, onIn, onSeen }: TimelineSetupProps) {
  const uid = useId();
  const report = useGetReport(reportId ?? "", { query: { queryKey: getGetReportQueryKey(reportId ?? ""), enabled: !!reportId } });
  const chart = (report.data?.chartData as ChartData | null | undefined) ?? null;
  const natal = useMemo<DialNatal | null>(
    () => (week ? { points: week.natal, angles: week.angles } : chart ? natalOfChart(chart) : null),
    [week, chart],
  );
  const still = useReducedMotion();
  const span = useMemo(() => spanOf(setup, screen), [setup, screen]);
  const run = useSetupRun(natal, span, still);
  const [moving, setMoving] = useState(false);
  const onMoving = useCallback(() => setMoving(true), []);

  const retrograde = moving && run !== null && anyRetrograde(run.frames);
  const settled = !reportId || !report.isPending;
  const ids = useMemo(() => ({ counter: `${uid}-counter`, title: `${uid}-title` }), [uid]);
  return (
    <section aria-labelledby={screen === "setup" ? ids.counter : ids.title} className="rp-root bg-transparent" data-timeline-setup={screen}>
      <SetupFrame
        setup={setup}
        screen={screen}
        natal={natal}
        run={run}
        span={span}
        ids={ids}
        onIn={onIn}
        onSeen={onSeen}
        onMoving={onMoving}
      />
      <div className="mx-auto grid w-full max-w-[560px] gap-4 px-4 pb-16 pt-2">
        {retrograde ? <RetrogradeLine /> : null}
        {settled ? <DidYouKnow chart={chart} /> : null}
      </div>
    </section>
  );
}

export default TimelineSetup;
