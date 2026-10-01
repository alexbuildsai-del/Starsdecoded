/**
 * Your circle (ADR-112, landing scope 7): the dashboard's circle and card on the
 * sample account, so a visitor meets the second person before they have one. Mira
 * sits at the centre with the people she added around her; a tap opens a card
 * with no live control, in the panel on desktop and a bottom sheet on a phone.
 * The circle's rules are the dashboard's own (`orbitPoints`, `partnersOf`), fed
 * the sample account as a profile list and its reports.
 */
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { blindRisingText, legendParts } from "@/components/dashboard/CardSections";
import { CENTRE_ID, Orbit, type OrbitLabels } from "@/components/dashboard/Orbit";
import { SkyCard } from "@/components/dashboard/SkyCard";
import { rowText, triadRows } from "@/components/report/pair-hero-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { pairTitle } from "@/lib/lenses";
import { orbitPoints, partnersOf, type OrbitProfile, type OrbitReport } from "@/lib/orbit";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import { cn } from "@/lib/utils";
import { SAMPLE_PAIRS, SAMPLE_PEOPLE, samplePerson } from "@/site/data/people";
import type { ChartData } from "@/types/chart";

const SELF = SAMPLE_PEOPLE.find((p) => p.relation === "self") ?? SAMPLE_PEOPLE[0];

/** Two of the pairs the plates show below are the account's reports, so some people wear the violet ring and some do not. */
const SHARED: readonly (readonly [string, string])[] = [SAMPLE_PAIRS.partners, SAMPLE_PAIRS.parent_child];

/** One report still being written, so the circle shows that state as the dashboard draws it. */
const WRITING = new Set(["idris"]);

const PROFILES: OrbitProfile[] = SAMPLE_PEOPLE.map((p) => ({ id: p.id, name: p.name, isSelf: p.id === SELF.id }));

const REPORTS: OrbitReport[] = [
  ...SAMPLE_PEOPLE.filter((p) => p.id !== SELF.id).map((p): OrbitReport => ({
    id: `natal:${p.id}`,
    kind: "natal",
    status: WRITING.has(p.id) ? "interpreting" : "complete",
    profileId: p.id,
    createdAt: "",
    access: "owner",
  })),
  ...SHARED.map(([x, y]): OrbitReport => ({
    id: `pair:${x}:${y}`,
    kind: "compatibility",
    status: "complete",
    profileId: null,
    participants: [x, y].map((id) => ({ id, name: samplePerson(id)?.name ?? id })),
    createdAt: "",
    access: "owner",
  })),
];

// The Add someone point is a control, and a sample card has none.
const POINTS = orbitPoints({ profiles: PROFILES, reports: REPORTS, gifts: [], credits: 0, enforced: false }).filter((p) => p.kind === "person");

/** The circle is Mira's, so it speaks of her; its own words say "you" to the dashboard's reader. */
const LABELS: OrbitLabels = {
  orbit: `${first(SELF.name)}'s circle, a sample account`,
  centre: `${first(SELF.name)}'s chart at a glance`,
  sharedPair: `has a ${COMPATIBILITY_REPORT} with ${first(SELF.name)}`,
};

const EYEBROW = "font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]";
const TAG = "font-numeric text-[10.5px] uppercase leading-none tracking-[0.14em] text-[var(--sd-muted)]";
const CLOSE =
  "rounded px-1 py-1 font-label text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const FRAME = "min-w-0 rounded-[14px] border border-[#242C3B]";

/** The phone sheet's first stop, as on the dashboard: the card's head and triad, with the circle above still in view to tap. */
const PEEK = 0.45;
const SHEET_HEIGHT = 0.96;
const EASE = [0.16, 1, 0.3, 1] as const;

const firstOf = (id: string) => first(samplePerson(id)?.name ?? id);

/** The account's reports as the dashboard's rows name them, without the row's door: a sample has no report to open. */
function SamplePairs({ pairs }: { pairs: readonly (readonly [string, string])[] }) {
  return (
    <ul className="grid gap-2">
      {pairs.map(([x, y]) => (
        <li key={`${x}:${y}`} className="rounded-xl border border-border/60 bg-card/60 px-3 py-2.5">
          <span className="mb-1 block font-label text-[10px] font-medium uppercase tracking-[0.16em] text-secondary">{COMPATIBILITY_REPORT}</span>
          <span className="block font-display text-[15px] leading-snug">{pairTitle(firstOf(x), firstOf(y))}</span>
        </li>
      ))}
    </ul>
  );
}

function sampleCard(id: string | null): { node: ReactNode; label: string } | null {
  if (id === null) return null;
  const self = id === CENTRE_ID;
  const person = self ? SELF : samplePerson(id);
  if (!person) return null;
  const pairs = SHARED.filter((pair) => pair.includes(person.id));
  return {
    label: self ? `${first(person.name)}'s chart at a glance` : `${person.name}, at a glance`,
    node: (
      <SkyCard
        key={id}
        self={self}
        person={{ name: person.name, birthDate: person.birthDate, chart: person.chart, writing: WRITING.has(person.id) }}
        compatibility={pairs.length > 0 ? <SamplePairs pairs={pairs} /> : undefined}
      />
    ),
  };
}

/** Mira's Sun, Moon and Rising as the card's legend reads them, without the plate, as the dashboard's panel sums up its centre. */
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
            <dd className="v min-w-0 font-sans text-xs leading-[1.35] text-muted-foreground">{blindRisingText(name, false)}</dd>
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

function IdlePanel() {
  const headingId = useId();
  const name = first(SELF.name);
  return (
    <section aria-labelledby={headingId} className={cn(FRAME, "rp-root grid gap-3.5 bg-[rgba(17,22,31,.7)] p-[18px]")}>
      <div className="min-w-0">
        <p className={EYEBROW}>{`${name}'s circle`}</p>
        <h3 id={headingId} className="mt-1.5 font-display text-[22px] leading-[1.15] [overflow-wrap:anywhere]">{SELF.name}</h3>
      </div>
      <TriadRows chart={SELF.chart} name={SELF.name} />
      <p className="text-[13px] leading-[1.45] text-muted-foreground">
        {`Tap a person, or ${name} at the centre, for their chart at a glance. A violet ring marks a ${COMPATIBILITY_REPORT} with ${name}.`}
      </p>
    </section>
  );
}

/** The desktop panel's frame; the card draws none of its own, so the same card serves the sheet. */
function CardFrame({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className={cn(FRAME, "bg-[rgba(17,22,31,.86)] px-[18px] pb-4 pt-2")}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className={TAG}>Sample</span>
        <button type="button" onClick={onClose} className={CLOSE}>
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

function glide(reduced: boolean) {
  return reduced ? { duration: 0 } : { duration: 0.5, ease: EASE };
}

function useViewportHeight(): number {
  const [height, setHeight] = useState(() => (typeof window === "undefined" ? 0 : window.innerHeight));
  useEffect(() => {
    const measure = () => setHeight(window.innerHeight);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return height;
}

interface CardSheetProps {
  open: boolean;
  /** The open card's point, so each new card rises from the peek with its top in view. */
  cardKey: string | null;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The card as a bottom sheet on a phone, the dashboard's sheet in behaviour
 * (dashboard-sky, Layout): a peek, a drag up for the rest, and not modal, so
 * the circle above stays live: a tap on empty space closes it and a tap on
 * someone else swaps the card. The dashboard's sheet lives inside its page,
 * so this one is drawn here to the same measures.
 */
function CardSheet({ open, cardKey, label, onClose, children }: CardSheetProps) {
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

  // Escape inside the sheet closes it; the circle already answers Escape pressed anywhere outside a dialog.
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
    const now = y.get();
    const speed = info.velocity.y;
    if (now > peekY + (height - peekY) / 3 || (speed > 600 && !full)) {
      onClose();
      return;
    }
    const toFull = speed < -400 || (Math.abs(speed) <= 400 && now < peekY / 2);
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
            <span className={cn(TAG, "absolute left-5 top-1/2 -translate-y-1/2")}>Sample</span>
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

export default function YourPeople() {
  const headingId = useId();
  const root = useRef<HTMLElement>(null);
  const phone = useIsMobile();
  const [selected, setSelected] = useState<string | null>(null);
  // The circle places its points in a layout effect, so the prerendered page holds its square and it draws on hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const card = sampleCard(selected);
  const partners = selected === null ? [] : partnersOf(selected === CENTRE_ID ? SELF.id : selected, REPORTS);

  const closeCard = useCallback(() => {
    const was = selected;
    setSelected(null);
    // Back to the point the card opened from, so a keyboard reader keeps their place in the circle.
    if (was) root.current?.querySelector<SVGElement>(`[data-orbit-id="${CSS.escape(was)}"]`)?.focus();
  }, [selected]);

  // The short bottom padding is the gap to TwoCharts' box, which follows on the home page 72 px under the circle, as the artifact sets it.
  return (
    <section ref={root} id="people" aria-labelledby={headingId} className="sd-sec sd-sec-a sd-line pb-[72px]">
      <div className="sd-wrap">
        <div className="sd-shead">
          <p className="sd-eyebrow">Your circle</p>
          <h2 id={headingId} className="sd-h2">
            Add the people you care about
          </h2>
          <p className="sd-sub">
            You can add your partner, parents, kids or friends, and each of them gets their own {PERSONAL_REPORT}. They show up around you
            on your dashboard, so you can tap anyone to see their chart.
          </p>
        </div>
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-9">
          <figure className="m-0 min-w-0 md:sticky md:top-[calc(var(--nav)+24px)]">
            {hydrated ? (
              <Orbit
                centre={{ firstName: first(SELF.name), hasReport: true, writing: false }}
                points={POINTS}
                selectedId={selected}
                partners={partners}
                onSelect={setSelected}
                labels={LABELS}
              />
            ) : (
              <div aria-hidden className="mx-auto aspect-square w-full max-w-[440px]" />
            )}
            <figcaption className="mt-1.5 text-center font-numeric text-[10.5px] uppercase leading-[1.5] tracking-[0.14em] text-[var(--sd-muted)]">
              A sample account · tap anyone
            </figcaption>
          </figure>
          {/* The card's sections are laid out for the dashboard's panel, about this wide; wider, its rows and cells go sparse. */}
          <div className="min-w-0 max-w-[480px]">{!phone && card ? <CardFrame onClose={closeCard}>{card.node}</CardFrame> : <IdlePanel />}</div>
        </div>
      </div>
      {phone && (
        <CardSheet open={!!card} cardKey={card ? selected : null} label={card?.label ?? ""} onClose={closeCard}>
          {card?.node}
        </CardSheet>
      )}
    </section>
  );
}
