/**
 * A contact on the reader's chart as one card (ADR-172), the same on
 * /timeline, in Now and ahead, on the dashboard and in Ask: its tone and how
 * long it lasts, the plain headline, the everyday line when there is one, and
 * the astronomy last, small and grey (timeline-page §2). With `onOpen` a tap
 * anywhere on the card opens its reading.
 */
import type { Tone } from "@workspace/engine";
import { READ_LINE, TONE_WORDS, readLabel, toneClass, type ContactView } from "@/lib/timeline-view";

/** A tone as a dot in its colour beside its word; the word stays grey, so the colour never says it alone. */
export function ToneWord({ tone }: { tone: Tone }) {
  return (
    <span
      className={`${toneClass(tone)} inline-flex items-center gap-1.5 font-label text-[10px] uppercase leading-none tracking-[.12em] text-[#AEB6C6]`}
    >
      <i aria-hidden className="block h-[9px] w-[9px] flex-none rounded-full bg-[var(--sd-tone)]" />
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
    <button
      type="button"
      onClick={onOpen}
      aria-label={readLabel(headline)}
      className={`justify-self-start pt-1 text-left text-[13px] text-[#9FA8DA] after:absolute after:inset-0 ${rounded} focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#9FA8DA]`}
    >
      {READ_LINE}
    </button>
  );
}

export function ContactCard({ contact, onOpen }: { contact: ContactView; onOpen?: () => void }) {
  const { tone, headline, line, lasts, facts } = contact;
  const opens = onOpen ? " transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#171D29]" : "";
  return (
    <article
      className={`${toneClass(tone)} relative grid min-w-0 gap-[3px] rounded-xl border border-l-[3px] border-[#242C3B] border-l-[color:var(--sd-tone)] bg-[#11161F] px-3 py-[11px]${opens}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1">
        <ToneWord tone={tone} />
        <span className="text-xs text-[#AEB6C6]">{lasts}</span>
      </div>
      <p className="font-display text-lg leading-[1.25] text-[#E8EBF2]">{headline}</p>
      {line ? <p className="text-sm leading-normal text-[#E8EBF2]">{line}</p> : null}
      <p className="pt-0.5 font-numeric text-[11px] leading-normal text-[#7E889A]">{facts}</p>
      {onOpen ? <OpenCard headline={headline} onOpen={onOpen} rounded="after:rounded-xl" /> : null}
    </article>
  );
}
