/**
 * Sun, Moon and Rising, one row each, the same on every page that prints them
 * (ADR-211, reading 20): the planet render, or the Ascendant glyph for the
 * Rising, then the label, then the sign, degrees and house in Plex Mono. The
 * rows come from `triadRowsOf`. It wears the report legend's look, with its
 * fonts and brass also set here, so it reads the same outside a report's
 * tokens, on the dashboard and on the public pages.
 */
import { AngleGlyph } from "@/components/report/AngleGlyph";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import type { TriadRowData } from "@/lib/triad-row";
import { cn } from "@/lib/utils";

export interface TriadRowProps {
  rows: readonly TriadRowData[];
  /** The sign and degrees only, for a column too narrow for the house. */
  compact?: boolean;
  /** Turns the Rising's line on a chart with no birth time into the button that asks for one. */
  onAddBirthTime?: () => void;
  className?: string;
}

function Mark({ row }: { row: TriadRowData }) {
  // The Rising is a point on the horizon, never a body, so it is never a render (ADR-49).
  if (row.key === "rising") return <AngleGlyph angle="ascendant" size={22} className="block flex-none" />;
  return <img src={PLANET_RENDERS[row.key]} alt="" width={22} height={22} />;
}

function Value({ row, compact, onAddBirthTime }: { row: TriadRowData; compact: boolean; onAddBirthTime?: () => void }) {
  if (row.at === null) {
    return (
      <dd className="v min-w-0 font-sans text-xs leading-[1.35] text-[var(--paper-dim)]">
        {onAddBirthTime ? (
          <button
            type="button"
            onClick={onAddBirthTime}
            className="rounded-sm text-left text-brass underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]"
          >
            {row.blind}
          </button>
        ) : row.blind}
      </dd>
    );
  }
  const house = compact ? null : row.house;
  // Each part wraps whole on a narrow screen, so "12th (solitude)" never splits from itself.
  return (
    <dd className="v min-w-0 font-numeric">
      <span className="inline-block max-w-full">{house ? `${row.at} ·` : row.at}</span>
      {house && (
        <>
          {" "}
          <span className="inline-block max-w-full">{house}</span>
        </>
      )}
    </dd>
  );
}

export function TriadRow({ rows, compact = false, onAddBirthTime, className }: TriadRowProps) {
  if (rows.length === 0) return null;
  return (
    <dl className={cn("rp-legend", className)}>
      {rows.map((row) => (
        <div key={row.key} className="lr">
          {/* The mark sits in the term: a definition list's groups hold only terms and definitions. */}
          <dt className="k flex w-[83px] items-center gap-[9px] font-label text-brass">
            <Mark row={row} />
            <span className="w-[52px]">{row.label}</span>
          </dt>
          <Value row={row} compact={compact} onAddBirthTime={onAddBirthTime} />
        </div>
      ))}
    </dl>
  );
}

export default TriadRow;
