/**
 * The quick look a tap on the circle opens (ADR-182, review-01-10 scope 3):
 * the name and birth date, Sun, Moon and Rising with degrees, then for a pair
 * with the reader "With you" and its block, or for the reader chapter 08's
 * superpower and growing edge. Below, two buttons of one width and height
 * (Make You & {name} or Open Compatibility report, then Open {name}'s report),
 * and a line on what they can read with a small text Share that opens the one
 * Share window (sharing-and-circle §5, ADR-333, 335, 337). No story, no drawer
 * (ADR-338). Nothing from the old card comes with it: no elements, houses or
 * Generate (reading 2). A report that could not be written opens nothing, so
 * under the triad its coded line (ADR-84) stands in place of the rest, with
 * Try again where the reader may rewrite it (reading 10). Its content is
 * `GET /home`'s, so nothing loads on open (reading 4); why a report failed is
 * `GET /reports`', the copy the page already holds for its picker.
 *
 * It is content only: the page frames it as the panel beside the circle on
 * desktop and as the bottom sheet on a phone, so one quick look serves both.
 * Key it by the person, so each one rises afresh. `rp-root` scopes the report's
 * tokens, so the triad row and the blocks read as the report's own.
 */
import { useId, useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListReportsQueryKey,
  getListSharesQueryKey,
  useListReports,
  useRegenerateReport,
  useShareBack,
  type HomePair,
  type HomePerson,
} from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { Numbers } from "@/ds/atoms/Numbers";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { TriadRow } from "@/components/TriadRow";
import { BlockFrame, BlockHeading, BlockLine, PairBlock } from "@/components/dashboard/PairBlock";
import { ShareWindow } from "@/components/share/ShareWindow";
import { useToast } from "@/hooks/use-toast";
import { useHome } from "@/hooks/useHome";
import {
  OWN_LINES, SHARE_MINE, TRY_AGAIN, birthDateText, blindRisingText, canPair, failureLine, firstName, isFailed, isFinished, offersShareBack,
  offersTryAgain, quickLookDoors, shareErrorLine, shareLine, sharedBackText, tryAgainErrorLine, withYouText, writingText,
  type Door,
} from "@/lib/home-view";
import { makePairText, openReportText, readsYoursLine } from "@/lib/pair-row";
import { refusalLine } from "@/lib/refusals";
import { footerLine } from "@/lib/share-window";
import { triadRowsOf } from "@/lib/triad-row";

export interface QuickLookProps {
  person: HomePerson;
  /** The reader's pair with this person (`pairWithYou`); absent on the reader's own quick look and for anyone they have none with. */
  pair?: HomePair;
  /** The reader's own quick look, opened from the centre. */
  self: boolean;
  onClose: () => void;
  /** Make You & {name}: the page opens the picker with both people picked (`/dashboard?pair=`). */
  onMakePair: (profileId: string) => void;
}

// A status stands where its door will be, in the door's own place and size (ADR-130).
const WIDE_STATUS =
  "flex min-h-10 w-full items-center justify-center rounded-control border border-indigo/35 bg-indigo-tint px-4 font-label text-button-compact text-indigo-lt";
const WIDE = "h-auto min-h-[46px] whitespace-normal px-4 py-2 text-center";
// Share yours back keeps the indigo outline Share with wears on a report's own page (SendLine).
const SHARE_OUTLINE = `${WIDE} border-indigo/60 text-indigo-lt`;
const ALERT = "text-ui text-error";

// The two actions share one box, so a status stands in its button's place and size (ADR-130).
function DoorView({ door, main = false }: { door: Door; main?: boolean }) {
  if (door.kind === "writing") {
    return (
      <div className={WIDE_STATUS}>
        <StatusDots label={door.label} />
      </div>
    );
  }
  return (
    <Button asChild full variant={main ? "primary" : "secondary"} className={WIDE}>
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
      <Button full onClick={() => regenerate.mutate({ id: person.reportId })} aria-describedby={freeId} className={WIDE}>
        {TRY_AGAIN.label}
      </Button>
      <p id={freeId} className="text-center text-caption text-paper-dim">{TRY_AGAIN.free}</p>
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
          variant="secondary"
          full
          aria-describedby={lineId}
          onClick={() => back.mutate({ data: { profileId: person.profileId } })}
          className={SHARE_OUTLINE}
        >
          {SHARE_MINE.back}
        </Button>
      )}
      <p id={lineId} className="text-caption text-paper-dim">{shareLine(firstName(person.name))}</p>
      {error && <p role="alert" className={ALERT}>{error}</p>}
    </div>
  );
}

export function QuickLook({ person, pair, self, onClose, onMakePair }: QuickLookProps) {
  const headingId = useId();
  const home = useHome().data;
  const [sharing, setSharing] = useState(false);

  // The page polls this list for its picker; a quick look reads that copy rather than asking again as it opens.
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey(), refetchOnMount: false } });
  const listed = Array.isArray(reports.data) ? reports.data : [];
  const summaryOf = (reportId: string | undefined) => (reportId ? listed.find((r) => r.id === reportId) : undefined);

  const failed = isFailed(person.status);
  const look = { person, pair: self ? undefined : pair, self };
  const doors = quickLookDoors(look);
  const triad = triadRowsOf(person.triad, { blind: blindRisingText(person.name, self) });
  const reportDoor: Door | null =
    doors.report?.kind === "open" ? { ...doors.report, label: openReportText(person.name) } : doors.report;
  // A pair is one credit and needs two readable reports; the page's `canPair` says so for every entry (ADR-332).
  const canMake = !look.self && !look.pair && isFinished(person.status) && !!home && canPair(home);
  const ownReady = !!home?.you && isFinished(home.you.status);
  const shareBack = offersShareBack(look);
  const readsLine =
    look.self ? (isFinished(person.status) ? footerLine(person.readers) : null)
    : ownReady && !shareBack ? readsYoursLine(person.name, person.readsYours)
    : null;

  return (
    <article
      aria-labelledby={headingId}
      className="rp-root grid w-full min-w-0 gap-3.5 bg-transparent animation-duration-500 ease-[var(--ease)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-[10px]"
      data-quick-look
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="font-display text-sheet-title [overflow-wrap:anywhere]">{person.name}</h3>
          <p className="mt-1"><Numbers>{birthDateText(person.birthDate)}</Numbers></p>
        </div>
        <Button size="compact" variant="secondary" onClick={onClose} aria-label="Close" className="size-9 shrink-0 px-0">
          <X aria-hidden />
        </Button>
      </header>

      <TriadRow rows={triad} />

      {failed ? (
        <>
          <p className="text-ui text-paper-dim">{failureLine(summaryOf(person.reportId))}</p>
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
              <p><Eyebrow className="text-violet">{withYouText(look.pair)}</Eyebrow></p>
              <PairBlock pair={look.pair} />
            </div>
          )}

          <div className="grid gap-2.5">
            {canMake ? (
              <>
                <Button full onClick={() => onMakePair(person.profileId)} className={WIDE}>
                  {makePairText(person.name)}
                </Button>
                <DoorView door={doors.primary} />
              </>
            ) : (
              <>
                <DoorView door={doors.primary} main />
                {reportDoor && <DoorView door={reportDoor} />}
              </>
            )}
          </div>

          {shareBack && <ShareBack person={person} />}

          {readsLine && (
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
              <p className="min-w-0 text-small text-paper-dim">{readsLine}</p>
              <TextButton onClick={() => setSharing(true)} className="-mr-2 shrink-0 px-2 font-label underline-offset-4 hover:underline">
                Share
              </TextButton>
            </div>
          )}
        </>
      )}

      <ShareWindow open={sharing} onClose={() => setSharing(false)} target={{ kind: "own" }} />
    </article>
  );
}

export default QuickLook;
