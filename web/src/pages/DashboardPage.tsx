/**
 * The dashboard as a home (Review 01/10, ADR-171, 174, 182): "Dashboard" with
 * a one-line summary, Your circle in three views, what the reader is
 * practising, their pairs and, last, their stories, designed at 390 px first.
 * One GET /home draws all of it, so no card fetches a report on open; the
 * rows' actions, the picker, the credits, gifts and history keep their own
 * routes (reading 4). The pieces only draw and call back; the page holds the
 * view, the selection and the sheets, so the circle, a quick look and a row
 * never disagree about a person.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditHistoryQueryKey,
  getGetHomeQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  useGetCreditHistory,
  useGetCredits,
  useGetHome,
  useListGifts,
  useListProfiles,
  useListReports,
  type CreditHistoryItem,
  type Home,
  type HomePair,
} from "@workspace/api-client-react";
import { AccountMenu } from "@/components/AccountMenu";
import { BundleList } from "@/components/BundleList";
import { CompatibilityPicker } from "@/components/CompatibilityPicker";
import { StatusDots } from "@/components/StatusDots";
import { Wordmark } from "@/components/Wordmark";
import { AddSomeoneSheet } from "@/components/dashboard/AddSomeoneSheet";
import { CompatibilityRows } from "@/components/dashboard/CompatibilityRows";
import { CreditPill, CreditRow } from "@/components/dashboard/CreditPill";
import { CreditsSheet } from "@/components/dashboard/CreditsSheet";
import { GiftFlow } from "@/components/dashboard/GiftFlow";
import { Nudge } from "@/components/dashboard/Nudge";
import { Orbit } from "@/components/dashboard/Orbit";
import { PathSheet, usePathOffer } from "@/components/dashboard/PathSheet";
import { PeopleRows } from "@/components/dashboard/PeopleRows";
import { Practising } from "@/components/dashboard/Practising";
import { QuickLook } from "@/components/dashboard/QuickLook";
import { Stories } from "@/components/dashboard/Stories";
import { WaitingGiftCard } from "@/components/dashboard/WaitingGiftCard";
import { YourPairs } from "@/components/dashboard/YourPairs";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { creditsEnforced, pathHave } from "@/lib/credits-view";
import { quickLookFor } from "@/lib/home-view";
import { nudgeFor, type Nudge as NudgeData } from "@/lib/nudges";
import { CENTRE_ID, circlePoints, partnersOf } from "@/lib/orbit";
import type { PairSelection } from "@/lib/pair-selection";
import { usePageTitle } from "@/lib/page-title";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import { cn } from "@/lib/utils";

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
  const personal = (home.you ? 1 : 0) + home.people.length;
  const pairs = home.pairs.filter(opens).length;
  if (personal === 0 && pairs === 0) return `Start with your own ${PERSONAL_REPORT}.`;
  const reports = plural(personal, "report");
  if (pairs > 0) return `${reports} · ${plural(pairs, COMPATIBILITY_REPORT)}`;
  return home.you && personal === 1 ? `${reports} · you` : reports;
}

function giftGiver(history: readonly CreditHistoryItem[] | undefined): string | null {
  const gift = history?.find((item) => item.kind === "gift");
  if (!gift) return null;
  return GIFT_FROM.exec(gift.label.trim())?.[1] ?? "Someone";
}

/**
 * GET /home follows the lists the rows' own routes refresh (reading 4): a
 * share, a mark, a delete, a birth time or a new pair invalidates those, and
 * the circle must move with them. Structural sharing keeps a list's reference
 * while nothing in it changed, so a poll that finds nothing new refetches
 * nothing, and the first load of each is not a change.
 */
function useHomeFollows(reports: unknown, profiles: unknown): void {
  const client = useQueryClient();
  const last = useRef<{ reports: unknown; profiles: unknown } | null>(null);
  useEffect(() => {
    const was = last.current;
    last.current = { reports, profiles };
    if (!was || [was.reports, was.profiles, reports, profiles].some((list) => list === undefined)) return;
    if (was.reports !== reports || was.profiles !== profiles) void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
  }, [client, reports, profiles]);
}

/** A spend names its cost beside its verb (annex, Credits). */
function Spend({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick} className="justify-self-start font-label">
      {label}
      <span aria-hidden className="text-white/60">·</span>
      <span className="font-numeric">1 credit</span>
    </Button>
  );
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

interface StartPanelProps {
  /** Zero credits where credits are enforced (ADR-138): the bundles and Get credits, else the reader's own report. */
  out: boolean;
  /** The balance is known, so the panel never offers one action and then the other. */
  settled: boolean;
  /** A claimed gift's suggestion of the reader's own report (ADR-139). */
  gift: NudgeData | null;
  onOwnReport: () => void;
  onGetCredits: () => void;
}

/** Until the reader's own Personal report exists, the circle starts here (the approved mock's first state). */
function StartPanel({ out, settled, gift, onOwnReport, onGetCredits }: StartPanelProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn(PANEL, "grid gap-3.5 p-4")}>
      <div className="grid gap-1.5">
        <p className={cn(EYEBROW, "text-[#D4B06A]")}>Your circle starts with you</p>
        <h3 id={headingId} className="font-display text-2xl leading-[1.2]">
          Get your {PERSONAL_REPORT} first
        </h3>
        <p className="text-[13px] leading-[1.5] text-[#9AA3B5]">
          Ten chapters on how you think, work and love, most ending with things to try. Then add the people close to you.
        </p>
      </div>
      {gift && <Nudge nudge={gift} />}
      {settled &&
        (out ? (
          <>
            <BundleList compact />
            <Button onClick={onGetCredits} className="font-label">
              Get credits
            </Button>
            <p className="text-xs leading-snug text-[#9AA3B5]">You pay once, with no subscription.</p>
          </>
        ) : (
          // MB-113 provisional: making a report says Write, as the birth form's own button does.
          <Spend label="Write my report" onClick={onOwnReport} />
        ))}
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

/**
 * The desktop panel while no quick look is open: where one will open, the
 * circle's one line for a reader alone in it, over Add someone, or at zero
 * over the credit row's own Get credits, so the panel never offers the same
 * thing twice.
 */
function IdlePanel({ nudge, onAddSomeone, onGetCredits }: {
  nudge: NudgeData | null;
  onAddSomeone: () => void;
  onGetCredits: () => void;
}) {
  return (
    <div className={cn(PANEL, "grid gap-3.5 p-[18px]")}>
      <p className="text-[13px] leading-[1.45] text-[#9AA3B5]">{CIRCLE_HINT}</p>
      {nudge && <Nudge nudge={nudge} />}
      {nudge?.control === "add_someone" && <Spend label="Add someone" onClick={onAddSomeone} />}
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

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const [, navigate] = useLocation();
  const phone = useIsMobile();
  const enforced = creditsEnforced();
  const viewIds = useId();

  const homeQ = useGetHome({ query: { queryKey: getGetHomeQueryKey() } });
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
  useHomeFollows(reportsQ.data, profilesQ.data);

  const home = homeQ.data ?? null;
  const reports = useMemo(() => (Array.isArray(reportsQ.data) ? reportsQ.data : []), [reportsQ.data]);
  const profiles = useMemo(() => (Array.isArray(profilesQ.data) ? profilesQ.data : []), [profilesQ.data]);
  const gifts = useMemo(() => (Array.isArray(giftsQ.data) ? giftsQ.data : []), [giftsQ.data]);
  const loaded = !!home && Array.isArray(reportsQ.data) && Array.isArray(profilesQ.data);
  const failed = !loaded && (homeQ.isError || reportsQ.isError || profilesQ.isError);

  // MB-6 provisional: zero reads Get credits only where credits are enforced (ADR-138); production's soft pass still writes.
  const out = enforced && available !== undefined && available <= 0;
  const settled = !enforced || available !== undefined;

  const you = home?.you ?? null;
  const several = home?.several ?? false;
  const people = useMemo(() => home?.people ?? [], [home]);
  const empty = !!home && !you && !several && people.length === 0 && home.pairs.length === 0;
  const alone = !!you && people.length === 0;

  const history = useGetCreditHistory({
    query: { queryKey: getGetCreditHistoryQueryKey(), enabled: loaded && !you && !several },
  });
  const giftFrom = giftGiver(history.data);
  const giftNudge = giftFrom && !you && !several && !out
    ? nudgeFor({ claimedGift: { giverName: giftFrom, hasOwnChart: false } }, new Set())
    : null;
  const circleNudge = nudgeFor({ alone, credits: enforced ? available : undefined }, new Set());

  const [view, setView] = useState<View>("circle");
  const [selection, setSelection] = useState<{ id: string; giftId?: string } | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [preselect, setPreselect] = useState<Partial<PairSelection> | null>(null);
  const path = usePathOffer();
  const have = useMemo(() => pathHave({ profiles, reports }), [profiles, reports]);

  // A balance still loading is not zero, so the add point waits as Add someone rather than flashing Get credits.
  const points = useMemo(
    () => (home ? circlePoints({ you: home.you, people: home.people, pairs: home.pairs, gifts, credits: available ?? 1, enforced }) : []),
    [home, gifts, available, enforced],
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
  // Add someone hands itself to the credits sheet at zero, reading the balance as it opens; a checkout that
  // just added one credit calls this before the page renders the new balance.
  const openAdd = useCallback(() => setAddOpen(true), []);
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
        else if (out) setCreditsOpen(true);
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
    [you, several, out, ownReport, openAdd, toView, points],
  );

  const closeCard = useCallback(() => {
    const was = selection?.id;
    setSelection(null);
    // Back to the point the quick look opened from, so a keyboard reader keeps their place on the circle.
    if (was) document.querySelector<SVGElement>(`[data-orbit-id="${CSS.escape(was)}"]`)?.focus();
  }, [selection]);

  const twoPeople = useCallback(() => {
    toView("compatibility");
    // A new object each press brings the picker back into view without choosing for the reader.
    setPreselect({});
  }, [toView]);

  let card: ReactNode = null;
  let cardLabel = "";
  let cardCloses = true;
  if (look) {
    cardLabel = look.self ? "Your quick look" : `Quick look at ${first(look.person.name)}`;
    card = (
      <div className="grid gap-3.5">
        <QuickLook key={look.self ? CENTRE_ID : look.person.profileId} person={look.person} pair={look.pair} self={look.self} onClose={closeCard} />
        {look.self && circleNudge && <Nudge nudge={circleNudge} />}
      </div>
    );
  } else if (openGift) {
    cardLabel = `Gift for ${openGift.recipientName}`;
    cardCloses = false;
    card = <WaitingGiftCard key={openGift.id} gift={openGift} onTakenBack={() => setSelection(null)} />;
  }

  const partners = !home || !active ? [] : partnersOf(active === CENTRE_ID ? (you?.profileId ?? "") : active, home.pairs);

  const lead = !home ? null
    : several ? <SeveralPanel onPeople={() => toView("people")} />
    : !you ? <StartPanel out={out} settled={settled} gift={giftNudge} onOwnReport={ownReport} onGetCredits={openCredits} />
    : null;

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <CreditPill onOpen={openCredits} />
            {out ? (
              // The pill opens the same sheet, so a phone, which also has Sign in to fit, keeps the one control.
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

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-[74px] sm:px-6 sm:pt-20">
        <header className="grid gap-1">
          <h1 className="font-display text-[30px] font-normal leading-[1.15] tracking-[-0.01em]">Dashboard</h1>
          {home && <p className="text-[13px] leading-snug text-[#9AA3B5]">{summaryLine(home)}</p>}
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
                    {!empty && <p className={cn(HINT, !lead && "md:hidden")}>{CIRCLE_HINT}</p>}
                  </div>
                  <div className="min-w-0">
                    {!phone && card ? (
                      <CardFrame onClose={cardCloses ? undefined : closeCard}>{card}</CardFrame>
                    ) : lead ? (
                      lead
                    ) : !phone ? (
                      <IdlePanel nudge={circleNudge} onAddSomeone={openAdd} onGetCredits={openCredits} />
                    ) : null}
                  </div>
                </div>
              ) : view === "people" ? (
                <div role="tabpanel" id={ids.people.panel} aria-labelledby={ids.people.tab} className="grid gap-2.5">
                  <PeopleRows />
                  <p className={HINT}>{ROWS_HINT}</p>
                </div>
              ) : (
                <div role="tabpanel" id={ids.compatibility.panel} aria-labelledby={ids.compatibility.tab} className="grid gap-2.5">
                  <CompatibilityRows />
                  <p className={HINT}>{ROWS_HINT}</p>
                  {/* A select sizes itself to its longest report name, which would push a phone sideways; it takes the column's width instead. */}
                  <div className="mt-4 grid grid-cols-[minmax(0,1fr)] [&_select]:w-full [&_select]:min-w-0">
                    <CompatibilityPicker
                      reports={reports}
                      preselect={preselect}
                      openOnCreate={false}
                      enforced={enforced}
                      onGetCredits={openCredits}
                    />
                  </div>
                </div>
              )}
            </section>

            <Practising items={home.practising} />
            <YourPairs pairs={home.pairs} />
            <Stories pairs={home.pairs} />
          </div>
        )}
      </main>

      {phone && (
        <PhoneSheet open={!!card} cardKey={card ? active : null} label={cardLabel} closes={cardCloses} onClose={closeCard}>
          {card}
        </PhoneSheet>
      )}

      <CreditsSheet open={creditsOpen} onClose={() => setCreditsOpen(false)} onAddSomeone={openAdd} onGift={() => setGiftOpen(true)} />
      <AddSomeoneSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSomeoneYouKnow={() => navigate("/chart")}
        onGift={() => setGiftOpen(true)}
        onTwoPeople={twoPeople}
        onGetCredits={openCredits}
      />
      <GiftFlow open={giftOpen} onClose={() => setGiftOpen(false)} onGetCredits={openCredits} />
      <PathSheet offer={path.offer} have={have} onClose={path.dismiss} onOwnChart={ownReport} onAddSomeone={openAdd} />
    </div>
  );
}
