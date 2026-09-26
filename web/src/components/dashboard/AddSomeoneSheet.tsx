/**
 * Add someone (ADR-122): "Who is it for?" with the credit named, and exactly
 * three choices. Each choice is a callback, because the birth form, the gift
 * flow and the picker live elsewhere and the sheets never import one another;
 * the page closes this sheet and opens the next thing.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Mail, Plus } from "lucide-react";
import { useGetCredits } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { creditsEnforced } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

export interface AddSomeoneSheetProps {
  open: boolean;
  onClose: () => void;
  /** Someone you know: the birth form, then Send once their report is written. */
  onSomeoneYouKnow: () => void;
  /** Gift a report: the gift flow. */
  onGift: () => void;
  /** Two people together: the picker. */
  onTwoPeople: () => void;
  /** Opened with no credits where credits are enforced, the sheet closes and calls this instead. */
  onGetCredits: () => void;
  /** `creditsEnforced()` when left out. */
  enforced?: boolean;
}

/** What a choice draws on; with no balance there is nothing to name. */
function creditLine(available: number | undefined): string | null {
  if (available === undefined || available < 1) return null;
  return available === 1 ? "your 1 credit" : `1 of your ${available} credits`;
}

type Tone = "indigo" | "gift" | "pair";

// The orbit's own marks: the dashed "+" of Add someone, the teal envelope of a
// waiting gift (credit-loop), the violet of a pair (§9).
const TONES: Record<Tone, { mark: string; edge: string }> = {
  indigo: { mark: "border-[#9FA8DA]/60 text-[#9FA8DA]", edge: "border-border hover:border-[#9FA8DA]/55" },
  gift: { mark: "border-[#3FA796]/70 text-[#3FA796]", edge: "border-[#3FA796]/45 hover:border-[#3FA796]/75" },
  pair: { mark: "border-[#9575CD]/60 text-[#9575CD]", edge: "border-border hover:border-[#9575CD]/55" },
};

function Choice({
  tone,
  icon,
  title,
  detail,
  onSelect,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-card/60 p-3.5 text-left",
        "transition duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-primary/[0.06] active:scale-[.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        TONES[tone].edge,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("grid h-10 w-10 place-items-center rounded-full border border-dashed", TONES[tone].mark)}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[17px] leading-[1.2]">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-[1.4] text-muted-foreground">{detail}</span>
      </span>
      <span className="font-numeric text-xs text-muted-foreground">1 credit</span>
    </button>
  );
}

function PairMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9.5" cy="12" r="5.5" />
      <circle cx="14.5" cy="12" r="5.5" />
    </svg>
  );
}

export function AddSomeoneSheet({
  open,
  onClose,
  onSomeoneYouKnow,
  onGift,
  onTwoPeople,
  onGetCredits,
  enforced,
}: AddSomeoneSheetProps) {
  const phone = useIsMobile();
  const credits = useGetCredits();
  const available = credits.data?.available;
  // A balance still loading is not zero: the choices show rather than a wrong hand-over.
  const atZero = (enforced ?? creditsEnforced()) && available === 0;

  const latest = useRef({ onClose, onGetCredits });
  useEffect(() => {
    latest.current = { onClose, onGetCredits };
  });
  useEffect(() => {
    if (!open || !atZero) return;
    // MB-6 provisional: at zero where credits are enforced (ADR-138), Add someone
    // is the credits sheet, whose Get credits is the test checkout until real
    // checkout exists; production's soft pass never reaches this.
    latest.current.onClose();
    latest.current.onGetCredits();
  }, [open, atZero]);

  const line = creditLine(available);
  const choose = (next: () => void) => () => {
    onClose();
    next();
  };

  return (
    <Sheet open={open && !atZero} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-5 overflow-y-auto",
          phone ? "max-h-[90dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription className="font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]">
            {line ? `Add someone · ${line}` : "Add someone"}
          </SheetDescription>
          <SheetTitle className="font-display text-2xl font-normal leading-[1.1] tracking-[-0.02em]">
            Who is it for?
          </SheetTitle>
        </SheetHeader>
        <div className="grid gap-2.5">
          <Choice
            tone="indigo"
            icon={<Plus className="h-4 w-4" />}
            title="Someone you know"
            detail="You enter their birth details. Send them the report when it's written."
            onSelect={choose(onSomeoneYouKnow)}
          />
          {/* ADR-139: a gift is a credit, and what its recipient writes reaches the giver only if they share it. */}
          <Choice
            tone="gift"
            icon={<Mail className="h-4 w-4" />}
            title="Gift a report"
            detail="We email them a credit with your note. What they write is theirs."
            onSelect={choose(onGift)}
          />
          <Choice
            tone="pair"
            icon={<PairMark />}
            title="Two people together"
            detail="A Compatibility report on how two people get along."
            onSelect={choose(onTwoPeople)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AddSomeoneSheet;
