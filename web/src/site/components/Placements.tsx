/**
 * /sky's placements table (annex /sky): each body the wheel draws with its
 * position and its house and word, then Rising and the Midheaven. A chart with
 * no time has no House column and gives the Moon's range across the day
 * (ADR-34, ADR-98). Where the table is narrower than a phone's three columns
 * need, each position and house stacks into two lines, so it never scrolls
 * sideways.
 */
import { Fragment } from "react";
import { renderFor } from "@/lib/planet-renders";
import { houseParts, placementRows, type PlacementRow } from "@/site/lib/sky";
import type { ChartData } from "@/types/chart";

const HEAD = "px-4 py-3.5 text-left font-label text-[10.5px] font-medium uppercase leading-none tracking-[.16em] text-[color:var(--sd-muted)] @max-[460px]:px-3";
const CELL = "border-b border-[color:var(--line-soft)] px-4 py-[11px] align-middle group-last:border-b-0 @max-[460px]:px-3";

/** Inline side by side where the table has room, one under the other where it doesn't. */
function Parts({ parts }: { parts: readonly string[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="whitespace-nowrap @max-[460px]:block">{part}</span>
        </Fragment>
      ))}
    </>
  );
}

/** The body's own render, or for an angle the brass marker the wheel draws it with (ADR-49). */
function Marker({ row }: { row: PlacementRow }) {
  if (row.angle) {
    return (
      <span
        aria-hidden="true"
        className={`mb-[-1px] ml-[3px] mr-[11px] inline-block h-3 w-3 border-[1.4px] border-[color:var(--sd-brass)] shadow-[inset_0_0_0_3px_var(--bg),inset_0_0_0_6px_var(--sd-brass)] @max-[460px]:mr-[9px] ${row.key === "midheaven" ? "rounded-[2px]" : "rounded-full"}`}
      />
    );
  }
  const src = renderFor(row.key, 18);
  return src ? <img src={src} alt="" width={18} height={18} className="mr-2 inline-block h-[18px] w-[18px] align-[-4px] @max-[460px]:mr-1.5" /> : null;
}

export function Placements({ chart, caption }: { chart: ChartData; caption: string }) {
  const houses = chart.angles !== undefined;
  return (
    <div className="@container overflow-x-auto rounded-[14px] border border-[color:var(--line)] bg-[rgba(17,22,31,.45)]">
      <table className="w-full border-collapse text-[14.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[color:var(--line)]">
            <th scope="col" className={HEAD}>
              Planet
            </th>
            <th scope="col" className={HEAD}>
              Position
            </th>
            {houses ? (
              <th scope="col" className={HEAD}>
                House
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {placementRows(chart).map((row) => (
            <tr key={row.key} className="group">
              <th scope="row" className={`${CELL} whitespace-nowrap text-left font-normal text-[color:var(--paper)]`}>
                <Marker row={row} />
                {row.label}
              </th>
              <td className={`${CELL} font-numeric text-[13px] text-[color:var(--paper-dim)]`}>
                <Parts parts={row.position} />
              </td>
              {houses ? (
                <td className={`${CELL} text-[color:var(--paper-dim)]`}>{row.house ? <Parts parts={houseParts(row.house)} /> : null}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Placements;
