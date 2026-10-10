import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/ds/organisms/Sheet";
import { TextButton } from "@/ds/atoms/TextButton";

export const HOUSE_SYSTEM_PARAGRAPHS = [
  "A house system is the rule for dividing the sky into the twelve life areas. Your planets, signs, degrees and aspects are the same in every system. Only the house numbers change.",
  "This report uses Whole Sign houses. It is the oldest system, and the old books this report is built on use it. Your rising sign is your 1st house. Each sign after it is the next house. It works everywhere in the world. It gives the same answer whether your birth time is exact or rounded to the nearest quarter hour.",
  "Most sites use Placidus. It divides the sky by time, not by sign. Its house lines move about one degree every four minutes. So a planet near a line can change house if your birth time is a little off. It also stops working near the poles. It is not wrong. It is a different rule. It will sometimes put a planet one house away from where you see it here.",
];

/** A slide-over, not a panel sitting open in the middle of the reading. */
export function HouseSystemSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <TextButton className="text-muted underline decoration-line underline-offset-4 hover:text-paper">
          <span className="font-label text-data-sm uppercase">Why do my houses differ from other sites?</span>
        </TextButton>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Whole sign houses</SheetTitle>
          <SheetDescription className="sr-only">
            How this report divides the sky into houses.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 text-ui text-paper-dim">
          {HOUSE_SYSTEM_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default HouseSystemSheet;
