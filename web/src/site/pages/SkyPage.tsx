/**
 * /sky, the free birth chart (annex /sky; ADR-107 to 109, 116): the copy above
 * the horizon, the form below it and the wheel across both, as on the home
 * page, with the form before the wheel on a phone so the rewind plays where the
 * reader is heading. The prerender draws the sample's chart as the worked
 * example, with its table; in the browser the sky now over the visitor's city
 * takes its place, and Show my chart rewinds the wheel in place to the birth.
 * The placements and the guide below follow the wheel once it lands. Nothing
 * typed is stored; after launch Get my report carries the birth to the birth
 * form (ADR-140, reading 14).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CHAPTERS } from "@/lib/chapters";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { ReportCta } from "@/site/cta";
import { HorizonWheel } from "@/site/components/HorizonWheel";
import { Placements } from "@/site/components/Placements";
import { ReadTheWheel } from "@/site/components/ReadTheWheel";
import { SkyForm } from "@/site/components/SkyForm";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import {
  birthSky,
  countWord,
  keyCount,
  prepareRewind,
  resultLines,
  sampleSky,
  wheelLabel,
  type PreparedRewind,
  type Sky,
  type SkyBirth,
} from "@/site/lib/sky";
import { useLiveSky } from "@/site/lib/useLiveSky";
import { useKeepForForm } from "@/site/sections/SkyScreen";
import { SiteLayout } from "../SiteLayout";
import { SAMPLE_LIVE, pageFor, type PagePath } from "../site";

const page = pageFor("/sky");

const RELATED: readonly { path: PagePath; eyebrow: string; line: string }[] = [
  { path: "/learn/birth-time", eyebrow: "Learn", line: "What changes without it, and where to look for it" },
  { path: "/learn/whole-sign-houses", eyebrow: "Learn", line: "The oldest way to split a chart into twelve houses" },
  { path: "/method", eyebrow: pageFor("/method").eyebrow, line: "From the positions of the planets to the last check" },
];

const NO_TIME = "Your chart still shows where every planet was that day, and the range the Moon covered. Your rising sign and houses need a birth time.";

interface OnWheel {
  sky: Sky;
  rewind: PreparedRewind | null;
}

export default function SkyPage() {
  const reduced = useReducedMotion();
  const titleId = useId();
  const sample = useMemo(() => sampleSky(SAMPLE.name, SAMPLE.place, SAMPLE.birth, sampleChart()), []);
  // The birth the wheel is drawing or rewinding to, and the one the table lists once the wheel has landed on it.
  const [onWheel, setOnWheel] = useState<OnWheel | null>(null);
  const [listed, setListed] = useState<Sky | null>(null);
  const [busy, setBusy] = useState(false);
  const [told, setTold] = useState("");
  const live = useLiveSky(busy || onWheel !== null);
  const wheelBox = useRef<HTMLDivElement>(null);
  const awaited = useRef<Sky | null>(null);
  const stopPreparing = useRef<(() => void) | null>(null);
  const keepForForm = useKeepForForm(listed?.birth);

  useEffect(() => () => stopPreparing.current?.(), []);

  const result = listed ?? live ?? sample;
  const lines = resultLines(result);

  // A phone stacks the wheel under the form, so the rewind would play off screen; the reader's own press brings it in.
  const bringWheelIn = () => {
    const box = wheelBox.current;
    if (!box) return;
    const at = box.getBoundingClientRect();
    if (at.top > window.innerHeight * 0.6 || at.bottom < window.innerHeight * 0.4) {
      box.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }
  };

  // The birth's chart is timed as it is worked out: its cost says how many rewind frames this device can ready quickly.
  const show = (birth: SkyBirth) => {
    if (busy) return;
    const from = onWheel?.sky ?? live ?? sample;
    const started = performance.now();
    const to = birthSky(birth);
    const frames = keyCount(performance.now() - started);
    awaited.current = to;
    bringWheelIn();
    if (reduced) {
      setOnWheel({ sky: to, rewind: null });
      return;
    }
    setBusy(true);
    stopPreparing.current?.();
    stopPreparing.current = prepareRewind(from, to, frames, (rewind) => {
      stopPreparing.current = null;
      setOnWheel({ sky: to, rewind });
    });
  };

  // The table and the guide change as the wheel lands, not when the button is pressed, so they never run ahead of it.
  const arrive = (sky: Sky) => {
    if (sky !== awaited.current) return;
    awaited.current = null;
    setListed(sky);
    setBusy(false);
    setTold(wheelLabel(sky));
  };

  const head = (
    // Clipped sideways for the horizon's run to the page's edges, but not downwards, where the place list opens.
    <section className="sd-hero" style={{ overflowY: "visible", zIndex: 1 }}>
      <div className="sd-wrap sd-hero-grid">
        <div className="sd-h-top grid gap-[18px]">
          <p className="sd-eyebrow">{page.eyebrow}</p>
          <h1 className="sd-page-h1">{page.h1}</h1>
          <p className="sd-lede">{page.lede}</p>
        </div>
        <div className="sd-h-bot">
          <div className="sd-panel">
            <SkyForm onShow={show} heading={false} busy={busy} />
          </div>
        </div>
        <div ref={wheelBox} className="sd-h-wheel">
          <HorizonWheel sky={onWheel?.sky ?? live} example={sample} arrival="intro" hud rewind={onWheel?.rewind ?? null} onArrived={arrive} />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {told}
      </p>
    </section>
  );

  const end = (
    <>
      <div className="sd-cta">
        <div>
          <p className="sd-eyebrow">{PERSONAL_REPORT}</p>
          <h2>Your {PERSONAL_REPORT} explains what your chart says about you</h2>
          <p>
            It has {countWord(CHAPTERS.length)} chapters about how you think, work, love and handle money, and every line shows which part of
            your chart it comes from.
          </p>
        </div>
        <div className="sd-cta-acts">
          <span className="contents" onClickCapture={keepForForm}>
            <ReportCta source="sky" className="sd-btn" />
          </span>
          {SAMPLE_LIVE ? (
            <Link className="sd-btn sd-btn-g" href="/sample">
              Read a sample
            </Link>
          ) : null}
        </div>
      </div>
      <div className="sd-rel">
        {RELATED.map(({ path, eyebrow, line }) => (
          <Link key={path} className="sd-relcard" href={path}>
            <span className="sd-eyebrow">{eyebrow}</span>
            <b>{pageFor(path).h1}</b>
            <span>{line}</span>
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <SiteLayout page={page} head={head} end={end}>
      <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby={titleId}>
        <div className="sd-wrap">
          <div className="mb-9 grid max-w-[760px] gap-2.5">
            <p className="sd-eyebrow">{lines.eyebrow}</p>
            <h2 id={titleId} className="sd-h2">
              {lines.title}
            </h2>
            <p className="font-numeric text-[11px] uppercase leading-normal tracking-[.14em] text-[color:var(--sd-muted)]">{lines.summary}</p>
            {result.chart.angles ? null : <p className="max-w-[56ch] text-[15.5px] leading-normal text-[color:var(--paper-dim)]">{NO_TIME}</p>}
          </div>
          <div className="grid items-start gap-x-14 gap-y-10 min-[1001px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <Placements chart={result.chart} caption={lines.caption} />
              {result.kind === "sample" ? (
                <p className="sd-fine">
                  This is {SAMPLE.name}'s birth chart. Her birth time comes from her public birth record ({SAMPLE.source}). {PRODUCT} has
                  no connection to her family or estate.
                </p>
              ) : null}
            </div>
            <ReadTheWheel sky={result} />
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
