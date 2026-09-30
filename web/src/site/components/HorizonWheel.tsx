/**
 * The product's wheel on the page's horizon (landing scope 2, 14, 15; ADR-107,
 * 108): NatalWheel's plate, radii, band words, renders and colours, drawn from
 * the same geometry module, but framed on the Ascendant itself rather than on
 * its sign's first degree, so the page's dotted line is the chart's horizon
 * and east is on the left. NatalWheel frames on the cusp and makes every house
 * and body a button; a landing needs neither, and it needs bodies it can move.
 *
 * Three ways a sky arrives. First light: the band settles, the bodies rise
 * from the Ascendant to their degrees 70 ms apart, the houses and aspects come
 * in, about 2.3 s on the one easing. The rewind: the band turns on the
 * compositor while the bodies run through engine charts worked out ahead,
 * gliding the short way from one to the next and landing on the birth chart
 * itself; they leave long-exposure trails and the centre counts the date. At
 * once: the minute's update, and everything under reduced motion.
 *
 * The square is empty until the browser has a sky: the prerender cannot know
 * the visitor's minute or city, and the square keeps its place meanwhile.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ASPECT_ORBS } from "@workspace/engine";
import { houseBandLabel } from "@/components/chart/NatalWheel";
import { arcLabelPath, arcPath, aspectStrength, assignLanes, norm360, pointAt, wedgePath, wheelRadii } from "@/components/chart/wheel-geometry";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { renderFor } from "@/lib/planet-renders";
import { PLANET_LABELS, type ChartData } from "@/types/chart";
import {
  BODIES,
  EASE_CSS,
  REWIND_MS,
  bodiesAt,
  countAt,
  ease,
  frameOf,
  hudLines,
  moonDay,
  placementLine,
  rewindAt,
  wheelLabel,
  type Body,
  type PreparedRewind,
  type Sky,
} from "@/site/lib/sky";

const PLATE = 600;
const R = wheelRadii(PLATE);
const C = R.centre;
/** NatalWheel's padding: the band's edge then sits 9.15% into the square, where site.css ends the page's horizon. */
const PAD = PLATE * 0.085;
const VIEW = PLATE + 2 * PAD;
/** The sign band's outer edge as a share of the square's width, for anything drawn round the ring from outside. */
export const RING_SHARE = R.signOuter / VIEW;
const BRASS = "hsl(var(--brass))";
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

const ASPECT_STROKE: Record<string, string> = {
  conjunction: BRASS,
  trine: "hsl(var(--chart-4))",
  sextile: "hsl(var(--chart-4))",
  square: "hsl(var(--destructive))",
  opposition: "hsl(var(--destructive))",
};

/**
 * Each body keeps one lane in flight, so crossing another never makes it jump in or out; the inner lane stays
 * empty, where the counting date would cover it.
 */
const FLIGHT_LANE: Record<Body, number> = { sun: 0, moon: 1, mercury: 0, venus: 1, mars: 0, jupiter: 1, saturn: 0, uranus: 1, neptune: 0, pluto: 1 };
/** A trail takes its body's own colour, sampled from its render. */
const TRAIL: Record<Body, string> = {
  sun: "255,196,118", moon: "221,227,238", mercury: "201,194,182", venus: "241,221,176", mars: "224,132,92",
  jupiter: "227,190,148", saturn: "220,198,144", uranus: "159,214,222", neptune: "125,150,230", pluto: "194,168,152",
};

/** First light's parts, in seconds from the sky's arrival (landing scope 15). */
const BODY_START = 0.6;
const BODY_STEP = 0.07;
const BODY_RISE = 1.1;
const LAYERS_START = 1.4;
const INTRO_END = BODY_START + (BODIES.length - 1) * BODY_STEP + BODY_RISE;
const LAND_MS = 600;
/** How far a body may move between two frames and still draw a line rather than a dot. */
const TRAIL_JOIN = 38;

type Phase = "rest" | "intro" | "flying" | "landing";

interface Geometry {
  chart: ChartData;
  frame: number;
  drawn: boolean;
  theta: (lon: number) => number;
  lane: Record<string, number>;
  bodies: { key: Body; lon: number }[];
}

function geometryOf(chart: ChartData): Geometry {
  const frame = frameOf(chart);
  const bodies = BODIES.filter((key) => chart.planets[key]).map((key) => ({ key, lon: chart.planets[key].absoluteDegree }));
  const lanes = assignLanes(bodies.map((b) => ({ key: b.key, absoluteDegree: b.lon })), frame, { lanes: R.lanes, node: R.node, gap: PLATE * 0.01 });
  return {
    chart,
    frame,
    drawn: chart.angles !== undefined,
    theta: (lon) => 180 + norm360(lon - frame),
    lane: Object.fromEntries(lanes.map((l) => [l.key, l.radius])),
    bodies,
  };
}

const f2 = (n: number) => n.toFixed(2);

export interface HorizonWheelProps {
  /** Null until the browser has a sky. */
  sky: Sky | null;
  /** "intro": the first sky arrives by first light and later ones at once; "still": always at once. */
  arrival?: "intro" | "still";
  /** Given with a new sky, the frames worked out ahead for it: the wheel rewinds from the sky on show to that one. */
  rewind?: PreparedRewind | null;
  /** The four corner readouts, as the hero shows them. */
  hud?: boolean;
  /** The page's horizon line, left and right of the ring; a chart with no time never shows it. */
  horizon?: boolean;
  /** While the sky screen holds the wheel, the page's square stays in place, empty. */
  hidden?: boolean;
  /** Called with each sky once it is on the wheel: after first light, as a rewind lands, or at once; maybe twice. */
  onArrived?: (sky: Sky) => void;
  squareRef?: RefObject<HTMLDivElement | null>;
}

interface Flight {
  rewind: PreparedRewind;
  spin: Animation | null;
  hides: Animation[];
  canvas: CanvasRenderingContext2D | null;
}

export function HorizonWheel({ sky, arrival = "still", rewind = null, hud = false, horizon = true, hidden = false, onArrived, squareRef }: HorizonWheelProps) {
  const uid = useId();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<Sky | null>(null);
  const [phase, setPhase] = useState<Phase>("rest");
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const geo = useMemo(() => (shown ? geometryOf(shown.chart) : null), [shown]);

  const square = useRef<HTMLDivElement | null>(null);
  const spin = useRef<HTMLDivElement>(null);
  const trails = useRef<HTMLCanvasElement>(null);
  const count = useRef<SVGTextElement>(null);
  const band = useRef<SVGGElement>(null);
  const houses = useRef<SVGGElement>(null);
  const aspects = useRef<SVGGElement>(null);
  const axes = useRef<SVGGElement>(null);
  const marker = useRef<SVGGElement>(null);
  const leaders = useRef<SVGGElement>(null);
  const moonArc = useRef<SVGGElement>(null);
  const bodyEls = useRef(new Map<string, SVGGElement>());

  const taken = useRef<Sky | null>(null);
  const latest = useRef<Sky | null>(null);
  const flight = useRef<Flight | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const arrived = useRef(onArrived);
  arrived.current = onArrived;

  const put = (key: string, r: number, theta: number) => {
    const p = pointAt(C, C, r, theta);
    bodyEls.current.get(key)?.setAttribute("transform", `translate(${f2(p.x)} ${f2(p.y)})`);
  };

  const placeAtRest = (g: Geometry) => {
    for (const { key, lon } of g.bodies) put(key, g.lane[key], g.theta(lon));
  };

  const fadeable = () => [houses.current, aspects.current, axes.current, leaders.current, moonArc.current].filter((el): el is SVGGElement => el !== null);

  // A new sky: taken at once, by first light, or by the rewind from the one on show. Before paint, so a flight starts
  // on the frame the lift ends and the old sky is never drawn over the new one.
  useLayoutEffect(() => {
    latest.current = sky;
    if (!sky || sky === taken.current) return;
    const before = taken.current;
    const flies = before !== null && rewind !== null && rewind.plan.to.getTime() === sky.at.getTime() && !reduced;
    if (stop.current && !flies) return; // settles when the motion under way ends
    taken.current = sky;
    stop.current?.();
    stop.current = null;
    if (!before) {
      setShown(sky);
      setPhase(arrival === "intro" && !reduced ? "intro" : "rest");
      return;
    }
    if (flies && rewind) {
      flight.current = { rewind, spin: null, hides: [], canvas: null };
      setShown(before);
      setPhase("flying");
      return;
    }
    setShown(sky);
    setPhase("rest");
  }, [sky, arrival, rewind, reduced]);

  // A still arrival waited for the motion under way; when it ends the latest sky is drawn.
  const settle = () => {
    stop.current = null;
    const next = latest.current;
    if (next && next !== taken.current) {
      taken.current = next;
      setShown(next);
    }
    setPhase("rest");
  };

  useLayoutEffect(() => {
    if (!geo) return;
    if (phase === "rest") {
      placeAtRest(geo);
      return;
    }
    if (phase === "intro") return runIntro(geo);
    if (phase === "flying") return runFlight(geo);
    return runLanding(geo);
  }, [geo, phase]);

  // A rewind's sky has arrived once the bodies are on its degrees; they settle into their lanes as the page answers.
  useEffect(() => {
    if ((phase === "rest" || phase === "landing") && shown) arrived.current?.(shown);
  }, [phase, shown]);

  useEffect(() => () => {
    stop.current?.();
    flight.current?.spin?.cancel();
  }, []);

  function runIntro(g: Geometry) {
    const layers = fadeable();
    const order = [...g.bodies].sort((a, b) => norm360(180 - g.theta(a.lon)) - norm360(180 - g.theta(b.lon)));
    const m = pointAt(C, C, R.signOuter, 180);
    const part = (t: number, start: number, len: number) => ease(Math.min(1, Math.max(0, (t - start) / len)));
    const attr = (el: Element | null | undefined, name: string, value: string | null) => {
      if (!el) return;
      if (value === null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    };
    const clear = () => {
      for (const el of [band.current, marker.current, ...layers]) {
        attr(el, "opacity", null);
        attr(el, "transform", null);
      }
      for (const el of bodyEls.current.values()) attr(el, "opacity", null);
    };
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const b = part(t, 0, 1.6);
      attr(band.current, "opacity", b.toFixed(3));
      attr(band.current, "transform", `rotate(${f2(-24 * (1 - b))} ${C} ${C})`);
      const k = part(t, 1, 0.7);
      attr(marker.current, "opacity", k.toFixed(3));
      attr(marker.current, "transform", `translate(${f2(m.x)} ${f2(m.y)}) scale(${(0.2 + 0.8 * k).toFixed(3)}) translate(${f2(-m.x)} ${f2(-m.y)})`);
      for (const el of layers) attr(el, "opacity", (el === axes.current ? part(t, 0.9, 0.7) : part(t, LAYERS_START, 0.9)).toFixed(3));
      order.forEach(({ key, lon }, i) => {
        const start = BODY_START + i * BODY_STEP;
        let d = norm360(g.theta(lon) - 180);
        if (d > 180) d -= 360;
        attr(bodyEls.current.get(key), "opacity", t < start ? "0" : null);
        put(key, g.lane[key], 180 + d * part(t, start, BODY_RISE));
      });
      if (t < INTRO_END) {
        raf = requestAnimationFrame(frame);
        return;
      }
      clear();
      placeAtRest(g);
      settle();
    };
    // The first frame is drawn before the browser paints, so the settled chart never flashes first.
    frame(t0);
    stop.current = () => {
      cancelAnimationFrame(raf);
      clear();
    };
    return () => cancelAnimationFrame(raf);
  }

  function runFlight(g: Geometry) {
    const run = flight.current;
    const box = square.current;
    if (!run || !box) {
      settle();
      return;
    }
    const { plan, keys } = run.rewind;
    run.hides = fadeable().map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: EASE_CSS, fill: "forwards" }));
    run.spin = spin.current?.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${plan.turn}deg)` }], { duration: REWIND_MS, easing: EASE_CSS, fill: "forwards" }) ?? null;

    const cv = trails.current;
    // The layout width: the square may still carry the lift's transform.
    const size = box.offsetWidth;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.max(1, Math.round(size * dpr));
    const scale = px / VIEW;
    if (cv) {
      cv.width = px;
      cv.height = px;
      cv.style.transition = "none";
      cv.style.opacity = "1";
      run.canvas = cv.getContext("2d");
      run.canvas?.clearRect(0, 0, px, px);
    }
    const ctx = run.canvas;
    const prev = new Map<Body, [number, number]>();
    const t0 = performance.now();
    let last = t0;
    let raf = 0;

    const step = (now: number) => {
      const ms = typeof run.spin?.currentTime === "number" ? run.spin.currentTime : now - t0;
      const u = Math.min(1, ms / REWIND_MS);
      const longitudes = bodiesAt(keys, u);
      const turned = rewindAt(plan, u).frame;
      const blend = ease(Math.min(1, (now - t0) / 400));
      if (ctx) {
        // The exposure fades by time, not by frame, so a slow device keeps the same length of trail.
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${f2(1 - Math.pow(0.925, (now - last) / 16.7))})`;
        ctx.fillRect(0, 0, px, px);
        ctx.globalCompositeOperation = "lighter";
      }
      last = now;
      for (const { key } of g.bodies) {
        const r = g.lane[key] + (R.lanes[FLIGHT_LANE[key]] - g.lane[key]) * blend;
        put(key, r, 180 + norm360(longitudes[key] - plan.frame));
        if (!ctx) continue;
        const p = pointAt(C, C, r, 180 + norm360(longitudes[key] - turned));
        const x = (p.x + PAD) * scale;
        const y = (p.y + PAD) * scale;
        const before = prev.get(key);
        ctx.strokeStyle = ctx.fillStyle = `rgba(${TRAIL[key]},.85)`;
        if (before && Math.hypot(x - before[0], y - before[1]) < TRAIL_JOIN * scale) {
          ctx.lineWidth = (key === "sun" ? 2.4 : 1.6) * scale;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(before[0], before[1]);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 1.6 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        prev.set(key, [x, y]);
      }
      if (count.current) count.current.textContent = countAt(plan, u);
      if (u < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      stop.current = null;
      const target = taken.current;
      if (target) setShown(target);
      setPhase("landing");
    };
    raf = requestAnimationFrame(step);
    stop.current = () => {
      cancelAnimationFrame(raf);
      run.spin?.cancel();
      for (const a of run.hides) a.cancel();
    };
    return () => cancelAnimationFrame(raf);
  }

  function runLanding(g: Geometry) {
    const run = flight.current;
    // Two whole turns and the short way: the band drawn on the new Ascendant is where the turn left it.
    run?.spin?.cancel();
    for (const a of run?.hides ?? []) a.cancel();
    const shows = fadeable().map((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: EASE_CSS, fill: "backwards" }));
    // The exposure fades out where it lies; the next rewind clears it before drawing.
    const cv = trails.current;
    if (cv) {
      cv.style.transition = `opacity 1.4s ${EASE_CSS}`;
      cv.style.opacity = "0";
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = ease(Math.min(1, (now - t0) / LAND_MS));
      for (const { key, lon } of g.bodies) {
        const from = R.lanes[FLIGHT_LANE[key]];
        put(key, from + (g.lane[key] - from) * k, g.theta(lon));
      }
      if (k < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      flight.current = null;
      settle();
    };
    step(t0);
    stop.current = () => {
      cancelAnimationFrame(raf);
      for (const a of shows) a.cancel();
    };
    return () => cancelAnimationFrame(raf);
  }

  const setSquare = (el: HTMLDivElement | null) => {
    square.current = el;
    if (squareRef) squareRef.current = el;
  };

  const drawn = geo?.drawn ?? true;
  const lines = shown ? hudLines(shown) : null;
  const flying = phase === "flying";
  const showHorizon = horizon && drawn && !flying;
  const plan = flight.current?.rewind.plan;
  const back = !plan || plan.to.getTime() < plan.from.getTime();

  return (
    <div className="relative" data-phase={phase}>
      <div className="sd-hz sd-hz-l" aria-hidden="true" style={{ opacity: showHorizon ? 1 : 0, transition: `opacity .6s ${EASE_CSS}` }}>
        <i />
        <b>EAST · RISING</b>
      </div>
      <div className="sd-hz sd-hz-r" aria-hidden="true" style={{ opacity: showHorizon ? 1 : 0, transition: `opacity .6s ${EASE_CSS}` }}>
        <i />
        <b>WEST · SETTING</b>
      </div>
      <div ref={setSquare} className="relative aspect-square" style={{ visibility: hidden ? "hidden" : undefined }}>
        {shown && geo ? (
          <>
            <div ref={spin} className="absolute inset-0">
              <svg
                viewBox={`${-PAD} ${-PAD} ${VIEW} ${VIEW}`}
                className="block h-full w-full overflow-visible"
                role="img"
                aria-label={wheelLabel(shown)}
                onPointerOver={(event) => {
                  const el = (event.target as Element).closest("[data-k]");
                  const key = el?.getAttribute("data-k");
                  if (!key || phase !== "rest") return;
                  const p = pointAt(C, C, geo.lane[key], geo.theta(geo.chart.planets[key].absoluteDegree));
                  setTip({ text: `${PLANET_LABELS[key]} · ${placementLine(geo.chart, key)}`, x: ((p.x + PAD) / VIEW) * 100, y: ((p.y + PAD) / VIEW) * 100 });
                }}
                onPointerOut={(event) => {
                  const into = event.relatedTarget as Element | null;
                  if (!into?.closest?.("[data-k]")) setTip(null);
                }}
              >
                <defs>
                  <radialGradient id={`${uid}g`}>
                    <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx={C} cy={C} r={R.aspect} fill={`url(#${uid}g)`} />
                <Band uid={uid} geo={geo} ref={band} />
                <g ref={houses}>{geo.drawn && <Houses uid={uid} geo={geo} />}</g>
                <g ref={aspects}>
                  <Aspects geo={geo} />
                </g>
                <g ref={axes}>{geo.drawn && <Axes geo={geo} markerRef={marker} />}</g>
                <g ref={leaders}>
                  {geo.bodies.map(({ key, lon }) => {
                    const a = geo.theta(lon);
                    const tick = pointAt(C, C, R.tick, a);
                    const end = pointAt(C, C, geo.lane[key] + R.node * 0.5, a);
                    return (
                      <g key={key}>
                        <line x1={f2(tick.x)} y1={f2(tick.y)} x2={f2(end.x)} y2={f2(end.y)} stroke={BRASS} strokeOpacity={geo.lane[key] < R.lanes[0] ? 0.42 : 0.3} />
                        <circle cx={f2(tick.x)} cy={f2(tick.y)} r={1.7} fill={BRASS} fillOpacity={0.85} />
                      </g>
                    );
                  })}
                </g>
                <g ref={moonArc}>
                  <MoonArc geo={geo} />
                </g>
                <g>
                  {geo.bodies.map(({ key }) => (
                    <BodyMark
                      key={key}
                      body={key}
                      retrograde={phase === "rest" && geo.chart.planets[key].retrograde}
                      register={(el) => {
                        if (el) bodyEls.current.set(key, el);
                        else bodyEls.current.delete(key);
                      }}
                    />
                  ))}
                </g>
              </svg>
            </div>
            <canvas ref={trails} className="pointer-events-none absolute inset-0 h-full w-full opacity-0" aria-hidden="true" />
            <svg
              viewBox={`${-PAD} ${-PAD} ${VIEW} ${VIEW}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ opacity: flying ? 1 : 0, transition: `opacity .4s ${EASE_CSS}` }}
              aria-hidden="true"
            >
              <text ref={count} x={C} y={C + 4} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={27} fill="#F2F4F9" />
              <text x={C} y={C + 30} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={9.5} letterSpacing={2.4} fill="#9FA8DA">
                {back ? "REWINDING THE SKY" : "RUNNING THE SKY FORWARD"}
              </text>
            </svg>
            {tip && phase === "rest" ? (
              <div
                className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-[calc(100%+16px)] whitespace-nowrap rounded-md border border-[#242C3B] bg-[rgba(23,29,41,.96)] px-2.5 py-1.5 font-numeric text-[11.5px] leading-tight text-[#E8EBF2]"
                style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
                aria-hidden="true"
              >
                {tip.text}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {hud && lines ? (
        <>
          <div className="sd-hud tl" aria-hidden="true">
            {shown?.kind === "now" ? <span className="sd-live" /> : null}
            {lines.tl}
          </div>
          <div className="sd-hud tr" aria-hidden="true">{lines.tr}</div>
          <div className="sd-hud bl" aria-hidden="true">{lines.bl}</div>
          <div className="sd-hud br" aria-hidden="true">{lines.br}</div>
        </>
      ) : null}
    </div>
  );
}

function Band({ uid, geo, ref }: { uid: string; geo: Geometry; ref: RefObject<SVGGElement | null> }) {
  const first = Math.floor(norm360(geo.frame) / 30);
  const labelAt = geo.drawn ? R.bandSign : (R.signOuter + R.signInner) / 2;
  return (
    <g ref={ref}>
      {SIGNS.map((sign, i) => {
        const a0 = geo.theta(i * 30);
        const a1 = a0 + 30;
        const house = geo.drawn ? ((i - first + 12) % 12) + 1 : i + 1;
        return (
          <g key={sign}>
            <path d={wedgePath(C, C, R.signOuter, R.signInner, a0, a1)} fill={`hsl(var(--brass) / ${house % 2 ? 0.05 : 0.085})`} stroke="hsl(var(--brass) / 0.3)" strokeWidth={1} />
            <path id={`${uid}s${i}`} d={arcLabelPath(C, C, labelAt, a0 + 1.5, a1 - 1.5)} fill="none" />
            <text fontFamily="Space Grotesk, sans-serif" fontSize={PLATE * 0.0225} letterSpacing="1.4" fill={BRASS} dominantBaseline="middle">
              <textPath href={`#${uid}s${i}`} startOffset="50%" textAnchor="middle">
                {sign.toUpperCase()}
              </textPath>
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={R.signInner} fill="none" stroke="hsl(var(--brass) / 0.28)" />
      <circle cx={C} cy={C} r={R.aspect} fill="none" stroke="hsl(var(--brass) / 0.2)" />
      {Array.from({ length: 72 }, (_, i) => i * 5).map((d) => {
        const a = geo.theta(d);
        const t0 = pointAt(C, C, R.tick, a);
        const t1 = pointAt(C, C, R.tick - (d % 30 === 0 ? PLATE * 0.02 : PLATE * 0.008), a);
        return <line key={d} x1={f2(t0.x)} y1={f2(t0.y)} x2={f2(t1.x)} y2={f2(t1.y)} stroke={BRASS} strokeOpacity={d % 30 === 0 ? 0.42 : 0.16} />;
      })}
    </g>
  );
}

/** Each house under its sign, as review-25-09 names it: "10 · CAREER" (ADR-98). */
function Houses({ uid, geo }: { uid: string; geo: Geometry }) {
  const first = Math.floor(norm360(geo.frame) / 30);
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
        const a0 = geo.theta((first + h - 1) * 30);
        const a1 = a0 + 30;
        return (
          <g key={h}>
            <path d={wedgePath(C, C, R.tick, R.aspect, a0, a1)} fill={`hsl(0 0% 100% / ${h % 2 ? 0.012 : 0.026})`} />
            <path id={`${uid}h${h}`} d={arcLabelPath(C, C, R.bandHouse, a0 + 1.5, a1 - 1.5)} fill="none" />
            <text fontFamily="Space Grotesk, sans-serif" fontSize={PLATE * 0.019} letterSpacing="1.2" fill="hsl(var(--foreground) / 0.55)" dominantBaseline="middle">
              <textPath href={`#${uid}h${h}`} startOffset="50%" textAnchor="middle">
                {houseBandLabel(h)}
              </textPath>
            </text>
          </g>
        );
      })}
    </>
  );
}

function Aspects({ geo }: { geo: Geometry }) {
  return (
    <>
      {geo.chart.aspects.map((a) => {
        const p1 = geo.chart.planets[a.planet1];
        const p2 = geo.chart.planets[a.planet2];
        if (!p1 || !p2) return null;
        const q1 = pointAt(C, C, R.aspect, geo.theta(p1.absoluteDegree));
        const q2 = pointAt(C, C, R.aspect, geo.theta(p2.absoluteDegree));
        const s = aspectStrength(a.orb, ASPECT_ORBS[a.type as keyof typeof ASPECT_ORBS] ?? 6);
        return (
          <line
            key={`${a.planet1}-${a.planet2}-${a.type}`}
            x1={f2(q1.x)} y1={f2(q1.y)} x2={f2(q2.x)} y2={f2(q2.y)}
            stroke={ASPECT_STROKE[a.type] ?? "hsl(var(--muted-foreground))"}
            strokeWidth={0.6 + 1.2 * s}
            strokeOpacity={0.18 + 0.42 * s}
            strokeLinecap="round"
            strokeDasharray={a.applying ? undefined : "3 4"}
          />
        );
      })}
    </>
  );
}

/** The horizon and meridian; the Ascendant is the R03 marker on the ring's edge, where the page's line meets it (ADR-49). */
function Axes({ geo, markerRef }: { geo: Geometry; markerRef: RefObject<SVGGElement | null> }) {
  const angles = geo.chart.angles;
  if (!angles) return null;
  const mc = geo.theta(angles.midheaven.absoluteDegree);
  const lines = [
    { a: 180, major: true },
    { a: 0, major: false },
    { a: mc, major: true },
    { a: mc + 180, major: false },
  ];
  const label = pointAt(C, C, R.signOuter + PLATE * 0.026, mc);
  const m = pointAt(C, C, R.signOuter, 180);
  const r = 8.5;
  return (
    <>
      {lines.map(({ a, major }) => {
        const q0 = pointAt(C, C, R.aspect, a);
        const q1 = pointAt(C, C, R.signInner + PLATE * 0.012, a);
        return <line key={a} x1={f2(q0.x)} y1={f2(q0.y)} x2={f2(q1.x)} y2={f2(q1.y)} stroke={BRASS} strokeWidth={major ? 1.5 : 1} strokeOpacity={major ? 0.72 : 0.4} />;
      })}
      <text x={f2(label.x)} y={f2(label.y + 3)} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={PLATE * 0.024} letterSpacing="1.4" fill={BRASS}>
        MC
      </text>
      <g ref={markerRef}>
        <circle cx={f2(m.x)} cy={f2(m.y)} r={r} fill="hsl(var(--background))" stroke={BRASS} strokeWidth={1.8} />
        <circle cx={f2(m.x)} cy={f2(m.y)} r={3} fill={BRASS} />
        <line x1={f2(m.x - r)} y1={f2(m.y)} x2={f2(m.x - r - 12)} y2={f2(m.y)} stroke={BRASS} strokeWidth={1.8} strokeLinecap="round" />
      </g>
    </>
  );
}

/**
 * A day with no time draws the Moon's whole day (landing scope 3), just inside the ticks where no body's disc
 * covers it; the Moon itself sits at noon on it.
 */
function MoonArc({ geo }: { geo: Geometry }) {
  const day = moonDay(geo.chart);
  if (!day) return null;
  const a0 = geo.theta(day.from);
  const a1 = a0 + norm360(day.to - day.from);
  return <path d={arcPath(C, C, R.tick - PLATE * 0.015, a0, a1)} fill="none" stroke="#E8EBF2" strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" />;
}

function BodyMark({ body, retrograde, register }: { body: Body; retrograde: boolean; register: (el: SVGGElement | null) => void }) {
  const size = R.node;
  const src = renderFor(body, size);
  return (
    <g ref={register} data-k={body}>
      <circle r={R.node * 0.62} fill="hsl(var(--background))" fillOpacity={0.92} />
      {src ? <image href={src} x={-size / 2} y={-size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" /> : null}
      {retrograde ? (
        <text x={R.node * 0.46} y={-R.node * 0.32} fontFamily="IBM Plex Mono, monospace" fontSize={PLATE * 0.019} fill="hsl(var(--destructive))">
          R
        </text>
      ) : null}
    </g>
  );
}

export default HorizonWheel;
