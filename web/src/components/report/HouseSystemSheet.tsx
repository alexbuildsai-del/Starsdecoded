import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const HOUSE_SYSTEM_PARAGRAPHS = [
  "A house system is the rule for dividing the sky into the twelve life areas. Your planets, signs, degrees and aspects are the same in every system. Only the house numbers change.",
  "This report uses Whole Sign houses, the oldest system and the one used by the classical sources it is built on. Your rising sign is your 1st house, and each following sign is the next house. It works at every latitude and gives the same answer whether your recorded birth time is exact or rounded to the nearest quarter hour.",
  "Most consumer sites use Placidus, which divides the sky by time rather than by sign. Its house boundaries move roughly one degree every four minutes of clock time, so a planet near a boundary can change house with a small error in birth time, and the system breaks down at high latitudes. It is not wrong. It is a different rule, and it will sometimes put a planet one house away from where you see it here.",
];

/** A slide-over, not a panel sitting open in the middle of the reading. */
export function HouseSystemSheet() {
  return (
    <Sheet>
      <SheetTrigger className="font-label text-[10px] tracking-[0.16em] uppercase text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border">
        Why do my houses differ from other sites?
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Whole sign houses</SheetTitle>
          <SheetDescription className="sr-only">
            How this report divides the sky into houses.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/80">
          {HOUSE_SYSTEM_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default HouseSystemSheet;
