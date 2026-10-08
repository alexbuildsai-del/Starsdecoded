/**
 * The dashboard as a home (Review 01/10, ADR-171, 174, 182): "Dashboard" with
 * a one-line summary, Your circle in three views, what the reader is
 * practising and their pairs, designed at 390 px first, with no stories
 * (ADR-338). Beside the circle, Your first steps until the first pair, then
 * Make a report (ADR-330, 334). One GET /home draws all of it, so no card
 * fetches a report on open; the rows' actions, the picker, the credits, gifts
 * and history keep their own routes (reading 4). The pieces only draw and call
 * back; the page holds the view, the selection, the sheets and the picker's
 * pop-up, so the circle, a quick look and a row never disagree about a person,
 * and `canPair` decides every way into a Compatibility report (ADR-332).
 * Timeline adds one section or the other (reading 26): Your week after Your
 * circle for a subscriber, and for a reader without it whose own report is
 * finished, their big cycles after the pairs.
 * Before the reader has a report of their own, the panel is the first visit
 * (Review 05/10 §1, reading 20), and Your first steps, Practising and Ask wait
 * for that report to be finished. `?visitor=new` is the admin's look at a new
 * visitor's dashboard, drawn from nothing in a tab of its own (reading 21).
 */
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocation, useSearch } from "wouter";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { Plus } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditHistoryQueryKey,
  getGetHomeQueryKey,
  getGetTimelineAccessQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  useGetCreditHistory,
  useGetCredits,
  useListGifts,
  useListProfiles,
  useListReports,
  type CreditHistoryItem,
  type FirstSteps as FirstStepsData,
  type Home,
  type HomePair,
  type PriceItem,
} from "@workspace/api-client-react";
import type { BundleId } from "@workspace/commerce";
import { AccountMenu } from "@/components/AccountMenu";
import { BundleButtons } from "@/components/BundleList";
import { CompatibilityPicker } from "@/components/CompatibilityPicker";
import { StatusDots } from "@/components/StatusDots";
import { Wordmark } from "@/components/Wordmark";
import { AddSomeoneSheet } from "@/components/dashboard/AddSomeoneSheet";
import { CompatibilityRows } from "@/components/dashboard/CompatibilityRows";
import { CreditPill, CreditRow } from "@/components/dashboard/CreditPill";
import { CreditsSheet } from "@/components/dashboard/CreditsSheet";
import { ChoiceButton, FirstSteps } from "@/components/dashboard/FirstSteps";
import { GiftFlow } from "@/components/dashboard/GiftFlow";
import { Nudge } from "@/components/dashboard/Nudge";
import { Orbit } from "@/components/dashboard/Orbit";
import { PeopleRows } from "@/components/dashboard/PeopleRows";
import { Practising } from "@/components/dashboard/Practising";
import { QuickLook } from "@/components/dashboard/QuickLook";
import { TimelineTeaser } from "@/components/dashboard/TimelineTeaser";
import { WaitingGiftCard } from "@/components/dashboard/WaitingGiftCard";
import { YourPairs } from "@/components/dashboard/YourPairs";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHome } from "@/hooks/useHome";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { checkoutHref } from "@/lib/checkout-view";
import { openFrom, returnPath, signInFirst, withoutOpen, type AskingStep } from "@/lib/credits-view";
import {
  EMPTY_HOME, FIRST_VISIT, FIRST_VISIT_LINES, VISITOR, firstVisitNote, isFirstVisit, ownFinished, useVisitorGate,
  visitorAsked, visitorStep, withoutVisitor, type VisitorTap,
} from "@/lib/first-visit";
import {
  MAKE_REPORT, canPair, hideSteps, ownIds, pairFrom, quickLookFor, stepsHidden, withoutPair,
} from "@/lib/home-view";
import { nudgeFor, type Nudge as NudgeData } from "@/lib/nudges";
import { CENTRE_ID, circlePoints, partnersOf } from "@/lib/orbit";
import { preselectPair, type PairSelection } from "@/lib/pair-selection";
import { usePageTitle } from "@/lib/page-title";
import { usePrices } from "@/lib/prices";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { useShownZone } from "@/lib/reader-zone";
import { first } from "@/lib/share-card";
import { useTimelineAccess } from "@/lib/timeline-access";
import { cn } from "@/lib/utils";

// Your week and Ask bring the dial, Timeline's pieces and the sky engine with them, so a reader without Timeline never
// downloads them.
const YourWeek = lazy(() => import("@/components/dashboard/YourWeek"));
const AskLauncher = lazy(() => import("@/components/ask/AskLauncher"));

/** The phone sheet's first stop, a share of the screen: the quick look's head and triad, with the circle above still in view to tap. */
const PEEK = 0.45;
const SHEET_HEIGHT = 0.96;
/** The report's easing (annex, Micro animations: the phone sheet slides up on it). */
const EASE = [0.16, 1, 0.3, 1] as const;
const POLL_MS = 3000;
const UNDER_WAY = new Set(["pending", "computing", "interpreting", "revising"]);
// The ledger names a received gift "A gift from {giver}" (credits.ts): the one place its giver reaches the recipient.
const GIFT_FROM = /^A gift from (.+)$/;

type View = "circle" | "people" | "compatibility";
const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: "circle", label: "Circle" },
  { id: "people", label: "People" },
  { id: "compatibility", label: "Compatibility" },
];

// The approved mock's type for a section's eyebrow, in the tokens' own colours, since the page draws outside the report's scope.
const EYEBROW = "font-label text-[11px] font-medium uppercase leading-[1.4] tracking-[0.18em]";
const HINT = "text-center text-xs leading-snug text-[#9AA3B5]";
const CIRCLE_HINT = "Tap someone for a quick look";
const ROWS_HINT = "Tap a row to open the report";
const PANEL = "min-w-0 rounded-[14px] border border-[#242C3B] bg-[#11161F]";
const CLOSE =
  "rounded px-1 py-1 font-label text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function underWay(status: string | undefined): boolean {
  return !!status && UNDER_WAY.has(status);
}

function writing(status: string | undefined): boolean {
  return status === "pending" || status === "computing" || status === "interpreting";
}

/** A pair the reader can still open: not failed, and not closed by a stop (MB-103 provisional). */
function opens(pair: HomePair): boolean {
  return pair.status !== "failed" && !pair.stoppedBy;
}

function plural(n: number, one: string): string {
  return `${n} ${one}${n === 1 ? "" : "s"}`;
}

/**
 * The line under "Dashboard", in the approved mock's words: the Personal
 * reports the reader can read, with "you" while theirs is the only one, then
 * the Compatibility reports they can open.
 */
function summaryLine(home: Home): string {
  // A failed report keeps its seat so it can say so (R12-26), but it is not a report the reader has.
  const you = home.you && home.you.status !== "failed" ? home.you : null;
  const personal = (you ? 1 : 0) + home.people.filter((p) => p.status !== "failed").length;
  const pairs = home.pairs.filter(opens).length;
  if (personal === 0 && pairs === 0) return `Start with your own ${PERSONAL_REPORT}.`;
  const reports = plural(personal, "report");
  if (pairs > 0) return `${reports} · ${plural(pairs, COMPATIBILITY_REPORT)}`;
  return you && personal === 1 ? `${reports} · you` : reports;
}

function giftGiver(history: readonly CreditHistoryItem[] | undefined): string | null {
  const gift = history?.find((item) => item.kind === "gift");
  if (!gift) return null;
  return GIFT_FROM.exec(gift.label.trim())?.[1] ?? "Someone";
}

/**
 * GET /home follows the lists the rows' own routes refresh (reading 4): a
 * share, a mark, a delete, a birth time, a new pair or a gift sent invalidates
 * those, and the circle and Your first steps must move with them. Structural
 * sharing keeps a list's reference while nothing in it changed, so a poll that
 * finds nothing new refetches nothing, and the first load of each is not a
 * change.
 */
function useHomeFollows(reports: unknown, profiles: unknown, gifts: unknown): void {
  const client = useQueryClient();
  const last = useRef<{ reports: unknown; profiles: unknown; gifts: unknown } | null>(null);
  useEffect(() => {
    const was = last.current;
    last.current = { reports, profiles, gifts };
    if (!was) return;
    const moved = ([["reports", reports], ["profiles", profiles], ["gifts", gifts]] as const).some(
      ([key, now]) => was[key] !== undefined && now !== undefined && was[key] !== now,
    );
    if (moved) void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
  }, [client, reports, profiles, gifts]);
}

/**
 * Circle · People · Compatibility, one switch on every size (reading 1): a
 * tab list, so the arrow keys move along it and the view follows.
 */
function ViewSwitch({ view, onChange, ids }: { view: View; onChange: (view: View) => void; ids: Record<View, { tab: string; panel: string }> }) {
  const tabs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = VIEWS.findIndex((v) => v.id === view);
    const to =
      e.key === "ArrowRight" ? (at + 1) % VIEWS.length
      : e.key === "ArrowLeft" ? (at - 1 + VIEWS.length) % VIEWS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? VIEWS.length - 1
      : null;
    if (to === null) return;
    e.preventDefault();
    onChange(VIEWS[to].id);
    tabs.current[VIEWS[to].id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Your circle"
      onKeyDown={onKeyDown}
      className="flex gap-0.5 rounded-[10px] border border-[#242C3B] bg-[#0B0F15] p-[3px] md:max-w-[440px]"
    >
      {VIEWS.map(({ id, label }) => {
        const on = id === view;
        return (
          <button
            key={id}
            ref={(el) => {
              tabs.current[id] = el;
            }}
            type="button"
            role="tab"
            id={ids[id].tab}
            aria-selected={on}
            aria-controls={ids[id].panel}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-9 flex-1 rounded-[7px] px-2 font-label text-[12.5px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]",
              on ? "bg-[#171D29] text-[#E8EBF2]" : "text-[#9AA3B5] hover:text-[#E8EBF2]",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface FirstVisitPanelProps {
  /** `usePrices().items`, so a live campaign shows on its button (reading 6); null keeps the catalogue's. */
  prices: readonly PriceItem[] | null;
  /** Each bundle's checkout, which comes back to the birth form for You; in the admin's preview, a tap said instead. */
  bundles: { buy: (id: BundleId) => string } | { onPick: (id: BundleId) => void };
  /**
   * With a credit to spend, the button that starts the reader's own report, under a claimed gift's suggestion of it
   * (ADR-139); null at zero, where the bundles show.
   */
  start: { gift: NudgeData | null; onOwnReport: () => void } | null;
}

/**
 * The first visit (Review 05/10 §1, reading 20): beside the circle with You, one heading, one line and the three
 * bundles as buttons, each through checkout and back to the birth form for You (ADR-389), and nothing else: no
 * Practising, no Ask and no second Get credits. With a credit already held, the bundles would only sell it again, so the
 * one button starts the reader's own report, as Make a report's first button does (ADR-334).
 */
function FirstVisitPanel({ prices, bundles, start }: FirstVisitPanelProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid gap-4">
      <div className="grid gap-1.5">
        <h3 id={headingId} className="font-display text-2xl leading-[1.2]">
          {FIRST_VISIT.heading}
        </h3>
        <p className="text-sm leading-[1.5] text-[#9AA3B5]">{FIRST_VISIT.line}</p>
      </div>
      {start ? (
        <div className="grid gap-3">
          {start.gift && <Nudge nudge={start.gift} />}
          <ChoiceButton title={MAKE_REPORT.yours.title} line={MAKE_REPORT.yours.line} main onClick={start.onOwnReport} />
        </div>
      ) : (
        <div className="grid gap-3">
          <BundleButtons prices={prices} lines={FIRST_VISIT_LINES} {...bundles} />
          <p className="text-[12.5px] leading-snug text-[#9AA3B5]">{firstVisitNote()}</p>
        </div>
      )}
    </section>
  );
}

/** More than one report is marked as the reader's, so the centre waits until People settles which (reading 3). */
function SeveralPanel({ onPeople }: { onPeople: () => void }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn(PANEL, "grid gap-2 p-4")}>
      <h3 id={headingId} className="font-display text-xl leading-[1.2]">
        Your report
      </h3>
      <p className="text-[13px] leading-[1.5] text-[#9AA3B5]">
        More than one is marked as yours. In{" "}
        <button type="button" onClick={onPeople} className="rounded-sm text-[#E8EBF2] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          People
        </button>
        , choose Not me on any that isn't.
      </p>
    </section>
  );
}

interface MakeReportProps {
  /** The reader has a Personal report of their own, in any state: the first button turns to one for someone. */
  own: boolean;
  /** `canPair(home)`: Compatibility shows only then (ADR-332). */
  pairable: boolean;
  /** Hide hands the focus here once the card has gone. */
  focusRef: (el: HTMLElement | null) => void;
  onOwnReport: () => void;
  onAddSomeone: () => void;
  onPair: () => void;
}

/**
 * Make a report (ADR-334), the artifact's screen A: two actions of one weight side by side, the main one by colour
 * only (ADR-333), Compatibility the main one once it shows. Alone, the one button is the main one.
 */
function MakeReport({ own, pairable, focusRef, onOwnReport, onAddSomeone, onPair }: MakeReportProps) {
  const headingId = useId();
  return (
    // A section, not a control, takes the focus from Hide, so a stray Enter starts nothing (R14-12).
    <section ref={focusRef} tabIndex={-1} aria-labelledby={headingId} className="grid gap-2.5 outline-none">
      <h3 id={headingId} className={cn(EYEBROW, "text-[#9AA3B5]")}>
        {MAKE_REPORT.label}
      </h3>
      <div className={cn("grid gap-2", pairable && "grid-cols-2")}>
        {own ? (
          <ChoiceButton title={MAKE_REPORT.someone.title} line={MAKE_REPORT.someone.line} main={!pairable} onClick={onAddSomeone} />
        ) : (
          <ChoiceButton title={MAKE_REPORT.yours.title} line={MAKE_REPORT.yours.line} main onClick={onOwnReport} />
        )}
        {pairable && <ChoiceButton title={MAKE_REPORT.pair.title} line={MAKE_REPORT.pair.line} main={own} onClick={onPair} />}
      </div>
    </section>
  );
}

interface IdlePanelProps {
  /** The circle has someone to tap; on a phone the line sits under the circle instead. */
  hint: boolean;
  /**
   * Your first steps, while the server sends them, the reader's own report is finished and they have not hidden them
   * (readings 18, 20).
   */
  steps: FirstStepsData | null;
  make: Omit<MakeReportProps, "onPair">;
  onHideSteps: () => void;
  onMakePair: (profileId: string) => void;
  onPair: () => void;
  onGetCredits: () => void;
}

/**
 * The panel beside the circle while no quick look is open, under it on a phone, once the reader has a report of their
 * own: where one will open, then Your first steps until the first pair, else Make a report, over the credit row. One
 * holds the panel at a time, so it never offers the same thing twice.
 */
function IdlePanel({ hint, steps, make, onHideSteps, onMakePair, onPair, onGetCredits }: IdlePanelProps) {
  return (
    <div className={cn(PANEL, "grid gap-4 p-4 md:p-[18px]")}>
      {hint && <p className="hidden text-[13px] leading-[1.45] text-[#9AA3B5] md:block">{CIRCLE_HINT}</p>}
      {steps ? (
        <FirstSteps steps={steps} onAddSomeone={make.onAddSomeone} onMakePair={onMakePair} onHide={onHideSteps} />
      ) : (
        <MakeReport {...make} onPair={onPair} />
      )}
      <CreditRow onGetCredits={onGetCredits} />
    </div>
  );
}

/**
 * The desktop panel's frame. A quick look draws its own close, so the frame
 * draws one only for what has none, a waiting gift's card.
 */
function CardFrame({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  return (
    <div className={cn(PANEL, "bg-[rgba(17,22,31,.86)] px-[18px] py-4")}>
      {onClose && (
        <div className="-mt-2 mb-1 flex justify-end">
          <button type="button" onClick={onClose} className={CLOSE}>
            Close
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

interface PhoneSheetProps {
  open: boolean;
  /** The open quick look's point, so each new one rises from the peek with its top in view. */
  cardKey: string | null;
  label: string;
  /** The content draws its own close, as a quick look does; a waiting gift's card has none, so the sheet's top carries one. */
  closes: boolean;
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
 * The quick look as a bottom sheet on a phone (scope 3): a peek, a drag up
 * for the rest. It is not modal, so the circle above stays live: a tap on
 * empty sky closes it and a tap on someone else swaps it. vaul's non-modal
 * drawer still blocks the page when it is opened from state, so the sheet is
 * drawn here.
 */
function PhoneSheet({ open: shown, cardKey, label, closes, onClose, children }: PhoneSheetProps) {
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
    if (!shown) return;
    const controls = animate(y, full ? 0 : peekY, glide(reduced));
    return () => controls.stop();
  }, [shown, full, peekY, reduced, y]);

  // Escape inside the sheet closes it; the circle already answers Escape pressed anywhere outside a dialog.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (e.target instanceof Node && sheet.current?.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

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
      {shown && (
        <motion.div
          key="sheet"
          ref={sheet}
          role="dialog"
          aria-modal="false"
          aria-label={label}
          drag="y"
          dragControls={drag}
          // At the peek the whole sheet drags up; once open, only its top does, so the quick look scrolls.
          dragListener={!full}
          dragConstraints={{ top: 0, bottom: height }}
          dragElastic={{ top: 0.04, bottom: 0.3 }}
          dragMomentum={false}
          onDragEnd={settle}
          exit={{ y: height, transition: reduced ? { duration: 0 } : { duration: 0.35, ease: EASE } }}
          style={{ y, height }}
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[20px] border border-b-0 border-[#3A4560] bg-[#171D29] shadow-[0_-18px_44px_rgba(0,0,0,.65)]"
        >
          <div
            onPointerDown={(e) => {
              if (full) drag.start(e);
            }}
            className="relative flex h-10 shrink-0 touch-none items-center justify-center"
          >
            <button
              type="button"
              aria-label="Show all"
              aria-expanded={full}
              onClick={() => setFull((was) => !was)}
              className="grid h-8 w-16 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span aria-hidden className="block h-1 w-10 rounded-full bg-[#3A4560]" />
            </button>
            {!closes && (
              <button type="button" onClick={onClose} className={cn(CLOSE, "absolute right-4 top-1/2 -translate-y-1/2")}>
                Close
              </button>
            )}
          </div>
          <div
            ref={scroller}
            className={cn(
              "min-h-0 flex-1 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
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

/** The page's bar: the wordmark, and whatever the view puts at its right. */
function DashboardNav({ children }: { children: ReactNode }) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </nav>
  );
}

/** The preview's ribbon, under the bar and kept in sight while the page scrolls: what this is, the last tap, and Leave. */
function PreviewRibbon({ said, onLeave }: { said: string | null; onLeave: () => void }) {
  return (
    <div className="sticky top-14 z-40 mt-14 border-b border-[#5A4C2C] bg-[#171D29]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="shrink-0 font-label text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#D4B06A]">Preview</span>
        <p role="status" className="min-w-0 flex-1 text-[13px] leading-snug text-[#E8EBF2]">
          {said ?? VISITOR.intro}
        </p>
        <button
          type="button"
          onClick={onLeave}
          aria-label={VISITOR.leaveLabel}
          className="inline-flex min-h-8 shrink-0 items-center rounded-md px-2 font-label text-[12.5px] font-medium text-[#9FA8DA] underline-offset-4 transition-colors hover:text-[#E8EBF2] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AEB8F0]"
        >
          {VISITOR.leave}
        </button>
      </div>
    </div>
  );
}

const VISITOR_PILL =
  "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-transparent px-2.5 font-label text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-[#9FA8DA]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const NO_ONE: readonly [] = [];

/**
 * The admin's look at a new visitor's dashboard (ADR-389, reading 21): the first visit drawn from an empty home and no
 * credits, as a visitor who isn't signed in meets it, under the Preview ribbon. It asks for nothing: no home, credits,
 * gifts, prices or Timeline, and no Ask, so the bundles carry the catalogue's prices and the admin's name and menu
 * stay out. A tap says which step it would open and stays. It is a drawing, not a second session, so nothing lets a
 * browser name one (ADR-197).
 */
function NewVisitorView({ onLeave }: { onLeave: () => void }) {
  const circleId = useId();
  const [said, setSaid] = useState<string | null>(null);
  const say = useCallback((tap: VisitorTap) => setSaid(visitorStep(tap)), []);
  const points = useMemo(
    () => circlePoints({ you: EMPTY_HOME.you, people: EMPTY_HOME.people, pairs: EMPTY_HOME.pairs, gifts: NO_ONE, credits: 0 }),
    [],
  );
  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <DashboardNav>
        <button type="button" onClick={() => say("credits")} className={VISITOR_PILL}>
          <span className="font-numeric text-xs">0</span> credits
        </button>
        <Button size="sm" variant="ghost" className="font-label text-xs" onClick={() => say("sign-in")}>
          Sign in
        </Button>
      </DashboardNav>
      <PreviewRibbon said={said} onLeave={onLeave} />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-[18px] sm:px-6 sm:pt-6">
        <header className="grid gap-1">
          <h1 className="font-display text-[30px] font-normal leading-[1.15] tracking-[-0.01em]">Dashboard</h1>
        </header>
        <section aria-labelledby={circleId} className="mt-6 grid gap-2.5 md:mt-8">
          <h2 id={circleId} className={cn(EYEBROW, "text-[#8E9BE0]")}>
            Your circle
          </h2>
          <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <div className="mx-auto w-full min-w-0 max-w-[360px] md:max-w-none">
              <Orbit
                centre={{ firstName: "", hasReport: false, writing: false }}
                points={points}
                selectedId={null}
                partners={NO_ONE}
                onSelect={(id) => {
                  if (id === CENTRE_ID) say("centre");
                }}
              />
            </div>
            <div className="min-w-0">
              <FirstVisitPanel prices={null} bundles={{ onPick: say }} start={null} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * `?visitor=new` waits, asking for nothing of the reader's, until it knows the admin is looking; anyone else drops the
 * query and gets their own dashboard (reading 21).
 */
function VisitorGate({ search }: { search: string }) {
  const [, navigate] = useLocation();
  const gate = useVisitorGate();
  useEffect(() => {
    if (gate === "dashboard") navigate(withoutVisitor(search), { replace: true });
  }, [gate, search, navigate]);
  if (gate === "preview") return <NewVisitorView onLeave={() => navigate(withoutVisitor(search), { replace: true })} />;
  return (
    <div className="grid min-h-screen place-items-center bg-background bg-stars font-label text-sm text-muted-foreground">
      <StatusDots label="Loading your dashboard" />
    </div>
  );
}

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const search = useSearch();
  return visitorAsked(search) ? <VisitorGate search={search} /> : <Dashboard />;
}

function Dashboard() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { isSignedIn } = useAuth();
  const phone = useIsMobile();
  const viewIds = useId();
  const { items: prices } = usePrices();

  const homeQ = useHome();
  const reportsQ = useListReports({
    query: {
      queryKey: getListReportsQueryKey(),
      refetchInterval: (query) => {
        const data = query.state.data;
        return Array.isArray(data) && data.some((r) => underWay(r.status)) ? POLL_MS : false;
      },
    },
  });
  const profilesQ = useListProfiles({ query: { queryKey: getListProfilesQueryKey() } });
  const giftsQ = useListGifts();
  const available = useGetCredits().data?.available;
  useHomeFollows(reportsQ.data, profilesQ.data, giftsQ.data);

  const home = homeQ.data ?? null;
  const reports = useMemo(() => (Array.isArray(reportsQ.data) ? reportsQ.data : []), [reportsQ.data]);
  const profiles = useMemo(() => (Array.isArray(profilesQ.data) ? profilesQ.data : []), [profilesQ.data]);
  const gifts = useMemo(() => (Array.isArray(giftsQ.data) ? giftsQ.data : []), [giftsQ.data]);
  const loaded = !!home && Array.isArray(reportsQ.data) && Array.isArray(profilesQ.data);
  const failed = !loaded && (homeQ.isError || reportsQ.isError || profilesQ.isError);

  // Zero means zero on every host (ADR-275); a balance still loading is neither.
  const out = available !== undefined && available <= 0;
  const settled = available !== undefined;

  const you = home?.you ?? null;
  const several = home?.several ?? false;
  const people = useMemo(() => home?.people ?? [], [home]);
  const empty = !!home && !you && !several && people.length === 0 && home.pairs.length === 0;
  const alone = !!you && people.length === 0;
  // One or the other, and the teaser never on an empty dashboard nor beside Your week (reading 26).
  const week = home?.week ?? null;
  const teaser = home && !week && !empty ? (home.teaser ?? null) : null;
  // Both print the reader's days: with no zone from the browser, the birth place's, which the server reads them in.
  const birthZone = you ? profiles.find((p) => p.id === you.profileId)?.timezone : undefined;
  const zone = useShownZone(!!week, birthZone);

  const firstVisit = !!home && isFirstVisit(home);
  const ownDone = !!home && ownFinished(home);

  // Ask needs Timeline and a finished Personal report of the reader's own (Review 05/10 §1), as AskLauncher reads them.
  // Once drawn, Ask stays: a chat open when access goes keeps its refusal on screen until the reader closes it.
  const { access, hasPersonalReport } = useTimelineAccess();
  const [asks, setAsks] = useState(false);
  useEffect(() => {
    if (access && hasPersonalReport) setAsks(true);
  }, [access, hasPersonalReport]);
  // Access is read once a visit, so when this page sees the reader's own report finish it reads access again, rather
  // than leave Ask out until the next visit.
  const client = useQueryClient();
  useEffect(() => {
    if (access && !hasPersonalReport && ownDone) void client.invalidateQueries({ queryKey: getGetTimelineAccessQueryKey() });
  }, [access, hasPersonalReport, ownDone, client]);

  const history = useGetCreditHistory({
    query: { queryKey: getGetCreditHistoryQueryKey(), enabled: loaded && !you && !several },
  });
  const giftFrom = giftGiver(history.data);
  const giftNudge = giftFrom && !you && !several && !out
    ? nudgeFor({ claimedGift: { giverName: giftFrom, hasOwnChart: false } })
    : null;
  const circleNudge = nudgeFor({ alone, credits: available });

  const [view, setView] = useState<View>("circle");
  const [selection, setSelection] = useState<{ id: string; giftId?: string } | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  // The picker's pop-up and the two it opens with; empty opens it on whatever the tab last kept (reading 2).
  const [picker, setPicker] = useState<{ preselect: Partial<PairSelection> } | null>(null);
  const pairable = !!home && canPair(home);
  const own = useMemo(() => (home ? ownIds(home) : new Set<string>()), [home]);
  // Hide is kept in the browser (reading 18), and Make a report takes the card's place. The steps start from the
  // reader's own finished report (reading 20), so till then Make a report stands there too.
  const [stepsOff, setStepsOff] = useState(() => stepsHidden());
  const steps = stepsOff || !ownDone ? null : (home?.firstSteps ?? null);
  const focusMake = useRef(false);

  // A balance still loading is not zero, so the add point waits as Add someone rather than flashing Get credits.
  const points = useMemo(
    () => (home ? circlePoints({ you: home.you, people: home.people, pairs: home.pairs, gifts, credits: available ?? 1 }) : []),
    [home, gifts, available],
  );

  const ids = useMemo(
    () => Object.fromEntries(VIEWS.map(({ id }) => [id, { tab: `${viewIds}-${id}-tab`, panel: `${viewIds}-${id}` }])) as Record<View, { tab: string; panel: string }>,
    [viewIds],
  );

  // A gift opened from its seat stays open when it is claimed or taken back meanwhile, so its card can say so.
  const openGift = view === "circle" && selection?.giftId ? (gifts.find((g) => g.id === selection.giftId) ?? null) : null;
  const look = view === "circle" && selection && !selection.giftId ? quickLookFor(home, selection.id) : null;
  const active = look || openGift ? (selection?.id ?? null) : null;

  const openCredits = useCallback(() => setCreditsOpen(true), []);
  // Each asking step's checkout comes back to that step (reading 2). Only an account buys (reading 1), so a reader
  // without one signs in on the way, which a guarded route's own redirect would do without the checkout's query.
  const buyHref = useCallback(
    (item: BundleId | null, step: AskingStep) => signInFirst(checkoutHref(item, returnPath(step)), isSignedIn === false),
    [isSignedIn],
  );
  const getCredits = useCallback((step: AskingStep) => navigate(buyHref(null, step)), [navigate, buyHref]);
  // At zero Add someone has nothing to offer yet, so its door is the checkout that comes back to it.
  const openAdd = useCallback(() => (out ? getCredits("add") : setAddOpen(true)), [out, getCredits]);
  const ownReport = useCallback(() => navigate("/chart?self=1"), [navigate]);
  const toView = useCallback((next: View) => {
    setSelection(null);
    setView(next);
  }, []);

  const onSelect = useCallback(
    (id: string | null) => {
      if (id === null) {
        setSelection(null);
        return;
      }
      if (id === CENTRE_ID) {
        if (you) {
          setSelection({ id });
          return;
        }
        setSelection(null);
        if (several) toView("people");
        else if (out) getCredits("chart");
        else ownReport();
        return;
      }
      const tapped = points.find((p) => p.id === id);
      // A ghost seat is nobody yet: it shows who could join and opens nothing.
      if (!tapped || tapped.kind === "ghost") return;
      if (tapped.kind === "add") {
        setSelection(null);
        openAdd();
        return;
      }
      setSelection({ id, giftId: tapped.giftId });
    },
    [you, several, out, getCredits, ownReport, openAdd, toView, points],
  );

  const closeCard = useCallback(() => {
    const was = selection?.id;
    setSelection(null);
    // Back to the point the quick look opened from, so a keyboard reader keeps their place on the circle.
    if (was) document.querySelector<SVGElement>(`[data-orbit-id="${CSS.escape(was)}"]`)?.focus();
  }, [selection]);

  const openPicker = useCallback((preselect: Partial<PairSelection> = {}) => setPicker({ preselect }), []);
  const twoPeople = useCallback(() => openPicker(), [openPicker]);
  const makePair = useCallback(
    (profileId: string) => {
      const theirs = home?.people.find((p) => p.profileId === profileId)?.reportId ?? "";
      openPicker(preselectPair(you?.reportId ?? "", theirs));
    },
    [home, you, openPicker],
  );
  // `canPair` gates every way in, so a pop-up asked for before the page could tell, or after a report it needs has
  // gone, stays shut (ADR-332).
  const pickerOpen = !!picker && loaded && pairable;
  useEffect(() => {
    if (loaded && !pairable) setPicker(null);
  }, [loaded, pairable]);

  const hideFirstSteps = useCallback(() => {
    hideSteps();
    focusMake.current = true;
    setStepsOff(true);
  }, []);
  const makeRef = useCallback((el: HTMLElement | null) => {
    if (!el || !focusMake.current) return;
    focusMake.current = false;
    el.focus();
  }, []);

  // A checkout comes back to the step that asked (reading 2): the sheet, the gift flow, Add someone, or the picker,
  // whose pair the tab still remembers. The query goes as the step opens, so a reload or Back never opens it again.
  const reopen = openFrom(search);
  useEffect(() => {
    if (!reopen) return;
    navigate(withoutOpen(search), { replace: true });
    if (reopen === "credits") setCreditsOpen(true);
    else if (reopen === "gift") setGiftOpen(true);
    else if (reopen === "add") setAddOpen(true);
    else openPicker();
  }, [reopen, search, navigate, openPicker]);

  // `?pair=<profileId>` (Ask's offer, ADR-336) opens the picker with the reader and that person picked, once the page
  // knows who they are; the query goes as it opens, as `?open=` does.
  const pairWith = pairFrom(search);
  useEffect(() => {
    if (!pairWith || !loaded) return;
    navigate(withoutPair(search), { replace: true });
    if (pairable) makePair(pairWith);
  }, [pairWith, loaded, pairable, search, navigate, makePair]);

  let card: ReactNode = null;
  let cardLabel = "";
  let cardCloses = true;
  if (look) {
    cardLabel = look.self ? "Your quick look" : `Quick look at ${first(look.person.name)}`;
    card = (
      <div className="grid gap-3.5">
        <QuickLook
          key={look.self ? CENTRE_ID : look.person.profileId}
          person={look.person}
          pair={look.pair}
          self={look.self}
          onClose={closeCard}
          onMakePair={makePair}
        />
        {look.self && circleNudge && <Nudge nudge={circleNudge} />}
      </div>
    );
  } else if (openGift) {
    cardLabel = `Gift for ${openGift.recipientName}`;
    cardCloses = false;
    card = <WaitingGiftCard key={openGift.id} gift={openGift} onTakenBack={() => setSelection(null)} />;
  }

  const partners = !home || !active ? [] : partnersOf(active === CENTRE_ID ? (you?.profileId ?? "") : active, home.pairs);

  // Without a report of their own the panel waits for the balance, so it never offers one start and then the other.
  const lead = !home ? null
    : several ? <SeveralPanel onPeople={() => toView("people")} />
    : firstVisit ? (settled ? (
      <FirstVisitPanel
        prices={prices}
        bundles={{ buy: (id) => buyHref(id, "chart") }}
        start={out ? null : { gift: giftNudge, onOwnReport: ownReport }}
      />
    ) : null)
    : null;
  const idle = !!home && !!you ? (
    <IdlePanel
      hint={!empty}
      steps={steps}
      make={{ own: true, pairable, focusRef: makeRef, onOwnReport: ownReport, onAddSomeone: openAdd }}
      onHideSteps={hideFirstSteps}
      onMakePair={makePair}
      onPair={twoPeople}
      onGetCredits={openCredits}
    />
  ) : null;

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <DashboardNav>
        <CreditPill onOpen={openCredits} />
        {out ? (
          // The first visit's bundles are its one way to credits, so it draws no second Get credits (Review 05/10 §1).
          // Elsewhere the pill opens the same sheet, so a phone, which also has Sign in to fit, keeps the one control.
          firstVisit ? null : (
            <Button size="sm" variant="outline" onClick={openCredits} className="hidden font-label sm:inline-flex">
              Get credits
            </Button>
          )
        ) : (
          <Button size="sm" variant="outline" onClick={openAdd} aria-label="Add someone" className="gap-1.5 font-label" data-testid="button-add-someone">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add someone</span>
          </Button>
        )}
        <AccountMenu />
      </DashboardNav>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-[74px] sm:px-6 sm:pt-20">
        <header className="grid gap-1">
          <h1 className="font-display text-[30px] font-normal leading-[1.15] tracking-[-0.01em]">Dashboard</h1>
          {/* An empty dashboard's line would only repeat the first visit's heading. */}
          {home && !empty && <p className="text-[13px] leading-snug text-[#9AA3B5]">{summaryLine(home)}</p>}
        </header>

        {failed ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">We couldn't load your reports. Check your connection and try again.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void homeQ.refetch();
                void reportsQ.refetch();
                void profilesQ.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : !loaded || !home ? (
          <div className="grid min-h-[360px] place-items-center font-label text-sm text-muted-foreground">
            <StatusDots label="Loading your dashboard" />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:mt-8 md:gap-10">
            <section aria-labelledby={`${viewIds}-circle`} className="grid gap-2.5">
              <h2 id={`${viewIds}-circle`} className={cn(EYEBROW, "text-[#8E9BE0]")}>
                Your circle
              </h2>
              {!empty && <ViewSwitch view={view} onChange={toView} ids={ids} />}

              {view === "circle" || empty ? (
                <div
                  {...(empty ? {} : { role: "tabpanel", id: ids.circle.panel, "aria-labelledby": ids.circle.tab })}
                  className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]"
                >
                  <div className="grid min-w-0 gap-1.5 md:sticky md:top-20">
                    <div className="mx-auto w-full max-w-[360px] md:max-w-none">
                      <Orbit
                        centre={{ firstName: you ? first(you.name) : "", hasReport: !!you, writing: writing(you?.status) }}
                        points={points}
                        selectedId={active}
                        partners={partners}
                        onSelect={onSelect}
                      />
                    </div>
                    {/* On a wide screen with nothing open, the panel beside the circle says it instead. */}
                    {!empty && <p className={cn(HINT, !lead && idle && "md:hidden")}>{CIRCLE_HINT}</p>}
                  </div>
                  <div className="min-w-0">
                    {!phone && card ? <CardFrame onClose={cardCloses ? undefined : closeCard}>{card}</CardFrame> : (lead ?? idle)}
                  </div>
                </div>
              ) : view === "people" ? (
                <div role="tabpanel" id={ids.people.panel} aria-labelledby={ids.people.tab} className="grid gap-2.5">
                  <PeopleRows />
                  <p className={HINT}>{ROWS_HINT}</p>
                </div>
              ) : (
                <div role="tabpanel" id={ids.compatibility.panel} aria-labelledby={ids.compatibility.tab} className="grid gap-2.5">
                  {pairable && (
                    <Button onClick={twoPeople} className="mb-1 gap-1.5 justify-self-start font-label">
                      <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                      {MAKE_REPORT.newPair}
                    </Button>
                  )}
                  <CompatibilityRows />
                  <p className={HINT}>{ROWS_HINT}</p>
                </div>
              )}
            </section>

            {week && zone && (
              <Suspense
                fallback={
                  <div className="grid min-h-[200px] place-items-center font-label text-sm text-muted-foreground">
                    <StatusDots label="Loading your week" />
                  </div>
                }
              >
                <YourWeek week={week} zone={zone} />
              </Suspense>
            )}
            {/* What to practise comes from a finished report of the reader's own, so before one there's nothing, not a sample (reading 20). */}
            {ownDone && <Practising items={home.practising} />}
            <YourPairs pairs={home.pairs} />
            {teaser && zone && <TimelineTeaser teaser={teaser} zone={zone} />}
          </div>
        )}
      </main>

      {asks && (
        <Suspense fallback={null}>
          <AskLauncher />
        </Suspense>
      )}

      {phone && (
        <PhoneSheet open={!!card} cardKey={card ? active : null} label={cardLabel} closes={cardCloses} onClose={closeCard}>
          {card}
        </PhoneSheet>
      )}

      <CreditsSheet
        open={creditsOpen}
        onClose={() => setCreditsOpen(false)}
        onAddSomeone={openAdd}
        onGift={() => setGiftOpen(true)}
        prices={prices}
        buy={(id) => buyHref(id, "credits")}
      />
      <AddSomeoneSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSomeoneYouKnow={() => navigate("/chart")}
        onGift={() => setGiftOpen(true)}
        onTwoPeople={pairable ? twoPeople : undefined}
        onGetCredits={() => getCredits("add")}
      />
      <GiftFlow open={giftOpen} onClose={() => setGiftOpen(false)} onGetCredits={() => getCredits("gift")} />
      <CompatibilityPicker
        open={pickerOpen}
        onClose={() => setPicker(null)}
        reports={loaded ? reports : undefined}
        preselect={picker?.preselect ?? null}
        own={own}
        onGetCredits={() => getCredits("pair")}
      />
    </div>
  );
}
