/**
 * The quick look a tap on the circle opens (ADR-182, review-01-10 scope 3):
 * the name and birth date, Sun, Moon and Rising with degrees, then for a pair
 * with the reader "With you" and its block, or for the reader chapter 08's
 * superpower and growing edge, then the buttons and a close control. Nothing
 * from the old card comes with it: no elements, houses or Generate (reading 2).
 * A report that could not be written opens nothing, so under the triad its
 * coded line (ADR-84) stands in place of the rest, with Try again where the
 * reader may rewrite it (reading 10). Its content is `GET /home`'s, so nothing
 * loads on open (reading 4); whether "Share with" is offered, and why a report
 * failed, are `GET /reports`', the copy the page already holds for its picker.
 * The reader's own quick look alone asks for more: who their report is shared
 * with, since Stop sharing lives on its list (ADR-235, reading 5).
 *
 * It is content only: the page frames it as the panel beside the circle on
 * desktop and as the bottom sheet on a phone, so one quick look serves both.
 * Key it by the person, so each one rises afresh. `rp-root` scopes the report's
 * tokens, so the triad row and the blocks read as the report's own.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListReportsQueryKey,
  getListSharesQueryKey,
  useListReports,
  useListShares,
  useRegenerateReport,
  useShareBack,
  type HomePair,
  type HomePerson,
} from "@workspace/api-client-react";
import { SendDialog } from "@/components/SendDialog";
import { StatusDots } from "@/components/StatusDots";
import { TriadRow } from "@/components/TriadRow";
import { BlockFrame, BlockHeading, BlockLine, PairBlock } from "@/components/dashboard/PairBlock";
import { ShareMySheet } from "@/components/dashboard/ShareMySheet";
import { StopSharingDialog, type StopTarget } from "@/components/dashboard/StopSharingDialog";
import { StoryPreview } from "@/components/report/ShareCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  OWN_LINES, SHARE_MINE, TRY_AGAIN, birthDateText, blindRisingText, failureLine, firstName, isFailed, offersShareBack, offersShareMine,
  offersTryAgain, quickLookDoors, shareControl, shareErrorLine, shareLine, shareName, shareStateText, shareTargetFor, sharedBackText,
  tryAgainErrorLine, withYouText, writingText,
  type Door, type ShareTarget,
} from "@/lib/home-view";
import { refusalLine } from "@/lib/refusals";
import { SHARE_LABELS, pairStoryText } from "@/lib/share-card";
import { triadRowsOf } from "@/lib/triad-row";

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
const WIDE_STATUS = `flex min-h-10 w-full justify-center px-4 text-[13.5px] ${STATUS}`;
const WIDE = "w-full whitespace-normal px-4 text-center font-label text-[13.5px]";
// Sharing your own report keeps the indigo outline Share with wears on a report's own page (SendLine).
const SHARE_OUTLINE = `${WIDE} text-[var(--indigo-lt)] [border-color:rgba(92,107,192,.6)]`;
const ALERT = "text-sm leading-[1.45] text-[#E79AB2]";

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
    <Button asChild size="lg" className={WIDE}>
      <Link href={door.href}>{door.label}</Link>
    </Button>
  ) : (
    <Button asChild variant="outline" size="sm" className="font-label text-xs">
      <Link href={door.href}>{door.label}</Link>
    </Button>
  );
}

/**
 * Try again rewrites a failed report in place and takes no credit (ADR-313). Once it starts,
 * the report is being written, so that status holds here until `GET /home`
 * says so and the quick look draws its door's own.
 */
function TryAgain({ person, self }: { person: HomePerson; self: boolean }) {
  const client = useQueryClient();
  const freeId = useId();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
    void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
  };
  // A 409 is a rewrite already under way, so the quick look only needs to catch up with it.
  const regenerate = useRegenerateReport({ mutation: { onSuccess: refresh, onError: (err) => err.status === 409 && refresh() } });

  if (regenerate.isPending || regenerate.isSuccess) {
    return (
      <div className={WIDE_STATUS}>
        <StatusDots label={regenerate.isSuccess ? writingText(person.name, self) : TRY_AGAIN.starting} />
      </div>
    );
  }
  const error = regenerate.isError && regenerate.error.status !== 409
    ? (refusalLine(regenerate.error) ?? tryAgainErrorLine(person.name, self))
    : null;
  return (
    <div className="grid gap-2">
      <Button size="lg" onClick={() => regenerate.mutate({ id: person.reportId })} aria-describedby={freeId} className={WIDE}>
        {TRY_AGAIN.label}
      </Button>
      <p id={freeId} className="text-center text-xs leading-snug text-[#9AA3B5]">{TRY_AGAIN.free}</p>
      {error && <p role="alert" className={ALERT}>{error}</p>}
    </div>
  );
}

/**
 * Share yours back is one tap with no email, since both people are known
 * (reading 4), so what goes is named under it before the tap (ADR-139). Once
 * it is done the offer is gone; the toast says so until `GET /home` agrees.
 */
function ShareBack({ person }: { person: HomePerson }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const lineId = useId();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
    void client.invalidateQueries({ queryKey: getListSharesQueryKey() });
  };
  const back = useShareBack({
    mutation: {
      onSuccess: () => {
        toast({ title: sharedBackText(person.name) });
        refresh();
      },
      // Already shared is the state the reader asked for, so the offer only has to leave.
      onError: (err) => err.data?.error === "already_shared" && refresh(),
    },
  });

  if (back.isSuccess) return null;
  const code = back.error?.data?.error;
  const error = back.isError && code !== "already_shared" ? (refusalLine(back.error) ?? shareErrorLine(code)) : null;
  return (
    <div className="grid gap-2">
      {back.isPending ? (
        <div className={WIDE_STATUS}>
          <StatusDots label={SHARE_MINE.sending} />
        </div>
      ) : (
        <Button
          variant="outline"
          size="lg"
          aria-describedby={lineId}
          onClick={() => back.mutate({ data: { profileId: person.profileId } })}
          className={SHARE_OUTLINE}
        >
          {SHARE_MINE.back}
        </Button>
      )}
      <p id={lineId} className="text-xs leading-[1.45] text-[var(--paper-dim)]">{shareLine(firstName(person.name))}</p>
      {error && <p role="alert" className={ALERT}>{error}</p>}
    </div>
  );
}

/** Who the reader's own report is shared with, each with Stop sharing, whatever state the report is in, so a share can always end (reading 5). */
function SharedWith({ onStop }: { onStop: (target: StopTarget) => void }) {
  const headingId = useId();
  const shares = useListShares({ query: { queryKey: getListSharesQueryKey() } });
  const list = Array.isArray(shares.data) ? shares.data : [];
  if (list.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="grid gap-1">
      <h4 id={headingId} className={`${EYEBROW} text-[var(--paper-dim)]`}>{SHARE_MINE.sharedWith}</h4>
      <ul className="grid">
        {list.map((share) => {
          const name = shareName(share);
          return (
            <li key={share.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="text-[13.5px] leading-[1.3] text-[var(--paper)] [overflow-wrap:anywhere]">{name}</p>
                <p className="mt-0.5 text-xs leading-[1.3] text-[var(--paper-dim)]">{shareStateText(share)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label={`${SHARE_MINE.stop} with ${name}`}
                onClick={() => onStop({ kind: "share", id: share.id, name })}
                className="shrink-0 font-label text-xs"
              >
                {SHARE_MINE.stop}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function QuickLook({ person, pair, self, onClose }: QuickLookProps) {
  const headingId = useId();
  const storyId = useId();
  const reduced = useReducedMotion();
  const storyRef = useRef<HTMLDivElement>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [sending, setSending] = useState<ShareTarget | null>(null);
  const [sharingMine, setSharingMine] = useState(false);
  const [stopping, setStopping] = useState<StopTarget | null>(null);

  // The page polls this list for its picker; a quick look reads that copy rather than asking again as it opens.
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey(), refetchOnMount: false } });
  const listed = Array.isArray(reports.data) ? reports.data : [];
  const summaryOf = (reportId: string | undefined) => (reportId ? listed.find((r) => r.id === reportId) : undefined);
  const sendOf = (reportId: string | undefined) => summaryOf(reportId)?.send ?? null;

  const failed = isFailed(person.status);
  const look = { person, pair: self ? undefined : pair, self };
  const doors = quickLookDoors(look);
  const triad = triadRowsOf(person.triad, { blind: blindRisingText(person.name, self) });
  const share = shareTargetFor(look, { person: sendOf(person.reportId), pair: sendOf(look.pair?.reportId) });
  const control = share ? shareControl(share, person.name) : null;
  const story = look.pair ? pairStoryText(look.pair) : null;

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

      <TriadRow rows={triad} />

      {failed ? (
        <>
          <p className="text-sm leading-[1.5] text-[var(--paper-dim)]">{failureLine(summaryOf(person.reportId))}</p>
          {offersTryAgain(person) && <TryAgain person={person} self={self} />}
        </>
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

          {offersShareMine(look) && (
            <Button variant="outline" size="lg" onClick={() => setSharingMine(true)} className={SHARE_OUTLINE}>
              {SHARE_MINE.open}
            </Button>
          )}

          {offersShareBack(look) && <ShareBack person={person} />}

          {(doors.report || share || story) && (
            <div className="flex flex-wrap gap-2">
              {doors.report && <DoorView door={doors.report} />}
              {control?.status && <span className="self-center font-label text-xs text-[var(--paper-dim)]">{control.status}</span>}
              {share && control && (
                <Button variant="outline" size="sm" onClick={() => setSending(share)} className="font-label text-xs">
                  {control.label}
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

      {self && <SharedWith onStop={setStopping} />}

      <SendDialog open={sending !== null} onClose={() => setSending(null)} target={sending} />
      {self && (
        <>
          <ShareMySheet open={sharingMine} onClose={() => setSharingMine(false)} />
          <StopSharingDialog target={stopping} onClose={() => setStopping(null)} />
        </>
      )}
    </article>
  );
}

export default QuickLook;
