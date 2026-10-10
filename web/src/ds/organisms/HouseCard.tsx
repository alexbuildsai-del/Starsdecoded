/**
 * One house as chapter 02's deck shows it (ADR-179): the house and its sign, who stands there, the house's full title
 * (ADR-98), then the report's own reading, then its blocks (Often noticed, the stellium, each body going backwards,
 * ADR-396 to 404), closed by its Behaviour check. On a phone the card leads with the first sentence and keeps the rest
 * behind Read the rest; on a desktop and on paper it shows the whole text. The card writes no astrological prose of its
 * own. A blind chart has no house to show, so the deck gives it the blind card.
 */
import { useId, useState } from "react";
import { PLANET_GLYPHS, PLANET_LABELS, type ChartData } from "@/types/chart";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { hintFor } from "@/lib/birth-record-hints";
import { HOUSE_NAMES, ORDINALS, houseWord } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { splitReading } from "@/lib/house-deck";
import type { Occupant } from "@/lib/house-occupants";
import { cn } from "@/lib/utils";
import { AngleGlyph, type AngleKey } from "@/components/report/AngleGlyph";
import { TextButton } from "@/ds/atoms/TextButton";
import { ReportBlocks, StelliumChip } from "@/ds/organisms/ReportBlocks";

/** How the planet row draws one occupant: a planet's render, the brass angle marker, or a point's glyph. */
export type RowLook = "render" | "angle" | "glyph";

export interface RowMark {
  key: string;
  /** The occupant's name, the mark's accessible name. */
  label: string;
  look: RowLook;
}

/**
 * The header's planet row (RP51, restored): every occupant, in the order the house holds them. No degree and no R:
 * the degree lives on the wheel's chip and going backwards on the wheel and the R block.
 */
export function planetRow(occupants: Occupant[]): RowMark[] {
  return occupants.map((o) => ({
    key: o.key,
    label: o.label,
    look: o.kind === "angle" ? "angle" : o.kind === "planet" && PLANET_RENDERS[o.key] ? "render" : "glyph",
  }));
}

function RowMarkView({ m }: { m: RowMark }) {
  if (m.look === "render") {
    return <img src={PLANET_RENDERS[m.key]} alt={m.label} title={m.label} width={16} height={16} className="size-4" loading="lazy" />;
  }
  // The R03 marker (ADR-49): an angle is a point on the horizon, never a body.
  if (m.look === "angle") {
    return (
      <span role="img" aria-label={m.label} title={m.label} className="inline-flex">
        <AngleGlyph angle={m.key as AngleKey} size={16} />
      </span>
    );
  }
  return (
    <span role="img" aria-label={m.label} title={m.label} className="font-mono text-data-sm font-medium leading-none tracking-normal text-paper-dim">
      {PLANET_GLYPHS[m.key] ?? "·"}
    </span>
  );
}

/** The planet that goes with the rising sign, and where the chart puts it. Null for a blind chart, which has no 1st house. */
export interface ChartRuler {
  label: string;
  sign: string;
  house: number;
}

export function chartRuler(chart: ChartData): ChartRuler | null {
  const asc = chart.angles?.ascendant;
  const key = asc ? TRADITIONAL_RULER[asc.sign] : undefined;
  const planet = key ? chart.planets[key] : undefined;
  if (!key || !planet || !planet.house) return null;
  return { label: PLANET_LABELS[key] ?? key, sign: planet.sign, house: planet.house };
}

export interface HouseBlocksData {
  noticed?: { idea: string; why: string } | null;
  stellium?: { text: string; balance: string } | null;
  retrograde?: { planet: string; text: string }[];
}

export interface HouseCardProps {
  house: number;
  /** The whole-sign sign on this house. */
  sign: string;
  /** Who stands in the house (`houseOccupants`): the header's planet row. */
  occupants?: Occupant[];
  /** The chart ruler, on the 1st house's card only; the triad rows no longer print it. */
  ruler?: ChartRuler | null;
  /** A house with no one in it: the small line that says whose it is (`quietLine`). */
  quiet?: string | null;
  /** The house's reading as the report stored it; absent while the section is still being written. */
  reading?: string;
  /** The bodies the engine finds in a stellium here (ADR-397): the chip, and the count the stellium block prints. */
  stellium?: string[] | null;
  /** The blocks the report stored with the reading. A report before v12 stores none, and its card keeps the reading alone. */
  blocks?: HouseBlocksData;
  /** The whole text at once, for the desktop card: no Read the rest. */
  whole?: boolean;
  /** The card the deck is on. The others stand back, except with reduced motion and on paper. */
  lit?: boolean;
  className?: string;
}

const SIDE_LINE = "-mt-1 font-numeric text-[12.5px] leading-[1.45] text-paper-dim print:text-black";

export function HouseCard({
  house, sign, occupants = [], ruler, quiet, reading, stellium, blocks, whole = false, lit = true, className = "",
}: HouseCardProps) {
  const [open, setOpen] = useState(false);
  const restId = useId();
  const parts = reading ? splitReading(reading) : null;
  const i = house - 1;
  const row = planetRow(occupants);
  const stelliumBlock = stellium && blocks?.stellium ? { ...blocks.stellium, bodies: stellium } : null;

  return (
    <article
      aria-label={`${ORDINALS[i]} house, ${sign}`}
      className={cn(
        "grid content-start gap-2.5 rounded-2xl border bg-surface p-4 transition-[opacity,transform,border-color] duration-[var(--dur-base)] ease-[var(--ease)] motion-reduce:transition-none print:break-inside-avoid print:border-neutral-300 print:bg-transparent",
        lit ? "border-brass/35" : "scale-[.97] border-line opacity-55 motion-reduce:scale-100 motion-reduce:opacity-100 print:scale-100 print:opacity-100",
        className,
      )}
    >
      <div className="flex min-h-4 flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="font-mono text-data-sm font-medium uppercase tracking-[.12em] text-brass">
            {ORDINALS[i]} house · {sign}
          </p>
          {stellium && <StelliumChip />}
        </div>
        {row.length > 0 && (
          <span className="flex shrink-0 items-center gap-1">
            {row.map((m) => <RowMarkView key={m.key} m={m} />)}
          </span>
        )}
      </div>
      <h3 className={cn("font-display font-normal leading-[1.15] text-paper print:text-black", whole ? "text-[28px]" : "text-[22px]")}>
        {HOUSE_NAMES[i]}
      </h3>
      {quiet && <p className={SIDE_LINE}>{quiet}</p>}
      {ruler && (
        <p className={SIDE_LINE}>
          {`${ruler.label} is your chart ruler, the planet that goes with your rising sign. It stands in ${ruler.sign}, in the ${ORDINALS[ruler.house - 1]} house (${houseWord(ruler.house)}).`}
        </p>
      )}
      {parts ? (
        <>
          <p className={cn("font-display leading-[1.45] text-paper print:text-black", whole ? "text-[20px]" : "text-[17px]")}>
            {parts.lead}
          </p>
          {parts.rest && (
            <p
              id={restId}
              className={cn(
                "text-paper/85 print:block print:text-black",
                whole ? "text-prose leading-[1.65]" : "text-small leading-[1.55]",
                !whole && !open && "hidden",
              )}
            >
              {parts.rest}
            </p>
          )}
          {parts.rest && !whole && (
            <TextButton
              aria-expanded={open}
              aria-controls={restId}
              onClick={() => setOpen((o) => !o)}
              className="-my-2 justify-self-start print:hidden"
            >
              {open ? "Show less" : "Read the rest"}
            </TextButton>
          )}
          <ReportBlocks house={house} noticed={blocks?.noticed} stellium={stelliumBlock} retrograde={blocks?.retrograde} whole={whole} />
          {parts.check && (
            <div className="grid gap-1 border-t border-line-soft pt-2.5 print:border-neutral-300">
              <p className="font-label text-label uppercase text-[color:var(--accent)]">Does this sound like you?</p>
              <p className={cn("text-paper print:text-black", whole ? "text-ui leading-[1.55]" : "text-small")}>
                {parts.check}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="font-label text-label uppercase text-label-dim">Still writing this card</p>
      )}
    </article>
  );
}

const HOUR_ADDS = [
  "Your rising sign, and the chapter it opens",
  "Twelve houses: which part of life each planet affects",
  "Day or night, and which planets matter most",
  "The Lots, points worked out from your rising sign",
];

/** The country is the last part of the place the geocoder returned, when it gave one. */
function countryOf(birthPlace?: string): string | null {
  if (!birthPlace) return null;
  const parts = birthPlace.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function AddBirthTimeCard({ birthPlace, onAddBirthTime }: { birthPlace?: string; onAddBirthTime?: () => void }) {
  const hint = hintFor(countryOf(birthPlace));
  return (
    <div className="relative flex h-full flex-col rounded-xl border border-brass/40 bg-surface/40 p-5 text-left" data-testid="add-birth-time-card">
      <p className="rp-kicker">Rising sign · needs a birth time</p>
      <h4 className="mt-1 font-display text-sheet-title text-paper">What your birth time adds</h4>
      <ul className="mt-4 space-y-2 text-ui leading-relaxed text-paper/85">
        {HOUR_ADDS.map((line) => <li key={line} className="flex gap-2"><span aria-hidden className="text-brass">·</span>{line}</li>)}
      </ul>
      <div className="mt-5">
        <button
          type="button"
          onClick={onAddBirthTime}
          disabled={!onAddBirthTime}
          className="relative rounded-pill border border-brass/60 bg-brass/10 px-4 py-2 font-label text-label uppercase tracking-[0.2em] text-brass transition-colors duration-[var(--dur-fast)] ease-[var(--ease)] after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:bg-brass/20 disabled:opacity-50"
        >
          Add my birth time
        </button>
        <p className="mt-2 font-label text-label uppercase text-muted">Free. We'll show you what changed.</p>
      </div>
      <p className="mt-auto border-t border-line/40 pt-3 text-caption leading-relaxed text-muted">
        <span className="font-label text-label uppercase text-brass/80">Where to find it · </span>
        {hint.text}
      </p>
    </div>
  );
}

export default HouseCard;
