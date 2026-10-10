/**
 * Always visible, never collapsible: what was computed and how. A report
 * whose horizon is unknown has no sect line to give; the horizon line says so.
 */
import type { Interpretation } from "@/types/chart";

export function MethodologyBox({ meta, horizonLine }: { meta: Interpretation["meta"]; horizonLine?: string }) {
  const alt = meta.sunAltitude;
  const sectLine = meta.sect && alt !== undefined
    ? `${meta.sect === "day" ? "Day" : "Night"} chart. The Sun's centre was ${Math.abs(alt).toFixed(1)}° ${alt > 0 ? "above" : "below"} the horizon at birth${meta.sectMarginal ? " (within 5°, marginal; the reading commits to " + meta.sect + ")" : ""}.`
    : "Without a birth time, we can't tell if you were born by day or night.";
  const orbs = Object.entries(meta.orbs ?? {}).map(([k, v]) => `${k} ${v}°`).join(", ");
  return (
    <div className="mx-auto max-w-2xl mt-6 rounded-card border border-line bg-surface/40 px-5 py-4 text-left">
      <p className="font-label text-label uppercase text-label-dim mb-2">Methodology</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption">
        <dt className="text-muted">Houses</dt>
        <dd className="text-paper-dim">Whole Sign. Sites such as astro.com default to Placidus, so some house numbers there will differ. Signs, degrees and aspects are identical.</dd>
        <dt className="text-muted">Zodiac</dt>
        <dd className="text-paper-dim">Tropical</dd>
        <dt className="text-muted">Ephemeris</dt>
        <dd className="text-paper-dim">{meta.ephemeris}</dd>
        <dt className="text-muted">Orbs</dt>
        <dd className="text-paper-dim">{orbs}</dd>
        {horizonLine && (
          <>
            <dt className="text-muted">Horizon</dt>
            <dd className="text-paper-dim">{horizonLine}</dd>
          </>
        )}
        <dt className="text-muted">Sect</dt>
        <dd className="text-paper-dim">{sectLine}</dd>
        <dt className="text-muted">Evidence</dt>
        <dd className="text-paper-dim">Every cited placement, ruler, Lot and aspect in this report was checked against the computed chart before the report was stored.</dd>
      </dl>
    </div>
  );
}
