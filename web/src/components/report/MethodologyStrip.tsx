import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MethodologyBox } from "@/components/MethodologyBox";
import { HOUSE_SYSTEM_PARAGRAPHS, HouseSystemSheet } from "@/components/report/HouseSystemSheet";
import type { Interpretation } from "@/types/chart";

/**
 * Chrome demotion: the method is a footnote strip and a slide-over, not a panel
 * open in the middle of the reading. It still prints in full.
 */
export function MethodologyStrip({ meta }: { meta: Interpretation["meta"] }) {
  return (
    <footer className="mt-12 border-t border-border/50 pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 no-print">
        <p className="font-numeric text-[11px] text-muted-foreground">
          {meta.houseSystem} · {meta.zodiac} · {meta.ephemeris} · {meta.sect} chart, sun alt{" "}
          {meta.sunAltitude.toFixed(1)}°
        </p>
        <Sheet>
          <SheetTrigger className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border">
            Method
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display text-xl">How this was computed</SheetTitle>
              <SheetDescription className="sr-only">
                House system, zodiac, ephemeris, orbs, sect and evidence.
              </SheetDescription>
            </SheetHeader>
            <MethodologyBox meta={meta} />
          </SheetContent>
        </Sheet>
        <HouseSystemSheet />
      </div>
      {/* The PDF has no slide-over, so the same words print inline. */}
      <div className="hidden print:block space-y-3">
        <MethodologyBox meta={meta} />
        <p className="font-label text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Whole sign houses
        </p>
        {HOUSE_SYSTEM_PARAGRAPHS.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
        ))}
      </div>
    </footer>
  );
}

export default MethodologyStrip;
