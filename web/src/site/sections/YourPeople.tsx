/**
 * Your circle (ADR-112, landing scope 7): the dashboard's circle and card on the
 * sample account, so a visitor meets the second person before they have one. Mira
 * sits at the centre with the people she added around her; a tap opens a card
 * with no live control, in the panel on desktop and a bottom sheet on a phone.
 * The circle's rules are the dashboard's own (`orbitPoints`, `partnersOf`), fed
 * the sample account as a profile list and its reports.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { blindRisingText } from "@/components/dashboard/CardSections";
import { CENTRE_ID, Orbit, type OrbitLabels } from "@/components/dashboard/Orbit";
import { SkyCard } from "@/components/dashboard/SkyCard";
import { TriadRow } from "@/components/TriadRow";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { TextButton } from "@/ds/atoms/TextButton";
import { Sheet } from "@/ds/organisms/Sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { pairTitle } from "@/lib/lenses";
import { orbitPoints, partnersOf, type OrbitProfile, type OrbitReport } from "@/lib/orbit";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";
import { first } from "@/lib/share-card";
import { triadRowsOf } from "@/lib/triad-row";
import { cn } from "@/lib/utils";
import { SAMPLE_PAIRS, SAMPLE_PEOPLE, samplePerson } from "@/site/data/people";

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
const POINTS = orbitPoints({ profiles: PROFILES, reports: REPORTS, gifts: [], credits: 0 }).filter((p) => p.kind === "person");

/** The circle is Mira's, so it speaks of her; its own words say "you" to the dashboard's reader. */
const LABELS: OrbitLabels = {
  orbit: `${first(SELF.name)}'s circle, a sample account`,
  centre: `${first(SELF.name)}'s chart at a glance`,
  sharedPair: `has a ${COMPATIBILITY_REPORT} with ${first(SELF.name)}`,
};

const TAG = "font-numeric text-data-sm uppercase leading-none text-muted";
const CLOSE = "font-label text-label uppercase text-paper-dim";
const FRAME = "min-w-0 rounded-card border border-line";

/** The dashboard's two verbs, each with its own mark: the waiting gift's teal dashed ring and the share's indigo ring. */
const WAYS: readonly { title: string; line: string; mark: ReactNode }[] = [
  {
    title: "Gift them a report",
    line: `They get a credit for their own ${PERSONAL_REPORT}, with their own birth details.`,
    mark: (
      <svg aria-hidden viewBox="0 0 34 34" fill="none" stroke="currentColor" className="size-[34px] text-teal">
        <circle cx="17" cy="17" r="15.5" strokeDasharray="3 3" />
        <path d="M11 15h12v8H11zM10 12h14v3H10zM17 12v11M17 12c-2-4-6-3-4 0M17 12c2-4 6-3 4 0" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Share reports with each other",
    line: "Share yours, read theirs, and you each learn how the other works.",
    mark: (
      <svg aria-hidden viewBox="0 0 34 34" fill="none" stroke="currentColor" className="size-[34px] text-indigo-lt">
        <circle cx="17" cy="17" r="15.5" />
        <path d="M12 19l10-6M12 19a2.5 2.5 0 1 1 0-.1M22 13a2.5 2.5 0 1 1 0-.1M22 23a2.5 2.5 0 1 1 0-.1M12 19l10 4" strokeWidth="1.3" />
      </svg>
    ),
  },
];

const firstOf = (id: string) => first(samplePerson(id)?.name ?? id);

/** The account's reports as the dashboard's rows name them, without the row's door: a sample has no report to open. */
function SamplePairs({ pairs }: { pairs: readonly (readonly [string, string])[] }) {
  return (
    <ul className="grid gap-2">
      {pairs.map(([x, y]) => (
        <li key={`${x}:${y}`} className="rounded-card border border-border/60 bg-card/60 px-3 py-2.5">
          <span className="mb-1 block font-label text-label uppercase text-secondary">{COMPATIBILITY_REPORT}</span>
          <span className="block font-display text-prose leading-snug">{pairTitle(firstOf(x), firstOf(y))}</span>
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

function IdlePanel() {
  const headingId = useId();
  const name = first(SELF.name);
  return (
    <section aria-labelledby={headingId} className={cn(FRAME, "rp-root grid gap-3.5 bg-surface/70 p-[18px]")}>
      <div className="min-w-0">
        <p>
          <Eyebrow kind="kicker" className="leading-[1.2]">{`${name}'s circle`}</Eyebrow>
        </p>
        <h3 id={headingId} className="mt-1.5 font-display text-card-title leading-[1.15] [overflow-wrap:anywhere]">{SELF.name}</h3>
      </div>
      <TriadRow rows={triadRowsOf(SELF.chart, { blind: blindRisingText(SELF.name, false) })} />
      <p className="text-small leading-[1.45] text-muted-foreground">
        {`Tap a person, or ${name} at the centre, for their chart at a glance. A violet ring marks a ${COMPATIBILITY_REPORT} with ${name}.`}
      </p>
    </section>
  );
}

/** The desktop panel's frame; the card draws none of its own, so the same card serves the sheet. */
function CardFrame({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className={cn(FRAME, "bg-surface/86 px-[18px] pb-4 pt-2")}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className={TAG}>Sample</span>
        <TextButton onClick={onClose} className={CLOSE}>
          Close
        </TextButton>
      </div>
      {children}
    </div>
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
            Add your partner, parents, kids or friends. They show up around you on your dashboard. Tap anyone to see their chart.
          </p>
          <ul className="m-0 grid max-w-[640px] list-none gap-2 p-0">
            {WAYS.map((way) => (
              <li key={way.title} className="grid grid-cols-[34px_minmax(0,1fr)] items-start gap-3 rounded-card border border-line-soft bg-void/55 p-3">
                {way.mark}
                <div>
                  <p className="m-0 font-display text-card-title-sm leading-[1.3] text-paper">{way.title}</p>
                  <p className="m-0 text-small leading-[1.5] text-paper-dim">{way.line}</p>
                </div>
              </li>
            ))}
          </ul>
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
            <figcaption className="mt-1.5 text-center font-numeric text-data-sm uppercase leading-[1.5] text-muted">
              A sample account · tap anyone
            </figcaption>
          </figure>
          {/* The card's sections are laid out for the dashboard's panel, about this wide; wider, its rows and cells go sparse. */}
          <div className="min-w-0 max-w-[480px]">{!phone && card ? <CardFrame onClose={closeCard}>{card.node}</CardFrame> : <IdlePanel />}</div>
        </div>
      </div>
      {phone && (
        <Sheet peek open={!!card} onOpenChange={(open) => !open && closeCard()} contentKey={card ? selected : null} label={card?.label ?? ""}>
          <span className={cn(TAG, "mb-2 block")}>Sample</span>
          {card?.node}
        </Sheet>
      )}
    </section>
  );
}
