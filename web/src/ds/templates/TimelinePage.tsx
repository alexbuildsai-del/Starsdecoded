import type { ReactNode } from "react";

export interface TimelinePageProps {
  header: ReactNode;
  /** Kicker, title and lede. */
  intro: ReactNode;
  /** The dial; it keeps its own size on every width. */
  dial?: ReactNode;
  /** Transit cards (Card, tone version) with their Chips. */
  cards?: ReactNode;
  /** The closing call to action. */
  closing?: ReactNode;
  footer: ReactNode;
}

/** The public Timeline page: the site's tempo around the dial and a column of tone cards. */
export function TimelinePage({ header, intro, dial, cards, closing, footer }: TimelinePageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-ground text-paper">
      {header}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-12 sm:px-8 md:pt-20">
        <div className="max-w-2xl">{intro}</div>
        {dial && <div className="mx-auto my-10 flex justify-center md:my-16">{dial}</div>}
        {cards && <div className="grid gap-4 md:grid-cols-2">{cards}</div>}
        {closing && <div className="mt-12 md:mt-16">{closing}</div>}
      </main>
      {footer}
    </div>
  );
}

export default TimelinePage;
