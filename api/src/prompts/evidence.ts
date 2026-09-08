/**
 * Claim-level evidence, verified in code.
 *
 * Each reader-facing section returns `claims`: a verbatim quote from its own
 * prose plus one or more structured references to the chart. The references
 * are a closed set of shapes with enum-bounded fields, never free text, and
 * every one is checked against the computed chart before the report is
 * stored. A citation the reader cross-checks is therefore a fact the code
 * confirmed. The reader-facing line is composed here from the validated
 * reference, so it cannot be invented either.
 */
import { z } from "zod/v4";
import type { NatalChartData } from "../lib/chartCalculation.js";
import {
  TRADITIONAL_PLANETS, houseRulers, lots, sect, sectPayload, type Dignity,
} from "../lib/traditional.js";
import { ASPECTS, BODIES, BODY_LABELS, SIGNS, cap, ordinal, type Body } from "./vocabulary.js";

const BodyEnum = z.enum(BODIES);
const SignEnum = z.enum(SIGNS);
const TraditionalEnum = z.enum(TRADITIONAL_PLANETS);
const DignityEnum = z.enum(["domicile", "exaltation", "detriment", "fall", "peregrine"]);
const SectRoleEnum = z.enum([
  "sect_light", "benefic_of_sect", "benefic_out_of_sect", "malefic_of_sect", "malefic_out_of_sect",
]);

export const EvidenceRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("placement"), body: BodyEnum, sign: SignEnum, house: z.int() })
    .describe("a body in a sign and whole-sign house, exactly as the brief lists it"),
  z.object({ kind: z.literal("aspect"), body1: BodyEnum, body2: BodyEnum, type: z.enum(ASPECTS), orb: z.number() })
    .describe("an aspect from the brief's list, with its orb in degrees"),
  z.object({ kind: z.literal("ruler"), house: z.int(), ruler: TraditionalEnum, rulerSign: SignEnum, rulerHouse: z.int(), dignity: DignityEnum })
    .describe("a house read through its ruler, exactly as the brief's HOUSE RULERS lists it"),
  z.object({ kind: z.literal("lot"), lot: z.enum(["fortune", "spirit"]), sign: SignEnum, house: z.int() })
    .describe("the Lot of Fortune or Spirit as the brief lists it"),
  z.object({ kind: z.literal("sect"), role: SectRoleEnum, body: BodyEnum })
    .describe("a sect role from the brief's SECT block and the body that holds it"),
]);
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const ClaimSchema = z.object({
  quote: z.string().describe("a verbatim sentence or clause copied exactly from this section's prose"),
  evidence: z.array(EvidenceRefSchema).min(1).max(3),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const ClaimsSchema = z.array(ClaimSchema).min(3).max(8);

/** A claim as stored: the validated reference plus its composed reader-facing label. */
export interface StoredEvidence { ref: EvidenceRef; label: string }
export interface StoredClaim { quote: string; evidence: StoredEvidence[] }

/** Contract appended by code to every reader-facing prompt. Not overridable. */
export const CLAIMS_CONTRACT = `CLAIMS. Alongside the prose, return 3 to 8 claims. Each claim is a verbatim quote copied exactly from the prose you wrote in this section, plus 1 to 3 evidence references drawn ONLY from the chart brief: a placement (body, sign, house), an aspect (both bodies, type, orb as listed), a house ruler (house, ruler, ruler's sign and house, dignity as listed), a Lot (fortune or spirit, sign, house), or a sect role (role, body). Copy values exactly from the brief. Every reference is checked against the chart by code and the section is rejected if any does not match. Choose the claims that matter most: the sentences a reader would want to verify.`;

function norm(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

/** Every string leaf of a section except the claims themselves, joined as the prose to quote from. */
export function proseOf(section: unknown): string {
  const out: string[] = [];
  const walk = (v: unknown, key?: string) => {
    if (key === "claims") return;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(section);
  return out.join("\n");
}

const ORB_TOLERANCE = 0.2;

/** Returns human-readable problems; empty means every claim verified. */
export function validateClaims(section: unknown, claims: Claim[], chart: NatalChartData): string[] {
  const errors: string[] = [];
  const prose = norm(proseOf(section));
  const rulers = houseRulers(chart);
  const theLots = lots(chart);
  const payload = sectPayload(sect(chart));

  claims.forEach((c, i) => {
    const q = norm(c.quote);
    if (q.length < 8) errors.push(`claim ${i + 1}: quote too short`);
    else if (!prose.includes(q)) errors.push(`claim ${i + 1}: quote not found verbatim in the section prose: "${c.quote.slice(0, 60)}"`);

    c.evidence.forEach((e, j) => {
      const tag = `claim ${i + 1} evidence ${j + 1}`;
      switch (e.kind) {
        case "placement": {
          const p = chart.planets[e.body];
          if (!p) { errors.push(`${tag}: no body ${e.body}`); break; }
          if (p.sign.toLowerCase() !== e.sign) errors.push(`${tag}: ${e.body} is in ${p.sign}, not ${e.sign}`);
          if (p.house !== e.house) errors.push(`${tag}: ${e.body} is in the ${ordinal(p.house)}, not the ${ordinal(e.house)}`);
          break;
        }
        case "aspect": {
          const hit = chart.aspects.find((a) =>
            a.type === e.type
            && ((a.planet1 === e.body1 && a.planet2 === e.body2) || (a.planet1 === e.body2 && a.planet2 === e.body1)));
          if (!hit) { errors.push(`${tag}: no ${e.body1} ${e.type} ${e.body2} in the chart`); break; }
          if (Math.abs(hit.orb - e.orb) > ORB_TOLERANCE) errors.push(`${tag}: orb is ${hit.orb.toFixed(1)}, not ${e.orb}`);
          break;
        }
        case "ruler": {
          const r = rulers[e.house - 1];
          if (!r) { errors.push(`${tag}: no house ${e.house}`); break; }
          if (r.ruler !== e.ruler) errors.push(`${tag}: the ${ordinal(e.house)} is ruled by ${r.ruler}, not ${e.ruler}`);
          if (r.rulerSign !== e.rulerSign) errors.push(`${tag}: ${r.ruler} is in ${r.rulerSign}, not ${e.rulerSign}`);
          if (r.rulerHouse !== e.rulerHouse) errors.push(`${tag}: ${r.ruler} is in the ${ordinal(r.rulerHouse)}, not the ${ordinal(e.rulerHouse)}`);
          if (r.rulerDignity !== e.dignity) errors.push(`${tag}: ${r.ruler} is ${r.rulerDignity}, not ${e.dignity}`);
          break;
        }
        case "lot": {
          const l = theLots[e.lot];
          if (l.sign !== e.sign) errors.push(`${tag}: Lot of ${e.lot} is in ${l.sign}, not ${e.sign}`);
          if (l.house !== e.house) errors.push(`${tag}: Lot of ${e.lot} is in the ${ordinal(l.house)}, not the ${ordinal(e.house)}`);
          break;
        }
        case "sect": {
          if (payload[e.role] !== e.body) errors.push(`${tag}: ${e.role} is ${payload[e.role]}, not ${e.body}`);
          break;
        }
      }
    });
  });
  return errors;
}

const ROLE_LABEL: Record<z.infer<typeof SectRoleEnum>, string> = {
  sect_light: "the sect light",
  benefic_of_sect: "the benefic of sect",
  benefic_out_of_sect: "the benefic out of sect",
  malefic_of_sect: "the malefic of sect",
  malefic_out_of_sect: "the malefic out of sect",
};

const DIGNITY_LABEL: Record<Dignity, string> = {
  domicile: "in domicile", exaltation: "exalted", detriment: "in detriment", fall: "in fall", peregrine: "peregrine",
};

/** The reader-facing line for a validated reference. Deterministic, never model text. */
export function labelEvidence(e: EvidenceRef, chart: NatalChartData): string {
  switch (e.kind) {
    case "placement": {
      const p = chart.planets[e.body];
      const deg = p ? ` ${p.degree.toFixed(1)}°` : "";
      return `${BODY_LABELS[e.body as Body]}${deg} ${cap(e.sign)}, ${ordinal(e.house)} house`;
    }
    case "aspect":
      return `${BODY_LABELS[e.body1 as Body]} ${e.type} ${BODY_LABELS[e.body2 as Body]}, ${e.orb.toFixed(1)}° orb`;
    case "ruler":
      return `${BODY_LABELS[e.ruler as Body]} rules the ${ordinal(e.house)} and sits in ${cap(e.rulerSign)}, ${ordinal(e.rulerHouse)} house, ${DIGNITY_LABEL[e.dignity]}`;
    case "lot":
      return `Lot of ${cap(e.lot)} in ${cap(e.sign)}, ${ordinal(e.house)} house`;
    case "sect":
      return `${BODY_LABELS[e.body as Body]} is ${ROLE_LABEL[e.role]}`;
  }
}

export function storeClaims(claims: Claim[], chart: NatalChartData): StoredClaim[] {
  return claims.map((c) => ({
    quote: c.quote,
    evidence: c.evidence.map((ref) => ({ ref, label: labelEvidence(ref, chart) })),
  }));
}
