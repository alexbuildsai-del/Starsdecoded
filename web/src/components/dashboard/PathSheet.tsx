/**
 * The path after buying (credit-loop, ADR-125): once per bundle of 3 or more,
 * one skippable sheet that lays the whole balance out as steps and ticks what
 * the reader already has. Only the first open step can start; the others say
 * what they wait for. It frames itself like the other dashboard sheets.
 */
import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useGetCredits } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { useIsMobile } from "@/hooks/use-mobile";
import { markPathSeen, pathDue, pathView, readPathSeen, type PathHave, type PathStep } from "@/lib/credits-view";
import { cn } from "@/lib/utils";

const EYEBROW = "font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]";
const BUTTON = "inline-flex h-[30px] shrink-0 items-center justify-center whitespace-nowrap rounded-md px-[11px] font-label text-xs font-medium";

export interface PathOffer {
  id: string;
  count: number;
}

/**
 * The bundle whose path is showing. It is remembered as seen the moment it is
 * offered, so the path shows once however it is closed, and it is held here
 * until dismissed, so that memory cannot close the sheet early.
 */
export function usePathOffer(): { offer: PathOffer | null; dismiss: () => void } {
  const credits = useGetCredits().data;
  const [offer, setOffer] = useState<PathOffer | null>(null);
  const id = credits?.lastBundle?.id;
  const count = credits?.lastBundle?.count;
  const available = credits?.available ?? 0;

  useEffect(() => {
    if (id === undefined || count === undefined) return;
    if (!pathDue({ id, count }, available, readPathSeen())) return;
    markPathSeen(id);
    setOffer({ id, count });
  }, [id, count, available]);

  const dismiss = useCallback(() => setOffer(null), []);
  return { offer, dismiss };
}

export interface PathSheetProps {
  /** From `usePathOffer`; the sheet is open while there is one. */
  offer: PathOffer | null;
  /** What the reader already has: `pathHave` over the lists the dashboard loads. */
  have: PathHave;
  /** The skip link, Escape and each step's button all close the path: pass `usePathOffer`'s dismiss. */
  onClose: () => void;
  /** The birth form for the reader's own chart. */
  onOwnChart: () => void;
  /** Add someone's three choices. */
  onAddSomeone: () => void;
}

function Step({ step, onStart }: { step: PathStep; onStart: () => void }) {
  const lower = step.title.charAt(0).toLowerCase() + step.title.slice(1);
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-[rgba(20,24,31,.6)] px-3.5 py-3">
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full border font-numeric text-xs",
          step.done ? "border-[#7FB08B] bg-[#7FB08B] text-background" : "border-[#9FA8DA]/50 text-[#9FA8DA]",
        )}
      >
        {step.done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : step.number}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-base leading-[1.2]",
            step.done ? "text-muted-foreground line-through decoration-muted-foreground/60" : "text-foreground",
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{step.line}</p>
      </div>
      {step.done ? (
        <span className="text-[13px] text-muted-foreground">Done</span>
      ) : step.after === null ? (
        <button
          type="button"
          onClick={onStart}
          aria-label={step.kind === "own" ? "Start your own chart" : `Choose ${lower}`}
          className={cn(
            BUTTON,
            "bg-primary text-white transition duration-200 hover:brightness-110 active:scale-[.97]",
            "motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {step.kind === "own" ? "Start" : "Choose"}
        </button>
      ) : (
        <span className={cn(BUTTON, "border border-border text-muted-foreground")}>After step {step.after}</span>
      )}
    </li>
  );
}

export function PathSheet({ offer, have, onClose, onOwnChart, onAddSomeone }: PathSheetProps) {
  const phone = useIsMobile();
  const balance = Math.max(0, useGetCredits().data?.available ?? 0);
  // The words stay put while the sheet slides away after its offer is dismissed.
  const [shown, setShown] = useState(offer);
  if (offer && offer.id !== shown?.id) setShown(offer);
  const view = pathView((offer ?? shown)?.count ?? 0, balance, have);

  const then = (next: () => void) => () => {
    onClose();
    next();
  };

  return (
    <Sheet open={offer !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-4 overflow-y-auto",
          phone ? "max-h-[90dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription className={EYEBROW}>{view.eyebrow}</SheetDescription>
          <SheetTitle className="font-display text-2xl font-normal leading-[1.1] tracking-[-0.02em]">{view.title}</SheetTitle>
        </SheetHeader>

        <CreditDots count={balance} />
        {view.line && <p className="text-[13px] leading-relaxed text-muted-foreground">{view.line}</p>}

        <ul className="grid gap-2.5">
          {view.steps.map((step) => (
            <Step key={step.kind} step={step} onStart={then(step.kind === "own" ? onOwnChart : onAddSomeone)} />
          ))}
        </ul>

        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {view.spare && `${view.spare} `}Or{" "}
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip for now"
            className="rounded text-[#9FA8DA] underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            skip
          </button>
          ; nothing expires. Any credit can go to any report.
        </p>
      </SheetContent>
    </Sheet>
  );
}

export default PathSheet;
