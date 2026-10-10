/**
 * A reading in a sheet (ADR-210; reading 10): the reading of an event or a life cycle. Before Timeline is set up it is
 * written the first time it is opened, and kept; once set up, the setup writes it (ADR-362), and a reading still in
 * its queue is waited for, not written. While it is written the sheet says "Writing" with its dots (ADR-130) and asks
 * again every few seconds; then the reading's own line, its paragraphs and the part of the reader's report it starts
 * from. It frames itself like the dashboard's sheets, from the bottom on a phone and from the right on a desktop.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTimelineLifeQueryKey,
  getGetTimelineNowQueryKey,
  useOpenTimelineReading,
  type ReadingStatus,
  type TimelineEvent,
  type TimelineReading,
} from "@workspace/api-client-react";
import { FactCard } from "@/components/FactCard";
import { PassStrip } from "@/components/timeline/PassStrip";
import { Button } from "@/ds/atoms/Button";
import { RetrogradeBadge } from "@/ds/atoms/RetrogradeBadge";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/ds/organisms/Sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { buildsOnText, paragraphs } from "@/lib/now-ahead";
import { CHANGES_HEADING, boldParts, passBlocks, sheetFacts, whyHeading } from "@/lib/passes-view";
import { refusalLine } from "@/lib/refusals";
import { useShownZone } from "@/lib/reader-zone";
import { shadowFact } from "@/lib/shadow-fact";

/** What a tap on a card hands the sheet. */
export interface ReadingTarget {
  key: string;
  headline: string;
  status: ReadingStatus;
  /** A sky event's card hands over its event, so Read more can show its facts and passes; a cycle has none. */
  event?: TimelineEvent;
}

// Each POST counts against the reading limit (20 a minute), so a reading being written is asked about every four
// seconds, and for no longer than its writer is given.
const POLL_MS = 4000;
const POLLS = 20;
// A set-up reader's reading waits its turn in the setup's queue behind every reading before it, so the sheet asks for
// ten minutes; an open the setup's job holds is not counted against the limit (ADR-362).
const SET_UP_POLLS = 150;

export const READING_LINES = {
  writing: "Your reading is written the first time you open it, then kept.",
  /** Once Timeline is set up, every reading is already in the queue, so the first open no longer writes it. */
  writingSetUp: "We're still writing this reading. It shows here when it's ready.",
  failed: "We couldn't write this reading. Try again in a few minutes.",
  slow: "This reading is taking longer than usual. Try again in a minute.",
  missing: "We couldn't find this reading. Close this and open it again from Timeline.",
  error: "We couldn't open this reading. Check your connection and try again.",
} as const;

const EYEBROW = "font-label text-label uppercase text-indigo-lt";

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
  /** Timeline is set up, so the setup writes every reading and the sheet waits for it (ADR-362). */
  setUp?: boolean;
  /** The sky event the reading is of, for the facts under it; none for a cycle's reading. */
  event?: TimelineEvent | null;
}

/** A block under the strip: the R, its heading, and its words with the bold marks drawn. */
function PassBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5">
      <RetrogradeBadge className="mt-px" />
      <div className="grid gap-1.5">
        <h3 className="font-label text-label uppercase text-rose">{title}</h3>
        <p className="max-w-[60ch] text-ui leading-[1.6] text-paper-dim">
          {boldParts(text).map((part, i) =>
            part.bold ? (
              <strong key={i} className="font-medium text-paper">
                {part.text}
              </strong>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}

/** What Read more adds under a sky event's reading: its passes and the two blocks when it has more than one, its facts, and Mercury's shadow card. */
function SkyFacts({ event, zone }: { event: TimelineEvent; zone: string }) {
  const { order } = useEntryFormat();
  const now = useMemo(() => new Date(), []);
  const blocks = passBlocks(event, zone, { order, now });
  const facts = sheetFacts(event, zone, order);
  const shadow = useMemo(() => shadowFact(event, { zone, order, now }), [event, zone, order, now]);
  return (
    <div className="grid gap-4 border-t border-line pt-4">
      {blocks ? (
        <>
          <PassStrip event={event} now={now} zone={zone} />
          <PassBlock title={whyHeading(event.passes.length)} text={blocks.why} />
          <PassBlock title={CHANGES_HEADING} text={blocks.changes} />
        </>
      ) : null}
      <div className="grid gap-1.5">
        <p className={EYEBROW}>The facts</p>
        {facts.map((line, i) => (
          <p key={i} className="font-mono text-data tabular-nums text-paper-dim">
            {line}
          </p>
        ))}
      </div>
      {shadow ? <FactCard title={shadow.title} body={shadow.body} /> : null}
    </div>
  );
}

export function ReadingSheet({ eventKey, open, onClose, headline, status, reportId, setUp = false, event }: ReadingSheetProps) {
  const phone = useIsMobile();
  const client = useQueryClient();
  const { mutateAsync } = useOpenTimelineReading();
  const [shown, setShown] = useState<Shown>({ kind: "opening" });
  const [attempt, setAttempt] = useState(0);
  // Read when the sheet opens, not followed: the cards refetch once a reading is written, and that must not reopen it.
  // Effects run in order, so this one has stored the latest status and wait before the one below reads them.
  const hint = useRef(status);
  const allowed = useRef(POLLS);
  useEffect(() => {
    hint.current = status;
    allowed.current = setUp ? SET_UP_POLLS : POLLS;
  });

  useEffect(() => {
    if (!open || !eventKey) return undefined;
    let live = true;
    let timer: number | undefined;
    let asked = 0;
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
            asked += 1;
            if (asked < allowed.current) timer = window.setTimeout(ask, POLL_MS);
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
  // The facts are this reading's own event; a stale one left from the last card is never shown beside another's reading.
  const own = event && event.key === eventKey ? event : null;
  const zone = useShownZone(open && own !== null);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={`flex flex-col gap-5 overflow-y-auto ${phone ? "max-h-[88dvh] pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md"}`}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetDescription>
            <span className={EYEBROW}>Your reading</span>
          </SheetDescription>
          <SheetTitle>{headline ?? "Your reading"}</SheetTitle>
        </SheetHeader>

        {shown.kind === "opening" ? (
          <p className="font-label text-ui text-paper-dim">
            <StatusDots label="Opening" />
          </p>
        ) : shown.kind === "writing" ? (
          <div className="grid gap-2">
            <p className="font-label text-ui text-paper">
              <StatusDots label="Writing" />
            </p>
            <p className="text-small text-paper-dim">{setUp ? READING_LINES.writingSetUp : READING_LINES.writing}</p>
          </div>
        ) : shown.kind === "failed" ? (
          <div className="grid justify-items-start gap-3">
            <p className="text-ui text-paper-dim">{shown.line}</p>
            <Button variant="secondary" size="compact" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="font-display text-lede text-paper">{shown.reading.line}</p>
            {paragraphs(shown.reading.body).map((text, i) => (
              <p key={i} className="max-w-[60ch] whitespace-pre-line text-prose text-paper">
                {text}
              </p>
            ))}
            {builds ? (
              <div className="grid gap-2 border-t border-line pt-4">
                <p className="text-small text-paper-dim">{builds.text}</p>
                {reportId ? (
                  <TextButton asChild className="justify-self-start">
                    <Link href={`/report/${encodeURIComponent(reportId)}${builds.chapter ? `#chapter-${builds.chapter}` : ""}`}>
                      Read it in your report
                    </Link>
                  </TextButton>
                ) : null}
              </div>
            ) : null}
            {own && zone ? <SkyFacts event={own} zone={zone} /> : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ReadingSheet;
