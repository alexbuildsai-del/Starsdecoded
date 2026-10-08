/**
 * Mercury's shadow, the Did you know card in Timeline's reading sheet (explain-like-a-friend §9; ADR-378, 383). The
 * words are fixed and told as a tradition; only the dates and the house change. The dates come from the engine's
 * `shadowOf` and the event's own stations, each as the reader's day in their zone with its year (Review 05/10 §2).
 * Nothing is typed here that the engine did not compute, and a retrograde the engine cannot place gets no card.
 */
import { shadowOf } from "@workspace/engine";
import type { DateOrder } from "@/lib/date-entry";
import { housesText } from "@/lib/now-ahead";
import { dayIn, fullDate } from "@/lib/timeline-view";

/** The part of a sheet's event the card reads. */
export interface ShadowTarget {
  key: string;
  /** The whole-sign houses it goes back through, in order; empty or missing on a blind chart. */
  houses?: readonly number[];
  /** The retrograde station, as an ISO instant. */
  start?: string;
  /** The direct station, as an ISO instant. */
  end?: string;
}

export interface ShadowOptions {
  /** The reader's zone. UTC when none is given, the day the engine keys its events by. */
  zone?: string;
  /** The reader's date order; day first when none is given. */
  order?: DateOrder;
  /** Where "goes" turns into "went", once a stretch has ended; the clock when none is given. */
  now?: Date;
}

export const SHADOW_TITLE = "Mercury's shadow";

/** Only Mercury's: the card is about the planet people hear about, and its shadow is the short one. */
const MERCURY = /^retrograde\.mercury\./;

/** The title and body of the card for a Mercury retrograde, else null. */
export function shadowFact(target: ShadowTarget, options: ShadowOptions = {}): { title: string; body: string } | null {
  if (!MERCURY.test(target.key) || !target.start || !target.end) return null;
  const start = new Date(target.start);
  const end = new Date(target.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  let shadow: { from: Date; to: Date };
  try {
    shadow = shadowOf("mercury", start, end);
  } catch {
    return null;
  }

  const zone = options.zone ?? "UTC";
  const order = options.order ?? "dmy";
  const now = (options.now ?? new Date()).getTime();
  const day = (at: Date) => fullDate(dayIn(at, zone), order);
  // A stretch is in the past only once it has ended; one under way still "goes" and "runs".
  const tense = (ends: Date, past: string, present: string) => (ends.getTime() < now ? past : present);
  const first = target.houses?.[0];
  const house = first === undefined ? null : housesText([first]);

  const lines = [
    `Mercury ${tense(end, "went", "goes")} backwards from ${day(start)} to ${day(end)}.`,
    `Astrologers also watch the weeks around it, which they call its shadow. This one ${tense(shadow.to, "ran", "runs")} from ${day(shadow.from)} to ${day(shadow.to)}.`,
    "In that time Mercury crosses the same stretch of sky three times: forward, back, then forward again.",
    "It's like missing your exit, turning around and passing the same petrol station three times.",
    "Many astrologers read the last pass as a time when unfinished plans get a second try.",
  ];
  if (house) lines.push(`In your chart, Mercury ${tense(end, "went", "goes")} back over your ${house}, so that is where they would look.`);
  return { title: SHADOW_TITLE, body: lines.join(" ") };
}
