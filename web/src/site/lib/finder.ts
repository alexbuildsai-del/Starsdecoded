/**
 * The Saturn-return finder's sums (timeline-page §3, ADR-251, reading 21): a birth date in, the four cycles the
 * finder shows out, birth to 90, from the engine at 12:00 UTC on that date, shaped as Life's cycle cards read them.
 * This is the one module the finder runs the engine through, and the page imports it on the first full date typed,
 * never at render: until then the finder shows Mira's answer, computed at build (`MIRA.finder`), which this gives
 * again for her date. It reaches no network, so nothing typed leaves the browser.
 */
import { CYCLE_WORDS, KNOWN_AGES, lifeCycles, noonLongitudes, noonOf, roundProgress, type CycleId } from "@workspace/engine";
import type { CycleView } from "@/lib/life-view";

/** Saturn's returns, Jupiter's, the nodal returns and the Uranus opposition: the four ages Life opens on (ADR-209). */
export const FINDER_IDS: readonly CycleId[] = KNOWN_AGES.map((age) => age.id);

// With no birth place there is no zone, so a cycle's days are the UTC days the engine keys it by (reading 5), as Mira's
// example has them.
const utcDay = (at: Date): string => at.toISOString().slice(0, 10);
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Every cycle of the four, oldest first, for a "YYYY-MM-DD" birth date: its dates as UTC days, its status and
 * look-back counted from `today`, the reader's day, and its planet's way round since birth at `now`.
 */
export function findCycles(birthDate: string, today: string, now: Date = new Date()): CycleView[] {
  const natal = noonLongitudes(birthDate);
  const cycles = lifeCycles(natal, noonOf(birthDate), { ids: [...FINDER_IDS] });
  const rounds = new Map(
    KNOWN_AGES.map(({ id, body }) => {
      const home = natal[body];
      return [id, home === undefined ? null : r3(roundProgress(body, home, now))] as const;
    }),
  );
  return cycles.map((cycle) => {
    const same = cycles.filter((other) => other.id === cycle.id);
    const before = same[same.indexOf(cycle) - 1];
    return {
      key: cycle.key,
      id: cycle.id,
      name: CYCLE_WORDS[cycle.id].name,
      word: CYCLE_WORDS[cycle.id].word,
      age: cycle.age,
      exact: cycle.window.exact.map(utcDay),
      start: utcDay(cycle.window.start),
      end: utcDay(cycle.window.end),
      repeats: cycle.repeats,
      today,
      progress: rounds.get(cycle.id) ?? null,
      last: before ? { on: utcDay(before.window.exact[0] ?? before.window.start), age: before.age } : null,
      ages: same.map((other) => other.age),
      why: null,
    };
  });
}
