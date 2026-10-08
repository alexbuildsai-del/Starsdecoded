/**
 * The week as one picture (Review 05/10 §3; reading 23): seven day heads, Monday to Sunday, today's column lit, and
 * one row for each transit in effect, a bar across the days it is on the reader. A flat end carries on past the week, a
 * rounded one stops inside it with a tick on that day. A tap on a row opens its line, facts and a way to read more:
 * Timeline's own page opens the reading in its sheet, the dashboard links to Timeline.
 */
import { useId, useMemo, useState } from "react";
import { Link } from "wouter";
import type { Week } from "@workspace/api-client-react";
import { ToneLegend } from "@/components/timeline/ToneLegend";
import type { ReadingTarget } from "@/components/timeline/ReadingSheet";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { TONE_WORDS, toneClass } from "@/lib/timeline-view";
import { cn } from "@/lib/utils";
import { weekModel, type WeekRow, type WeekRun } from "@/lib/week-view";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]";
const LINK = `rounded text-[13.5px] text-[#9FA8DA] transition-colors hover:text-[#E8EBF2] ${FOCUS}`;

function Bar({ run }: { run: WeekRun }) {
  return (
    <i
      className={cn(
        "relative block h-2 bg-[var(--sd-tone,#7E889A)] opacity-85",
        run.starts && "rounded-l-[4px]",
        run.ends && "rounded-r-[4px]",
      )}
      style={{ gridColumn: `${run.from + 1} / ${run.to + 2}` }}
    >
      {run.starts ? <b className="absolute -top-[3px] left-0 block h-[14px] w-0.5 bg-[#E8EBF2]" /> : null}
      {run.ends ? <b className="absolute -top-[3px] right-0 block h-[14px] w-0.5 bg-[#E8EBF2]" /> : null}
    </i>
  );
}

function Row({
  row,
  open,
  onToggle,
  onRead,
}: {
  row: WeekRow;
  open: boolean;
  onToggle: () => void;
  onRead?: (target: ReadingTarget) => void;
}) {
  const panel = useId();
  return (
    <li className={cn("border-t border-[#1A202C]", row.tone && toneClass(row.tone))}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        className={cn("grid w-full gap-[5px] py-[9px] text-left", FOCUS, "focus-visible:ring-inset")}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-2">
            <i aria-hidden className="mt-[7px] block h-[7px] w-[7px] flex-none rounded-full bg-[var(--sd-tone,#7E889A)]" />
            <span className="min-w-0 text-sm leading-[1.4] text-[#E8EBF2]">
              {row.tone ? <span className="sr-only">{TONE_WORDS[row.tone]}: </span> : null}
              {row.headline}
            </span>
          </span>
          <span className={cn("flex-none whitespace-nowrap pt-px text-xs leading-[1.6]", row.changes ? "font-medium text-[#E8EBF2]" : "text-[#AEB6C6]")}>
            {row.label}
          </span>
        </span>
        <span aria-hidden className="grid h-2 grid-cols-7">
          {row.runs.map((run) => (
            <Bar key={run.from} run={run} />
          ))}
        </span>
      </button>
      {open ? (
        <div id={panel} className="grid justify-items-start gap-1.5 pb-3">
          {row.line ? <p className="text-sm leading-normal text-[#AEB6C6]">{row.line}</p> : null}
          <p className="font-numeric text-xs leading-normal text-[#7E889A]">{row.facts}</p>
          {onRead ? (
            row.reads ? (
              <button
                type="button"
                onClick={() => onRead({ key: row.key, headline: row.headline, status: row.event.reading, event: row.event })}
                className={LINK}
              >
                Read more <span aria-hidden="true">→</span>
              </button>
            ) : null
          ) : (
            <Link href="/dashboard/timeline" className={LINK}>
              Read more in Timeline <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** What the bars and their ends mean, drawn the way the rows draw them. */
function MarksKey() {
  const item = "inline-flex items-center gap-1.5";
  return (
    <p aria-hidden className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs leading-snug text-[#9AA3B5]">
      <span className={item}>
        <i className="block h-2 w-[18px] rounded-[4px] bg-[#AEB6C6] opacity-85" />
        The days it is on your chart
      </span>
      <span className={item}>
        <i className="relative block h-2 w-[18px] bg-[#AEB6C6] opacity-85">
          <b className="absolute -top-[3px] right-0 block h-[14px] w-0.5 bg-[#E8EBF2]" />
        </i>
        It starts or ends that day
      </span>
      <span className={item}>
        <i className="block h-2 w-[18px] bg-[#AEB6C6] opacity-85" />
        A flat end carries on
      </span>
    </p>
  );
}

export interface WeekBarsProps {
  week: Week;
  /** The reader's zone, so the days a transit is on them are theirs. */
  zone: string;
  /** Timeline's page opens a reading in its sheet; with none, a row links to Timeline. */
  onRead?: (target: ReadingTarget) => void;
  className?: string;
}

export function WeekBars({ week, zone, onRead, className }: WeekBarsProps) {
  const { order } = useEntryFormat();
  const model = useMemo(() => weekModel(week, zone, order), [week, zone, order]);
  const [open, setOpen] = useState<string | null>(null);
  const { heads, rows, todayAt } = model;

  return (
    <div className={cn("grid min-w-0 content-start gap-3", className)}>
      {model.headline ? <h3 className="font-display text-xl font-normal leading-[1.25] text-[#E8EBF2]">{model.headline}</h3> : null}
      {rows.length ? (
        <>
          <div className="relative min-w-0">
            {todayAt >= 0 ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 rounded-lg bg-white/[.06]"
                style={{ left: `${(todayAt / heads.length) * 100}%`, width: `${100 / heads.length}%` }}
              />
            ) : null}
            <div className="relative grid grid-cols-7 pb-2 pt-1.5 text-center">
              {heads.map((head) => (
                <span key={head.date} className="grid min-w-0 gap-0.5">
                  <span className={cn("font-label text-[10.5px] leading-none tracking-[.08em]", head.today ? "text-[#E8EBF2]" : "text-[#7E889A]")}>
                    {head.label}
                  </span>
                  <span className={cn("font-numeric text-[11px] leading-none", head.today ? "text-[#E8EBF2]" : "text-[#AEB6C6]")}>{head.number}</span>
                </span>
              ))}
            </div>
            <ul role="list" className="relative m-0 grid list-none p-0">
              {rows.map((row) => (
                <Row
                  key={row.key}
                  row={row}
                  open={open === row.key}
                  onToggle={() => setOpen(open === row.key ? null : row.key)}
                  onRead={onRead}
                />
              ))}
            </ul>
          </div>
          <MarksKey />
          <ToneLegend />
        </>
      ) : null}
    </div>
  );
}

export default WeekBars;
