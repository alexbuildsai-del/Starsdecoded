import { useEffect, useState } from "react";
import { getSkyNow, type SkyNow as SkyNowBody } from "@workspace/api-client-react";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { clockLine, latLngLine, skySentence, sunLine, tiltToAscendant, visitorZone } from "@/lib/sky-now";
import type { ChartData } from "@/types/chart";

export type Sky = Omit<SkyNowBody, "chart"> & { chart: ChartData; atDate: Date; offsetHours: number };

/**
 * The sky now over the visitor's city (ADR-107), from the API's engine, asked
 * again on each minute. A failed call keeps the last sky; before the first,
 * the wheel's square stays empty and the heading never waits for it.
 */
export function useSkyNow(): Sky | null {
  const [sky, setSky] = useState<Sky | null>(null);
  useEffect(() => {
    let timer = 0;
    let live = true;
    const zone = visitorZone();
    const ask = async () => {
      try {
        const body = await getSkyNow(zone ? { zone } : undefined);
        if (live) {
          setSky({ ...body, chart: body.chart as unknown as ChartData, atDate: new Date(body.at), offsetHours: body.chart.timezoneOffset ?? 0 });
        }
      } catch {
        // The last sky stays up; the next minute asks again.
      }
      if (live) timer = window.setTimeout(ask, 60_000 - (Date.now() % 60_000) + 1_000);
    };
    void ask();
    return () => { live = false; window.clearTimeout(timer); };
  }, []);
  return sky;
}

export function SkyNow({ sky }: { sky: Sky | null }) {
  return (
    <div className="wl-h-wheel">
      <div className="wl-hz wl-hz-l" aria-hidden="true"><i /><b>EAST · RISING</b></div>
      <div className="wl-hz wl-hz-r" aria-hidden="true"><i /><b>WEST · SETTING</b></div>
      {sky ? (
        <>
          <div className="wl-wheel" style={{ ["--tilt" as string]: `${tiltToAscendant(sky.chart)}deg` }}>
            <NatalWheel chartData={sky.chart} selectedHouse={0} />
          </div>
          <p className="sr-only">The sky now over {sky.city}: {skySentence(sky.chart)}</p>
          <div className="wl-hud tl" aria-hidden="true"><span className="wl-live" />LIVE · {clockLine(sky.atDate, sky.zone)}</div>
          <div className="wl-hud tr" aria-hidden="true">OVER {sky.city.toUpperCase()} · {latLngLine(sky.latitude, sky.longitude)}</div>
          <div className="wl-hud bl" aria-hidden="true">WHOLE SIGN · TROPICAL</div>
          <div className="wl-hud br" aria-hidden="true">{sunLine(sky.chart)}</div>
        </>
      ) : (
        <div className="aspect-square" aria-hidden="true" />
      )}
    </div>
  );
}
