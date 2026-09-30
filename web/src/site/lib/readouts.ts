/**
 * The words the home page's method and birth-time sections print about a
 * chart. Each is read off the engine's chart (R-3.1), and the birth-time
 * plates go through the birth form's own window sweep and readout (ADR-33),
 * so the page can never say something about a birth that the form would not.
 */
import { cityName, offsetAtBirth } from "@workspace/engine";
import { SIGN_ORDER } from "@/components/chart/wheel-geometry";
import {
  DEFAULT_ANSWER, PART_LABELS, readout, toValue,
  type BirthTimeAnswer, type BirthTimeMode, type BirthTimeValue,
} from "@/lib/birth-time";
import { houseWithWord } from "@/lib/evidence-glossary";
import { elementLead, modalityLine } from "@/lib/sky-card";
import { degreeLine, utcLine } from "@/lib/sky-now";
import { PLANET_LABELS, type ChartData, type ChartPlanet } from "@/types/chart";
import { chartOf, type Birth } from "@/site/lib/chart";

export interface ReadoutRow {
  label: string;
  value: string;
}

/** A no-break space holds "4th (home)" together when a narrow step wraps the row, as the sky card's legend does. */
const placed = (body: ChartPlanet): string =>
  `${degreeLine(body)}${body.house ? ` · ${houseWithWord(body.house).replace(" ", " ")}` : ""}`;

/**
 * The clock a birth was on: the offset its zone kept that minute, and whether
 * that was the zone's summer clock, taking the lower of its January and July
 * offsets that year as its standard one. An offset off the quarter-hour is a
 * town's own mean time, kept before the zone had a standard.
 */
export function clockAtBirth(birth: Birth): string {
  const zone = birth.timezone;
  if (!zone) return utcLine(birth.timezoneOffset);
  const offset = offsetAtBirth(zone, birth.birthDate, birth.birthTime);
  const year = birth.birthDate.slice(0, 4);
  const standard = Math.min(offsetAtBirth(zone, `${year}-01-15`, "12:00"), offsetAtBirth(zone, `${year}-07-15`, "12:00"));
  const kind = Math.round(offset * 60) % 15 !== 0 ? "local mean time" : offset > standard ? "summer time" : "standard time";
  return `${utcLine(offset)} · ${cityName(zone)} ${kind}, ${Number(year)}`;
}

/** The method's first step: the Sun, Moon and rising where the engine puts them, and the clock that set the minute. */
export function chartReadout(chart: ChartData, birth: Birth): ReadoutRow[] {
  return [
    { label: "Sun", value: placed(chart.planets.sun) },
    { label: "Moon", value: placed(chart.planets.moon) },
    ...(chart.angles ? [{ label: "Rising", value: degreeLine(chart.angles.ascendant) }] : []),
    { label: "Clock", value: clockAtBirth(birth) },
  ];
}

export type NoteKind = "sect" | "strongest" | "element" | "modality";

export interface ChartNote {
  kind: NoteKind;
  text: string;
}

/** The engine counts a planet in these houses as dominant; with none there, it names the Sun anyway, which no note repeats. */
const ANGULAR_HOUSES = [1, 4, 7, 10];

function listed(items: readonly string[], last = "and"): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * What stands out, as the engine itself computes it (reading 6): a day or night
 * birth from the Sun's altitude, the planets it counts as dominant, and the
 * balance of elements and modalities. The brief the report is written from
 * stays on the server. The balance is said as the dashboard's sky card says
 * it, since the engine's dominant element settles a tie by key order and the
 * card names a lead only when it is real (ADR-92).
 */
export function chartNotes(chart: ChartData): ChartNote[] {
  const notes: ChartNote[] = [];
  if (chart.sunAltitude !== undefined) {
    const night = chart.horizon.sect.value === "night";
    const degrees = Math.abs(chart.sunAltitude).toFixed(1);
    notes.push({
      kind: "sect",
      text: night ? `Born at night · Sun ${degrees}° below the horizon` : `Born by day · Sun ${degrees}° above the horizon`,
    });
  }
  const strongest = chart.dominance.dominantPlanets.filter((p) => ANGULAR_HOUSES.includes(chart.planets[p]?.house ?? 0));
  if (strongest.length > 0) {
    const names = listed(strongest.map((p) => PLANET_LABELS[p] ?? capital(p)));
    notes.push({ kind: "strongest", text: `${strongest.length === 1 ? "Strongest planet" : "Strongest planets"} · ${names}` });
  }
  notes.push(
    { kind: "element", text: `Elements · ${elementLead(chart.elements).line}` },
    { kind: "modality", text: modalityLine(chart.modalities) },
  );
  return notes;
}

export interface TimePlate {
  mode: BirthTimeMode;
  /** The answer as the birth form would take it. */
  answer: BirthTimeAnswer;
  /** The centre and window the form maps that answer to. */
  value: BirthTimeValue;
  chart: ChartData;
  /** The form's readout of the chart's sweep, word for word what it says under the same answer. */
  said: ReturnType<typeof readout>;
}

/** Someone who only remembers "about eight" for 07:40 says the nearest hour; the last hour of the day stays on that day. */
export function nearestHour(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  return `${String(Math.min(23, hour + (minute >= 30 ? 1 : 0))).padStart(2, "0")}:00`;
}

/**
 * One birth as each of the form's three answers takes it: the time known,
 * that time to the nearest hour give or take an hour, and no time. `own` is
 * the chart already computed for the birth as given, reused when an answer
 * lands on the same time and window, since each sweep costs a phone tens of
 * milliseconds.
 */
export function timePlates(birth: Birth, own?: ChartData): TimePlate[] {
  const answers: BirthTimeAnswer[] = [
    { ...DEFAULT_ANSWER, mode: "known", time: birth.birthTime },
    { ...DEFAULT_ANSWER, mode: "roughly", kind: "about", time: nearestHour(birth.birthTime) },
    { ...DEFAULT_ANSWER, mode: "unknown" },
  ];
  return answers.map((answer) => {
    const value = toValue(answer);
    if (!value) throw new Error(`The birth form takes no ${answer.mode} answer from ${birth.birthTime}`);
    const same = value.birthTime === birth.birthTime && value.birthTimeWindowMinutes === (birth.birthTimeWindowMinutes ?? 0);
    const chart = own && same
      ? own
      : chartOf({ ...birth, birthTime: value.birthTime, birthTimeWindowMinutes: value.birthTimeWindowMinutes });
    return { mode: answer.mode, answer, value, chart, said: readout(chart.horizon) };
  });
}

/** What was answered, as the person would put it. */
export function plateAnswer(plate: TimePlate): string {
  switch (plate.mode) {
    case "known":
      return `${plate.value.birthTime} on the birth certificate`;
    case "roughly":
      return `About ${plate.value.birthTime}, give or take an hour`;
    case "unknown":
      return "The report is written from the date alone.";
  }
}

const within = (absolute: number): { sign: string; degree: string } => {
  const lon = ((absolute % 360) + 360) % 360;
  return { sign: SIGN_ORDER[Math.floor(lon / 30)], degree: `${(lon % 30).toFixed(2)}°` };
};

/** "Moon 24.58° Aquarius to 7.45° Pisces", the sign said once when the Moon kept to one. */
export function moonRange(band: { fromDegree: number; toDegree: number }): string {
  const from = within(band.fromDegree);
  const to = within(band.toDegree);
  return from.sign === to.sign
    ? `Moon ${from.degree} to ${to.degree} ${to.sign}`
    : `Moon ${from.degree} ${from.sign} to ${to.degree} ${to.sign}`;
}

/**
 * The plate's readout: the rising sign as the form reads the sweep, or, with
 * no time, where the Moon went that day, since the form's line for a whole day
 * lists every sign that rose and names the first one twice.
 */
export function plateReadout(plate: TimePlate): string {
  const band = plate.chart.planets.moon.band;
  return plate.mode === "unknown" && band ? moonRange(band) : plate.said.rising;
}

const COUNTS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/**
 * What the answer settles, and what the report leaves out without it. The
 * no-time line points at the readout rather than the plate's Moon arc, which
 * a day's band is too short to show from under the Moon's own render.
 */
export function plateLine(plate: TimePlate): string {
  if (plate.mode === "unknown") return "There's no rising sign, and your Moon is somewhere in that range.";
  if (plate.said.status === "known") return "Your rising sign is shown.";
  if (plate.said.status === "approximate") return "Your rising sign holds either way, so it's shown.";
  const { ascendant, moonSign } = plate.chart.horizon;
  const signs = new Set(ascendant.values).size;
  const moon = moonSign.holds
    ? `Your Moon is in ${moonSign.value} either way.`
    : `Your Moon could be in ${listed(moonSign.values, "or")}.`;
  return `Your rising sign could be one of ${COUNTS[signs] ?? signs}, so the report leaves it out. ${moon}`;
}

/** The form's parts of the day with the part and its hours apart, as the chips print them. */
export function partsOfDay(): { part: string; hours: string }[] {
  return Object.values(PART_LABELS).map((label) => {
    const cut = label.indexOf(", ");
    return { part: label.slice(0, cut), hours: label.slice(cut + 2) };
  });
}
