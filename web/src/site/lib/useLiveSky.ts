import { useEffect, useState } from "react";
import { visitorZone } from "@/lib/sky-now";
import { skyNow, type Sky } from "@/site/lib/sky";

/**
 * The sky now over the visitor's city (ADR-107), worked out in the browser on
 * each minute. Null on the server and at first paint, so the prerendered page
 * and hydration agree, and the wheel keeps its square until the first sky. A
 * hidden tab, or a page showing another sky, computes nothing.
 */
export function useLiveSky(paused = false): Sky | null {
  const [sky, setSky] = useState<Sky | null>(null);

  useEffect(() => {
    if (paused) return;
    const zone = visitorZone();
    let timer = 0;
    const tick = () => {
      if (!document.hidden) setSky(skyNow(new Date(), zone));
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 250);
    };
    const onShow = () => {
      if (document.hidden) return;
      window.clearTimeout(timer);
      tick();
    };
    // After the first paint, so the page shows before the engine's first run.
    timer = window.setTimeout(tick, 0);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [paused]);

  return sky;
}
