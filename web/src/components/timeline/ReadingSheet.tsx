/**
 * A reading in a sheet (ADR-210; reading 10): the reading of an event or a life cycle, written for the reader the
 * first time it is opened and kept. While it is written the sheet says "Writing" with its dots (ADR-130) and asks
 * again every few seconds; then the reading's own line, its paragraphs and the part of the reader's report it starts
 * from. It frames itself like the dashboard's sheets, from the bottom on a phone and from the right on a desktop.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTimelineLifeQueryKey,
  getGetTimelineNowQueryKey,
  useOpenTimelineReading,
  type ReadingStatus,
  type TimelineReading,
} from "@workspace/api-client-react";
import { StatusDots } from "@/components/StatusDots";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { buildsOnText, paragraphs } from "@/lib/now-ahead";
import { refusalLine } from "@/lib/refusals";
import { cn } from "@/lib/utils";

/** What a tap on a card hands the sheet. */
export interface ReadingTarget {
  key: string;
  headline: string;
  status: ReadingStatus;
}

// Each POST counts against the reading limit (20 a minute), so a reading being written is asked about every four
// seconds, and for no longer than its writer is given.
const POLL_MS = 4000;
const POLLS = 20;

export const READING_LINES = {
  writing: "Your reading is written the first time you open it, then kept.",
  failed: "We couldn't write this reading. Try again in a few minutes.",
  slow: "This reading is taking longer than usual. Try again in a minute.",
  missing: "We couldn't find this reading. Close this and open it again from Timeline.",
  error: "We couldn't open this reading. Check your connection and try again.",
} as const;

const EYEBROW = "font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]";
const LINK =
  "justify-self-start rounded text-[14.5px] font-medium text-[#9FA8DA] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Shown =
  | { kind: "opening" }
  | { kind: "writing" }
  | { kind: "ready"; reading: TimelineReading }
  | { kind: "failed"; line: string };

function errorLine(error: unknown): string {
  const refused = refusalLine(error);
  if (refused) return refused;
  return (error as { status?: unknown } | null)?.status === 404 ? READING_LINES.missing : READING_LINES.error;
}

export interface ReadingSheetProps {
  eventKey: string | null;
  open: boolean;
  onClose: () => void;
  /** The card's headline, the sheet's title from the moment it opens. */
  headline?: string;
  /** Where the card said its reading stood, so one already written opens without saying it is being written. */
  status?: ReadingStatus;
  /** The reader's own Personal report, which the reading links back to; no link without it. */
  reportId?: string | null;
}

export function ReadingSheet({ eventKey, open, onClose, headline, status, reportId }: ReadingSheetProps) {
  const phone = useIsMobile();
  const client = useQueryClient();
  const { mutateAsync } = useOpenTimelineReading();
  const [shown, setShown] = useState<Shown>({ kind: "opening" });
  const [attempt, setAttempt] = useState(0);
  // Read when the sheet opens, not followed: the cards refetch once a reading is written, and that must not reopen it.
  // Effects run in order, so this one has stored the latest status before the one below reads it.
  const hint = useRef(status);
  useEffect(() => {
    hint.current = status;
  });

  useEffect(() => {
    if (!open || !eventKey) return undefined;
    let live = true;
    let timer: number | undefined;
    let polls = 0;
    const known = hint.current === "ready";
    setShown(known ? { kind: "opening" } : { kind: "writing" });
    const ask = () => {
      mutateAsync({ key: eventKey }).then(
        (answer) => {
          if (!live) return;
          if (answer.status === "ready" && answer.reading) {
            setShown({ kind: "ready", reading: answer.reading });
            // A card's everyday line is its reading's own once written (reading 9), so the screens read again.
            if (!known) {
              void client.invalidateQueries({ queryKey: getGetTimelineNowQueryKey() });
              void client.invalidateQueries({ queryKey: getGetTimelineLifeQueryKey() });
            }
          } else if (answer.status === "writing") {
            setShown({ kind: "writing" });
            polls += 1;
            if (polls < POLLS) timer = window.setTimeout(ask, POLL_MS);
            else setShown({ kind: "failed", line: READING_LINES.slow });
          } else {
            setShown({ kind: "failed", line: answer.line ?? READING_LINES.failed });
          }
        },
        (error: unknown) => {
          if (live) setShown({ kind: "failed", line: errorLine(error) });
        },
      );
    };
    ask();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [open, eventKey, attempt, mutateAsync, client]);

  const builds = shown.kind === "ready" ? buildsOnText(shown.reading.buildsOn) : null;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-5 overflow-y-auto border-[#242C3B] bg-[#11161F]",
          phone ? "max-h-[88dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription className={EYEBROW}>Your reading</SheetDescription>
          <SheetTitle className="font-display text-2xl font-normal leading-[1.15] tracking-[-0.01em] text-[#E8EBF2]">
            {headline ?? "Your reading"}
          </SheetTitle>
        </SheetHeader>

        {shown.kind === "opening" ? (
          <p className="font-label text-sm text-[#AEB6C6]">
            <StatusDots label="Opening" />
          </p>
        ) : shown.kind === "writing" ? (
          <div className="grid gap-2">
            <p className="font-label text-sm text-[#E8EBF2]">
              <StatusDots label="Writing" />
            </p>
            <p className="text-[13.5px] leading-normal text-[#AEB6C6]">{READING_LINES.writing}</p>
          </div>
        ) : shown.kind === "failed" ? (
          <div className="grid justify-items-start gap-3">
            <p className="text-[14.5px] leading-normal text-[#AEB6C6]">{shown.line}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex min-h-10 items-center rounded-[10px] border border-[#242C3B] bg-[#171D29] px-4 font-label text-sm font-medium text-[#E8EBF2] transition-colors hover:border-[#5C6BC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="font-display text-[19px] leading-[1.5] text-[#E8EBF2]">{shown.reading.line}</p>
            {paragraphs(shown.reading.body).map((text, i) => (
              <p key={i} className="max-w-[60ch] whitespace-pre-line text-[15.5px] leading-[1.65] text-[#E8EBF2]">
                {text}
              </p>
            ))}
            {builds ? (
              <div className="grid gap-2 border-t border-[#242C3B] pt-4">
                <p className="text-[13.5px] leading-normal text-[#AEB6C6]">{builds.text}</p>
                {reportId ? (
                  <Link
                    href={`/report/${encodeURIComponent(reportId)}${builds.chapter ? `#chapter-${builds.chapter}` : ""}`}
                    className={LINK}
                  >
                    Read it in your report
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ReadingSheet;
