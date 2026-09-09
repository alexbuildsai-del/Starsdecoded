/**
 * The chart facts a paragraph rests on, rendered directly under it. Labels are
 * composed by the API from references it verified against the chart, so what
 * the reader cross-checks is a confirmed fact, never model text.
 */
import type { Claim } from "@/types/chart";

function normalise(s: string): string {
  return s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, " ").trim();
}

/** Claims whose quote appears in this paragraph. */
export function claimsFor(text: string, claims: Claim[] | undefined): Claim[] {
  if (!claims?.length) return [];
  const t = normalise(text);
  return claims.filter((c) => t.includes(normalise(c.quote)));
}

export function EvidenceLines({ text, claims }: { text: string; claims?: Claim[] }) {
  const hits = claimsFor(text, claims);
  if (hits.length === 0) return null;
  return (
    <ul className="mt-2 mb-4 space-y-1">
      {hits.map((c, i) => (
        <li key={i} className="text-[12px] leading-snug text-muted-foreground">
          <span className="text-foreground/60">"{c.quote}"</span>
          <span className="text-foreground/40"> — </span>
          {c.evidence.map((e) => e.label).join(" · ")}
        </li>
      ))}
    </ul>
  );
}
