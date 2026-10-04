/**
 * Every chart here is computed live through the real engine from the birth
 * data in fixtures/charts (audrey-hepburn, beatrice, marie-curie-unknown,
 * george), and the stored triad is shaped from it as `GET /home` shapes it
 * (api/src/lib/home.ts, `triadOf`), so no placement is typed in.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculateNatalChart } from "@workspace/engine";
import type { HomePerson, Spot, SpotPoint } from "@workspace/api-client-react";
import type { ChartData } from "@/types/chart";
import { NEEDS_BIRTH_TIME, triadOfChart, triadRowsOf, triadText, type TriadRowData } from "./triad-row";

type Birth = [date: string, time: string, latitude: number, longitude: number, zone: string | number, windowMinutes: number];

const BIRTHS = {
  audrey: ["1929-05-04", "03:00", 50.8333, 4.3667, "Europe/Brussels", 0],
  // Marie Curie's day with the time unknown, as marie-curie-unknown enters it.
  marie: ["1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 720],
  // The same day within half an hour: the rising sign holds, so the houses stand and the Moon's range keeps one.
  marieHalfHour: ["1867-11-07", "12:00", 52.2297, 21.0122, 1.4, 30],
  // Beatrice's published record with the time left out: her Moon crosses from Gemini into Cancer that day.
  beatriceUnknown: ["1988-08-08", "20:18", 51.521, -0.1445, "Europe/London", 720],
  // George's record with a window of 163 minutes: his Moon reaches 0° Aquarius at its late end.
  george: ["2013-07-22", "16:24", 51.517, -0.1735, "Europe/London", 163],
  // The Moon crosses from Pisces into Aries within this half day, so its range wraps past 360° into the next sign.
  moonIntoAries: ["2021-01-18", "12:00", 51.5, -0.1, "Europe/London", 360],
} satisfies Record<string, Birth>;

const chartOf = (birth: Birth): ChartData => calculateNatalChart(...birth) as unknown as ChartData;

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

/** One end of the Moon's band as `GET /home` sends it: its own sign and its degree in it, in hundredths. */
function pointOf(longitude: number): SpotPoint {
  const at = ((Math.round(longitude * 100) % 36000) + 36000) % 36000;
  return { sign: SIGNS[Math.floor(at / 3000)], degree: (at % 3000) / 100 };
}

/** As `GET /home` builds a triad: two decimals, a house only with a horizon, never on the Rising, and the Moon's range on a rough time. */
function storedTriad(birth: Birth): HomePerson["triad"] {
  return storedTriadOf(chartOf(birth));
}

function storedTriadOf(chart: ChartData): HomePerson["triad"] {
  const spot = (p: { sign: string; degree: number; house?: number }, house: boolean): Spot => ({
    sign: p.sign, degree: Math.round(p.degree * 100) / 100, house: house && p.house ? p.house : null,
  });
  const band = (chart.windowMinutes ?? 0) > 0 ? chart.planets.moon.band : undefined;
  return {
    sun: spot(chart.planets.sun, true),
    moon: band ? { ...spot(chart.planets.moon, true), band: { from: pointOf(band.fromDegree), to: pointOf(band.toDegree) } } : spot(chart.planets.moon, true),
    rising: chart.angles ? spot(chart.angles.ascendant, false) : null,
  };
}

const texts = (rows: TriadRowData[], compact = false) => rows.map((row) => triadText(row, compact));

describe("one triad row (reading 20)", () => {
  it("reads sign, degrees and house with its word, and the Rising's 1st (self)", () => {
    const rows = triadRowsOf(storedTriad(BIRTHS.audrey));
    expect(rows).toEqual([
      { key: "sun", label: "Sun", at: "Taurus 13.12°", house: "4th (home)", blind: null },
      { key: "moon", label: "Moon", at: "Pisces 6.45°", house: "2nd (money)", blind: null },
      { key: "rising", label: "Rising", at: "Aquarius 28.62°", house: "1st (self)", blind: null },
    ]);
    expect(texts(rows)).toEqual(["Taurus 13.12° · 4th (home)", "Pisces 6.45° · 2nd (money)", "Aquarius 28.62° · 1st (self)"]);
  });

  it("names no ruler on any row", () => {
    for (const birth of Object.values(BIRTHS)) {
      for (const line of texts(triadRowsOf(chartOf(birth)))) expect(line).not.toMatch(/rule/i);
    }
  });

  it("keeps two decimals on a degree", () => {
    const triad = storedTriad(BIRTHS.audrey)!;
    expect(triadText(triadRowsOf({ ...triad, sun: { ...triad.sun, degree: 5 } })[0])).toBe("Taurus 5.00° · 4th (home)");
  });

  it("gives a known Rising the 1st house whatever the stored triad holds, and leaves a compact row the sign and degrees", () => {
    const triad = storedTriad(BIRTHS.audrey)!;
    expect(triadRowsOf({ ...triad, rising: { ...triad.rising!, house: 7 } })[2].house).toBe("1st (self)");
    expect(texts(triadRowsOf(triad), true)).toEqual(["Taurus 13.12°", "Pisces 6.45°", "Aquarius 28.62°"]);
  });

  it("draws no rows before the chart is stored", () => {
    expect(triadRowsOf(null)).toEqual([]);
    expect(triadRowsOf(undefined)).toEqual([]);
  });
});

describe("a chart with no birth time", () => {
  it("names no house, and the Rising keeps the line its page gives it", () => {
    const rows = triadRowsOf(storedTriad(BIRTHS.marie), { blind: "Add your birth time to see your rising sign and houses" });
    expect(rows[0]).toEqual({ key: "sun", label: "Sun", at: "Scorpio 14.58°", house: null, blind: null });
    expect(rows[2]).toEqual({ key: "rising", label: "Rising", at: null, house: null, blind: "Add your birth time to see your rising sign and houses" });
    expect(triadText(rows[2])).toBe("Add your birth time to see your rising sign and houses");
  });

  it("says it needs a birth time where the page gives no line of its own", () => {
    expect(triadRowsOf(chartOf(BIRTHS.marie))[2].blind).toBe(NEEDS_BIRTH_TIME);
    expect(NEEDS_BIRTH_TIME).toBe("Needs a birth time");
  });
});

describe("the Moon's range over a rough birth time (MB-139)", () => {
  it("reads one range in one sign, and both signs with no house across a cusp", () => {
    expect(triadText(triadRowsOf(storedTriad(BIRTHS.marie))[1])).toBe("10.19° to 22.85° Pisces");
    expect(triadRowsOf(storedTriad(BIRTHS.beatriceUnknown))[1]).toMatchObject({ at: "28.66° Gemini to 6.81° Cancer", house: null });
    // An exact time keeps its one degree, and the Sun never takes a range.
    expect(triadRowsOf(storedTriad(BIRTHS.audrey))[1].at).toBe("Pisces 6.45°");
    expect(triadRowsOf(storedTriad(BIRTHS.marie))[0].at).toBe("Scorpio 14.58°");
  });

  it("keeps the house on a range in one sign, where the rising sign holds", () => {
    expect(texts(triadRowsOf(storedTriad(BIRTHS.marieHalfHour)))).toEqual([
      "Scorpio 14.58° · 11th (friends)",
      "16.22° to 16.74° Pisces · 3rd (mind)",
      "Capricorn 12.07° · 1st (self)",
    ]);
  });

  it("names no house across a cusp, even on a triad that carries one", () => {
    const moon = storedTriad(BIRTHS.beatriceUnknown)!.moon;
    const triad = storedTriad(BIRTHS.audrey)!;
    expect(triadRowsOf({ ...triad, moon: { ...moon, house: 2 } })[1].house).toBeNull();
  });

  it("reads an end on the cusp as 0.00° of the sign it enters", () => {
    expect(triadRowsOf(storedTriad(BIRTHS.george))[1].at).toMatch(/^\d+\.\d{2}° Capricorn to 0\.00° Aquarius$/);
  });

  it("reads a range whose two ends meet as the one point", () => {
    const triad = storedTriad(BIRTHS.marie)!;
    const end = triad.moon.band!.to;
    expect(triadRowsOf({ ...triad, moon: { ...triad.moon, band: { from: end, to: end } } })[1].at).toBe("Pisces 22.85°");
  });
});

describe("a stored triad and its chart (re-pin 11)", () => {
  it("print the same rows, whichever the page holds", () => {
    for (const birth of Object.values(BIRTHS)) {
      const chart = chartOf(birth);
      expect(triadRowsOf(chart, { blind: "x" })).toEqual(triadRowsOf(storedTriad(birth), { blind: "x" }));
      expect(triadOfChart(chart)).toEqual(storedTriad(birth));
    }
  });

  it("reads the Moon's range from a chart only over a windowed time, as GET /home does", () => {
    const chart = chartOf(BIRTHS.marie);
    expect(triadRowsOf({ ...chart, windowMinutes: 0 })[1].at).toBe(`Pisces ${chart.planets.moon.degree.toFixed(2)}°`);
  });
});

describe("a stored triad and its chart, on every committed fixture (re-pin 11)", () => {
  const DIR = fileURLToPath(new URL("../../../fixtures/charts/", import.meta.url));
  const fixtures = readdirSync(DIR).filter((name) => name.endsWith(".json"));

  it("reads every fixture's birth data, so a new one is covered the day it lands", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(16);
  });

  it("prints equal rows from the stored triad and from the chart, exactly and over a rough time, and never a ruler", { timeout: 180_000 }, () => {
    for (const name of fixtures) {
      const f = JSON.parse(readFileSync(`${DIR}${name}`, "utf8"));
      for (const window of [f.birthTimeWindowMinutes ?? 0, 45, 720]) {
        const chart = calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezone ?? f.timezoneOffset, window) as unknown as ChartData;
        const stored = storedTriadOf(chart);
        const label = `${name} ${window}`;
        expect(triadOfChart(chart), label).toEqual(stored);
        const fromChart = triadRowsOf(chart, { blind: "x" });
        expect(fromChart, label).toEqual(triadRowsOf(stored, { blind: "x" }));
        expect(fromChart.map((row) => row.key), label).toEqual(["sun", "moon", "rising"]);
        for (const line of texts(fromChart)) expect(line, label).not.toMatch(/rule/i);
        const rising = fromChart[2];
        if (chart.angles) expect(rising, label).toMatchObject({ house: "1st (self)", blind: null });
        else expect(rising, label).toMatchObject({ at: null, house: null, blind: "x" });
      }
    }
  });
});

describe("the Moon's range past the end of Pisces", () => {
  it("names both signs and no house, each end in its own sign, the second starting at 0° of Aries", () => {
    const moon = triadRowsOf(storedTriad(BIRTHS.moonIntoAries))[1];
    expect(moon.at).toMatch(/^\d+\.\d{2}° Pisces to \d+\.\d{2}° Aries$/);
    expect(moon.house).toBeNull();
    expect(triadRowsOf(chartOf(BIRTHS.moonIntoAries))[1]).toEqual(moon);
  });
});

describe("a row's words", () => {
  it("lists Sun, Moon and Rising in that order whatever the input, with a label each", () => {
    for (const source of [storedTriad(BIRTHS.audrey), chartOf(BIRTHS.audrey), storedTriad(BIRTHS.marie)]) {
      expect(triadRowsOf(source).map((row) => [row.key, row.label])).toEqual([["sun", "Sun"], ["moon", "Moon"], ["rising", "Rising"]]);
    }
  });

  it("gives a chart with no Sun or no Moon no rows at all", () => {
    const chart = chartOf(BIRTHS.audrey);
    expect(triadRowsOf({ ...chart, planets: { ...chart.planets, sun: undefined } } as unknown as ChartData)).toEqual([]);
    expect(triadRowsOf({ ...chart, planets: { ...chart.planets, moon: undefined } } as unknown as ChartData)).toEqual([]);
  });

  it("prints a blind Rising as its line alone, in the full row and the compact one, never an empty sign", () => {
    const rising = triadRowsOf(storedTriad(BIRTHS.marie), { blind: "Add your birth time" })[2];
    expect(triadText(rising)).toBe("Add your birth time");
    expect(triadText(rising, true)).toBe("Add your birth time");
    expect(rising.at).toBeNull();
  });
});
