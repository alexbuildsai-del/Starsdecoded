import type { ChartData } from "@/types/chart";

/**
 * The words around the waitlist page's live wheel. The sky itself comes from
 * the API's engine (GET /api/sky); these only say it.
 */
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function visitorZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** "26 SEP 2026 · 19:46" on the city's clock. */
export function clockLine(at: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${Number(get("day"))} ${MONTHS[Number(get("month")) - 1]} ${get("year")} · ${get("hour")}:${get("minute")}`;
}

/** "50.83°N 4.33°E" */
export function latLngLine(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
}

/** Sect's one input, as a reader would see it: "SUN 16.6° BELOW THE HORIZON". */
export function sunLine(chart: Pick<ChartData, "sunAltitude">): string {
  if (chart.sunAltitude === undefined) return "";
  return `SUN ${Math.abs(chart.sunAltitude).toFixed(1)}° ${chart.sunAltitude > 0 ? "ABOVE" : "BELOW"} THE HORIZON`;
}

/** The wheel's text equivalent: "Sun in Libra, Moon in Leo, Gemini rising." */
export function skySentence(chart: Pick<ChartData, "planets" | "angles">): string {
  const rising = chart.angles ? `, ${chart.angles.ascendant.sign} rising` : "";
  return `Sun in ${chart.planets.sun.sign}, Moon in ${chart.planets.moon.sign}${rising}.`;
}

/** Degrees to the hundredth, as every readout prints them: "13.12° Taurus". */
export function degreeLine(body: { degree: number; sign: string }): string {
  return `${body.degree.toFixed(2)}° ${body.sign}`;
}

/** "UTC+2", "UTC+5:30", "UTC-3" */
export function utcLine(offsetHours: number): string {
  const abs = Math.abs(offsetHours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${offsetHours < 0 ? "-" : "+"}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * The product's wheel sets the rising sign's first degree on the left; turning
 * it by the Ascendant's degree in that sign puts the Ascendant there instead,
 * so the page's line is the true horizon. The turn is rigid: every body keeps
 * its distance from the Ascendant.
 */
export function tiltToAscendant(chart: Pick<ChartData, "angles">): number {
  return chart.angles ? chart.angles.ascendant.absoluteDegree % 30 : 0;
}
