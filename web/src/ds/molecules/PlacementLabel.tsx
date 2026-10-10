import { PlanetBody } from "@/ds/atoms/PlanetBody";
import { RetrogradeBadge } from "@/ds/atoms/RetrogradeBadge";
import { degreesMinutes } from "@/components/chart/wheel-geometry";
import { cn } from "@/lib/utils";
import { PLANET_LABELS } from "@/types/chart";

export interface PlacementLabelProps {
  /** The body's id, such as "mercury". */
  body: string;
  /** Degrees inside the sign, as the chart stores them. */
  deg: number;
  sign: string;
  /** 1 to 12. Absent without a birth time: the label says why instead of guessing. */
  house?: number;
  /** The house's word, shown in brackets after the house. */
  houseWord?: string;
  retrograde?: boolean;
  /** "label" floats on a chart; "row" sits in a list. */
  variant?: "label" | "row";
  className?: string;
}

export function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

const NO_TIME = "needs a birth time";

/** A planet's place in one line: render, name, degree and sign in mono, then its house. */
export function PlacementLabel({ body, deg, sign, house, houseWord, retrograde = false, variant = "label", className }: PlacementLabelProps) {
  const name = PLANET_LABELS[body] ?? body.charAt(0).toUpperCase() + body.slice(1);
  const where = `${degreesMinutes(deg)} · ${sign}`;
  const houseText = house ? `${ordinal(house)} house${houseWord ? ` (${houseWord})` : ""}` : NO_TIME;

  if (variant === "row") {
    return (
      <div
        className={cn(
          "grid min-h-11 grid-cols-[22px_minmax(80px,1fr)_auto_auto] items-center gap-2.5 border-b border-line-soft px-1",
          className,
        )}
      >
        <PlanetBody body={body} size={22} />
        <b className="text-ui font-medium text-paper">
          {name}
          {retrograde ? <RetrogradeBadge /> : null}
        </b>
        <span className="whitespace-nowrap font-numeric text-data text-paper-dim">{where}</span>
        <span className={cn("whitespace-nowrap font-numeric text-data", house ? "text-paper-dim" : "text-muted")}>{houseText}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-pill border border-line-strong bg-raised py-1.5 pl-1.5 pr-2.5 font-numeric text-data text-paper shadow-raised",
        className,
      )}
    >
      <PlanetBody body={body} size={18} />
      <span>
        {name}
        {retrograde ? <RetrogradeBadge /> : null}
        {` · ${where} · `}
        <span className={house ? "text-paper-dim" : "text-muted"}>{houseText}</span>
      </span>
    </span>
  );
}
