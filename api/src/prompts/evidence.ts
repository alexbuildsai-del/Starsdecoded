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
import { hasHorizon, type NatalChartData } from "../lib/chartCalculation.js";
import {
  TRADITIONAL_PLANETS, houseRulers, lots, sect, sectPayload, type Dignity,
} from "../lib/traditional.js";
import { ASPECTS, BODIES, BODY_LABELS, SIGNS, cap, ordinal, type Body } from "./vocabulary.js";
import { fixed, repair, type Check, type Validated } from "./checks.js";

const BodyEnum = z.enum(BODIES);
const SignEnum = z.enum(SIGNS);
const TraditionalEnum = z.enum(TRADITIONAL_PLANETS);
const DignityEnum = z.enum(["domicile", "exaltation", "detriment", "fall", "peregrine"]);
const SectRoleEnum = z.enum([
  "sect_light", "benefic_of_sect", "benefic_out_of_sect", "malefic_of_sect", "malefic_out_of_sect",
]);
const AngleEnum = z.enum(["ascendant", "midheaven"]);

export const EvidenceRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("placement"), body: BodyEnum, sign: SignEnum, house: z.int().nullable() })
    .describe("a body in a sign and whole-sign house, exactly as the brief lists it; house is null when the brief reads HORIZON: unknown"),
  z.object({ kind: z.literal("aspect"), body1: BodyEnum, body2: BodyEnum, type: z.enum(ASPECTS), orb: z.number() })
    .describe("an aspect from the brief's list, with its orb in degrees"),
  z.object({ kind: z.literal("ruler"), house: z.int(), ruler: TraditionalEnum, rulerSign: SignEnum, rulerHouse: z.int(), dignity: DignityEnum })
    .describe("a house read through its ruler, exactly as the brief's HOUSE RULERS lists it"),
  z.object({ kind: z.literal("lot"), lot: z.enum(["fortune", "spirit"]), sign: SignEnum, house: z.int() })
    .describe("the Lot of Fortune or Spirit as the brief lists it"),
  z.object({ kind: z.literal("sect"), role: SectRoleEnum, body: BodyEnum })
    .describe("a sect role from the brief's SECT block and the body that holds it"),
  z.object({ kind: z.literal("angle"), angle: AngleEnum, sign: SignEnum })
    .describe("the Ascendant or the Midheaven and the sign it falls in, as the brief's ANGLES line gives it"),
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
export const CLAIMS_CONTRACT = `CLAIMS. Alongside the prose, return 3 to 8 claims. Each claim is a verbatim quote copied exactly from the prose you wrote in this section, plus 1 to 3 evidence references drawn ONLY from the chart brief: a placement (body, sign, house), an aspect (both bodies, type, orb as listed), a house ruler (house, ruler, ruler's sign and house, dignity as listed), a Lot (fortune or spirit, sign, house), a sect role (role, body), or an angle (the ascendant or the midheaven, and its sign). Copy values exactly from the brief. When the brief reads HORIZON: unknown, only placements with house null and aspects exist; any other kind is rejected. Every reference is checked against the chart by code and the section is rejected if any does not match. Choose the claims that matter most: the sentences a reader would want to verify.`;

/**
 * Typographic variants the model swaps freely and a reader never notices:
 * curly quotes, dashes and runs of whitespace. Exactly what the page's
 * CitedText softens before it looks for a quote, so a claim the validator
 * accepts is a claim the page marks (MB-62).
 */
export function softenQuote(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

const norm = softenQuote;

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

/** The evidence kinds that are the horizon: none of them can be claimed when it is unknown (ADR-34). */
const HORIZON_KINDS = new Set(["angle", "ruler", "sect", "lot"]);

/** Returns human-readable problems; empty means every claim verified. */
export function validateClaims(section: unknown, claims: Claim[], chart: NatalChartData): string[] {
  const errors: string[] = [];
  const prose = norm(proseOf(section));
  const drawn = hasHorizon(chart);
  const rulers = drawn ? houseRulers(chart) : null;
  const theLots = drawn ? lots(chart) : null;
  const payload = drawn ? sectPayload(sect(chart)) : null;

  claims.forEach((c, i) => {
    const q = norm(c.quote);
    if (q.length < 8) errors.push(`claim ${i + 1}: quote too short`);
    else if (!prose.includes(q)) errors.push(`claim ${i + 1}: quote not found verbatim in the section prose: "${c.quote.slice(0, 60)}"`);

    c.evidence.forEach((e, j) => {
      const tag = `claim ${i + 1} evidence ${j + 1}`;
      if (!drawn && HORIZON_KINDS.has(e.kind)) {
        errors.push(`${tag}: a ${e.kind} claim cannot be made when the horizon is unknown`);
        return;
      }
      if (!drawn && e.kind === "placement" && e.house !== null) {
        errors.push(`${tag}: a placement claim cannot carry a house when the horizon is unknown`);
        return;
      }
      switch (e.kind) {
        case "placement": {
          const p = chart.planets[e.body];
          if (!p) { errors.push(`${tag}: no body ${e.body}`); break; }
          if (p.sign.toLowerCase() !== e.sign) errors.push(`${tag}: ${e.body} is in ${p.sign}, not ${e.sign}`);
          if (drawn && e.house === null) errors.push(`${tag}: ${e.body} is in the ${ordinal(p.house ?? 0)}; the brief lists the house`);
          else if (drawn && p.house !== e.house) errors.push(`${tag}: ${e.body} is in the ${ordinal(p.house ?? 0)}, not the ${ordinal(e.house ?? 0)}`);
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
          const r = rulers?.[e.house - 1];
          if (!r) { errors.push(`${tag}: no house ${e.house}`); break; }
          if (r.ruler !== e.ruler) errors.push(`${tag}: the ${ordinal(e.house)} is ruled by ${r.ruler}, not ${e.ruler}`);
          if (r.rulerSign !== e.rulerSign) errors.push(`${tag}: ${r.ruler} is in ${r.rulerSign}, not ${e.rulerSign}`);
          if (r.rulerHouse !== e.rulerHouse) errors.push(`${tag}: ${r.ruler} is in the ${ordinal(r.rulerHouse)}, not the ${ordinal(e.rulerHouse)}`);
          if (r.rulerDignity !== e.dignity) errors.push(`${tag}: ${r.ruler} is ${r.rulerDignity}, not ${e.dignity}`);
          break;
        }
        case "lot": {
          const l = theLots?.[e.lot];
          if (!l) { errors.push(`${tag}: no lots without a horizon`); break; }
          if (l.sign !== e.sign) errors.push(`${tag}: Lot of ${e.lot} is in ${l.sign}, not ${e.sign}`);
          if (l.house !== e.house) errors.push(`${tag}: Lot of ${e.lot} is in the ${ordinal(l.house)}, not the ${ordinal(e.house)}`);
          break;
        }
        case "sect": {
          if (!payload) { errors.push(`${tag}: no sect without a horizon`); break; }
          if (payload[e.role] !== e.body) errors.push(`${tag}: ${e.role} is ${payload[e.role]}, not ${e.body}`);
          break;
        }
        case "angle": {
          const actual = chart.angles?.[e.angle].sign.toLowerCase();
          if (!actual) { errors.push(`${tag}: no angles without a horizon`); break; }
          if (actual !== e.sign) errors.push(`${tag}: the ${e.angle} is in ${actual}, not ${e.sign}`);
          break;
        }
      }
    });
  });
  return errors;
}

// ---------------------------------------------------------------------------
// Reconciliation (ADR-82): claims snap or drop, and never force a rewrite.
// ---------------------------------------------------------------------------

/** Lower-cased word tokens, punctuation gone, so "Don't stop." and "don't stop" agree. */
export function quoteTokens(s: string): string[] {
  return softenQuote(s).toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, " ").split(/\s+/).filter(Boolean);
}

/** Sentences of a prose text, for the snap: the nearest sentence to a quote that is not verbatim. */
export function proseSentences(prose: string): string[] {
  return prose.split(/\n+|(?<=[.!?])\s+(?=[A-Z"“'‘(])/).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Token overlap, quote against sentence: the share of the quote's tokens the sentence holds, tempered by the sentence's own length. */
export function tokenOverlap(quote: string, sentence: string): number {
  const q = quoteTokens(quote);
  const s = quoteTokens(sentence);
  if (!q.length || !s.length) return 0;
  const bag = new Map<string, number>();
  for (const t of s) bag.set(t, (bag.get(t) ?? 0) + 1);
  let hit = 0;
  for (const t of q) {
    const n = bag.get(t) ?? 0;
    if (n > 0) { hit += 1; bag.set(t, n - 1); }
  }
  return hit / Math.max(q.length, s.length);
}

export const SNAP_THRESHOLD = 0.85;

/**
 * A quote that is not verbatim snaps to the closest sentence when at least
 * 85% of the tokens agree, case and punctuation ignored (annex row 4); a
 * verbatim quote returns itself. Null means nothing close enough.
 */
export function snapQuote(quote: string, prose: string): string | null {
  const q = norm(quote);
  const p = norm(prose);
  if (q.length >= 8 && p.includes(q)) return quote;
  // The softened prose is a search text, never a quote: the snap returns the original sentence's own characters.
  let best: { sentence: string; score: number } | null = null;
  for (const sentence of proseSentences(prose)) {
    const score = tokenOverlap(quote, sentence);
    if (score >= SNAP_THRESHOLD && (!best || score > best.score)) best = { sentence, score };
  }
  return best?.sentence ?? null;
}

/** The chart's own value for a reference that is nearly right: the drawn house, the computed orb. Null when nothing in the chart matches it. */
export function reconcileRef(e: EvidenceRef, chart: NatalChartData, tag: string, checks: Check[]): EvidenceRef | null {
  const drawn = hasHorizon(chart);
  if (!drawn && HORIZON_KINDS.has(e.kind)) {
    checks.push(fixed("chk-05", `${tag}: a ${e.kind} reference cannot be made when the horizon is unknown; dropped`));
    return null;
  }
  if (!drawn && e.kind === "placement" && e.house !== null) {
    checks.push(fixed("chk-05", `${tag}: a placement carries a house although the horizon is unknown; house set to null`));
    e = { ...e, house: null };
  }
  const problems = validateClaims({ text: "" }, [{ quote: "________", evidence: [e] }], chart).filter((m) => !/quote/.test(m));
  if (problems.length === 0) return e;
  if (e.kind === "placement" && drawn && e.house === null) {
    const house = chart.planets[e.body]?.house;
    if (house !== undefined && chart.planets[e.body]?.sign.toLowerCase() === e.sign) {
      checks.push(fixed("chk-07", `${tag}: the placement's house was null on a drawn chart; filled from the chart`));
      return { ...e, house };
    }
  }
  if (e.kind === "aspect") {
    const hit = chart.aspects.find((a) => a.type === e.type
      && ((a.planet1 === e.body1 && a.planet2 === e.body2) || (a.planet1 === e.body2 && a.planet2 === e.body1)));
    if (hit) {
      checks.push(fixed("chk-08", `${tag}: orb ${e.orb} snapped to the computed ${hit.orb.toFixed(1)}`));
      return { ...e, orb: hit.orb };
    }
  }
  checks.push(fixed("chk-06", `${tag}: ${problems.join("; ")}; reference dropped`));
  return null;
}

export interface ReconciledClaims<C extends { quote: string }> {
  claims: C[];
  checks: Check[];
}

/**
 * Claims against the section's prose and the chart, in code: refs cut to
 * three, quotes snapped or dropped, wrong refs dropped and then the claim
 * when none is left, orbs and houses taken from the chart. Fewer than
 * `minClaims` valid claims at the end is a `repair`, never a prose rewrite.
 */
export function reconcileClaims(section: unknown, claims: Claim[], chart: NatalChartData, minClaims = 3): ReconciledClaims<Claim> {
  const checks: Check[] = [];
  const prose = proseOf(section);
  const kept: Claim[] = [];
  const list = claims.length > 8 ? (checks.push(fixed("chk-02", `${claims.length} claims; cut to 8`)), claims.slice(0, 8)) : claims;
  list.forEach((c, i) => {
    const tag = `claim ${i + 1}`;
    if (norm(c.quote).length < 8) { checks.push(fixed("chk-03", `${tag}: quote too short; claim dropped`)); return; }
    const quote = snapQuote(c.quote, prose);
    if (quote === null) { checks.push(fixed("chk-04", `${tag}: quote not found in the prose and no sentence close enough; claim dropped`)); return; }
    if (quote !== c.quote) checks.push(fixed("chk-04", `${tag}: quote not verbatim; snapped to its sentence`));
    let evidence = c.evidence;
    if (evidence.length > 3) { checks.push(fixed("chk-01", `${tag}: ${evidence.length} references; cut to 3`)); evidence = evidence.slice(0, 3); }
    const valid = evidence.map((e, j) => reconcileRef(e, chart, `${tag} evidence ${j + 1}`, checks)).filter((e): e is EvidenceRef => e !== null);
    if (!valid.length) { checks.push(fixed("chk-01", `${tag}: no reference left; claim dropped`)); return; }
    kept.push({ quote, evidence: valid });
  });
  if (kept.length < minClaims) checks.push(repair("chk-09", `${kept.length} valid claims after reconciliation; ${minClaims} needed`));
  return { claims: kept, checks };
}

const ROLE_LABEL: Record<z.infer<typeof SectRoleEnum>, string> = {
  sect_light: "the sect light",
  benefic_of_sect: "the benefic of sect",
  benefic_out_of_sect: "the benefic out of sect",
  malefic_of_sect: "the malefic of sect",
  malefic_out_of_sect: "the malefic out of sect",
};

const ANGLE_LABEL: Record<z.infer<typeof AngleEnum>, string> = {
  ascendant: "Ascendant", midheaven: "Midheaven",
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
      return e.house === null
        ? `${BODY_LABELS[e.body as Body]}${deg} ${cap(e.sign)}`
        : `${BODY_LABELS[e.body as Body]}${deg} ${cap(e.sign)}, ${ordinal(e.house)} house`;
    }
    case "aspect":
      return `${BODY_LABELS[e.body1 as Body]} ${e.type} ${BODY_LABELS[e.body2 as Body]}, ${e.orb.toFixed(1)}° orb`;
    case "ruler":
      return `${BODY_LABELS[e.ruler as Body]} rules the ${ordinal(e.house)} and sits in ${cap(e.rulerSign)}, ${ordinal(e.rulerHouse)} house, ${DIGNITY_LABEL[e.dignity]}`;
    case "lot":
      return `Lot of ${cap(e.lot)} in ${cap(e.sign)}, ${ordinal(e.house)} house`;
    case "sect":
      return `${BODY_LABELS[e.body as Body]} is ${ROLE_LABEL[e.role]}`;
    case "angle": {
      const a = chart.angles?.[e.angle];
      return a ? `${ANGLE_LABEL[e.angle]} · ${a.degree.toFixed(1)}° ${cap(e.sign)}` : `${ANGLE_LABEL[e.angle]} in ${cap(e.sign)}`;
    }
  }
}

export function storeClaims(claims: Claim[], chart: NatalChartData): StoredClaim[] {
  return claims.map((c) => ({
    quote: c.quote,
    evidence: c.evidence.map((ref) => ({ ref, label: labelEvidence(ref, chart) })),
  }));
}

/** The validator every claims-bearing natal section shares: the prose stands, the claims are reconciled. */
export function validateSectionClaims<T extends { claims: Claim[] }>(out: T, chart: NatalChartData, minClaims = 3): Validated<T> {
  const { claims, checks } = reconcileClaims(out, out.claims, chart, minClaims);
  return { output: { ...out, claims }, checks };
}
