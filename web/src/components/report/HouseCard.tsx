/**
 * One house as chapter 02's deck shows it (ADR-179): the house and its sign,
 * who stands there, the house's full title (ADR-98), then the report's own
 * reading, then its blocks (Often noticed, the stellium, each body going backwards, ADR-396 to 404), closed by its
 * Behaviour check. On a phone the card leads with the
 * first sentence and keeps the rest behind Read the rest; on a desktop and on
 * paper it shows the whole text. The card writes no astrological prose of its
 * own. A blind chart has no house to show, so the deck gives it the blind card.
 */
import { useId, useState } from "react";
import { PLANET_GLYPHS } from "@/types/chart";
import { PLANET_RENDERS } from "@/lib/planet-renders";
import { hintFor } from "@/lib/birth-record-hints";
import { HOUSE_NAMES, ORDINALS, houseWord } from "@/lib/evidence-glossary";
import { TRADITIONAL_RULER } from "@/lib/house-rulers";
import { splitReading } from "@/lib/house-deck";
import { OftenNoticed, RetrogradeBlock, StelliumBlock, StelliumChip } from "@/components/report/HouseBlocks";
import { AngleGlyph, type AngleKey } from "@/components/report/AngleGlyph";
import type { Occupant } from "@/lib/house-occupants";
import { PLANET_LABELS, type ChartData } from "@/types/chart";

const EASE = "ease-[cubic-bezier(.16,1,.3,1)]";

function OccupantMark({ o }: { o: Occupant }) {
  const src = o.kind === "planet" ? PLANET_RENDERS[o.key] : undefined;
  if (src) return <img src={src} alt={o.label} title={o.label} width={16} height={16} className="h-4 w-4" loading="lazy" />;
  // The R03 marker (ADR-49): an angle is a point on the horizon, never a body.
  if (o.kind === "angle") {
    return (
      <span role="img" aria-label={o.label} title={o.label} className="inline-flex">
        <AngleGlyph angle={o.key as AngleKey} size={16} />
      </span>
    );
  }
  return (
    <span role="img" aria-label={o.label} title={o.label} className="font-mono text-[11px] font-medium leading-none text-[color:var(--paper-dim)]">
      {PLANET_GLYPHS[o.key] ?? "·"}
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
  occupants: Occupant[];
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

export function HouseCard({ house, sign, occupants, ruler, quiet, reading, stellium, blocks, whole = false, lit = true, className = "" }: HouseCardProps) {
  const [open, setOpen] = useState(false);
  const restId = useId();
  const parts = reading ? splitReading(reading) : null;
  const i = house - 1;
  const stelliumBlock = stellium && blocks?.stellium ? blocks.stellium : null;

  return (
    <article
      aria-label={`${ORDINALS[i]} house, ${sign}`}
      className={`grid content-start gap-2.5 rounded-2xl border bg-[color:var(--surface)] p-4 transition-[opacity,transform,border-color] duration-[400ms] ${EASE} motion-reduce:transition-none print:break-inside-avoid print:border-neutral-300 print:bg-transparent ${
        lit ? "border-brass/35" : "scale-[.97] border-[color:var(--line)] opacity-55 motion-reduce:scale-100 motion-reduce:opacity-100 print:scale-100 print:opacity-100"
      } ${className}`}
    >
      <div className="flex min-h-4 flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[.12em] text-brass">
            {ORDINALS[i]} house · {sign}
          </p>
          {stellium && <StelliumChip />}
        </div>
        {occupants.length > 0 && (
          <span className="flex shrink-0 items-center gap-1">
            {occupants.map((o) => <OccupantMark key={o.key} o={o} />)}
          </span>
        )}
      </div>
      <h3 className={`font-display font-normal leading-[1.15] text-[color:var(--paper)] print:text-black ${whole ? "text-[28px]" : "text-[22px]"}`}>
        {HOUSE_NAMES[i]}
      </h3>
      {quiet && (
        <p className="-mt-1 font-numeric text-[12.5px] leading-[1.45] text-[color:var(--paper-dim)] print:text-black">{quiet}</p>
      )}
      {ruler && (
        <p className="-mt-1 font-numeric text-[12.5px] leading-[1.45] text-[color:var(--paper-dim)] print:text-black">
          {`${ruler.label} is your chart ruler, the planet that goes with your rising sign. It stands in ${ruler.sign}, in the ${ORDINALS[ruler.house - 1]} house (${houseWord(ruler.house)}).`}
        </p>
      )}
      {parts ? (
        <>
          <p className={`font-display leading-[1.45] text-[color:var(--paper)] print:text-black ${whole ? "text-[20px]" : "text-[17px]"}`}>
            {parts.lead}
          </p>
          {parts.rest && (
            <p
              id={restId}
              className={`text-foreground/85 print:block print:text-black ${whole ? "text-[15px] leading-[1.65]" : "text-[13.5px] leading-[1.55]"} ${
                whole || open ? "" : "hidden"
              }`}
            >
              {parts.rest}
            </p>
          )}
          {parts.rest && !whole && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={restId}
              onClick={() => setOpen((o) => !o)}
              className="-my-2 justify-self-start py-2 font-label text-[12.5px] font-medium text-[color:var(--indigo-lt)] hover:text-[color:var(--paper)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--indigo-lt)] print:hidden"
            >
              {open ? "Show less" : "Read the rest"}
            </button>
          )}
          {blocks?.noticed && <OftenNoticed idea={blocks.noticed.idea} why={blocks.noticed.why} whole={whole} />}
          {stelliumBlock && stellium && (
            <StelliumBlock count={stellium.length} house={house} text={stelliumBlock.text} balance={stelliumBlock.balance} whole={whole} />
          )}
          {blocks?.retrograde?.map((r) => <RetrogradeBlock key={r.planet} planet={r.planet} text={r.text} whole={whole} />)}
          {parts.check && (
            <div className="grid gap-1 border-t border-[color:var(--line-soft)] pt-2.5 print:border-neutral-300">
              <p className="font-label text-[9.5px] font-medium uppercase tracking-[.16em] text-[color:var(--accent)]">Does this sound like you?</p>
              <p className={`text-[color:var(--paper)] print:text-black ${whole ? "text-[14px] leading-[1.55]" : "text-[13.5px] leading-[1.5]"}`}>
                {parts.check}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="font-label text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">Still writing this card</p>
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
    <div className="relative flex h-full flex-col rounded-xl border border-brass/40 bg-card/40 p-5 text-left" data-testid="add-birth-time-card">
      <p className="rp-kicker">Rising sign · needs a birth time</p>
      <h4 className="mt-1 font-display text-2xl leading-tight text-foreground">What your birth time adds</h4>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground/85">
        {HOUR_ADDS.map((line) => <li key={line} className="flex gap-2"><span aria-hidden className="text-brass">·</span>{line}</li>)}
      </ul>
      <div className="mt-5">
        <button
          type="button"
          onClick={onAddBirthTime}
          disabled={!onAddBirthTime}
          className="rounded-full border border-brass/60 bg-brass/10 px-4 py-2 font-label text-[11px] uppercase tracking-[0.2em] text-brass hover:bg-brass/20 disabled:opacity-50"
        >
          Add my birth time
        </button>
        <p className="mt-2 font-label text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Free. We'll show you what changed.</p>
      </div>
      <p className="mt-auto border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-label text-[10px] tracking-[0.16em] uppercase text-brass/80">Where to find it · </span>
        {hint.text}
      </p>
    </div>
  );
}

export default HouseCard;
