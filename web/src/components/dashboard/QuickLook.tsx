/**
 * The quick look a tap on the circle opens (ADR-182, review-01-10 scope 3):
 * the name and birth date, Sun, Moon and Rising with degrees, then for a pair
 * with the reader "With you" and its block, or for the reader chapter 08's
 * superpower and growing edge, then the buttons and a close control. Nothing
 * from the old card comes with it: no elements, houses or Generate (reading 2).
 * A report that could not be written opens nothing, so under the triad its
 * coded line (ADR-84) stands in place of the rest. Its content is
 * `GET /home`'s, so nothing loads on open (reading 4); whether "Share with" is
 * offered, and why a report failed, are `GET /reports`', the copy the page
 * already holds for its picker.
 *
 * It is content only: the page frames it as the panel beside the circle on
 * desktop and as the bottom sheet on a phone, so one quick look serves both.
 * Key it by the person, so each one rises afresh. `rp-root` scopes the report's
 * tokens for the legend rows, which read as the report's own.
 */
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import { getListReportsQueryKey, useListReports, type HomePair, type HomePerson } from "@workspace/api-client-react";
import { SendDialog } from "@/components/SendDialog";
import { StatusDots } from "@/components/StatusDots";
import { legendParts } from "@/components/dashboard/CardSections";
import { BlockFrame, BlockHeading, BlockLine, PairBlock } from "@/components/dashboard/PairBlock";
import { StoryPreview } from "@/components/report/ShareCard";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  OWN_LINES, birthDateText, blindRisingText, failureLine, firstName, isFailed, quickLookDoors, shareTargetFor, triadLines, withYouText,
  type Door, type ShareTarget, type TriadLine,
} from "@/lib/home-view";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { SHARE_LABELS, pairStoryText, shareWith } from "@/lib/share-card";

export interface QuickLookProps {
  person: HomePerson;
  /** The reader's pair with this person (`pairWithYou`); absent on the reader's own quick look and for anyone they have none with. */
  pair?: HomePair;
  /** The reader's own quick look, opened from the centre. */
  self: boolean;
  onClose: () => void;
}

const EYEBROW = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[.18em]";
// A status stands where its door will be, in the door's own place and size (ADR-130).
const STATUS = "items-center rounded-md border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.14)] font-label font-medium text-[var(--indigo-lt)]";

function TriadRows({ lines, name, self }: { lines: TriadLine[]; name: string; self: boolean }) {
  return (
    <dl className="rp-legend">
      {lines.map((line) => (
        <div key={line.key} className="lr">
          {line.key === "rising"
            ? <span aria-hidden className="rp-ascdot" />
            : <img src={PLANET_RENDERS[line.key]} alt="" width={22} height={22} />}
          <dt className="k">{line.label}</dt>
          {line.text === null ? (
            <dd className="v min-w-0 font-sans text-xs leading-[1.35] text-[var(--paper-dim)]">{blindRisingText(name, self)}</dd>
          ) : (
            <dd className="v min-w-0">
              {legendParts(line.text).map((part, i) => (
                <Fragment key={i}>
                  {i > 0 && " "}
                  <span className="inline-block max-w-full">{part}</span>
                </Fragment>
              ))}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

function DoorView({ door, primary = false }: { door: Door; primary?: boolean }) {
  if (door.kind === "writing") {
    return primary ? (
      <div className={`flex min-h-10 w-full justify-center px-4 text-[13.5px] ${STATUS}`}>
        <StatusDots label={door.label} />
      </div>
    ) : (
      <span className={`inline-flex min-h-8 px-3 text-xs ${STATUS}`}>
        <StatusDots label={door.label} />
      </span>
    );
  }
  return primary ? (
    <Button asChild size="lg" className="w-full whitespace-normal px-4 text-center font-label text-[13.5px]">
      <Link href={door.href}>{door.label}</Link>
    </Button>
  ) : (
    <Button asChild variant="outline" size="sm" className="font-label text-xs">
      <Link href={door.href}>{door.label}</Link>
    </Button>
  );
}

export function QuickLook({ person, pair, self, onClose }: QuickLookProps) {
  const headingId = useId();
  const storyId = useId();
  const reduced = useReducedMotion();
  const storyRef = useRef<HTMLDivElement>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [sending, setSending] = useState<ShareTarget | null>(null);

  // The page polls this list for its picker; a quick look reads that copy rather than asking again as it opens.
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey(), refetchOnMount: false } });
  const listed = Array.isArray(reports.data) ? reports.data : [];
  const summaryOf = (reportId: string | undefined) => (reportId ? listed.find((r) => r.id === reportId) : undefined);
  const sendOf = (reportId: string | undefined) => summaryOf(reportId)?.send ?? null;

  const failed = isFailed(person.status);
  const look = { person, pair: self ? undefined : pair, self };
  const doors = quickLookDoors(look);
  const triad = triadLines(person.triad);
  const share = shareTargetFor(look, { person: sendOf(person.reportId), pair: sendOf(look.pair?.reportId) });
  const story = look.pair ? pairStoryText(look.pair) : null;
  const name = firstName(person.name);

  // On a phone the sheet may hold the story below its fold, so the story is brought into view as it opens.
  useEffect(() => {
    if (storyOpen) storyRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [storyOpen, reduced]);

  return (
    <article
      aria-labelledby={headingId}
      className="rp-root grid w-full min-w-0 gap-3.5 bg-transparent animation-duration-500 ease-[var(--ease)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-[10px]"
      data-quick-look
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-display text-[26px] leading-[1.1] tracking-[-0.01em] [overflow-wrap:anywhere]">{person.name}</h3>
          <p className="mt-1 font-numeric text-xs leading-[1.3] text-[var(--paper-dim)]">{birthDateText(person.birthDate)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] border border-[var(--line)] text-[var(--paper-dim)] transition-colors hover:text-[var(--paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </header>

      {triad.length > 0 && <TriadRows lines={triad} name={person.name} self={self} />}

      {failed ? (
        <p className="text-sm leading-[1.5] text-[var(--paper-dim)]">{failureLine(summaryOf(person.reportId))}</p>
      ) : (
        <>
          {self && person.lines && (
            <BlockFrame>
              <BlockHeading tone="comes">{OWN_LINES.superpower}</BlockHeading>
              <BlockLine>{person.lines.superpower}</BlockLine>
              <BlockHeading tone="challenge">{OWN_LINES.growingEdge}</BlockHeading>
              <BlockLine>{person.lines.growingEdge}</BlockLine>
            </BlockFrame>
          )}

          {look.pair && (
            <div className="grid gap-2">
              <p className={`${EYEBROW} text-[var(--violet)]`}>{withYouText(look.pair)}</p>
              <PairBlock pair={look.pair} />
            </div>
          )}

          <DoorView door={doors.primary} primary />

          {(doors.report || share || story) && (
            <div className="flex flex-wrap gap-2">
              {doors.report && <DoorView door={doors.report} />}
              {share && (
                <Button variant="outline" size="sm" onClick={() => setSending(share)} className="font-label text-xs">
                  {shareWith(name)}
                </Button>
              )}
              {story && (
                <Button
                  variant="outline"
                  size="sm"
                  aria-expanded={storyOpen}
                  aria-controls={storyId}
                  onClick={() => setStoryOpen((open) => !open)}
                  className="font-label text-xs"
                >
                  {SHARE_LABELS.share}
                </Button>
              )}
            </div>
          )}

          {story && (
            <div id={storyId} ref={storyRef} hidden={!storyOpen} className="scroll-mb-4">
              {storyOpen && <StoryPreview text={story} />}
            </div>
          )}
        </>
      )}

      <SendDialog open={sending !== null} onClose={() => setSending(null)} target={sending} />
    </article>
  );
}

export default QuickLook;
