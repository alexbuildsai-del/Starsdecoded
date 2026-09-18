/**
 * The chart explorer: the wheel and one house card side by side, in the normal
 * flow of chapter 02. Nothing is pinned to the viewport. Selecting a house
 * always shows its front; the card turns only when the card itself is tapped
 * (ADR-21, ADR-27).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { HouseCard, type TriadPassage } from "@/components/report/HouseCard";
import { houseOccupants } from "@/lib/house-occupants";
import { houseSign } from "@/components/chart/wheel-geometry";
import type { ChartData, HouseReading, TriadSection } from "@/types/chart";

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
  if (house === 1) out.push({ key: "rising", label: "Rising", text: triad.rising.text });
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
}

export function ChartExplorer({ chartData, orbs, readings, triad }: ChartExplorerProps) {
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

  const sign = houseSign(house, chartData.angles.ascendant.absoluteDegree);
  const reading = readings?.find((r) => r.house === house)?.reading;

  return (
    <div>
      {showHint && (
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
        </div>
      </div>
    </div>
  );
}

export default ChartExplorer;
