/**
 * The chart explorer: the wheel and one house card side by side, in the normal
 * flow of chapter 02. Nothing is pinned to the viewport. Selecting a house
 * always shows its front; the card turns only when the card itself is tapped
 * (ADR-21, ADR-27). A blind chart (ADR-34) has no house to select: the card
 * slot holds the one call to action instead.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { HouseCard, type TriadPassage } from "@/components/report/HouseCard";
import { houseOccupants } from "@/lib/house-occupants";
import { hintFor } from "@/lib/birth-record-hints";
import { houseSign } from "@/components/chart/wheel-geometry";
import type { ChartData, HouseReading, TriadSection } from "@/types/chart";

/** What the hour adds, in four lines (unknown-birth-time "Explorer"). */
const HOUR_ADDS = [
  "Your rising sign, and the chapter it opens",
  "Twelve houses: where each planet does its work",
  "Day or night, and which planets carry weight",
  "The Lots, drawn from the horizon",
];

/** The country is the last part of the place the geocoder returned, when it gave one. */
export function countryOf(birthPlace?: string): string | null {
  if (!birthPlace) return null;
  const parts = birthPlace.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function AddBirthTimeCard({ birthPlace, onAddBirthTime }: { birthPlace?: string; onAddBirthTime?: () => void }) {
  const hint = hintFor(countryOf(birthPlace));
  return (
    <div className="relative flex h-full flex-col rounded-xl border border-brass/40 bg-card/40 p-5 text-left" data-testid="add-birth-time-card">
      <p className="rp-kicker">Horizon · not drawn</p>
      <h4 className="mt-1 font-display text-2xl leading-tight text-foreground">What the hour adds</h4>
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
        <p className="mt-2 font-label text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Free. Every change is marked.</p>
      </div>
      <p className="mt-auto border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-label text-[10px] tracking-[0.16em] uppercase text-brass/80">Where to find it · </span>
        {hint.text}
      </p>
    </div>
  );
}

// MB-43 provisional: the first localStorage key in the web app. One key, no
// consent gate, noted on the privacy draft.
const HINT_KEY = "sd.explorer.hint";

function hintSeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberHint() {
  try {
    window.localStorage.setItem(HINT_KEY, "1");
  } catch {
    // A browser that refuses storage simply shows the hint again. Nothing else depends on it.
  }
}

/** The triad passages a house carries: the 1st the rising, the Sun's and the Moon's their own. */
function triadFor(chart: ChartData, house: number, triad?: TriadSection): TriadPassage[] {
  if (!triad) return [];
  const out: TriadPassage[] = [];
  if (house === 1 && triad.rising) out.push({ key: "rising", label: "Rising", text: triad.rising.text });
  if (chart.planets.sun?.house === house) out.push({ key: "sun", label: "Sun", text: triad.sun.text });
  if (chart.planets.moon?.house === house) out.push({ key: "moon", label: "Moon", text: triad.moon.text });
  return out;
}

export interface ChartExplorerProps {
  chartData: ChartData;
  /** interpretation.meta.orbs, so aspect weight is measured against the real budget. */
  orbs?: Record<string, number>;
  readings?: HouseReading[];
  triad?: TriadSection;
  /** For the blind card's country hint. */
  birthPlace?: string;
  /** Opens the three-way birth time control; the blind card's one call to action. */
  onAddBirthTime?: () => void;
}

export function ChartExplorer({ chartData, orbs, readings, triad, birthPlace, onAddBirthTime }: ChartExplorerProps) {
  const [house, setHouse] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setShowHint(!hintSeen()), []);

  // The card takes the wheel's rendered height, so the pair reads as one object
  // and the back scrolls inside instead of stretching the chapter.
  useLayoutEffect(() => {
    const wheel = wheelRef.current;
    const root = rootRef.current;
    if (!wheel || !root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--explorer-h", `${Math.round(wheel.getBoundingClientRect().height)}px`);
    });
    observer.observe(wheel);
    return () => observer.disconnect();
  }, []);

  function dismissHint() {
    if (!showHint) return;
    setShowHint(false);
    rememberHint();
  }

  function selectHouse(next: number) {
    setHouse(next);
    setFlipped(false);
    dismissHint();
  }

  const blind = chartData.angles === undefined;
  const sign = blind ? "" : houseSign(house, chartData.angles!.ascendant.absoluteDegree);
  const reading = readings?.find((r) => r.house === house)?.reading;

  return (
    <div>
      {showHint && !blind && (
        <p className="mb-3 font-label text-[10px] uppercase tracking-[0.18em] text-muted-foreground/75">
          Tap a house on the wheel · tap the card to read
        </p>
      )}
      <div ref={rootRef} className="rp-explorer">
        <div ref={wheelRef} className="wheel rp-wheelbox">
          <NatalWheel
            chartData={chartData}
            orbs={orbs}
            selectedHouse={house}
            onSelectHouse={selectHouse}
          />
        </div>
        <div className="card">
          {blind ? (
            <AddBirthTimeCard birthPlace={birthPlace} onAddBirthTime={onAddBirthTime} />
          ) : (
            <HouseCard
              house={house}
              sign={sign}
              occupants={houseOccupants(chartData, house)}
              reading={reading}
              triad={triadFor(chartData, house, triad)}
              triadClaims={triad?.claims}
              flipped={flipped}
              onFlip={() => { setFlipped((f) => !f); dismissHint(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ChartExplorer;
