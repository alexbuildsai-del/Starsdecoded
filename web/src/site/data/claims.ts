/**
 * The four claims the home page cites (ADR-110), the ones `/ux-copy` picked
 * from the sample run for the locked artifact. Each is addressed in the run,
 * never copied, so its sentence and evidence are the report's own, and each
 * names the body its line is drawn to. No Sun or Ascendant claim in this run
 * passes that test (MB-92); a Release that changes the sample run picks the
 * four again.
 */
import { claimById, type ReadingClaim } from "@/site/data/sample";

export interface HomeClaim {
  /** "section.index" in the sample run, as `ReadingClaim.id` reads. */
  claimId: string;
  /** Where the claim's line ends on the sample's wheel. */
  target: { kind: "body" | "angle"; key: string };
}

export const HOME_CLAIMS: readonly HomeClaim[] = [
  { claimId: "triad.5", target: { kind: "body", key: "saturn" } },
  { claimId: "superpowers.0", target: { kind: "body", key: "mercury" } },
  { claimId: "focus.5", target: { kind: "body", key: "moon" } },
  { claimId: "focus.1", target: { kind: "body", key: "mars" } },
];

export type ResolvedHomeClaim = HomeClaim & ReadingClaim;

/** Throws on an address the run lacks, so the prerender fails the build rather than the home page showing three claims. */
export function homeClaims(): ResolvedHomeClaim[] {
  return HOME_CLAIMS.map((h) => {
    const found = claimById(h.claimId);
    if (!found) throw new Error(`HOME_CLAIMS names ${h.claimId}, which is not a claim of the sample run`);
    return { ...h, ...found };
  });
}
