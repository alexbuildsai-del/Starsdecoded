/**
 * Writes src/chironTable.ts, Chiron's place from NASA JPL Horizons (ADR-221). Run by hand and commit what it
 * writes: nothing fetches Horizons at build, in CI or at run time.
 *
 *   pnpm --filter @workspace/engine run chiron:table
 *
 * The query, to https://ssd.jpl.nasa.gov/api/horizons.api:
 *
 *   COMMAND='2060' CENTER='500@399' EPHEM_TYPE='OBSERVER' QUANTITIES='31' TIME_TYPE='UT'
 *   START_TIME='1800-01-01' STOP_TIME='2150-01-06' STEP_SIZE='10 d' CSV_FORMAT='YES' OBJ_DATA='NO'
 *
 * Quantity 31 is the apparent ecliptic longitude of date seen from the Earth's centre, the place a chart reads.
 * The stop is the first node on or after 2150-01-01, so the span's last day still falls between two nodes.
 * Longitudes are kept in thousandths of a degree, a tenth of what a chart stores, and written as second
 * differences, which stay within a few hundred, so the committed file stays small.
 */
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";
const START = "1800-01-01";
const SPAN_END = "2150-01-01";
const STEP_DAYS = 10;
const PER_DEGREE = 1000;
const TURN = 360 * PER_DEGREE;
const STEP_MS = STEP_DAYS * 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startMs = Date.parse(`${START}T00:00:00Z`);
const stopMs = startMs + Math.ceil((Date.parse(`${SPAN_END}T00:00:00Z`) - startMs) / STEP_MS) * STEP_MS;
const stop = new Date(stopMs).toISOString().slice(0, 10);

const query = new URLSearchParams({
  format: "json",
  COMMAND: "'2060'",
  CENTER: "'500@399'",
  EPHEM_TYPE: "'OBSERVER'",
  QUANTITIES: "'31'",
  TIME_TYPE: "'UT'",
  START_TIME: `'${START}'`,
  STOP_TIME: `'${stop}'`,
  STEP_SIZE: `'${STEP_DAYS} d'`,
  CSV_FORMAT: "'YES'",
  OBJ_DATA: "'NO'",
  MAKE_EPHEM: "'YES'",
});

const response = await fetch(`${HORIZONS}?${query}`);
if (!response.ok) throw new Error(`Horizons answered ${response.status}`);
const { result, error } = (await response.json()) as { result?: string; error?: string };
if (!result) throw new Error(`Horizons sent no table: ${error ?? "no reason given"}`);

const target = /Target body name: (.+?)\s+\{source: ([^}]+)\}/.exec(result);
if (!target || !target[1].startsWith("2060 Chiron")) throw new Error(`Horizons answered for ${target?.[1] ?? "no named body"}`);
const soe = result.indexOf("$$SOE");
const eoe = result.indexOf("$$EOE");
if (soe < 0 || eoe < soe) throw new Error("Horizons's answer has no table between $$SOE and $$EOE");

// A row off the grid would shift every node after it in time, so each date is checked, not assumed.
const nodes = result.slice(soe + 5, eoe).trim().split("\n").map((line, k) => {
  const [when = "", , , lon] = line.split(",").map((cell) => cell.trim());
  const m = /^(\d{4})-([A-Z][a-z]{2})-(\d{2}) 00:00$/.exec(when);
  const at = m ? Date.UTC(Number(m[1]), MONTHS.indexOf(m[2]), Number(m[3])) : Number.NaN;
  if (at !== startMs + k * STEP_MS) throw new Error(`Row ${k + 1} is "${when}", off the ${STEP_DAYS}-day grid from ${START}`);
  const degrees = Number(lon);
  if (!(degrees >= 0 && degrees < 360)) throw new Error(`Row ${k + 1} has no longitude: ${line}`);
  return Math.round(degrees * PER_DEGREE) % TURN;
});
if (startMs + (nodes.length - 1) * STEP_MS !== stopMs) throw new Error(`Horizons stopped after ${nodes.length} rows, before ${stop}`);

// Chiron never moves half a turn in ten days, so the shorter way round is the way it went.
const steps = nodes.slice(1).map((n, k) => {
  const d = n - nodes[k];
  return d > TURN / 2 ? d - TURN : d < -TURN / 2 ? d + TURN : d;
});
const second = steps.slice(1).map((s, k) => s - steps[k]);

const decoded = [nodes[0], nodes[0] + steps[0]];
let step = steps[0];
for (const s of second) {
  step += s;
  decoded.push(decoded[decoded.length - 1] + step);
}
decoded.forEach((v, k) => {
  if (((v % TURN) + TURN) % TURN !== nodes[k]) throw new Error(`Node ${k} does not survive the encoding`);
});

const rows: string[] = [];
let row = "";
for (const v of second) {
  const cell = `${v},`;
  if (row && row.length + 1 + cell.length > 112) {
    rows.push(`    ${row}`);
    row = "";
  }
  row = row ? `${row} ${cell}` : cell;
}
if (row) rows.push(`    ${row}`);

const fetched = new Date().toISOString().slice(0, 10);
const file = `// Written by scripts/chiron-horizons.ts from NASA JPL Horizons on ${fetched}: ${target[1]}, orbit solution ${target[2]}.
// Rerun the script rather than edit this file.

/**
 * Chiron's apparent geocentric ecliptic longitude of date every \`stepDays\` from \`start\` 00:00 UT, in
 * 1/\`perDegree\` of a degree: the first node, the step to the second, then each step's change from the one
 * before, which keeps the numbers, and so the bundle, small.
 */
export const CHIRON_TABLE = {
  start: "${START}",
  stepDays: ${STEP_DAYS},
  perDegree: ${PER_DEGREE},
  first: ${nodes[0]},
  firstStep: ${steps[0]},
  secondDifferences: [
${rows.join("\n")}
  ],
};
`;

writeFileSync(new URL("../src/chironTable.ts", import.meta.url), file);
const widest = second.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
console.log(
  `${nodes.length} nodes, ${START} to ${stop}, second differences within ±${widest}; ` +
    `${Buffer.byteLength(file)} bytes, ${gzipSync(file, { level: 9 }).length} gzipped`,
);
