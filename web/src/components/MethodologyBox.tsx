/**
 * Always visible, never collapsible: what was computed and how.
 */
import type { Interpretation } from "@/types/chart";

export function MethodologyBox({ meta }: { meta: Interpretation["meta"] }) {
  const alt = meta.sunAltitude;
  const sectLine = `${meta.sect === "day" ? "Day" : "Night"} chart. The Sun's centre was ${Math.abs(alt).toFixed(1)}° ${alt > 0 ? "above" : "below"} the horizon at birth${meta.sectMarginal ? " (within 5°, marginal; the reading commits to " + meta.sect + ")" : ""}.`;
  const orbs = Object.entries(meta.orbs ?? {}).map(([k, v]) => `${k} ${v}°`).join(", ");
  return (
    <div className="mx-auto max-w-2xl mt-6 rounded-xl border border-border/50 bg-card/30 px-5 py-4 text-left">
      <p className="font-label text-[10px] tracking-[0.22em] uppercase text-muted-foreground mb-2">Methodology</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px] leading-snug">
        <dt className="text-muted-foreground">Houses</dt>
        <dd className="text-foreground/80">Whole Sign. Sites such as astro.com default to Placidus, so some house numbers there will differ. Signs, degrees and aspects are identical.</dd>
        <dt className="text-muted-foreground">Zodiac</dt>
        <dd className="text-foreground/80">Tropical</dd>
        <dt className="text-muted-foreground">Ephemeris</dt>
        <dd className="text-foreground/80">{meta.ephemeris}</dd>
        <dt className="text-muted-foreground">Orbs</dt>
        <dd className="text-foreground/80">{orbs}</dd>
        <dt className="text-muted-foreground">Sect</dt>
        <dd className="text-foreground/80">{sectLine}</dd>
        <dt className="text-muted-foreground">Evidence</dt>
        <dd className="text-foreground/80">Every cited placement, ruler, Lot and aspect in this report was checked against the computed chart before the report was stored.</dd>
      </dl>
    </div>
  );
}
