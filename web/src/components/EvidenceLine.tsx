/**
 * Claim matching. Labels are composed by the API from references it verified
 * against the chart, so what the reader cross-checks is a confirmed fact,
 * never model text. The rendering lives in report/Citation.tsx.
 */
import type { Claim } from "@/types/chart";

function normalise(s: string): string {
  return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
}

/** Claims whose quote appears in this paragraph. */
export function claimsFor(text: string, claims: Claim[] | undefined): Claim[] {
  if (!claims?.length) return [];
  const t = normalise(text);
  return claims.filter((c) => t.includes(normalise(c.quote)));
}
