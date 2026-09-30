/**
 * The sample account the landing's orbit and plates are drawn on (ADR-112):
 * invented people, labelled as samples wherever they are shown, whose charts
 * the engine computes from their birth data (R-3.1). Nobody here is real, and
 * the report lab never reads their fixtures.
 */
import type { ChartData, Lens } from "@/types/chart";
import { chartOf, type Birth } from "@/site/lib/chart";
import mira from "../../../../fixtures/sample-people/mira.json";
import tomas from "../../../../fixtures/sample-people/tomas.json";
import june from "../../../../fixtures/sample-people/june.json";
import idris from "../../../../fixtures/sample-people/idris.json";
import hanna from "../../../../fixtures/sample-people/hanna.json";
import noor from "../../../../fixtures/sample-people/noor.json";

/** Who each person is to Mira, the account's owner: one of each relation the orbit and the three lenses need. */
export type SampleRelation = "self" | "partner" | "child" | "parent" | "friend" | "colleague";

export interface SamplePerson {
  id: string;
  name: string;
  relation: SampleRelation;
  /** "YYYY-MM-DD", as a profile stores it. */
  birthDate: string;
  birth: Birth;
  readonly chart: ChartData;
}

interface SampleFixture {
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes?: number;
  latitude: number;
  longitude: number;
  timezone: string;
  timezoneOffset: number;
}

function person(id: string, relation: SampleRelation, f: SampleFixture): SamplePerson {
  const birth: Birth = {
    birthDate: f.birthDate,
    birthTime: f.birthTime,
    latitude: f.latitude,
    longitude: f.longitude,
    timezone: f.timezone,
    timezoneOffset: f.timezoneOffset,
    ...(f.birthTimeWindowMinutes !== undefined ? { birthTimeWindowMinutes: f.birthTimeWindowMinutes } : {}),
  };
  let chart: ChartData | undefined;
  return {
    id,
    name: f.name,
    relation,
    birthDate: f.birthDate,
    birth,
    // An engine run costs tens of milliseconds on a phone, so a chart is computed when a card or plate first reads it, not when the home page imports six.
    get chart() {
      chart ??= chartOf(birth);
      return chart;
    },
  };
}

/** Mira first, then the others in the order the artifact's orbit draws them. */
export const SAMPLE_PEOPLE: readonly SamplePerson[] = [
  person("mira", "self", mira),
  person("tomas", "partner", tomas),
  person("june", "child", june),
  person("idris", "parent", idris),
  person("hanna", "friend", hanna),
  person("noor", "colleague", noor),
];

/** Mira and one other under each lens; under parent and child the parent comes first, as the lens orders its roles. */
export const SAMPLE_PAIRS: Record<Lens, [string, string]> = {
  partners: ["mira", "tomas"],
  parent_child: ["mira", "june"],
  people: ["mira", "hanna"],
};

export function samplePerson(id: string): SamplePerson | undefined {
  return SAMPLE_PEOPLE.find((p) => p.id === id);
}
