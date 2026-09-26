import type { Claim } from "@/types/chart";
import { glossFor, sourceLines, withHouseWords } from "@/lib/evidence-glossary";

/** Children of the portalled `.rp-card`, so no wrapper of its own. Every house number carries its word (ADR-98). */
export function EvidenceCard({ claim }: { claim: Claim }) {
  const n = claim.evidence.length;
  return (
    <>
      <p className="q">“{claim.quote}”</p>
      {claim.evidence.map((e, i) => {
        // A source claim reads as two labelled lines and no sentence (ADR-60).
        if (e.ref.kind === "source") {
          const lines = sourceLines(e.ref, e.label);
          return (
            <div className="ev" key={i}>
              <div className="t"><span className="k source">source</span><span className="l">{lines.source}</span></div>
              <div className="t"><span className="k source">evidence</span><span className="l">{withHouseWords(lines.evidence)}</span></div>
            </div>
          );
        }
        return (
          <div className="ev" key={i}>
            <div className="t">
              <span className={`k ${e.ref.kind}`}>{e.ref.kind}</span>
              <span className="l">{withHouseWords(e.label)}</span>
            </div>
            <div className="w">{glossFor(e.ref)}</div>
          </div>
        );
      })}
      <p className="foot">
        {n} verified reference{n === 1 ? "" : "s"} · whole sign · tropical
      </p>
    </>
  );
}
