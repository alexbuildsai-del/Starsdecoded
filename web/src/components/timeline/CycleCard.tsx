/**
 * A life cycle as one card (ADR-172; Timeline's Life): full in Life and in Ask, compact in the finder and the dashboard
 * invitation. The full card is Your cycles' card (Review 05/10 §4), one idea a block in one order: its word and the
 * countdown; its name and the ⓘ that opens the science; what the cycle is and how often; For you, every age it comes at
 * and the date; what it means for the reader; and the look-back last. A card with `onOpen` and no meaning of its own
 * opens the reading on a tap. The compact card keeps the ring, the dates and a status chip.
 */
import { useId, useState } from "react";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { CycleRing } from "@/components/timeline/AgeRing";
import { OpenCard } from "@/components/timeline/ContactCard";
import { Chip, type ChipTone } from "@/ds/atoms/Chip";
import { TextButton } from "@/ds/atoms/TextButton";
import { Card } from "@/ds/molecules/Card";
import { Strip } from "@/ds/molecules/Strip";
import { Well } from "@/ds/molecules/Well";
import {
  cycleAbout, cycleAgeSteps, cycleAges, cycleChip, cycleCountdown, cycleDates, cycleNextLine, cycleWhen, lookBack, ringTarget,
  type CycleView,
} from "@/lib/life-view";

const CHIP_LOOK: Record<ReturnType<typeof cycleWhen>, { tone: ChipTone; selected?: boolean; className?: string }> = {
  now: { tone: "now", selected: true },
  ahead: { tone: "neutral", className: "text-paper" },
  past: { tone: "neutral", className: "text-muted" },
};

function CycleChip({ cycle }: { cycle: CycleView }) {
  const look = CHIP_LOOK[cycleWhen(cycle, cycle.today)];
  return (
    <Chip quiet tone={look.tone} selected={look.selected} className={look.className}>
      {cycleChip(cycle, cycle.today)}
    </Chip>
  );
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const DEGREE = /(\d+\.\d{2}\u00b0 [A-Z][a-z]+)/;

/** A science line with its degrees set in the numbers' face. */
function ScienceLine({ text }: { text: string }) {
  return (
    <p className="text-small text-paper-dim">
      {text.split(DEGREE).map((part, i) =>
        i % 2 ? (
          <span key={i} className="font-mono text-data tabular-nums text-paper">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

const STEP_LOOK = { past: "text-muted", this: "font-medium text-paper", ahead: "text-paper-dim" } as const;

export interface CycleCardProps {
  cycle: CycleView;
  compact?: boolean;
  onOpen?: () => void;
  /** The ⓘ's lines (`cycleScience`), asked for when it opens; without it the card has no ⓘ. */
  science?: () => readonly string[];
  /** What it means for the reader: its paragraphs; one line saying why there are none (the card then offers Read more); null while they load; omitted, the card has none. */
  meaning?: readonly string[] | string | null;
}

export function CycleCard({ cycle, compact = false, onOpen, science, meaning }: CycleCardProps) {
  const { order } = useEntryFormat();
  const [scienceOpen, setScienceOpen] = useState(false);
  const scienceId = useId();

  if (compact) {
    const target = ringTarget(cycle);
    return (
      <article className="relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-line-soft pt-3">
        <div className="grid min-w-0 gap-1">
          <p className="font-label text-label uppercase text-muted">{cycleAges(cycle)}</p>
          <p className="font-display text-card-title-sm text-paper">{cycle.name}</p>
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small">
            <span className="font-mono tabular-nums text-paper">{cycleDates(cycle, order)}</span>
            <CycleChip cycle={cycle} />
          </p>
          <p className="text-small text-paper-dim">{cycle.why || sentence(cycle.word)}</p>
          {onOpen ? <OpenCard headline={cycle.name} onOpen={onOpen} rounded="after:rounded-inner" /> : null}
        </div>
        <CycleRing progress={cycle.progress} target={target} size={56} />
      </article>
    );
  }

  const look = lookBack(cycle, cycle.today, order);
  const steps = cycleAgeSteps(cycle, cycle.today);
  return (
    <Card
      as="article"
      className={`relative grid min-w-0 p-3.5 sm:p-3.5${onOpen ? " transition-colors duration-base ease-[var(--ease)] hover:bg-raised" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Chip>{cycle.word}</Chip>
        <span className="font-mono text-data tabular-nums text-muted">{cycleCountdown(cycle, cycle.today)}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-card-title text-paper">{cycle.name}</p>
        {science ? (
          <TextButton
            aria-label="The science behind it"
            aria-expanded={scienceOpen}
            aria-controls={scienceId}
            onClick={() => setScienceOpen((on) => !on)}
            className={`z-10 grid size-6 min-h-0 flex-none place-items-center rounded-pill border px-0 font-display text-sm italic leading-none ${
              scienceOpen ? "border-brass text-brass" : "border-line text-paper-dim hover:border-indigo"
            }`}
          >
            i
          </TextButton>
        ) : null}
      </div>
      <p className="text-ui text-paper-dim">{cycleAbout(cycle.id)}</p>
      {science && scienceOpen ? (
        <Well id={scienceId} className="gap-1.5 px-3 py-2.5">
          {science().map((line, i) => (
            <ScienceLine key={i} text={line} />
          ))}
        </Well>
      ) : null}
      <Strip className="grid gap-1 px-2.5 py-2">
        <p className="font-label text-label uppercase leading-none text-muted">For you</p>
        <p className="font-mono text-small tabular-nums">
          {steps.map((step, i) => (
            <span key={`${step.age}-${i}`}>
              {i ? <span className="text-muted"> {"\u00b7"} </span> : null}
              <span className={STEP_LOOK[step.state]}>{step.age}</span>
            </span>
          ))}
        </p>
        <p className="text-small text-paper-dim">{cycleNextLine(cycle, cycle.today, order)}</p>
      </Strip>
      {meaning === null ? (
        <p aria-hidden className="h-[6.5em] rounded-inner bg-raised motion-safe:animate-pulse" />
      ) : typeof meaning === "string" ? (
        <p className="text-small text-paper-dim">{meaning}</p>
      ) : meaning ? (
        meaning.map((text, i) => (
          <p key={i} className="whitespace-pre-line text-ui leading-[1.6] text-paper">
            {text}
          </p>
        ))
      ) : null}
      {look ? <p className="border-l-2 border-teal pl-2.5 font-display text-prose italic leading-snug text-paper-dim">{look}</p> : null}
      {onOpen && (meaning === undefined || typeof meaning === "string") ? <OpenCard headline={cycle.name} onOpen={onOpen} rounded="after:rounded-card" /> : null}
    </Card>
  );
}
