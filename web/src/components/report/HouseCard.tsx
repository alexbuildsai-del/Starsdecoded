/**
 * One house, front and back. The front is drawn from the chart: who stands
 * there, at what degree. The back is the report's own words, the triad passage
 * this house carries and the generated reading (ADR-21). The card writes no
 * astrological prose of its own.
 */
import { PLANET_GLYPHS, type Claim } from "@/types/chart";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { CitedText, newCitationCounter } from "@/components/report/Citation";
import type { Occupant } from "@/lib/house-occupants";
import {
  HOUSE_NAMES, HOUSE_QUESTIONS, HOUSE_THEMES, ORDINALS, QUADRANTS,
} from "@/lib/evidence-glossary";
import { PLANET_LABELS } from "@/types/chart";

/** Which chapter picks a house's affairs up. Houses not listed here send nowhere. */
export const HOUSE_CHAPTER: Record<number, { number: number; title: string }> = {
  1: { number: 3, title: "Mind" },
  2: { number: 5, title: "Money" },
  3: { number: 3, title: "Mind" },
  4: { number: 7, title: "Family" },
  5: { number: 10, title: "Your Path" },
  7: { number: 6, title: "Relationships" },
  10: { number: 4, title: "Career" },
  11: { number: 10, title: "Your Path" },
};

export interface TriadPassage {
  key: string;
  label: string;
  text: string;
}

export interface HouseCardProps {
  house: number;
  /** The whole-sign sign on this house. */
  sign: string;
  occupants: Occupant[];
  /** The generated reading for this house, absent while the section is still writing. */
  reading?: string;
  /** The triad passages this house carries, in the order they should be read. */
  triad?: TriadPassage[];
  triadClaims?: Claim[];
  flipped: boolean;
  onFlip: () => void;
  className?: string;
}

function OccupantMark({ o }: { o: Occupant }) {
  if (o.kind === "planet") {
    const src = PLANET_RENDERS[o.key];
    return src
      ? <img src={src} alt="" width={36} height={36} className="h-9 w-9" loading="lazy" />
      : <span aria-hidden className="grid h-9 w-9 place-items-center text-lg text-brass/80">·</span>;
  }
  if (o.kind === "point") {
    return (
      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full border border-brass/35 text-base text-brass/90">
        {PLANET_GLYPHS[o.key] ?? "·"}
      </span>
    );
  }
  return (
    <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-brass">
      <span className="h-1.5 w-1.5 rounded-full bg-brass" />
    </span>
  );
}

export function HouseCard({
  house, sign, occupants, reading, triad, triadClaims, flipped, onFlip, className = "",
}: HouseCardProps) {
  const i = house - 1;
  const rulerKey = TRADITIONAL_RULER[sign];
  const quiet = occupants.length === 0;
  const chapter = HOUSE_CHAPTER[house];
  const counter = newCitationCounter();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${ORDINALS[i]} house card`}
      aria-pressed={flipped}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      className={`relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card/40 p-5 text-left transition-colors ${
        quiet ? "border-border/50" : "border-primary/40"
      } ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 right-2 select-none font-display text-[7rem] leading-none text-foreground/[0.045]"
      >
        {house < 10 ? `0${house}` : house}
      </span>

      <p className="rp-kicker">{ORDINALS[i]} house · {sign}</p>

      {flipped ? (
        <>
          <h4 className="mb-3 mt-1 font-display text-lg leading-snug text-foreground">
            {HOUSE_QUESTIONS[i]}
          </h4>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-sm leading-[1.6] text-foreground/85">
            {triad?.map((t) => (
              <p key={t.key}>
                <span className="mr-1.5 font-label text-[10px] uppercase tracking-[0.16em] text-primary/80">
                  {t.label}
                </span>
                {CitedText({ text: t.text, claims: triadClaims, counter })}
              </p>
            ))}
            {reading
              ? <p>{reading}</p>
              : (
                <p className="font-label text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  Still writing this card
                </p>
              )}
          </div>
          {chapter && (
            <a
              href={`#chapter-${chapter.number}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-4 border-t border-border/40 pt-3 font-label text-[9px] uppercase tracking-[0.2em] text-brass/80 hover:text-brass"
            >
              Read chapter · {chapter.title} →
            </a>
          )}
        </>
      ) : (
        <>
          <h4 className="mt-1 font-display text-2xl leading-tight text-foreground">
            {HOUSE_NAMES[i]}
          </h4>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/85">
            {HOUSE_THEMES[i]}
          </p>
          <div className="mt-5 min-h-0 flex-1 content-start overflow-y-auto">
            {quiet ? (
              <p className="font-label text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
                Quiet house · Influenced by {PLANET_LABELS[rulerKey] ?? rulerKey}, ruler of {sign}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                {occupants.map((o) => (
                  <span key={o.key} className="inline-flex items-center gap-1.5">
                    <OccupantMark o={o} />
                    <span className="font-label text-[10px] uppercase tracking-[0.12em] text-foreground/70">
                      {o.label}
                      {o.kind === "angle" && (
                        <span className="ml-1 font-numeric text-brass/90">{o.degree.toFixed(1)}°</span>
                      )}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <span className="font-label text-[9px] uppercase tracking-[0.2em] text-brass/70">
              {QUADRANTS[Math.floor(i / 3)]}
            </span>
            <span className="font-label text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
              Read →
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default HouseCard;
