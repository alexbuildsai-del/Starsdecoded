/**
 * A contact on the reader's chart as one card (ADR-172), the same on
 * /timeline, in Now and ahead, on the dashboard and in Ask: its tone word and
 * the date it lasts to with its year, "<Planet> going back" while the planet
 * is going backwards (ADR-392), a retrograde's own line, the plain headline and
 * the everyday line when there is one (Review 05/10 §2). The astronomy is Read
 * more's. With `onOpen` a tap anywhere on the card opens its reading.
 */
import type { Tone } from "@workspace/engine";
import { Chip } from "@/ds/atoms/Chip";
import { RetrogradeBadge } from "@/ds/atoms/RetrogradeBadge";
import { TextButton } from "@/ds/atoms/TextButton";
import { ToneDot } from "@/ds/atoms/ToneDot";
import { Card } from "@/ds/molecules/Card";
import { DOT_TONE, READ_LINE, TONE_WORDS, readLabel, type ContactView } from "@/lib/timeline-view";

/** A tone as a dot in its colour beside its word; the word stays grey, so the colour never says it alone. */
export function ToneWord({ tone }: { tone: Tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-label text-label uppercase text-paper-dim">
      <ToneDot tone={DOT_TONE[tone]} />
      {TONE_WORDS[tone]}
    </span>
  );
}

/**
 * The card's own button, stretched over the whole card by its ::after, so the
 * card opens on a tap anywhere while a screen reader hears one short name.
 */
export function OpenCard({ headline, onOpen, rounded }: { headline: string; onOpen: () => void; rounded: string }) {
  return (
    <TextButton
      onClick={onOpen}
      aria-label={readLabel(headline)}
      className={`min-h-0 justify-self-start px-0 pt-1 text-left after:inset-0 ${rounded} focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus`}
    >
      {READ_LINE}
    </TextButton>
  );
}

// The 3 px edge takes the tone; the card part knows rose, brass and teal, and Mixed is the dim paper.
const EDGE: Record<Tone, { tone: "rose" | "teal"; className?: string }> = {
  intense: { tone: "rose" },
  mixed: { tone: "rose", className: "border-l-paper-dim" },
  easy: { tone: "teal" },
};

export function ContactCard({ contact, onOpen }: { contact: ContactView; onOpen?: () => void }) {
  const { tone, headline, line, lasts, chip, retro } = contact;
  const edge = EDGE[tone];
  return (
    <Card
      as="article"
      variant="tone"
      tone={edge.tone}
      className={`relative grid gap-1.5 p-3.5 sm:p-3.5 ${edge.className ?? ""}${onOpen ? " transition-colors duration-base ease-[var(--ease)] hover:bg-raised" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ToneWord tone={tone} />
          <span className="font-mono text-data tabular-nums text-paper-dim">{lasts}</span>
        </div>
        {chip ? <Chip tone="back">{chip}</Chip> : null}
      </div>
      {retro ? (
        <p className="flex items-center gap-2 font-mono text-data tabular-nums text-paper-dim">
          <RetrogradeBadge size="small" />
          {retro}
        </p>
      ) : null}
      <p className="font-display text-card-title text-paper">{headline}</p>
      {line ? <p className="text-ui text-paper">{line}</p> : null}
      {onOpen ? <OpenCard headline={headline} onOpen={onOpen} rounded="after:rounded-card" /> : null}
    </Card>
  );
}
