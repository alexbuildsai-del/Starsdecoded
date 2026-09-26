/**
 * The dashboard (dashboard-sky, credit-loop): the reader at the centre of
 * their orbit, a tap that opens a card in the panel or, on a phone, a bottom
 * sheet, and the dense lists below. The pieces only draw and call back; the
 * page holds the lists, the selection and every call, so the orbit, a card
 * and a row never disagree about a person.
 */
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditHistoryQueryKey,
  getGetReportQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  useGetCreditHistory,
  useGetCredits,
  useGetReport,
  useListGifts,
  useListProfiles,
  useListReports,
  useStopSharingCompatibility,
  useStopSharingProfile,
  useUpdateProfile,
  type CreditHistoryItem,
  type ProfileSummary,
  type ReportSummary,
  type SendState,
} from "@workspace/api-client-react";
import { AccountMenu } from "@/components/AccountMenu";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { CompatibilityPicker } from "@/components/CompatibilityPicker";
import { DeleteReportDialog } from "@/components/DeleteReportDialog";
import { SendDialog, SendLine, type SendTarget } from "@/components/SendDialog";
import { StatusDots } from "@/components/StatusDots";
import { Wordmark } from "@/components/Wordmark";
import { AddSomeoneSheet } from "@/components/dashboard/AddSomeoneSheet";
import { birthDateText, blindRisingText, legendParts } from "@/components/dashboard/CardSections";
import { CompatibilityRows, type PairProposal, type PairReport } from "@/components/dashboard/CompatibilityRows";
import { CreditPill, CreditRow } from "@/components/dashboard/CreditPill";
import { CreditsSheet } from "@/components/dashboard/CreditsSheet";
import { GiftFlow } from "@/components/dashboard/GiftFlow";
import { Nudge } from "@/components/dashboard/Nudge";
import { CENTRE_ID, Orbit } from "@/components/dashboard/Orbit";
import { PathSheet, usePathOffer } from "@/components/dashboard/PathSheet";
import { SkyCard } from "@/components/dashboard/SkyCard";
import { WaitingGiftCard } from "@/components/dashboard/WaitingGiftCard";
import { rowText, triadRows } from "@/components/report/pair-hero-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useToast } from "@/hooks/use-toast";
import { creditsEnforced, pathHave } from "@/lib/credits-view";
import { NUDGE_SEEN_KEY, nudgeFor, type Nudge as NudgeData } from "@/lib/nudges";
import { orbitPoints, partnersOf } from "@/lib/orbit";
import type { PairSelection } from "@/lib/pair-selection";
import { usePageTitle } from "@/lib/page-title";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { PERSONAL_REPORT, COMPATIBILITY_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import { cn } from "@/lib/utils";
import type { ChartData } from "@/types/chart";

/** The phone sheet's first stop, a share of the screen: the card's head and triad, with the sky above still in view to tap. */
const PEEK = 0.45;
const SHEET_HEIGHT = 0.96;
/** The report's easing (annex, Micro animations: the phone sheet slides up on it). */
const EASE = [0.16, 1, 0.3, 1] as const;
const SEEN_KEPT = 100;
const POLL_MS = 3000;
const UNDER_WAY = new Set(["pending", "computing", "interpreting", "revising"]);
// The ledger names a received gift "A gift from {giver}" (credits.ts): the one place its giver reaches the recipient.
const GIFT_FROM = /^A gift from (.+)$/;

const EYEBROW = "font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]";
const CLOSE =
  "rounded px-1 py-1 font-label text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const ACTION =
  "inline-flex min-h-8 items-center gap-1.5 rounded-md font-label text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const QUIET = `${ACTION} px-1.5 text-muted-foreground hover:text-foreground`;
const OUTLINED = `${ACTION} border border-[rgba(92,107,192,.6)] px-2.5 text-[#9FA8DA] hover:border-[#9FA8DA]`;
// The locked mock's green for a settled state, as the send line's Joined ✓.
const DONE = "inline-flex min-h-7 items-center rounded-md border border-[rgba(127,176,139,.4)] px-2.5 font-label text-xs text-[#7FB08B]";
const FRAME = "min-w-0 rounded-[14px] border border-[#242C3B]";

/** A report under a horizon pass keeps its text and reads as it stands (progress.ts), as the orbit and the rows read it. */
function finished(status: string | undefined): boolean {
  return status === "complete" || status === "revising";
}

function writing(status: string | undefined): boolean {
  return status === "pending" || status === "computing" || status === "interpreting";
}

function sendOpen(send: SendState | null | undefined): boolean {
  return send?.state === "can_send" || send?.state === "can_grant";
}

function inPair(pair: Pick<ReportSummary, "participants">, profileId: string | undefined): boolean {
  return !!profileId && (pair.participants ?? []).some((p) => p.id === profileId);
}

interface NatalReports {
  latest: ReportSummary;
  /** The latest that did not fail, so a failed retry never hides a report that still opens. */
  readable: ReportSummary | null;
}

function natalByProfile(reports: readonly ReportSummary[]): Map<string, NatalReports> {
  const out = new Map<string, NatalReports>();
  for (const r of reports) {
    if (r.kind !== "natal" || !r.profileId) continue;
    const kept = out.get(r.profileId);
    const newer = (than: ReportSummary | null | undefined) => !than || r.createdAt > than.createdAt;
    out.set(r.profileId, {
      latest: kept && !newer(kept.latest) ? kept.latest : r,
      readable: r.status !== "failed" && newer(kept?.readable) ? r : (kept?.readable ?? null),
    });
  }
  return out;
}

function giftGiver(history: readonly CreditHistoryItem[] | undefined): string | null {
  const gift = history?.find((item) => item.kind === "gift");
  if (!gift) return null;
  return GIFT_FROM.exec(gift.label.trim())?.[1] ?? "Someone";
}

// MB-43: a functional key holding report ids only, never a person's data; the privacy draft names it (MB-33).
function readSeen(): Set<string> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(NUDGE_SEEN_KEY) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function keepSeen(ids: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(NUDGE_SEEN_KEY, JSON.stringify([...ids].slice(-SEEN_KEPT)));
  } catch {
    // The worst case is a nudge showing once more.
  }
}

/**
 * A card's chart, read from the stored report (ADR-92). The chart lands once
 * computing ends and moves with a horizon pass, so a new status in the list
 * fetches it again.
 */
function useChart(reportId: string | undefined, status: string | undefined): ChartData | null {
  const client = useQueryClient();
  const id = reportId ?? "";
  const report = useGetReport(id, { query: { queryKey: getGetReportQueryKey(id), enabled: !!reportId } });
  const last = useRef({ id, status });
  useEffect(() => {
    const was = last.current;
    last.current = { id, status };
    if (id && was.id === id && was.status !== status) void client.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
  }, [client, id, status]);
  return (report.data?.chartData ?? null) as unknown as ChartData | null;
}

/** The reader's Sun, Moon and Rising as the card's legend reads them, without the plate: the panel's summary of the centre. */
function TriadRows({ chart, name }: { chart: ChartData; name: string }) {
  return (
    <dl className="rp-legend">
      {triadRows(chart, "full").map((row) => (
        <div key={row.key} className="lr">
          {row.key === "rising"
            ? <span aria-hidden className="rp-ascdot" />
            : <img src={row.key === "sun" ? SUN_HERO : PLANET_RENDERS[row.key]} alt="" width={22} height={22} />}
          <dt className="k">{row.label}</dt>
          {row.blind ? (
            <dd className="v min-w-0 font-sans text-xs leading-[1.35] text-muted-foreground">{blindRisingText(name, true)}</dd>
          ) : (
            <dd className="v min-w-0">
              {legendParts(rowText(row)).map((part, i) => (
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

/** A spend names its cost beside its verb (annex, Credits); at zero it stays in sight, disabled, over the credit row's Get credits. */
function Spend({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button size="sm" disabled={disabled} onClick={onClick} className="justify-self-start font-label">
      {label}
      <span aria-hidden className="text-white/60">·</span>
      <span className="font-numeric">1 credit</span>
    </Button>
  );
}

interface IdlePanelProps {
  /** The reader's name, once a chart of their own sits at the centre. */
  name: string | null;
  chart: ChartData | null;
  /** More than one chart is marked as theirs, so the centre waits for the list to settle it. */
  several: boolean;
  people: number;
  violet: boolean;
  /** Zero credits where credits are enforced (ADR-138). */
  out: boolean;
  /** A claimed gift's suggestion of the reader's own chart (ADR-139), over Generate my chart. */
  nudge: NudgeData | null;
  onAddSomeone: () => void;
  onOwnChart: () => void;
  onGetCredits: () => void;
}

/** What the panel holds while no card is open, and what a phone shows under its orbit: the four empty states among them (annex). */
function IdlePanel({ name, chart, several, people, violet, out, nudge, onAddSomeone, onOwnChart, onGetCredits }: IdlePanelProps) {
  const headingId = useId();
  let heading: string;
  let line: string;
  let spend: ReactNode = null;
  if (name) {
    heading = name;
    if (people > 0) {
      line = `Tap a person for their chart at a glance, or your name for yours.${violet ? " A violet ring means the two of you have a Compatibility report." : ""}`;
    } else {
      line = out ? "Adding someone uses a credit, and you have none left." : "No one in your sky yet. Add someone and they join your orbit.";
      spend = <Spend label="Add someone" disabled={out} onClick={onAddSomeone} />;
    }
  } else if (several) {
    heading = "Your chart";
    line = "More than one chart is marked as yours. In Your People, choose Not me on any that isn't.";
  } else {
    heading = "Your chart comes first";
    line = people > 0 ? "Compatibility needs your own report. Their cards still open." : "It sits at the centre, and everyone you add orbits it.";
    spend = <Spend label="Generate my chart" disabled={out} onClick={onOwnChart} />;
  }
  return (
    <section aria-labelledby={headingId} className={cn(FRAME, "rp-root grid gap-3.5 bg-[rgba(17,22,31,.7)] p-[18px]")}>
      <div className="min-w-0">
        <p className={EYEBROW}>Your sky</p>
        <h2 id={headingId} className="mt-1.5 font-display text-[22px] leading-[1.15] [overflow-wrap:anywhere]">{heading}</h2>
      </div>
      {name && chart && <TriadRows chart={chart} name={name} />}
      <p className="text-[13px] leading-[1.45] text-muted-foreground">{line}</p>
      {nudge && spend && <Nudge nudge={nudge} />}
      {spend}
      <CreditRow onGetCredits={onGetCredits} />
    </section>
  );
}

/** The desktop panel's frame: the card draws none of its own, so the same card serves the sheet. */
function CardFrame({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className={cn(FRAME, "bg-[rgba(17,22,31,.86)] px-[18px] pb-4 pt-2")}>
      <div className="mb-1 flex justify-end">
        <button type="button" onClick={onClose} className={CLOSE}>
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

interface PhoneSheetProps {
  open: boolean;
  /** The open card's point, so each new card rises from the peek with its top in view. */
  cardKey: string | null;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

function glide(reduced: boolean) {
  return reduced ? { duration: 0 } : { duration: 0.5, ease: EASE };
}

function useViewportHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const measure = () => setHeight(window.innerHeight);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return height;
}

/**
 * The card as a bottom sheet on a phone (dashboard-sky, Layout): a peek, a
 * drag up for the rest. It is not modal, so the sky above stays live: a tap on
 * empty sky closes it and a tap on someone else swaps the card. vaul's
 * non-modal drawer still blocks the page when it is opened from state, so the
 * sheet is drawn here.
 */
function PhoneSheet({ open, cardKey, label, onClose, children }: PhoneSheetProps) {
  const reduced = useReducedMotion();
  const viewport = useViewportHeight();
  const height = Math.round(viewport * SHEET_HEIGHT);
  const peekY = height - Math.round(viewport * PEEK);
  const [full, setFull] = useState(false);
  const y = useMotionValue(height);
  const drag = useDragControls();
  const sheet = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardKey) return;
    setFull(false);
    scroller.current?.scrollTo({ top: 0 });
  }, [cardKey]);

  useEffect(() => {
    if (!open) return;
    const controls = animate(y, full ? 0 : peekY, glide(reduced));
    return () => controls.stop();
  }, [open, full, peekY, reduced, y]);

  // Escape inside the sheet closes it; the orbit already answers Escape pressed anywhere outside a dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Node && sheet.current?.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const settle = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const at = y.get();
    const speed = info.velocity.y;
    if (at > peekY + (height - peekY) / 3 || (speed > 600 && !full)) {
      onClose();
      return;
    }
    const toFull = speed < -400 || (Math.abs(speed) <= 400 && at < peekY / 2);
    if (toFull === full) animate(y, full ? 0 : peekY, glide(reduced));
    else setFull(toFull);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          ref={sheet}
          role="dialog"
          aria-modal="false"
          aria-label={label}
          drag="y"
          dragControls={drag}
          // At the peek the whole sheet drags up; once open, only its top does, so the card scrolls.
          dragListener={!full}
          dragConstraints={{ top: 0, bottom: height }}
          dragElastic={{ top: 0.04, bottom: 0.3 }}
          dragMomentum={false}
          onDragEnd={settle}
          exit={{ y: height, transition: reduced ? { duration: 0 } : { duration: 0.35, ease: EASE } }}
          style={{ y, height }}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[20px] border border-b-0 border-[#242C3B] bg-[#0E1219] shadow-[0_-12px_40px_rgba(0,0,0,.45)]"
        >
          <div
            onPointerDown={(e) => {
              if (full) drag.start(e);
            }}
            className="relative flex h-10 shrink-0 touch-none items-center justify-center"
          >
            <button
              type="button"
              aria-label="Show the whole card"
              aria-expanded={full}
              onClick={() => setFull((was) => !was)}
              className="grid h-8 w-16 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span aria-hidden className="block h-1 w-9 rounded-full bg-[#3A4356]" />
            </button>
            <button type="button" onClick={onClose} className={cn(CLOSE, "absolute right-4 top-1/2 -translate-y-1/2")}>
              Close
            </button>
          </div>
          <div
            ref={scroller}
            className={cn(
              "min-h-0 flex-1 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
              full ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
            )}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PersonRowProps {
  profile: ProfileSummary;
  report: ReportSummary;
  /** No chart is marked as the reader's yet, so any chart they wrote may be theirs. */
  unmarked: boolean;
  onSend: (report: ReportSummary) => void;
  onMark: (profile: ProfileSummary, mine: boolean, claimed: boolean) => void;
  onBirthTime: (profile: ProfileSummary) => void;
  onStopSharing: (profile: ProfileSummary, giver: string) => void;
}

/** One person in Your People: their report's state and what the reader may do with it (ADR-120, ADR-139). */
function PersonRow({ profile, report, unmarked, onSend, onMark, onBirthTime, onStopSharing }: PersonRowProps) {
  const claimed = report.access === "claimed";
  const mine = profile.isSelf === true;
  // Only the person a report was sent to learns who sent it, and only while the sender can still read it.
  const giver = claimed ? (profile.giverName ?? report.sharedBy ?? null) : null;
  const send = report.send ?? null;
  const meta: string[] = [];
  if (giver) meta.push(`From ${giver}`);
  if (claimed && mine) meta.push(giver ? "marked as yours" : "Marked as yours");
  const canMark = !mine && (claimed || (unmarked && (profile.ownership ?? "owner") === "owner"));
  const blind = profile.horizon === "unknown" && report.status === "complete";
  const nameClass = "font-display text-base leading-snug [overflow-wrap:anywhere]";

  return (
    <li className="min-w-0 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3" data-testid={`row-person-${profile.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {finished(report.status) ? (
            <Link href={`/report/${report.id}`} className={cn(nameClass, "rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring")}>
              {profile.name}
            </Link>
          ) : (
            <p className={nameClass}>{profile.name}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.length ? meta.join(" · ") : birthDateText(profile.birthDate)}</p>
        </div>
        {(writing(report.status) || report.status === "revising") && (
          <span className="font-label text-xs text-[#9FA8DA]">
            <StatusDots label={report.status === "revising" ? "Revising" : "Writing"} />
          </span>
        )}
      </div>
      {report.status === "failed" && (
        <p className="mt-1.5 text-xs text-red-300/90">{report.failureReason?.line ?? "Could not be written."}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {send && sendOpen(send) && (
          <button type="button" onClick={() => onSend(report)} className={OUTLINED}>
            Send to {send.firstName}
          </button>
        )}
        {send?.state === "sent" && <span className="px-1.5 text-xs text-muted-foreground">Sent · waiting for {send.firstName}</span>}
        {send?.state === "joined" && <span className={DONE}>Joined ✓</span>}
        {mine && <span className={DONE}>This is me ✓</span>}
        {mine && (
          <button type="button" onClick={() => onMark(profile, false, claimed)} className={QUIET}>
            Not me
          </button>
        )}
        {canMark && (
          <button type="button" onClick={() => onMark(profile, true, claimed)} className={QUIET}>
            This is me
          </button>
        )}
        {blind && (
          <button type="button" onClick={() => onBirthTime(profile)} className={QUIET}>
            Add birth time
          </button>
        )}
        {giver && (
          <button type="button" onClick={() => onStopSharing(profile, giver)} className={QUIET}>
            Stop sharing with {giver}
          </button>
        )}
        <DeleteReportDialog
          reportId={report.id}
          personName={profile.name}
          className={cn(QUIET, "h-auto gap-1 hover:bg-transparent hover:text-destructive")}
        />
      </div>
    </li>
  );
}

type StopTarget = { kind: "profile" | "pair"; id: string; name: string };

/**
 * Stop sharing ends the other person's reading at once (ADR-139), so it asks
 * first and names what goes. The subject's stop moves the report to them and
 * cannot be taken back; a pair's sender can send it again.
 */
function StopSharingDialog({ target, onClose }: { target: StopTarget | null; onClose: () => void }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const kept = useRef<StopTarget | null>(target);
  if (target) kept.current = target;
  const shown = target ?? kept.current;

  const done = () => {
    void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
    void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    if (shown) toast({ title: `${shown.name} can no longer read it` });
    onClose();
  };
  const profile = useStopSharingProfile({ mutation: { onSuccess: done } });
  const pair = useStopSharingCompatibility({ mutation: { onSuccess: done } });
  const { reset: resetProfile } = profile;
  const { reset: resetPair } = pair;
  const pending = profile.isPending || pair.isPending;
  const failed = profile.isError || pair.isError;

  useEffect(() => {
    if (!target) return;
    resetProfile();
    resetPair();
  }, [target, resetProfile, resetPair]);

  if (!shown) return null;
  const what = shown.kind === "profile" ? `this ${PERSONAL_REPORT}. You can't undo this.` : `this ${COMPATIBILITY_REPORT}.`;
  return (
    <AlertDialog open={!!target} onOpenChange={(next) => !next && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Stop sharing with {shown.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {shown.name} can no longer read {what}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            We couldn't stop sharing. Try again in a minute.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep sharing</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              if (shown.kind === "profile") profile.mutate({ id: shown.id });
              // MB-103 provisional: its sender ends the other person's reading of a pair; nothing is deleted.
              else pair.mutate({ id: shown.id });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending ? <StatusDots label="Stopping" /> : "Stop sharing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const phone = useIsMobile();
  const reduced = useReducedMotion();
  const { toast } = useToast();
  const enforced = creditsEnforced();
  const peopleRef = useRef<HTMLElement>(null);

  const reportsQ = useListReports({
    query: {
      queryKey: getListReportsQueryKey(),
      refetchInterval: (query) => {
        const data = query.state.data;
        return Array.isArray(data) && data.some((r) => UNDER_WAY.has(r.status)) ? POLL_MS : false;
      },
    },
  });
  const profilesQ = useListProfiles({ query: { queryKey: getListProfilesQueryKey() } });
  const giftsQ = useListGifts();
  const available = useGetCredits().data?.available;

  const reports = useMemo(() => (Array.isArray(reportsQ.data) ? reportsQ.data : []), [reportsQ.data]);
  const profiles = useMemo(() => (Array.isArray(profilesQ.data) ? profilesQ.data : []), [profilesQ.data]);
  const gifts = useMemo(() => (Array.isArray(giftsQ.data) ? giftsQ.data : []), [giftsQ.data]);
  const loaded = Array.isArray(reportsQ.data) && Array.isArray(profilesQ.data);
  const failed = !loaded && (reportsQ.isError || profilesQ.isError);

  // MB-6 provisional: zero reads Get credits only where credits are enforced (ADR-138); production's soft pass still writes.
  const out = enforced && available !== undefined && available <= 0;

  const natal = useMemo(() => natalByProfile(reports), [reports]);
  const pairs = useMemo(
    () => reports.filter((r) => r.kind === "compatibility").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reports],
  );
  const marked = profiles.filter((p) => p.isSelf === true);
  const self = marked.length === 1 ? marked[0] : null;
  const selfNatal = self ? (natal.get(self.id)?.readable ?? null) : null;
  const several = marked.length > 1;

  // A balance still loading is not zero, so the add point waits as Add someone rather than flashing Get credits.
  const points = useMemo(
    () => orbitPoints({ profiles, reports, gifts, credits: available ?? 1, enforced }),
    [profiles, reports, gifts, available, enforced],
  );
  const people = points.filter((p) => p.kind === "person").length;
  const have = useMemo(() => pathHave({ profiles, reports }), [profiles, reports]);

  const [seen, setSeen] = useState<Set<string>>(readSeen);
  // A nudge shows until the reader acts on the control it names (reading 5).
  const markSeen = useCallback((reportId: string) => {
    setSeen((prev) => {
      if (prev.has(reportId)) return prev;
      const next = new Set(prev).add(reportId);
      keepSeen(next);
      return next;
    });
  }, []);

  const history = useGetCreditHistory({
    query: { queryKey: getGetCreditHistoryQueryKey(), enabled: loaded && !selfNatal && !several },
  });
  const giftFrom = giftGiver(history.data);
  const idleNudge = giftFrom && !selfNatal && !several && !out
    ? nudgeFor({ claimedGift: { giverName: giftFrom, hasOwnChart: false } }, seen)
    : null;

  const [selection, setSelection] = useState<{ id: string; giftId?: string } | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
  const [stopTarget, setStopTarget] = useState<StopTarget | null>(null);
  const [timeTarget, setTimeTarget] = useState<ProfileSummary | null>(null);
  const [preselect, setPreselect] = useState<Partial<PairSelection> | null>(null);
  const [generating, setGenerating] = useState<Pick<PairSelection, "a" | "b"> | null>(null);
  const path = usePathOffer();

  const point = selection ? (points.find((p) => p.id === selection.id) ?? null) : null;
  // A gift opened from its point stays open when it is claimed or taken back meanwhile, so its card can say so.
  const openGift = selection?.giftId ? (gifts.find((g) => g.id === selection.giftId) ?? null) : null;
  const personProfile = point?.kind === "person" ? (profiles.find((p) => p.id === point.profileId) ?? null) : null;
  const personReport = point?.kind === "person" ? (reports.find((r) => r.id === point.reportId) ?? null) : null;
  const active =
    selection?.id === CENTRE_ID
      ? (selfNatal ? CENTRE_ID : null)
      : openGift || (personProfile && personReport)
        ? (selection?.id ?? null)
        : null;

  const selfChart = useChart(selfNatal?.id, selfNatal?.status);
  const personChart = useChart(personReport?.id, personReport?.status);

  const openCredits = useCallback(() => setCreditsOpen(true), []);
  // Add someone hands itself to the credits sheet at zero, reading the balance as it opens; a checkout that
  // just added one credit calls this before the page renders the new balance.
  const openAdd = useCallback(() => setAddOpen(true), []);
  const ownChart = useCallback(() => navigate("/chart?self=1"), [navigate]);

  const onSelect = useCallback(
    (id: string | null) => {
      if (id === null) {
        setSelection(null);
        return;
      }
      if (id === CENTRE_ID) {
        if (selfNatal) {
          setSelection({ id });
          return;
        }
        setSelection(null);
        if (several) peopleRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        else if (out) setCreditsOpen(true);
        else ownChart();
        return;
      }
      const tapped = points.find((p) => p.id === id);
      if (!tapped) return;
      if (tapped.kind === "add") {
        setSelection(null);
        openAdd();
        return;
      }
      setSelection({ id, giftId: tapped.giftId });
    },
    [selfNatal, several, reduced, out, ownChart, points, openAdd],
  );

  const closeCard = useCallback(() => {
    const was = selection?.id;
    setSelection(null);
    // Back to the point the card opened from, so a keyboard reader keeps their place on the orbit.
    if (was) document.querySelector<SVGElement>(`[data-orbit-id="${CSS.escape(was)}"]`)?.focus();
  }, [selection]);

  const generate = useCallback(
    (pick: Partial<PairSelection>) => {
      // The sheet covers the picker on a phone, so it goes first and the picker's scroll and focus land (reading 6).
      if (phone) setSelection(null);
      setPreselect(pick);
    },
    [phone],
  );

  const sendPerson = useCallback(
    (report: ReportSummary) => {
      if (!report.send) return;
      markSeen(report.id);
      setSendTarget({ kind: "person", send: report.send, reportId: report.id });
    },
    [markSeen],
  );

  const rowHandlers = {
    onOpen: (id: string) => navigate(`/compatibility/${id}`),
    onGenerate: generate,
    onSend: (pair: PairReport) => {
      if (!pair.send) return;
      markSeen(pair.id);
      // MB-103 provisional: a pair reaches its other person only when one of its two sends it.
      setSendTarget({ kind: "pair", send: pair.send, reportId: pair.id });
    },
    onStopSharing: (pair: PairReport) => {
      if (pair.send) setStopTarget({ kind: "pair", id: pair.id, name: pair.send.firstName });
    },
    onGetCredits: openCredits,
  };

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "We couldn't save that", description: "Try again in a minute." });
      },
    },
  });
  const mark = (profile: ProfileSummary, mine: boolean, claimed: boolean) => {
    // The writer marks their own chart; the person a chart was sent to says This is me or Not me (ADR-120).
    updateProfile.mutate({ id: profile.id, data: claimed ? { claimedAsSelf: mine } : { isSelf: mine } });
  };

  let card: ReactNode = null;
  let cardLabel = "";
  if (active === CENTRE_ID && self && selfNatal) {
    const ownPairs = pairs.filter((p) => p.status !== "failed" && inPair(p, self.id));
    const nudge = enforced && available !== undefined ? nudgeFor({ credits: available }, seen) : null;
    cardLabel = "Your chart at a glance";
    card = (
      <SkyCard
        key={CENTRE_ID}
        self
        person={{ name: self.name, birthDate: self.birthDate, chart: selfChart, writing: writing(selfNatal.status) }}
        compatibility={ownPairs.length > 0 ? <CompatibilityRows pairs={ownPairs} {...rowHandlers} /> : undefined}
        nudge={nudge ? <Nudge nudge={nudge} /> : undefined}
        credit={<CreditRow onGetCredits={openCredits} />}
        primary={{ href: `/report/${selfNatal.id}` }}
      />
    );
  } else if (openGift && active) {
    cardLabel = `Gift for ${openGift.recipientName}`;
    card = <WaitingGiftCard key={openGift.id} gift={openGift} onTakenBack={() => setSelection(null)} />;
  } else if (active && personProfile && personReport) {
    const name = first(personProfile.name);
    const theirs = pairs.filter((p) => inPair(p, personProfile.id));
    const ours = self ? theirs.find((p) => p.status !== "failed" && inPair(p, self.id)) : undefined;
    const pending =
      !!generating && !!selfNatal && [generating.a, generating.b].includes(selfNatal.id) && [generating.a, generating.b].includes(personReport.id);
    const send = personReport.send ?? null;
    const nudge = nudgeFor(
      {
        personReport: {
          reportId: personReport.id,
          name,
          canGeneratePair:
            finished(selfNatal?.status) && finished(personReport.status) && !ours && !pending && (!enforced || (available ?? 0) > 0),
          canSend: sendOpen(send),
        },
        pairReport:
          ours && finished(ours.status) && !ours.stoppedBy && sendOpen(ours.send) ? { reportId: ours.id, name, canSend: true } : undefined,
      },
      seen,
    );
    const proposal: PairProposal = {
      self: { profileId: self?.id, name: self?.name ?? "You", report: selfNatal },
      other: { profileId: personProfile.id, name: personProfile.name, report: personReport },
      credits: available ?? 0,
      enforced,
      generating: pending,
    };
    cardLabel = `${personProfile.name}, at a glance`;
    card = (
      <SkyCard
        key={active}
        person={{ name: personProfile.name, birthDate: personProfile.birthDate, chart: personChart, writing: writing(personReport.status) }}
        compatibility={
          <>
            {nudge?.control === "generate_pair" && <Nudge nudge={nudge} />}
            <CompatibilityRows
              pairs={theirs}
              propose={proposal}
              {...rowHandlers}
              onGenerate={(pick) => {
                markSeen(personReport.id);
                generate(pick);
              }}
            />
          </>
        }
        nudge={nudge?.control === "send" ? <Nudge nudge={nudge} /> : undefined}
        send={send ? <SendLine send={send} onSend={() => sendPerson(personReport)} /> : undefined}
        primary={{ href: `/report/${personReport.id}` }}
      />
    );
  }

  const partners = active === CENTRE_ID ? partnersOf(self?.id ?? "", reports) : active ? partnersOf(active, reports) : [];
  const rows = [...profiles]
    .sort((a, b) => Number(b.isSelf === true) - Number(a.isSelf === true))
    .flatMap((profile) => {
      const reportsOf = natal.get(profile.id);
      return reportsOf ? [{ profile, report: reportsOf.readable ?? reportsOf.latest }] : [];
    });

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <CreditPill onOpen={openCredits} />
            {out ? (
              // The pill opens the same sheet, so a phone keeps the one control.
              <Button size="sm" variant="outline" onClick={openCredits} className="hidden font-label sm:inline-flex">
                Get credits
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={openAdd} aria-label="Add someone" className="gap-1.5 font-label" data-testid="button-add-someone">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add someone</span>
              </Button>
            )}
            <AccountMenu />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-[72px] sm:px-6 sm:pt-20">
        <h1 className="sr-only">Dashboard</h1>

        {failed ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">We couldn't load your reports. Check your connection and try again.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void reportsQ.refetch();
                void profilesQ.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : !loaded ? (
          <div className="grid min-h-[360px] place-items-center font-label text-sm text-muted-foreground">
            <StatusDots label="Loading your dashboard" />
          </div>
        ) : (
          <>
            <section className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
              <div className="min-w-0 md:sticky md:top-20">
                <Orbit
                  centre={{ firstName: self ? first(self.name) : "", hasReport: !!selfNatal, writing: writing(selfNatal?.status) }}
                  points={points}
                  selectedId={active}
                  partners={partners}
                  onSelect={onSelect}
                />
              </div>
              <div className="min-w-0">
                {!phone && card ? (
                  <CardFrame onClose={closeCard}>{card}</CardFrame>
                ) : (
                  <IdlePanel
                    name={self && selfNatal ? self.name : null}
                    chart={selfChart}
                    several={several}
                    people={people}
                    violet={points.some((p) => p.sharedPair)}
                    out={out}
                    nudge={idleNudge}
                    onAddSomeone={openAdd}
                    onOwnChart={ownChart}
                    onGetCredits={openCredits}
                  />
                )}
              </div>
            </section>

            {rows.length > 0 && (
              <section ref={peopleRef} aria-labelledby="people-heading" className="mt-12 scroll-mt-20">
                <h2 id="people-heading" className="mb-3 font-display text-xl">
                  Your People
                </h2>
                <ul className="grid gap-2">
                  {rows.map(({ profile, report }) => (
                    <PersonRow
                      key={profile.id}
                      profile={profile}
                      report={report}
                      unmarked={marked.length === 0}
                      onSend={sendPerson}
                      onMark={mark}
                      onBirthTime={setTimeTarget}
                      onStopSharing={(p, name) => setStopTarget({ kind: "profile", id: p.id, name })}
                    />
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="pairs-heading" className="mt-12">
              <h2 id="pairs-heading" className="mb-3 font-display text-xl">
                Compatibility
              </h2>
              {/* A select sizes itself to its longest report name, which would push a phone sideways; it takes the column's width instead. */}
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 [&_select]:w-full [&_select]:min-w-0">
                <CompatibilityRows pairs={pairs} showFailed {...rowHandlers} />
                <CompatibilityPicker
                  reports={reports}
                  preselect={preselect}
                  openOnCreate={false}
                  onGenerating={setGenerating}
                  enforced={enforced}
                  onGetCredits={openCredits}
                />
              </div>
            </section>
          </>
        )}
      </main>

      {phone && (
        <PhoneSheet open={!!card} cardKey={card ? active : null} label={cardLabel} onClose={closeCard}>
          {card}
        </PhoneSheet>
      )}

      <CreditsSheet open={creditsOpen} onClose={() => setCreditsOpen(false)} onAddSomeone={openAdd} onGift={() => setGiftOpen(true)} />
      <AddSomeoneSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSomeoneYouKnow={() => navigate("/chart")}
        onGift={() => setGiftOpen(true)}
        // An empty pair brings the picker into view without choosing for the reader.
        onTwoPeople={() => setPreselect({})}
        onGetCredits={openCredits}
      />
      <GiftFlow open={giftOpen} onClose={() => setGiftOpen(false)} onGetCredits={openCredits} />
      <PathSheet offer={path.offer} have={have} onClose={path.dismiss} onOwnChart={ownChart} onAddSomeone={openAdd} />
      <SendDialog open={!!sendTarget} onClose={() => setSendTarget(null)} target={sendTarget} />
      <StopSharingDialog target={stopTarget} onClose={() => setStopTarget(null)} />

      {timeTarget && (
        <BirthTimeDialog
          open
          onClose={() => setTimeTarget(null)}
          profile={{
            id: timeTarget.id,
            name: timeTarget.name,
            birthDate: timeTarget.birthDate,
            birthTime: timeTarget.birthTime,
            birthTimeWindowMinutes: timeTarget.birthTimeWindowMinutes ?? 720,
            birthPlace: timeTarget.birthPlace,
            latitude: timeTarget.latitude,
            longitude: timeTarget.longitude,
            timezone: timeTarget.timezone,
            timezoneOffset: timeTarget.timezoneOffset,
          }}
          onDone={() => {
            void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
            void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
          }}
        />
      )}
    </div>
  );
}
