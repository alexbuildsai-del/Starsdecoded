/**
 * A person's chart at a glance, computed from the stored chart the page
 * fetched (ADR-92), with one door to the report. The card is content only:
 * the panel on desktop and the bottom sheet on a phone own its frame and its
 * Close, so the same card serves both and R11's sample people.
 *
 * `rp-root` scopes the report's tokens (paper, line, brass as `--sky`) to the
 * card and everything slotted into it; the ringed plate draws in them.
 */
import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusDots } from "@/components/StatusDots";
import {
  CardHeader,
  ChartPending,
  ElementsSection,
  HousesSection,
  OwnPairs,
  TriadSection,
  birthTimeNote,
  doorText,
  pendingText,
  writingText,
} from "@/components/dashboard/CardSections";
import type { ChartData } from "@/types/chart";

export interface SkyCardPerson {
  name: string;
  /** "YYYY-MM-DD", as the profile stores it. */
  birthDate: string;
  /** The report's stored chartData; null while GET /reports/{id} is on its way. */
  chart: ChartData | null;
  /** The natal report is still being written: the eyebrow says so and the door waits (ADR-130, 131). */
  writing: boolean;
}

/** The card's one door. While `person.writing` the Writing status stands in its place, so `href` waits unused. */
export interface SkyCardPrimary {
  href: string;
}

export interface SkyCardProps {
  person: SkyCardPerson;
  /** The reader's own card, opened from the centre of the orbit. */
  self?: boolean;
  /** The compatibility rows. On the reader's own card an empty slot means none yet, and the card says how to get one. */
  compatibility?: ReactNode;
  nudge?: ReactNode;
  send?: ReactNode;
  credit?: ReactNode;
  primary: SkyCardPrimary;
}

// Key it by the point it opens for, so each open rises afresh.
export function SkyCard({ person, self = false, compatibility, nudge, send, credit, primary }: SkyCardProps) {
  const { name, birthDate, chart, writing } = person;
  return (
    <article
      aria-label={self ? "Your chart at a glance" : `${name}, at a glance`}
      className="rp-root @container grid w-full min-w-0 gap-3.5 bg-transparent animation-duration-500 ease-[var(--ease)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-[10px]"
    >
      <CardHeader name={name} birthDate={birthDate} note={birthTimeNote(chart)} self={self} writing={writing} />
      {chart ? (
        <>
          <TriadSection chart={chart} name={name} self={self} />
          <ElementsSection chart={chart} />
          <HousesSection chart={chart} />
        </>
      ) : (
        <ChartPending label={pendingText(name, self)} />
      )}
      {self ? <OwnPairs>{compatibility}</OwnPairs> : compatibility}
      {nudge}
      {send}
      {credit}
      {writing ? (
        <div className="flex min-h-10 w-full items-center justify-center rounded-md border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.14)] px-4 font-label text-[13.5px] font-medium text-[var(--indigo-lt)]">
          <StatusDots label={writingText(name, self)} />
        </div>
      ) : (
        <Button asChild size="lg" className="w-full whitespace-normal px-4 text-center font-label text-[13.5px]">
          <Link href={primary.href}>
            {doorText(name, self)}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      )}
    </article>
  );
}

export default SkyCard;
