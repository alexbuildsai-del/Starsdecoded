/**
 * Claim-level evidence for the compatibility report (ADR-44). Two kinds:
 * `cross`, a cross-chart aspect or an overlay the engine computed, and
 * `source`, a claim already stored in one of the two natal reports, which
 * is rendered with that report's own evidence label. Every reference is
 * checked in code before storage; a source that does not resolve is
 * rejected with a message naming the report and section.
 */
import { z } from "zod/v4";
import { aspectKey, overlayKey, type PairBrief } from "../../lib/pairBrief.js";
import { findOverlay } from "../../lib/overlays.js";
import { ASPECTS, BODIES, BODY_LABELS, cap, ordinal, type Body } from "../vocabulary.js";
import { SECTION_IDS, type StoredClaim } from "../index.js";
import { proseOf, softenQuote, type StoredEvidence } from "../evidence.js";

const BodyEnum = z.enum(BODIES);
const SideEnum = z.enum(["A", "B"]);
const SectionEnum = z.enum(SECTION_IDS as [string, ...string[]]);

export const CrossAspectRef = z.object({
  kind: z.literal("cross"),
  planetA: BodyEnum, planetB: BodyEnum, aspect: z.enum(ASPECTS), orb: z.number(),
}).describe("a cross aspect from the brief's CROSS ASPECTS list: A's body, B's body, the type and the orb as listed");

export const OverlayRef = z.object({
  kind: z.literal("cross"),
  planet: BodyEnum, of: SideEnum, inHouseOf: SideEnum, house: z.int(),
}).describe("an overlay from the brief's OVERLAYS list: whose body, in whose house, which house");

export const SourceRef = z.object({
  kind: z.literal("source"),
  report: SideEnum, section: SectionEnum, claim: z.int(),
}).describe("a claim from the brief's NATAL CLAIMS list: the report letter, the section and the claim number as listed");

export const PairEvidenceRefSchema = z.union([CrossAspectRef, OverlayRef, SourceRef]);
export type PairEvidenceRef = z.infer<typeof PairEvidenceRefSchema>;

export const PairClaimSchema = z.object({
  quote: z.string().describe("a verbatim sentence or clause copied exactly from this section's prose"),
  evidence: z.array(PairEvidenceRefSchema).min(1).max(3),
});
export type PairClaim = z.infer<typeof PairClaimSchema>;
export const PairClaimsSchema = z.array(PairClaimSchema).min(3).max(8);

export const PAIR_CLAIMS_CONTRACT = `CLAIMS. Alongside the prose, return 3 to 8 claims. Each claim is a verbatim quote copied exactly from the prose you wrote in this section, plus 1 to 3 evidence references drawn ONLY from the brief: a cross aspect (A's body, B's body, type, orb as listed), an overlay (whose body, in whose house, the house as listed), or a source (the letter, section and claim number of a personal-report claim as listed). Copy values exactly from the brief. A cross aspect or an overlay may be cited only from THIS CHAPTER'S LINKS; a claim citing another chapter's link is rejected. A because-line cites a source. Every reference is checked by code and the section is rejected if any does not match.`;

const norm = softenQuote;

const ORB_TOLERANCE = 0.2;

/** The link a cross reference points at, as the brief's allocation keys it (ADR-66). */
export function crossLinkKey(e: Exclude<PairEvidenceRef, { kind: "source" }>): string {
  return "planetA" in e ? aspectKey(e.planetA, e.aspect, e.planetB) : overlayKey(e.of, e.planet, e.inHouseOf);
}

/**
 * Returns human-readable problems; empty means every claim verified against
 * the computed pair. With a chapter id and a brief that carries an
 * allocation, a cross claim outside that chapter's links is rejected.
 */
export function validatePairClaims(section: unknown, claims: PairClaim[], brief: PairBrief, chapterId?: string): string[] {
  const errors: string[] = [];
  const prose = norm(proseOf(section));
  const owned = chapterId && brief.allocation ? brief.allocation[chapterId] : undefined;
  claims.forEach((c, i) => {
    const q = norm(c.quote);
    if (q.length < 8) errors.push(`claim ${i + 1}: quote too short`);
    else if (!prose.includes(q)) errors.push(`claim ${i + 1}: quote not found verbatim in the section prose: "${c.quote.slice(0, 60)}"`);
    c.evidence.forEach((e, j) => {
      const tag = `claim ${i + 1} evidence ${j + 1}`;
      if (e.kind === "source") {
        const side = e.report === "A" ? brief.a : brief.b;
        const list = side.claims[e.section];
        if (!list || !list[e.claim - 1]) {
          errors.push(`${tag}: report ${e.report} (${side.name}) has no claim ${e.claim} in ${e.section}`);
        }
        return;
      }
      if (owned && !owned.includes(crossLinkKey(e))) {
        errors.push(`${tag}: cites a link outside this chapter's allocation; only THIS CHAPTER'S LINKS may be cited`);
        return;
      }
      if ("planetA" in e) {
        const hit = brief.cross.find((x) => x.planetA === e.planetA && x.planetB === e.planetB && x.type === e.aspect);
        if (!hit) { errors.push(`${tag}: no A ${e.planetA} ${e.aspect} B ${e.planetB} within orb`); return; }
        if (Math.abs(hit.orb - e.orb) > ORB_TOLERANCE) errors.push(`${tag}: orb is ${hit.orb.toFixed(1)}, not ${e.orb}`);
        return;
      }
      if (brief.blind) { errors.push(`${tag}: no overlay can be claimed when a chart has no horizon`); return; }
      const o = findOverlay(brief.overlays, e.planet, e.of, e.inHouseOf);
      if (!o) errors.push(`${tag}: ${e.of} ${e.planet} is not read against ${e.inHouseOf}'s houses`);
      else if (o.house !== e.house) errors.push(`${tag}: ${e.of} ${e.planet} falls in ${e.inHouseOf}'s ${ordinal(o.house)}, not the ${ordinal(e.house)}`);
    });
  });
  return errors;
}

const bodyLabel = (b: string): string => BODY_LABELS[b as Body] ?? cap(b);

/** The reader-facing line for a validated reference. A source carries the natal report's own labels. */
export function labelPairEvidence(e: PairEvidenceRef, brief: PairBrief): string {
  if (e.kind === "source") {
    const side = e.report === "A" ? brief.a : brief.b;
    const claim = side.claims[e.section]?.[e.claim - 1];
    const labels = claim?.evidence.map((x) => x.label).join("; ") ?? "";
    return `${side.name}'s report: ${labels}`;
  }
  if ("planetA" in e) {
    return `${brief.a.name}'s ${bodyLabel(e.planetA)} ${e.aspect} ${brief.b.name}'s ${bodyLabel(e.planetB)}, ${e.orb.toFixed(1)}° orb`;
  }
  const owner = e.of === "A" ? brief.a.name : brief.b.name;
  const host = e.inHouseOf === "A" ? brief.a.name : brief.b.name;
  return `${owner}'s ${bodyLabel(e.planet)} in ${host}'s ${ordinal(e.house)} house`;
}

export function storePairClaims(claims: PairClaim[], brief: PairBrief): StoredClaim[] {
  return claims.map((c) => ({
    quote: c.quote,
    evidence: c.evidence.map((ref): StoredEvidence => ({ ref: ref as unknown as StoredEvidence["ref"], label: labelPairEvidence(ref, brief) })),
  }));
}
