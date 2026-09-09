/**
 * Test-only helper: build a chart from a committed birth-data fixture in
 * fixtures/charts/. Lives outside the *.test.ts files so importing it does
 * not re-register another file's tests.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateNatalChart, type NatalChartData } from "./chartCalculation.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures", "charts");

interface Fixture {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
}

export function chartFromFixture(name: string): NatalChartData {
  const f = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as Fixture;
  return calculateNatalChart(f.birthDate, f.birthTime, f.latitude, f.longitude, f.timezoneOffset);
}
