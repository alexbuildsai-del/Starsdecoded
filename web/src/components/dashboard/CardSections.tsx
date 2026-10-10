/**
 * The card's chart sections, each read from the stored chart and nothing else
 * (ADR-92): the ringed plate with the report's legend rows, the element rows,
 * and the twelve whole-sign houses. Since Review 01/10 the landing's sample
 * card is their one reader (reading 2); the dashboard's quick look shares the
 * person words, which live in `home-view.ts` so a node test pins them.
 */
import { Children, type ReactNode } from "react";
import { TriadPlate } from "@/components/report/TriadPlate";
import { TriadRow } from "@/components/TriadRow";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { Numbers } from "@/ds/atoms/Numbers";
import { Well } from "@/ds/molecules/Well";
import { WINDOW_UNKNOWN } from "@/lib/birth-time";
import { ELEMENT_HEX } from "@/lib/chapter-accent";
import { birthDateText, blindRisingText, doorText, firstName, writingText } from "@/lib/home-view";
import { renderFor } from "@/lib/planet-renders";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { busiestHouse, elementLead, houseCells, modalityLine, type ElementKey } from "@/lib/sky-card";
import { triadRowsOf } from "@/lib/triad-row";
import { PLANET_LABELS, type ChartData } from "@/types/chart";

export { birthDateText, blindRisingText, doorText, firstName, writingText };

const ELEMENTS: ElementKey[] = ["fire", "earth", "air", "water"];
const HOUSE_RENDER_PX = 15;

export const HOUSES_NEED_TIME = "Houses need a birth time.";
export const NO_PAIRS_YET = "None yet. Tap someone in your circle to read the two of you together.";

export type BirthTimeNote = "unknown" | "approximate" | null;

/**
 * Said only on a blind chart, where it explains the missing horizon. A part of
 * the day is too wide to fix a horizon but is not unknown, so it reads as the
 * report's corner reads it (`timeOfBirthLabel`).
 */
export function birthTimeNote(chart: ChartData | null): BirthTimeNote {
  if (!chart || chart.angles) return null;
  const span = chart.windowMinutes ?? WINDOW_UNKNOWN;
  return span > 0 && span < WINDOW_UNKNOWN ? "approximate" : "unknown";
}

export function birthLine(birthDate: string, note: BirthTimeNote): string {
  return note ? `${birthDateText(birthDate)} · birth time ${note}` : birthDateText(birthDate);
}

export function eyebrowText(self: boolean, writing: boolean): string {
  return `${self ? `Your ${PERSONAL_REPORT}` : PERSONAL_REPORT}${writing ? " · writing" : ""}`;
}

export function pendingText(name: string, self: boolean): string {
  return self ? "Loading your chart" : `Loading ${firstName(name)}'s chart`;
}

/** "No air", "No fire or air": an element nobody stands in is itself a fact about the chart. */
export function emptyElementsText(empty: readonly string[]): string | null {
  if (empty.length === 0) return null;
  const last = empty[empty.length - 1];
  return `No ${empty.length === 1 ? last : `${empty.slice(0, -1).join(", ")} or ${last}`}`;
}

function SectionBox({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Well className="gap-0 px-4 py-3.5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
        <h3 className="m-0"><Eyebrow className="text-paper-dim">{title}</Eyebrow></h3>
        {aside}
      </div>
      {children}
    </Well>
  );
}

export interface CardHeaderProps {
  name: string;
  birthDate: string;
  note: BirthTimeNote;
  self: boolean;
  writing: boolean;
}

export function CardHeader({ name, birthDate, note, self, writing }: CardHeaderProps) {
  return (
    <header className="min-w-0">
      <p className="mb-1.5">
        <Eyebrow kind="kicker" className="text-brass">{eyebrowText(self, writing)}</Eyebrow>
      </p>
      <h2 className="font-display text-sheet-title [overflow-wrap:anywhere]">{name}</h2>
      <p className="mt-1"><Numbers className="text-muted">{birthLine(birthDate, note)}</Numbers></p>
    </header>
  );
}

export function TriadSection({ chart, name, self }: { chart: ChartData; name: string; self: boolean }) {
  return (
    <div className="grid grid-cols-1 items-center justify-items-center gap-3 @xs:grid-cols-[104px_minmax(0,1fr)] @xs:justify-items-stretch">
      <TriadPlate chart={chart} name={name} className="block h-auto w-[104px]" />
      <TriadRow rows={triadRowsOf(chart, { blind: blindRisingText(name, self) })} />
    </div>
  );
}

export function ElementsSection({ chart }: { chart: ChartData }) {
  const lead = elementLead(chart.elements);
  const total = ELEMENTS.reduce((sum, key) => sum + chart.elements[key], 0);
  const empty = emptyElementsText(lead.empty);
  return (
    <SectionBox
      title="Elements"
      aside={<span className={`text-small ${lead.lead ? "text-paper" : "text-muted"}`}>{lead.line}</span>}
    >
      <div className="space-y-2.5">
        {ELEMENTS.map((key) => {
          const count = chart.elements[key];
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Eyebrow style={{ color: ELEMENT_HEX[key] }}>{key}</Eyebrow>
                <Numbers className="text-muted">{count} / {total}</Numbers>
              </div>
              <div aria-hidden className="h-1 overflow-hidden rounded-pill bg-line">
                <div
                  className="h-full rounded-pill animation-duration-700 ease-[var(--ease)] motion-safe:animate-in motion-safe:slide-in-from-left-full"
                  style={{ width: `${total ? (count / total) * 100 : 0}%`, background: ELEMENT_HEX[key] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1 font-mono text-data tabular-nums text-muted">
        {empty && <span className="text-paper">{empty}</span>}
        <span>{modalityLine(chart.modalities)}</span>
      </div>
    </SectionBox>
  );
}

export function HousesSection({ chart }: { chart: ChartData }) {
  const cells = houseCells(chart);
  // A blind chart has no horizon to count houses from, so it names none (ADR-34).
  if (cells.length === 0) {
    return (
      <SectionBox title="Planets by house">
        <p className="text-small text-muted">{HOUSES_NEED_TIME}</p>
      </SectionBox>
    );
  }
  const busiest = busiestHouse(cells);
  return (
    <SectionBox title="Planets by house" aside={<Eyebrow className="text-muted">Whole sign</Eyebrow>}>
      <ol className="grid grid-cols-3 gap-1 @xs:grid-cols-4">
        {cells.map((cell) => {
          const filled = cell.bodies.length > 0;
          const tone = filled ? "text-paper-dim" : "text-muted";
          const frame = busiest?.house === cell.house
            ? "border-paper/40 bg-paper/5"
            : filled ? "border-line" : "border-line-soft";
          return (
            <li key={cell.house} className={`flex min-h-12 min-w-0 flex-col items-center gap-0.5 rounded-control border px-1 pb-1.5 pt-1 text-center ${frame}`}>
              {/* Every house number the page prints carries its one word (ADR-98). */}
              <span className={`font-mono text-data tabular-nums ${tone}`}>{cell.house}</span>
              <span className={`text-caption ${tone}`}>{cell.word}</span>
              {filled && (
                <span className="mt-0.5 flex flex-wrap justify-center gap-px">
                  {cell.bodies.map((body) => {
                    const src = renderFor(body, HOUSE_RENDER_PX);
                    return src ? (
                      <img
                        key={body}
                        src={src}
                        alt={PLANET_LABELS[body] ?? body}
                        width={HOUSE_RENDER_PX}
                        height={HOUSE_RENDER_PX}
                        className="animation-duration-500 ease-[var(--ease)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
                      />
                    ) : null;
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {busiest && <p className="mt-2.5 text-caption text-paper-dim">{busiest.line}</p>}
    </SectionBox>
  );
}

/** Holds the chart's room while GET /reports/{id} answers, so the slots below do not jump when it lands. */
export function ChartPending({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="grid gap-3.5">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="grid h-[118px] w-[104px] place-items-center justify-self-center @xs:justify-self-start">
        <div className="h-[68px] w-[68px] rounded-pill border border-line" />
      </div>
      <SectionBox title="Elements"><div aria-hidden className="h-[141px]" /></SectionBox>
      <SectionBox title="Planets by house"><div aria-hidden className="h-[175px]" /></SectionBox>
    </div>
  );
}

export function OwnPairs({ children }: { children?: ReactNode }) {
  // toArray drops null, false and an empty map alike, so however the rows arrive, none reads as none.
  const listed = Children.toArray(children).length > 0;
  return (
    <section className="grid min-w-0 gap-2">
      <h3 className="m-0"><Eyebrow className="text-paper-dim">{`Your ${COMPATIBILITY_REPORT}s`}</Eyebrow></h3>
      {listed ? children : <p className="text-small text-muted">{NO_PAIRS_YET}</p>}
    </section>
  );
}
