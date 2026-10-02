/**
 * The method section prints the sample's chart as the engine computes it,
 * and every birth-time plate says what the birth form itself would say for
 * that answer: its window, its sweep, its readout (ADR-33).
 */
import { describe, expect, it } from "vitest";
import { calculateNatalChart, offsetAtBirth } from "@workspace/engine";
import {
  PART_CENTRES, PART_LABELS, WINDOW_ABOUT, WINDOW_EXACT, WINDOW_UNKNOWN,
  partLabels, readout, risingReadout, toValue, type PartOfDay,
} from "@/lib/birth-time";
import { houseWithWord } from "@/lib/evidence-glossary";
import { elementLead, modalityLine } from "@/lib/sky-card";
import { utcLine } from "@/lib/sky-now";
import { PLANET_LABELS } from "@/types/chart";
import { SAMPLE_PEOPLE } from "@/site/data/people";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import { toChartData } from "@/site/lib/chart";
import curieFixture from "../../../../fixtures/charts/marie-curie.json";
import {
  chartNotes, chartReadout, clockAtBirth, moonRange, nearestHour, partsOfDay,
  plateAnswer, plateLine, plateReadout, timePlates,
} from "./readouts";

describe("the birth-time plates", () => {
  const mira = SAMPLE_PEOPLE[0];
  const plates = timePlates(mira.birth, mira.chart);

  it("take the form's three answers in its order, each mapped to the window the form stores", () => {
    expect(plates.map((p) => p.mode)).toEqual(["known", "roughly", "unknown"]);
    for (const p of plates) expect(p.value, p.mode).toEqual(toValue(p.answer));
    expect(plates.map((p) => p.value.birthTimeWindowMinutes)).toEqual([WINDOW_EXACT, WINDOW_ABOUT, WINDOW_UNKNOWN]);
    expect(plates[0].value.birthTime).toBe(mira.birth.birthTime);
    expect(plates[1].value.birthTime).toBe(nearestHour(mira.birth.birthTime));
  });

  it("each read the engine's sweep for its birth through the form's own readout", () => {
    for (const person of SAMPLE_PEOPLE) {
      const b = person.birth;
      for (const p of timePlates(b, person.chart)) {
        const natal = calculateNatalChart(b.birthDate, p.value.birthTime, b.latitude, b.longitude, b.timezone ?? b.timezoneOffset, p.value.birthTimeWindowMinutes);
        expect(p.chart, `${person.id}, ${p.mode}`).toEqual(toChartData(natal));
        expect(p.said, `${person.id}, ${p.mode}`).toEqual(readout(natal.horizon));
      }
    }
  });

  it("print the form's rising line, and with no time the Moon's day as the sweep found it", () => {
    expect(plateReadout(plates[0])).toBe(risingReadout(plates[0].chart.horizon.ascendant));
    expect(plateReadout(plates[1])).toBe(risingReadout(plates[1].chart.horizon.ascendant));
    const band = plates[2].chart.planets.moon.band;
    const moonSigns = plates[2].chart.horizon.moonSign.values;
    expect(band).toBeDefined();
    const from = `${(band!.fromDegree % 30).toFixed(2)}° ${moonSigns[0]}`;
    const to = `${(band!.toDegree % 30).toFixed(2)}° ${moonSigns[moonSigns.length - 1]}`;
    expect(plateReadout(plates[2])).toBe(moonSigns.length > 1 ? `Moon ${from} to ${to}` : `Moon ${from.split(" ")[0]} to ${to}`);
    expect(plateReadout(plates[2])).toBe(moonRange(band!));
  });

  it("show the known time holding and the hour around it crossing signs, the form's two readout shapes", () => {
    expect(plates[0].said.status).toBe("known");
    expect(plates[0].said.rising).toMatch(/^[A-Z][a-z]+ · holds from \d\d:\d\d to \d\d:\d\d$/);
    expect(plates[1].said.status).toBe("unknown");
    expect(plates[1].said.rising).toMatch(/^\d+ possible: [A-Z][a-z]+(, [A-Z][a-z]+)+ · flips at \d\d:\d\d(, \d\d:\d\d)*$/);
    expect(plates[1].chart.horizon.ascendant.values).toContain(plates[0].chart.horizon.ascendant.value);
    expect(plates[2].said.status).toBe("unknown");
    expect(plates[2].chart.angles).toBeUndefined();
  });

  it("say the answer and what it settles from the sweep's own facts", () => {
    expect(plateAnswer(plates[0])).toBe(`${mira.birth.birthTime} on the birth certificate`);
    expect(plateAnswer(plates[1])).toBe(`About ${nearestHour(mira.birth.birthTime)}, give or take an hour`);
    expect(plateLine(plates[0])).toBe("Your rising sign is shown.");
    const { ascendant, moonSign } = plates[1].chart.horizon;
    const count = ["two", "three", "four"][new Set(ascendant.values).size - 2];
    const moon = moonSign.holds ? `Your Moon is in ${moonSign.value} either way.` : `Your Moon could be in ${moonSign.values.join(" or ")}.`;
    expect(plateLine(plates[1])).toBe(`Your rising sign could be one of ${count}, so the report leaves it out. ${moon}`);
    expect(plateLine(plates[2])).toBe("There's no rising sign, and your Moon is somewhere in that range.");
  });

  it("round a remembered time to its hour and never past the day's last", () => {
    expect(nearestHour("07:40")).toBe("08:00");
    expect(nearestHour("07:29")).toBe("07:00");
    expect(nearestHour("00:10")).toBe("00:00");
    expect(nearestHour("23:45")).toBe("23:00");
  });

  it("print the form's four parts of the day, the part and its hours apart", () => {
    const parts = partsOfDay();
    const keys = Object.keys(PART_CENTRES) as PartOfDay[];
    expect(parts).toHaveLength(keys.length);
    parts.forEach(({ part, hours }, i) => {
      expect(part).toMatch(/^[A-Z][a-z]+$/);
      expect(hours.length).toBeGreaterThan(0);
      expect(`${part}, ${hours}`).toBe(PART_LABELS[keys[i]]);
    });
  });

  it("print the same parts on a 12-hour clock as the form's chips do, and the 24-hour clock without one", () => {
    const labels = partLabels(12);
    const keys = Object.keys(PART_CENTRES) as PartOfDay[];
    expect(partsOfDay(24)).toEqual(partsOfDay());
    partsOfDay(12).forEach(({ part, hours }, i) => expect(`${part}, ${hours}`).toBe(labels[keys[i]]));
    expect(partsOfDay(12)[0].hours).toBe("6\u00a0am to noon");
  });

  it("print each part and its hours exactly as written, in the day's order, on either clock", () => {
    expect(partsOfDay(24)).toEqual([
      { part: "Morning", hours: "06:00 to 12:00" },
      { part: "Afternoon", hours: "12:00 to 18:00" },
      { part: "Evening", hours: "18:00 to 24:00" },
      { part: "Night", hours: "00:00 to 06:00" },
    ]);
    expect(partsOfDay(12)).toEqual([
      { part: "Morning", hours: "6\u00a0am to noon" },
      { part: "Afternoon", hours: "noon to 6\u00a0pm" },
      { part: "Evening", hours: "6\u00a0pm to midnight" },
      { part: "Night", hours: "midnight to 6\u00a0am" },
    ]);
  });

  it("keep the separator out of a part, and a plain space out of the hours' am and pm", () => {
    for (const clock of [12, 24] as const) {
      for (const { part, hours } of partsOfDay(clock)) {
        expect(part).not.toContain(",");
        expect(hours.startsWith(" ") || hours.endsWith(" ")).toBe(false);
        expect(hours).not.toMatch(/\d [ap]m/);
      }
    }
  });
});

describe("the method's readout", () => {
  const chart = sampleChart();

  it("prints her Sun, Moon and rising where the engine puts them, each house with its word and never split from it", () => {
    const rows = chartReadout(chart, SAMPLE.birth);
    const { sun, moon } = chart.planets;
    const asc = chart.angles!.ascendant;
    const house = (n: number) => houseWithWord(n).replace(" ", " ");
    expect(rows).toEqual([
      { label: "Sun", value: `${sun.degree.toFixed(2)}° ${sun.sign} · ${house(sun.house!)}` },
      { label: "Moon", value: `${moon.degree.toFixed(2)}° ${moon.sign} · ${house(moon.house!)}` },
      { label: "Rising", value: `${asc.degree.toFixed(2)}° ${asc.sign}` },
      { label: "Clock", value: clockAtBirth(SAMPLE.birth) },
    ]);
  });

  it("reads her clock from the zone's history: the offset in force, and summer time that May", () => {
    const b = SAMPLE.birth;
    expect(offsetAtBirth(b.timezone!, b.birthDate, b.birthTime)).toBe(b.timezoneOffset);
    expect(clockAtBirth(b)).toBe(`${utcLine(b.timezoneOffset)} · Brussels summer time, 1929`);
  });

  it("says standard time out of summer, a town's mean time before its zone had a standard, and the bare offset without a zone", () => {
    const idris = SAMPLE_PEOPLE.find((p) => p.id === "idris")!.birth;
    expect(clockAtBirth(idris)).toBe(`${utcLine(idris.timezoneOffset)} · London standard time, 1958`);
    const curie = { ...curieFixture, timezone: undefined };
    expect(clockAtBirth(curie)).toBe(utcLine(curieFixture.timezoneOffset));
    const warsaw = { ...curie, timezone: "Europe/Warsaw" };
    expect(clockAtBirth(warsaw)).toBe(`${utcLine(offsetAtBirth("Europe/Warsaw", warsaw.birthDate, warsaw.birthTime))} · Warsaw local mean time, 1867`);
  });
});

describe("the method's notes", () => {
  const chart = sampleChart();
  const notes = chartNotes(chart);
  const note = (kind: string) => notes.find((n) => n.kind === kind);

  it("come in the reading's order: day or night, the strongest planets, then the element and modality", () => {
    expect(notes.map((n) => n.kind)).toEqual(["sect", "strongest", "element", "modality"]);
  });

  it("say she was born at night from the sweep, with the Sun's altitude to a tenth of a degree", () => {
    expect(chart.horizon.sect.value).toBe("night");
    expect(chart.sunAltitude).toBeLessThan(0);
    expect(note("sect")?.text).toBe(`Born at night · Sun ${Math.abs(chart.sunAltitude!).toFixed(1)}° below the horizon`);
  });

  it("name every planet the engine counts as dominant, each in a 1st, 4th, 7th or 10th house", () => {
    const text = note("strongest")?.text ?? "";
    expect(text).toMatch(/^Strongest planets? · /);
    for (const p of chart.dominance.dominantPlanets) {
      expect([1, 4, 7, 10], p).toContain(chart.planets[p].house);
      expect(text).toContain(PLANET_LABELS[p]);
    }
  });

  it("say the balance of elements and modalities as the dashboard's sky card says it, from the chart's own counts", () => {
    expect(note("element")?.text).toBe(`Elements · ${elementLead(chart.elements).line}`);
    expect(note("modality")?.text).toBe(modalityLine(chart.modalities));
  });

  it("never pass off the engine's tie-broken dominant element as a lead, and name a real one", () => {
    const counts = Object.values(chart.elements);
    const tied = counts.filter((n) => n === Math.max(...counts)).length > 1;
    if (tied) expect(note("element")?.text).not.toMatch(/leads/);
    const leading = SAMPLE_PEOPLE.map((p) => p.chart).find((c) => elementLead(c.elements).lead);
    expect(leading).toBeDefined();
    expect(chartNotes(leading!).find((n) => n.kind === "element")?.text).toMatch(/^Elements · [A-Z][a-z]+ leads · \d+ of \d+$/);
  });

  it("leave out the day and night, and the dominant Sun the engine names by default, when no birth time is known", () => {
    const noor = SAMPLE_PEOPLE.find((p) => p.id === "noor")!;
    const kinds = chartNotes(noor.chart).map((n) => n.kind);
    expect(noor.chart.horizon.status).toBe("unknown");
    expect(kinds).not.toContain("sect");
    expect(kinds).not.toContain("strongest");
  });
});
