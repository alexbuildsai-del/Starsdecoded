import type { Claim } from "@/types/chart";
import { glossFor } from "@/lib/evidence-glossary";

const KIND_TINT: Record<string, string> = {
  placement: "border-primary/40 text-primary/90",
  aspect: "border-secondary/40 text-secondary/90",
  ruler: "border-brass/40 text-brass/90",
  lot: "border-emerald-400/40 text-emerald-300/90",
  sect: "border-amber-400/40 text-amber-300/90",
};

export function EvidenceCard({ claim }: { claim: Claim }) {
  const n = claim.evidence.length;
  return (
    <div className="rounded-xl border border-brass/25 bg-popover/95 shadow-lg backdrop-blur-sm p-4">
      <p className="font-display italic text-[15px] leading-snug text-foreground/90 mb-3">
        “{claim.quote}”
      </p>
      <div className="space-y-2.5 border-t border-border/50 pt-3">
        {claim.evidence.map((e, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full border px-1.5 py-px font-label text-[9px] tracking-[0.14em] uppercase ${
                  KIND_TINT[e.ref.kind] ?? "border-border text-muted-foreground"
                }`}
              >
                {e.ref.kind}
              </span>
              <span className="font-numeric text-[12px] text-foreground/85">{e.label}</span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{glossFor(e.ref)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 pt-2 border-t border-border/50 font-label text-[9px] tracking-[0.16em] uppercase text-muted-foreground/70">
        {n} verified reference{n === 1 ? "" : "s"} · whole sign · tropical
      </p>
    </div>
  );
}
