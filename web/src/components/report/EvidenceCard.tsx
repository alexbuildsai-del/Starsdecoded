import type { Claim } from "@/types/chart";
import { glossFor } from "@/lib/evidence-glossary";

/** Children of the portalled `.rp-card`, so no wrapper of its own. */
export function EvidenceCard({ claim }: { claim: Claim }) {
  const n = claim.evidence.length;
  return (
    <>
      <p className="q">“{claim.quote}”</p>
      {claim.evidence.map((e, i) => (
        <div className="ev" key={i}>
          <div className="t">
            <span className={`k ${e.ref.kind}`}>{e.ref.kind}</span>
            <span className="l">{e.label}</span>
          </div>
          <div className="w">{glossFor(e.ref)}</div>
        </div>
      ))}
      <p className="foot">
        {n} verified reference{n === 1 ? "" : "s"} · whole sign · tropical
      </p>
    </>
  );
}
