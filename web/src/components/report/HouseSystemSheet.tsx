import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const HOUSE_SYSTEM_PARAGRAPHS = [
  "A house system is the rule for dividing the sky into the twelve life areas. Your planets, signs, degrees and aspects are the same in every system. Only the house numbers change.",
  "This report uses Whole Sign houses. It is the oldest system, and the old books this report is built on use it. Your rising sign is your 1st house. Each sign after it is the next house. It works everywhere in the world. It gives the same answer whether your birth time is exact or rounded to the nearest quarter hour.",
  "Most sites use Placidus. It divides the sky by time, not by sign. Its house lines move about one degree every four minutes. So a planet near a line can change house if your birth time is a little off. It also stops working near the poles. It is not wrong. It is a different rule. It will sometimes put a planet one house away from where you see it here.",
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
