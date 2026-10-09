/**
 * A retrograde's shadow (explain-like-a-friend §9, ADR-378, 383): before the planet turns back it first walks the
 * stretch of sky it is about to go back over, and after it turns forward it walks that stretch a third time. We read
 * no chart by it; Timeline's Did you know card for Mercury tells it as a tradition, with these dates.
 */
import type { RetrogradeBody } from "./doctrine.js";
import { exactHits, longitudeAt } from "./transits.js";

const DAY_MS = 86_400_000;

/**
 * Days searched from a station for the shadow's far end: the engine's longest cycle from one turn back to the next,
 * 1800 to 2150. The planet moves only forward from its last turn forward to this turn back, and from this turn
 * forward to its next turn back, so each end is within a cycle of its station and is the crossing nearest it.
 */
const REACH_DAYS: Record<RetrogradeBody, number> = { mercury: 126, venus: 589, mars: 811 };

/**
 * The shadow around one retrograde, given its two stations: `from` is when the planet first reaches the degree it
 * will turn forward at, `to` is when it is back at the degree it turned back at.
 */
export function shadowOf(body: RetrogradeBody, start: Date, end: Date): { from: Date; to: Date } {
  const a = start.getTime();
  const b = end.getTime();
  if (!(a < b)) throw new RangeError("A retrograde's direct station comes after its retrograde station");
  const reach = REACH_DAYS[body] * DAY_MS;
  const before = exactHits(body, longitudeAt(body, end), new Date(a - reach), start);
  const after = exactHits(body, longitudeAt(body, start), end, new Date(b + reach));
  const from = before[before.length - 1];
  const to = after[0];
  if (!from || !to) throw new Error(`No shadow for ${body} within ${REACH_DAYS[body]} days of its stations`);
  return { from, to };
}
