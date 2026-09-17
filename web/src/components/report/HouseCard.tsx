/**
 * Every word on the back is a string the report already emitted. If nothing
 * generated applies, the back says nothing: the UI does not write astrological
 * prose about this reader (ADR-18).
 */
import { useEffect, useState } from "react";
import { PLANET_LABELS, type AngleMeanings } from "@/types/chart";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import {
  HOUSE_NAMES, HOUSE_QUESTIONS, HOUSE_THEMES, ORDINALS, QUADRANTS,
} from "@/lib/evidence-glossary";

export interface HouseCardProps {
  house: number;
  /** The whole-sign sign on this house. */
  sign: string;
  /** Body keys that actually sit in this house. */
  occupants: string[];
  personalPlanets: Record<string, string>;
  angleMeanings?: AngleMeanings;
  /** Start on the back, as the wheel's side panel does. */
  open?: boolean;
  className?: string;
}

interface BackLine {
  key: string;
  label: string;
  text: string;
}

export function HouseCard({
  house, sign, occupants, personalPlanets, angleMeanings, open = false, className = "",
}: HouseCardProps) {
  const [flipped, setFlipped] = useState(open);
  useEffect(() => setFlipped(open), [open]);

  const i = house - 1;
  const ruler = TRADITIONAL_RULER[sign];
  const readThroughRuler = occupants.length === 0 && !!ruler;

  const lines: BackLine[] = [];
  if (house === 1 && angleMeanings?.ascendant?.firstImpression) {
    lines.push({ key: "asc", label: "Rising", text: angleMeanings.ascendant.firstImpression });
  }
  if (house === 10 && angleMeanings?.midheaven?.whereYouThrive) {
    lines.push({ key: "mc", label: "Midheaven", text: angleMeanings.midheaven.whereYouThrive });
  }
  for (const body of occupants) {
    const text = personalPlanets?.[body];
    if (text) lines.push({ key: body, label: PLANET_LABELS[body] ?? body, text });
  }
  if (readThroughRuler) {
    const text = personalPlanets?.[ruler];
    if (text) lines.push({ key: ruler, label: PLANET_LABELS[ruler] ?? ruler, text });
  }

  const rulerNote = readThroughRuler && lines.length > 0
    ? `Read through ${PLANET_LABELS[ruler] ?? ruler}, which rules ${sign}`
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${ORDINALS[i]} house card`}
      aria-pressed={flipped}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      className={`relative overflow-hidden rounded-xl border bg-card/40 p-5 text-left cursor-pointer transition-colors min-h-[19rem] flex flex-col ${
        occupants.length ? "border-primary/40" : "border-border/50"
      } ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 right-2 font-display text-[7rem] leading-none text-foreground/[0.045] select-none"
      >
        {house < 10 ? `0${house}` : house}
      </span>

      {flipped ? (
        <>
          <p className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            {ORDINALS[i]} house · {sign.toUpperCase()}
          </p>
          <h4 className="font-display text-lg leading-snug mt-1 mb-3 text-foreground">
            {HOUSE_QUESTIONS[i]}
          </h4>
          {rulerNote && (
            <p className="font-label text-[10px] tracking-[0.14em] uppercase text-brass/80 mb-2">
              {rulerNote}
            </p>
          )}
          <div className="space-y-3 text-sm leading-[1.6] text-foreground/85 flex-1 overflow-y-auto pr-1">
            {lines.map((l) => (
              <p key={l.key}>
                <span className="font-label text-[10px] tracking-[0.16em] uppercase text-primary/80 mr-1.5">
                  {l.label}
                </span>
                {l.text}
              </p>
            ))}
          </div>
          {lines.length > 0 && (
            <p className="mt-4 pt-3 border-t border-border/40 font-label text-[9px] tracking-[0.2em] uppercase text-muted-foreground/70">
              From your report
            </p>
          )}
        </>
      ) : (
        <>
          <p className="font-label text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            {ORDINALS[i]} house · {sign.toUpperCase()}
          </p>
          <h4 className="font-display text-2xl leading-tight mt-1 text-foreground">
            {HOUSE_NAMES[i]}
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground/85 mt-1.5">
            {HOUSE_THEMES[i]}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5 flex-1 content-start">
            {occupants.length > 0 ? (
              occupants.map((body) => {
                const src = PLANET_RENDERS[body];
                const label = PLANET_LABELS[body] ?? body;
                return (
                  <span key={body} className="inline-flex items-center gap-1.5">
                    {src
                      ? <img src={src} alt="" width={40} height={40} className="w-10 h-10" loading="lazy" />
                      : <span aria-hidden className="w-10 h-10 grid place-items-center text-brass/80 text-lg">·</span>}
                    <span className="font-label text-[10px] tracking-[0.12em] uppercase text-foreground/70">
                      {label}
                    </span>
                  </span>
                );
              })
            ) : (
              <span className="font-label text-[10px] tracking-[0.14em] uppercase text-muted-foreground/70">
                No planet sits here
              </span>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="font-label text-[9px] tracking-[0.2em] uppercase text-brass/70">
              {QUADRANTS[Math.floor(i / 3)]}
            </span>
            <span className="font-label text-[9px] tracking-[0.16em] uppercase text-muted-foreground/70">
              Read →
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default HouseCard;
