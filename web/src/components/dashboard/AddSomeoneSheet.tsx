/**
 * Add someone (ADR-122): "Who is it for?" with the credit named, and three
 * choices at most, Two people together only once the reader can read two
 * finished Personal reports (ADR-332). Each choice is a callback, because the
 * birth form, the gift flow and the picker live elsewhere and the sheets never
 * import one another; the page closes this sheet and opens the next thing.
 * With no credit it asks for one first, and its checkout comes back here
 * (reading 2).
 */
import type { ReactNode } from "react";
import { Mail, Plus } from "lucide-react";
import { useGetCredits } from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { TextButton } from "@/ds/atoms/TextButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ds/organisms/Sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface AddSomeoneSheetProps {
  open: boolean;
  onClose: () => void;
  /** Someone you know: the birth form, then Share once their report is written. */
  onSomeoneYouKnow: () => void;
  /** Gift a report: the gift flow. */
  onGift: () => void;
  /** Two people together: the picker. Left out while the page's `canPair` says no, and the choice with it. */
  onTwoPeople?: () => void;
  /** Get credits, when the sheet is open with none: a checkout that comes back to this sheet. */
  onGetCredits: () => void;
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
  indigo: { mark: "border-indigo-lt/60 text-indigo-lt", edge: "border-line hover:border-indigo-lt/55" },
  gift: { mark: "border-teal/70 text-teal", edge: "border-teal/45 hover:border-teal/75" },
  pair: { mark: "border-violet/60 text-violet", edge: "border-line hover:border-violet/55" },
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
    <TextButton
      onClick={onSelect}
      className={cn(
        "grid min-h-0 w-full after:hidden grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-card border bg-surface p-3.5 text-left font-normal",
        "transition duration-[var(--dur-fast)] ease-[var(--ease)] hover:bg-indigo-tint active:scale-[.99] motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus",
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
        <span className="block font-display text-card-title-sm text-paper">{title}</span>
        <span className="mt-0.5 block text-caption text-muted">{detail}</span>
      </span>
      <span className="font-numeric text-caption text-muted">1 credit</span>
    </TextButton>
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

export function AddSomeoneSheet({ open, onClose, onSomeoneYouKnow, onGift, onTwoPeople, onGetCredits }: AddSomeoneSheetProps) {
  const phone = useIsMobile();
  const credits = useGetCredits();
  const available = credits.data?.available;
  // A balance still loading is not zero. At zero (ADR-275) the sheet asks for a credit rather than leaving by itself,
  // since a checkout still being confirmed may have just brought the reader back here.
  const atZero = available !== undefined && available <= 0;

  const line = creditLine(available);
  const choose = (next: () => void) => () => {
    onClose();
    next();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn("flex flex-col gap-5 overflow-y-auto", phone && "max-h-[92dvh]")}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription className="font-label text-kicker uppercase text-indigo-lt">
            {line ? `Add someone · ${line}` : "Add someone"}
          </SheetDescription>
          <SheetTitle>{atZero ? "No credits left" : "Who is it for?"}</SheetTitle>
        </SheetHeader>
        {atZero ? (
          <>
            <p className="text-ui text-paper-dim">Adding someone uses one credit.</p>
            <Button full onClick={choose(onGetCredits)}>
              Get credits
            </Button>
          </>
        ) : (
          <div className="grid gap-2.5">
            <Choice
              tone="indigo"
              icon={<Plus className="h-4 w-4" />}
              title="Someone you know"
              detail="You enter their birth details. Share the report with them when it's written."
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
            {onTwoPeople && (
              <Choice
                tone="pair"
                icon={<PairMark />}
                title="Two people together"
                detail="A Compatibility report on how two people get along."
                onSelect={choose(onTwoPeople)}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AddSomeoneSheet;
