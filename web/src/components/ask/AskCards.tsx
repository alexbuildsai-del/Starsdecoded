/**
 * The computed cards under one of Ask's answers (ADR-172, 213): the same
 * pieces Timeline draws, never a second look. A day or a person's day is its
 * contact cards, a window its day cells, a cycle Life's card, and a quote the
 * report's evidence, word for word as the server put it in. The tone words'
 * legend follows the day cards, as it follows Timeline's.
 */
import { Fragment, useState } from "react";
import type { AskCard } from "@workspace/api-client-react";
import { TextButton } from "@/ds/atoms/TextButton";
import { ContactCard } from "@/components/timeline/ContactCard";
import { CycleCard } from "@/components/timeline/CycleCard";
import { DayCells } from "@/components/timeline/DayCells";
import { ToneLegend } from "@/components/timeline/ToneLegend";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { WINDOW_SHOWN, cardView, legendAfter, type AskCardView, type EventView } from "@/lib/ask-view";
import { useShownZone } from "@/lib/reader-zone";
import { dayIn } from "@/lib/timeline-view";

const HEAD = "font-label text-label uppercase text-muted";
const NOTE = "text-small text-paper-dim";

/** ContactCard's own frame, for the one event it can't take: an eclipse with no tone, which shows no tone word. */
function ToneFreeCard({ event }: { event: EventView }) {
  return (
    <article className="relative grid min-w-0 gap-[3px] rounded-xl border border-l-[3px] border-line bg-surface px-3 py-[11px]">
      <span className="text-xs text-paper-dim">{event.lasts}</span>
      <p className="font-display text-lg leading-[1.25] text-paper">{event.headline}</p>
      {event.line ? <p className="text-sm leading-normal text-paper">{event.line}</p> : null}
      <p className="pt-0.5 font-numeric text-data text-muted">{event.facts}</p>
    </article>
  );
}

function EventCards({ events }: { events: readonly EventView[] }) {
  return (
    <>
      {events.map((event) =>
        event.tone ? <ContactCard key={event.key} contact={{ ...event, tone: event.tone }} /> : <ToneFreeCard key={event.key} event={event} />,
      )}
    </>
  );
}

function WindowCard({ view }: { view: Extract<AskCardView, { kind: "window" }> }) {
  const [all, setAll] = useState(false);
  const long = view.days.length > WINDOW_SHOWN;
  return (
    <div role="group" aria-label={view.title} className="grid min-w-0 gap-2">
      <p className={HEAD}>{view.title}</p>
      <DayCells days={long && !all ? view.days.slice(0, WINDOW_SHOWN) : view.days} keyed />
      {long ? (
        <TextButton aria-expanded={all} onClick={() => setAll((was) => !was)} className="justify-self-start">
          {all ? "Show fewer days" : `Show all ${view.days.length} days`}
        </TextButton>
      ) : null}
    </div>
  );
}

function CardOf({ view }: { view: AskCardView }) {
  switch (view.kind) {
    case "day":
      return (
        <div role="group" aria-label={view.title} className="grid min-w-0 gap-2">
          <div className="grid gap-0.5">
            <p className={HEAD}>{view.title}</p>
            <p className="text-small leading-snug text-paper-dim">{view.moon}</p>
          </div>
          <EventCards events={view.events} />
          {view.quiet ? <p className={NOTE}>{view.quiet}</p> : null}
        </div>
      );
    case "person":
      return (
        <div role="group" aria-label={view.title} className="grid min-w-0 gap-2">
          <p className={HEAD}>{view.title}</p>
          <EventCards events={view.events} />
          {view.quiet ? <p className={NOTE}>{view.quiet}</p> : null}
        </div>
      );
    case "window":
      return <WindowCard view={view} />;
    case "cycle":
      return <CycleCard cycle={view.cycle} />;
    case "quote":
      return (
        <figure className="m-0 grid min-w-0 rounded-card border border-line bg-raised px-4 py-[15px] text-paper">
          <blockquote className="m-0 font-display text-sm italic leading-normal">“{view.text}”</blockquote>
          <figcaption className="mt-3 border-t border-line-soft pt-2.5 font-label text-label uppercase text-paper-dim">
            {view.source}
          </figcaption>
        </figure>
      );
  }
}

export function AskCards({ cards }: { cards: readonly AskCard[] }) {
  const { order } = useEntryFormat();
  // Only a reader with Timeline reads Ask, so the server can say which zone it read the cards' days in.
  const zone = useShownZone(true);
  if (!zone) return null;
  const today = dayIn(new Date(), zone);
  const views = cards.map((card) => cardView(card, today, zone, order));
  const legend = legendAfter(views);
  return (
    <div className="grid min-w-0 gap-3">
      {views.map((view, i) => (
        <Fragment key={`${view.kind}.${i}`}>
          <CardOf view={view} />
          {i === legend ? <ToneLegend /> : null}
        </Fragment>
      ))}
    </div>
  );
}
