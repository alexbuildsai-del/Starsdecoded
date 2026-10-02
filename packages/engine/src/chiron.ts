import { CHIRON_TABLE } from "./chironTable.js";

/**
 * Chiron from NASA JPL Horizons (ADR-221). astronomy-engine has no Chiron and a two-body orbit drifts with
 * Saturn's pull, so its place is a committed Horizons table (scripts/chiron-horizons.ts) read through a cubic
 * over the four nearest nodes. Outside the span a chart has no Chiron at all, rather than a guessed one.
 */
export const CHIRON_SPAN = { from: "1800-01-01", to: "2150-01-01" } as const;

const DAY_MS = 86_400_000;
const START_MS = Date.parse(`${CHIRON_TABLE.start}T00:00:00Z`);
const STEP_MS = CHIRON_TABLE.stepDays * DAY_MS;
const FROM_MS = Date.parse(`${CHIRON_SPAN.from}T00:00:00Z`);
const TO_MS = Date.parse(`${CHIRON_SPAN.to}T00:00:00Z`);
const TURN = 360 * CHIRON_TABLE.perDegree;

let decoded: Int32Array | undefined;

/** The nodes, unwrapped, in table units. Decoded on first use, so a page that never computes a chart never decodes them. */
function nodes(): Int32Array {
  if (decoded) return decoded;
  const { first, firstStep, secondDifferences } = CHIRON_TABLE;
  const out = new Int32Array(secondDifferences.length + 2);
  out[0] = first;
  out[1] = first + firstStep;
  let step = firstStep;
  for (let k = 0; k < secondDifferences.length; k++) {
    step += secondDifferences[k];
    out[k + 2] = out[k + 1] + step;
  }
  decoded = out;
  return out;
}

/**
 * Chiron's apparent geocentric ecliptic longitude of date at an instant, and its speed in degrees a day,
 * negative when retrograde; null outside CHIRON_SPAN. At a node's own instant the longitude is the node's
 * exactly, since every term but that node's is zero.
 */
export function chironAt(date: Date): { lon: number; speed: number } | null {
  const ms = date.getTime();
  if (!(ms >= FROM_MS && ms <= TO_MS)) return null;
  const q = nodes();
  const t = (ms - START_MS) / STEP_MS;
  const i = Math.min(Math.floor(t), q.length - 2);
  // The four nodes around the instant, shifted inward at the table's two ends.
  const k = Math.min(Math.max(i - 1, 0), q.length - 4);
  const a = t - k, b = a - 1, c = a - 2, d = a - 3;
  const weight = [-(b * c * d) / 6, (a * c * d) / 2, -(a * b * d) / 2, (a * b * c) / 6];
  const slope = [-(c * d + b * d + b * c) / 6, (c * d + a * d + a * c) / 2, -(b * d + a * d + a * b) / 2, (b * c + a * c + a * b) / 6];
  // Offsets from node i keep the sums small, so its own value is never rounded through a large unwrapped one.
  let offset = 0;
  let rate = 0;
  for (let j = 0; j < 4; j++) {
    const y = (q[k + j] - q[i]) / CHIRON_TABLE.perDegree;
    offset += weight[j] * y;
    rate += slope[j] * y;
  }
  const base = (((q[i] % TURN) + TURN) % TURN) / CHIRON_TABLE.perDegree;
  return {
    lon: offset === 0 ? base : (((base + offset) % 360) + 360) % 360,
    speed: rate / CHIRON_TABLE.stepDays,
  };
}
