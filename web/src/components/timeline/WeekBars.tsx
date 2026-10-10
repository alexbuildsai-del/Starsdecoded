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
import { TextButton } from "@/ds/atoms/TextButton";
import { ToneDot } from "@/ds/atoms/ToneDot";
import type { ReadingTarget } from "@/components/timeline/ReadingSheet";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { DOT_TONE, TONE_FILL, TONE_WORDS } from "@/lib/timeline-view";
import { cn } from "@/lib/utils";
import { weekModel, type WeekRow, type WeekRun } from "@/lib/week-view";

function Bar({ run, fill }: { run: WeekRun; fill: string }) {
  return (
    <i
      className={cn("relative block h-2 opacity-85", fill, run.starts && "rounded-l-inner", run.ends && "rounded-r-inner")}
      style={{ gridColumn: `${run.from + 1} / ${run.to + 2}` }}
    >
      {run.starts ? <b className="absolute -top-[3px] left-0 block h-[14px] w-0.5 bg-paper" /> : null}
      {run.ends ? <b className="absolute -top-[3px] right-0 block h-[14px] w-0.5 bg-paper" /> : null}
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
    <li className="border-t border-line-soft">
      <TextButton
        aria-expanded={open}
        aria-controls={panel}
        onClick={onToggle}
        className="grid min-h-0 w-full items-stretch gap-[5px] px-0 py-[9px] text-left font-normal text-paper"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-2">
            <ToneDot tone={row.tone ? DOT_TONE[row.tone] : "mixed"} className={`mt-[7px] ${row.tone ? "" : "bg-muted"}`} />
            <span className="min-w-0 text-ui text-paper">
              {row.tone ? <span className="sr-only">{TONE_WORDS[row.tone]}: </span> : null}
              {row.headline}
            </span>
          </span>
          <span className={`flex-none whitespace-nowrap pt-px text-xs leading-[1.6] ${row.changes ? "font-medium text-paper" : "text-paper-dim"}`}>
            {row.label}
          </span>
        </span>
        <span aria-hidden className="grid h-2 grid-cols-7">
          {row.runs.map((run) => (
            <Bar key={run.from} run={run} fill={row.tone ? TONE_FILL[row.tone] : "bg-muted"} />
          ))}
        </span>
      </TextButton>
      {open ? (
        <div id={panel} className="grid justify-items-start gap-1.5 pb-3">
          {row.line ? <p className="text-ui text-paper-dim">{row.line}</p> : null}
          <p className="font-mono text-data tabular-nums text-muted">{row.facts}</p>
          {onRead ? (
            row.reads ? (
              <TextButton onClick={() => onRead({ key: row.key, headline: row.headline, status: row.event.reading, event: row.event })}>
                Read more <span aria-hidden="true">→</span>
              </TextButton>
            ) : null
          ) : (
            <TextButton asChild>
              <Link href="/dashboard/timeline">
                Read more in Timeline <span aria-hidden="true">→</span>
              </Link>
            </TextButton>
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
    <p aria-hidden className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs leading-snug text-paper-dim">
      <span className={item}>
        <i className="block h-2 w-[18px] rounded-inner bg-paper-dim opacity-85" />
        The days it is on your chart
      </span>
      <span className={item}>
        <i className="relative block h-2 w-[18px] bg-paper-dim opacity-85">
          <b className="absolute -top-[3px] right-0 block h-[14px] w-0.5 bg-paper" />
        </i>
        It starts or ends that day
      </span>
      <span className={item}>
        <i className="block h-2 w-[18px] bg-paper-dim opacity-85" />
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
      {model.headline ? <h3 className="font-display text-card-title font-normal text-paper">{model.headline}</h3> : null}
      {rows.length ? (
        <>
          <div className="relative min-w-0">
            {todayAt >= 0 ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 rounded-control bg-paper/[.06]"
                style={{ left: `${(todayAt / heads.length) * 100}%`, width: `${100 / heads.length}%` }}
              />
            ) : null}
            <div className="relative grid grid-cols-7 pb-2 pt-1.5 text-center">
              {heads.map((head) => (
                <span key={head.date} className="grid min-w-0 gap-0.5">
                  <span className={`font-label text-data-sm leading-none ${head.today ? "text-paper" : "text-muted"}`}>{head.label}</span>
                  <span className={`font-mono text-data-sm tabular-nums leading-none ${head.today ? "text-paper" : "text-paper-dim"}`}>{head.number}</span>
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
