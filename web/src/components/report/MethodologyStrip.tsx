import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/ds/organisms/Sheet";
import { TextButton } from "@/ds/atoms/TextButton";
import { MethodologyBox } from "@/components/MethodologyBox";
import { HOUSE_SYSTEM_PARAGRAPHS, HouseSystemSheet } from "@/components/report/HouseSystemSheet";
import type { ChartData, HorizonPass, Interpretation } from "@/types/chart";

/** The one line that says what the hour settled (ADR-37). Printed too. */
export function horizonLine(meta: Interpretation["meta"], chart?: ChartData | null, birthTime?: string): string {
  const status = meta.horizon ?? chart?.horizon?.status ?? "known";
  if (status === "unknown") {
    const moon = chart?.planets.moon;
    const band = moon?.band
      ? ` · Moon ${(moon.band.fromDegree % 30).toFixed(1)}° to ${(moon.band.toDegree % 30).toFixed(1)}° ${moon.sign}`
      : "";
    return `birth time not recorded · rising sign, houses, day or night and lots not drawn · positions at ${birthTime ?? "12:00"} local${band}`;
  }
  const sect = meta.sect && meta.sunAltitude !== undefined ? `${meta.sect} chart, sun alt ${meta.sunAltitude.toFixed(1)}°` : "";
  if (status === "approximate") return `birth time approximate, holds across the window · ${sect}`;
  return sect;
}

function passLine(pass: HorizonPass): string {
  const when = new Date(pass.at);
  const date = Number.isNaN(when.getTime()) ? pass.at : when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `birth time added ${date} · ${pass.sentencesRevised} sentences revised · ${pass.paragraphsAdded} added`;
}

/**
 * Chrome demotion: the method is a footnote strip and a slide-over, not a panel
 * open in the middle of the reading. It still prints in full. The strip reads
 * the horizon status, blind or approximate, and folds the ledger's line in
 * once the reader has seen the ledger.
 */
export function MethodologyStrip({ meta, chart, birthTime, pass }: {
  meta: Interpretation["meta"];
  chart?: ChartData | null;
  birthTime?: string;
  /** The last pass, shown as one line once the ledger has folded away. */
  pass?: HorizonPass | null;
}) {
  const line = horizonLine(meta, chart, birthTime);
  return (
    <footer className="mt-12 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 no-print">
        <p className="font-numeric text-data-sm text-muted">
          {meta.houseSystem} · {meta.zodiac} · {meta.ephemeris}{line ? ` · ${line}` : ""}
        </p>
        {pass && <p className="font-numeric text-data-sm text-brass">{passLine(pass)}</p>}
        <Sheet>
          <SheetTrigger asChild>
            <TextButton className="text-muted underline decoration-line underline-offset-4 hover:text-paper">
              <span className="font-label text-data-sm uppercase">Method</span>
            </TextButton>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle>How this was computed</SheetTitle>
              <SheetDescription className="sr-only">
                House system, zodiac, ephemeris, orbs, sect and evidence.
              </SheetDescription>
            </SheetHeader>
            <MethodologyBox meta={meta} horizonLine={line} />
          </SheetContent>
        </Sheet>
        <HouseSystemSheet />
      </div>
      {/* The PDF has no slide-over, so the same words print inline. */}
      <div className="hidden print:block space-y-3">
        <p className="font-numeric text-data-sm">{line}</p>
        {pass && <p className="font-numeric text-data-sm">{passLine(pass)}</p>}
        <MethodologyBox meta={meta} horizonLine={line} />
        <p className="font-label text-label uppercase text-muted">
          Whole sign houses
        </p>
        {HOUSE_SYSTEM_PARAGRAPHS.map((p, i) => (
          <p key={i} className="text-ui text-paper-dim">{p}</p>
        ))}
      </div>
    </footer>
  );
}

export default MethodologyStrip;
