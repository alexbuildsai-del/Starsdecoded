/**
 * A contact on the reader's chart as one card (ADR-172), the same on
 * /timeline, in Now and ahead, on the dashboard and in Ask: its tone word and
 * the date it lasts to with its year, "<Planet> going back" while the planet
 * is going backwards (ADR-392), a retrograde's own line, the plain headline and
 * the everyday line when there is one (Review 05/10 §2). The astronomy is Read
 * more's. With `onOpen` a tap anywhere on the card opens its reading.
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

/** The R the birth chart uses, small, before a retrograde card's own line. */
function RMark() {
  return (
    <span
      aria-hidden
      className="inline-grid h-[18px] w-[18px] flex-none place-items-center rounded-[4px] border border-[#6B3A42] font-numeric text-[11px] font-semibold leading-none text-[#E3A3AD]"
    >
      R
    </span>
  );
}

export function ContactCard({ contact, onOpen }: { contact: ContactView; onOpen?: () => void }) {
  const { tone, headline, line, lasts, chip, retro } = contact;
  const opens = onOpen ? " transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[#171D29]" : "";
  return (
    <article
      className={`${toneClass(tone)} relative grid min-w-0 gap-1.5 rounded-xl border border-l-[3px] border-[#242C3B] border-l-[color:var(--sd-tone)] bg-[#11161F] px-3.5 py-3${opens}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ToneWord tone={tone} />
          <span className="font-numeric text-xs text-[#AEB6C6]">{lasts}</span>
        </div>
        {chip ? (
          <span className="rounded-full border border-[#D98C8C]/55 px-[7px] py-0.5 font-numeric text-[10.5px] uppercase leading-snug tracking-[.1em] text-[#D98C8C]">
            {chip}
          </span>
        ) : null}
      </div>
      {retro ? (
        <p className="flex items-center gap-2 font-numeric text-[12.5px] leading-normal text-[#AEB6C6]">
          <RMark />
          {retro}
        </p>
      ) : null}
      <p className="font-display text-[19px] leading-[1.25] text-[#E8EBF2]">{headline}</p>
      {line ? <p className="text-[14.5px] leading-normal text-[#E8EBF2]">{line}</p> : null}
      {onOpen ? <OpenCard headline={headline} onOpen={onOpen} rounded="after:rounded-xl" /> : null}
    </article>
  );
}
