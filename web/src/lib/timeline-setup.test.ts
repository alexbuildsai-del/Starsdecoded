import { describe, expect, it } from "vitest";
import type { TimelineSetup, TimelineSetupStepId } from "@workspace/api-client-react";
import {
  ALMOST_MS,
  SCRIPT,
  SETUP_LINES,
  STUCK_MS,
  TICKS_END,
  TIMELINE_APP,
  readyLine,
  replayLine,
  screenOf,
  setupParams,
  spanOf,
  holdProgress,
  setupProgress,
  ticksAt,
  wordsAt,
  type SetupTick,
} from "./timeline-setup";

// The setup screen's rules (ADR-362, readings 8 and 9): when it shows, how its six ticks land and what it says.
const STEPS: readonly TimelineSetupStepId[] = ["chart", "planets", "week", "month", "months", "cycles"];

function setup(state: TimelineSetup["state"], over: Partial<TimelineSetup> = {}, doneUpTo = -1): TimelineSetup {
  const started = state !== "none";
  return {
    state,
    from: started ? "2026-10-05" : null,
    to: started ? "2027-04-10" : null,
    steps: STEPS.map((id, i) => ({
      id,
      done: state === "ready" || (started && i <= Math.max(1, doneUpTo)),
      count: id === "chart" || id === "planets" || !started ? null : { week: 6, month: 20, months: 90, cycles: 42 }[id],
    })),
    replay: null,
    ...over,
  };
}

describe("where a plan lands, and what the setup read asks of the page", () => {
  it("lands on Timeline in the app, and sends the browser's zone only when it names one", () => {
    expect(TIMELINE_APP).toBe("/dashboard/timeline");
    expect(setupParams("Europe/Lisbon")).toEqual({ tz: "Europe/Lisbon" });
    expect(setupParams(undefined)).toEqual({});
    expect(setupParams("")).toEqual({});
  });

  it("asks for the catch-up on none, shows the screen while it writes, and opens Timeline as it is once ready", () => {
    expect(screenOf(setup("none"), null)).toBe("start");
    expect(screenOf(setup("writing"), null)).toBe("setup");
    expect(screenOf(setup("ready"), null)).toBeNull();
  });

  it("does not show the writing screen again to a reader who already went in to that setup from this tab", () => {
    expect(screenOf(setup("writing"), "2026-10-05")).toBeNull();
    expect(screenOf(setup("writing"), "2026-04-06"), "a setup of another Monday").toBe("setup");
    expect(screenOf(setup("none"), "2026-10-05"), "none always asks for the start").toBe("start");
  });

  it("draws the next six months once more while they wait to be seen, whichever the state", () => {
    const replay = { from: "2027-04-11", to: "2027-10-09" };
    expect(screenOf(setup("ready", { replay }), null)).toBe("replay");
    expect(screenOf(setup("ready", { replay }), "2026-10-05")).toBe("replay");
    expect(spanOf(setup("ready", { replay }), "replay")).toEqual(replay);
    expect(spanOf(setup("writing"), "setup")).toEqual({ from: "2026-10-05", to: "2027-04-10" });
    expect(spanOf(setup("none"), "setup"), "nothing to draw before it starts").toBeNull();
  });
});

describe("the six ticks", () => {
  const order = "dmy" as const;
  // Dates keep their words together with no-break spaces.
  const plain = (text: string) => text.replace(/\u00a0/g, " ");
  const states = (ticks: SetupTick[]) => ticks.map((tick) => `${tick.id}:${tick.state}`);

  it("names the six in order and ends on the script's own last moment", () => {
    const ticks = ticksAt(0, setup("writing"), "2026-10-05", order, null);
    expect(ticks.map((tick) => tick.name)).toEqual([
      "Your chart", "The planets", "This week", "This month", "The next six months", "Life cycles, birth to 90",
    ]);
    expect(TICKS_END).toBe(30);
    expect(states(ticks)).toEqual(["chart:live", "planets:waiting", "week:waiting", "month:waiting", "months:waiting", "cycles:waiting"]);
  });

  it("lands the chart and the planets by the drawing alone, and the readings' steps only once the server has them", () => {
    const writing = setup("writing", {}, 1);
    expect(states(ticksAt(8, writing, "2026-10-05", order, null))).toEqual([
      "chart:done", "planets:done", "week:live", "month:waiting", "months:waiting", "cycles:waiting",
    ]);
    // The drawing has passed every moment, and the server has only the chart and the planets: it waits on the week.
    expect(states(ticksAt(TICKS_END, writing, "2026-10-05", order, null))).toEqual([
      "chart:done", "planets:done", "week:live", "month:waiting", "months:waiting", "cycles:waiting",
    ]);
  });

  it("never lands a tick before the one above it, and every tick once the setup is ready and the drawing is over", () => {
    const monthOnly = setup("writing", {}, 1);
    monthOnly.steps[3].done = true;
    expect(states(ticksAt(TICKS_END, monthOnly, "2026-10-05", order, null)).slice(2, 4)).toEqual(["week:live", "month:waiting"]);
    expect(states(ticksAt(TICKS_END, setup("ready"), "2026-10-05", order, 16)).every((s) => s.endsWith(":done"))).toBe(true);
    // Ready, but the drawing is still in its first seconds: the script holds the ticks back.
    expect(states(ticksAt(1, setup("ready"), "2026-10-05", order, null))[0]).toBe("chart:live");
  });

  it("notes the week's and the month's days from the Monday, the transits and the server's cycle count", () => {
    const ticks = ticksAt(TICKS_END, setup("ready"), "2026-10-05", order, 16);
    const note = Object.fromEntries(ticks.map((tick) => [tick.id, tick.note]));
    expect(note.planets).toMatch(/^\d+ tracks$/);
    expect(plain(note.week)).toBe("5 Oct to 11 Oct");
    expect(plain(note.month)).toBe("5 Oct to 3 Nov");
    expect(note.months).toBe("16 transits");
    expect(note.cycles).toBe("42 cycles");
    expect(ticksAt(TICKS_END, setup("ready"), "2026-10-05", order, 1).find((t) => t.id === "months")?.note).toBe("1 transit");
    expect(ticksAt(0, setup("writing"), "2026-10-05", order, null).find((t) => t.id === "months")?.note, "no count before the transits are told").toBe("");
  });
});

describe("what the screen says", () => {
  const order = "dmy" as const;
  const ticksOf = (state: TimelineSetup["state"], doneUpTo: number, t = TICKS_END) => ticksAt(t, setup(state, {}, doneUpTo), "2026-10-05", order, 16);
  const base = { transits: 16, cycles: 42, replay: null } as const;

  it("waits a minute with the week written before it says 'Almost there', then offers the week", () => {
    expect(ALMOST_MS).toBe(60_000);
    const week = ticksOf("writing", 2);
    const early = wordsAt({ ...base, t: SCRIPT.end, screen: "setup", ticks: week, waitedMs: ALMOST_MS - 1 });
    expect(early.title).toBe(SETUP_LINES.months.title);
    expect(early.door).toBeNull();
    const almost = wordsAt({ ...base, t: SCRIPT.end, screen: "setup", ticks: week, waitedMs: ALMOST_MS });
    expect([almost.title, almost.door]).toEqual([SETUP_LINES.almost.title, { label: "Read this week", focus: false }]);
    // The drawing still running keeps its own words, whatever the wait.
    expect(wordsAt({ ...base, t: SCRIPT.months, screen: "setup", ticks: week, waitedMs: ALMOST_MS }).title).toBe(SETUP_LINES.months.title);
  });

  it("says ready, with the counts, and opens Timeline with focus once every tick has landed", () => {
    const words = wordsAt({ ...base, t: TICKS_END, screen: "setup", ticks: ticksAt(TICKS_END, setup("ready"), "2026-10-05", order, 16), waitedMs: 0 });
    expect(words.title).toBe("Your Timeline is ready");
    expect(words.subtitle).toBe("16 transits in the next six months, and 42 cycles across your life.");
    expect(words.door).toEqual({ label: "Open Timeline", focus: true });
    expect(words.announce).toBe(`Your Timeline is ready. ${words.subtitle}`);
    expect(readyLine(1, null)).toBe("1 transit in the next six months.");
    expect(readyLine(2, 1)).toBe("2 transits in the next six months, and 1 cycle across your life.");
  });

  it("lets a reader in anyway after two minutes with the week still unwritten, so none is held on the screen", () => {
    expect(STUCK_MS).toBe(120_000);
    const none = ticksOf("writing", 1);
    expect(wordsAt({ ...base, t: 1, screen: "setup", ticks: none, waitedMs: STUCK_MS - 1 }).door).toBeNull();
    expect(wordsAt({ ...base, t: 1, screen: "setup", ticks: none, waitedMs: STUCK_MS }).door).toEqual({ label: "Open Timeline", focus: false });
    expect(wordsAt({ ...base, t: SCRIPT.planets, screen: "setup", ticks: none, waitedMs: STUCK_MS }).door?.label).toBe("Open Timeline");
    expect(wordsAt({ ...base, t: 1, screen: "setup", ticks: none, waitedMs: 0 }).title).toBe(SETUP_LINES.chart.title);
    expect(wordsAt({ ...base, t: SCRIPT.planets, screen: "setup", ticks: none, waitedMs: 0 }).title).toBe(SETUP_LINES.planets.title);
  });

  it("says a replay's line throughout and lets the reader in when its drawing ends", () => {
    const span = { from: "2027-04-11", to: "2027-10-09" };
    const line = replayLine(span, order);
    expect(line.replace(/\u00a0/g, " ")).toBe("Your next six months are ready, 11 Apr to 9 Oct");
    const ticks = ticksOf("ready", 5);
    const during = wordsAt({ ...base, t: SCRIPT.months, screen: "replay", ticks, waitedMs: 0, replay: line });
    expect([during.title, during.subtitle, during.door]).toEqual([line, SETUP_LINES.months.subtitle, null]);
    const ended = wordsAt({ ...base, t: SCRIPT.end, screen: "replay", ticks, waitedMs: 0, replay: line });
    expect([ended.title, ended.door]).toEqual([line, { label: "Open Timeline", focus: true }]);
    expect(ended.subtitle).toBe(readyLine(16, 42));
  });
});

describe("the loading bar", () => {
  const COUNTS = { week: 6, month: 20, months: 90, cycles: 42 } as const;
  const ORDER = ["week", "month", "months", "cycles"] as const;
  const TOTAL = 6 + 20 + 90 + 42;

  /** The setup when `n` readings have landed, in the order they are written: this week's first, then on. */
  function landedAfter(n: number): TimelineSetup {
    let left = n;
    const taken = new Map<string, number>();
    for (const id of ORDER) {
      const here = Math.min(COUNTS[id], left);
      taken.set(id, here);
      left -= here;
    }
    return setup(n >= TOTAL ? "ready" : "writing", {
      steps: STEPS.map((id) => {
        if (id === "chart" || id === "planets") return { id, done: true, count: null, landed: null };
        const landed = taken.get(id) ?? 0;
        return { id, done: landed === COUNTS[id], count: COUNTS[id], landed };
      }),
    });
  }

  it("weighs the four writing steps by their readings and names the step being written", () => {
    expect(setupProgress(landedAfter(0))).toEqual({ pct: 0, line: "0% · writing this week" });
    expect(setupProgress(landedAfter(6))).toEqual({ pct: 3, line: "3% · writing this month" });
    expect(setupProgress(landedAfter(26))).toEqual({ pct: 16, line: "16% · writing the next six months" });
    expect(setupProgress(landedAfter(71))).toEqual({ pct: 44, line: "44% · writing the next six months" });
    expect(setupProgress(landedAfter(116))).toEqual({ pct: 73, line: "73% · writing your life cycles" });
    expect(setupProgress(landedAfter(TOTAL))).toEqual({ pct: 100, line: "100% · ready" });
  });

  it("never moves back as readings land, and shows 100 only with the last one", () => {
    let last = -1;
    for (let n = 0; n <= TOTAL; n++) {
      const { pct, line } = setupProgress(landedAfter(n));
      expect(pct).toBeGreaterThanOrEqual(last);
      expect(pct === 100).toBe(n === TOTAL);
      expect(line.startsWith(`${pct}% · `)).toBe(true);
      last = pct;
    }
  });

  it("holds the highest value when a later read shows less", () => {
    const high = setupProgress(landedAfter(71));
    const low = setupProgress(landedAfter(30));
    expect(holdProgress(high, low)).toBe(high);
    expect(holdProgress(low, high)).toBe(high);
    expect(holdProgress(null, low)).toBe(low);
  });

  it("reads a step as landed when it is done and the server sent no count, and a ready setup as whole", () => {
    expect(setupProgress(setup("writing", {}, 2)).pct, "week done, three steps not").toBe(Math.floor((600 * 1) / 158));
    expect(setupProgress(setup("ready")).pct).toBe(100);
    expect(setupProgress(setup("none")).line).toBe("0% · getting started");
  });
});
