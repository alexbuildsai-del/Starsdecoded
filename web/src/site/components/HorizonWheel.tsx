/**
 * The product's wheel on the page's horizon (landing scope 2, 14, 15; ADR-107,
 * 108): the one Chart in its Live sky state, tilted by its rising degree's
 * place in its sign so that degree sits on the page's level line, east on the
 * left (ADR-49, 395). The Chart draws every layer; this file only moves what
 * it drew, and never computes where a body goes.
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
 * the visitor's minute or city, and the square keeps its place meanwhile. A
 * page may give an example instead, a chart the prerender can draw (/sky's
 * worked example); the first sky then replaces it as it would fill the empty
 * square.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { tokens } from "@workspace/design";
import { norm360 } from "@/components/chart/wheel-geometry";
import { Chart } from "@/ds/organisms/chart/Chart";
import { buildScene, type Scene } from "@/ds/organisms/chart/scene";
import { PlacementLabel } from "@/ds/molecules/PlacementLabel";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { HOUSE_WORDS } from "@/lib/houses";
import { tiltToAscendant } from "@/lib/sky-now";
import type { ChartData } from "@/types/chart";
import {
  BODIES,
  EASE_CSS,
  REWIND_MS,
  bodiesAt,
  countAt,
  ease,
  hudLines,
  rewindAt,
  wheelLabel,
  type Body,
  type PreparedRewind,
  type Sky,
} from "@/site/lib/sky";

const PLATE = 600;
const c = tokens.color;
const font = tokens.fontFamily;
/** The plate's measures alone: buildScene reads no body for them, so a chart with none gives the ring's place in the square. */
const MEASURES = buildScene({ planets: {}, aspects: [] } as unknown as ChartData, "live-sky", PLATE);
const VIEW = PLATE + 2 * MEASURES.pad;
/** The sign band's outer edge as a share of the square's width, for anything drawn round the ring from outside. */
export const RING_SHARE = MEASURES.radii.signOuter / VIEW;

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
/** How far a body may move between two frames, in plate units, and still draw a line rather than a dot. */
const TRAIL_JOIN = 38;
/** What the layers a guide is not pointing at fade to, and the page's horizon with them. */
const UNLIT = 0.14;
const UNLIT_HORIZON = 0.15;

type Phase = "rest" | "intro" | "flying" | "landing";

/** The wheel's parts a guide can light, one at a time; the aspects dim whenever any is lit. */
export type WheelLayer = "signs" | "houses" | "horizon" | "bodies";

/** Where the Chart draws each layer, found by the marks it leaves on its own markup. */
const LAYER_MARKS: Record<WheelLayer | "aspects", string> = {
  signs: "[data-sign-ring]",
  houses: "[data-house]",
  horizon: "[data-horizon-line], [data-rising-marker]",
  bodies: "[data-body], [data-moon-band]",
  aspects: ":scope > line",
};

const f2 = (n: number) => n.toFixed(2);

interface Geometry {
  chart: ChartData;
  scene: Scene;
  /** Degrees the plate turns so the rising degree, not its sign's first degree, sits on the page's line. */
  tilt: number;
  drawn: boolean;
  /** The ten planets as the scene placed them: the motion moves only these. */
  bodies: { key: Body; lon: number; angle: number; radius: number }[];
}

function geometryOf(chart: ChartData): Geometry {
  const scene = buildScene(chart, "live-sky", PLATE);
  const placed = new Map(scene.bodies.map((b) => [b.id, b]));
  return {
    chart,
    scene,
    tilt: tiltToAscendant(chart),
    drawn: scene.timed,
    bodies: BODIES.filter((key) => placed.has(key)).map((key) => ({
      key,
      lon: chart.planets[key].absoluteDegree,
      angle: placed.get(key)!.angle,
      radius: placed.get(key)!.radius,
    })),
  };
}

/**
 * A drawn body taken off its rest point at `rest`: turned `turn` degrees (counter-clockwise, as the chart counts) round
 * the plate's centre and its lane scaled by `k`, its picture kept upright and its size. The Chart placed the body; this
 * only moves it, so no position is worked out twice.
 */
export function moved(rest: { x: number; y: number }, centre: number, turn: number, k: number): string | null {
  if (Math.abs(turn) < 1e-6 && Math.abs(k - 1) < 1e-6) return null;
  const { x, y } = rest;
  return `rotate(${f2(-turn)} ${centre} ${centre}) translate(${centre} ${centre}) scale(${k.toFixed(4)}) translate(${-centre} ${-centre}) `
    + `translate(${f2(x)} ${f2(y)}) scale(${(1 / k).toFixed(4)}) translate(${f2(-x)} ${f2(-y)}) rotate(${f2(turn)} ${f2(x)} ${f2(y)})`;
}

/** The body's rest point, read off its backing disc, the first circle the Chart draws in it. */
export function restOf(el: SVGGElement): { x: number; y: number } {
  const disc = el.querySelector("circle");
  return { x: Number(disc?.getAttribute("cx") ?? 0), y: Number(disc?.getAttribute("cy") ?? 0) };
}

/** Kept from the screen's edge, and from the ring, when the words have to move in. */
const EDGE_PX = 8;
const RING_GAP_PX = 4;
/** High enough over the line to clear the rising marker when the words come in close to the ring. */
const RAISED_PX = 16;

/**
 * The horizon's words sit in the page's margin beside the ring, outside the wheel's own box. Where that margin is too
 * narrow they come in from the screen's edge, raised clear of the marker, up to the ring; only where even that leaves
 * no room do they go and the line stays (B-98).
 */
function useWholeWords(root: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const words = [...host.querySelectorAll<HTMLElement>(".sd-hz b")];
    const check = () => {
      const box = host.getBoundingClientRect();
      const ringLeft = box.left + box.width * (0.5 - RING_SHARE);
      const ringRight = box.left + box.width * (0.5 + RING_SHARE);
      const screen = document.documentElement.clientWidth;
      for (const b of words) {
        b.style.visibility = "";
        b.style.transform = "";
        b.style.bottom = "";
        const r = b.getBoundingClientRect();
        if (r.width === 0) continue;
        const shift = r.left < EDGE_PX ? EDGE_PX - r.left : r.right > screen - EDGE_PX ? screen - EDGE_PX - r.right : 0;
        if (shift === 0) continue;
        b.style.transform = `translateX(${shift}px)`;
        b.style.bottom = `${RAISED_PX}px`;
        const east = b.closest(".sd-hz-l") !== null;
        const fits = east ? r.right + shift <= ringLeft - RING_GAP_PX : r.left + shift >= ringRight + RING_GAP_PX;
        if (!fits) b.style.visibility = "hidden";
      }
    };
    check();
    // Again once a lift into the sky screen has settled the wheel where it stays.
    const later = window.setTimeout(check, 1200);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(check);
    ro?.observe(host);
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(later);
      ro?.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [root]);
}

export interface HorizonWheelProps {
  /**
   * Null until the browser has a sky. One given at the first render is drawn
   * in it, prerender included, so it must be a sky the server works out the
   * same: never the visitor's minute or city.
   */
  sky: Sky | null;
  /** Drawn by the prerender and at first paint while `sky` is null; the first sky then arrives as it would on an empty square. */
  example?: Sky | null;
  /**
   * For a guide to reading the wheel: one layer at full strength and the
   * others faded, or null for none yet. A wheel no guide points at leaves it
   * out and carries no lighting.
   */
  lit?: WheelLayer | null;
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

export function HorizonWheel({
  sky,
  example = null,
  lit,
  arrival = "still",
  rewind = null,
  hud = false,
  horizon = true,
  hidden = false,
  onArrived,
  squareRef,
}: HorizonWheelProps) {
  const reduced = useReducedMotion();
  const { clock } = useEntryFormat();
  const [shown, setShown] = useState<Sky | null>(() => sky ?? example);
  const [phase, setPhase] = useState<Phase>("rest");
  const [tip, setTip] = useState<{ body: Body; x: number; y: number } | null>(null);
  const geo = useMemo(() => (shown ? geometryOf(shown.chart) : null), [shown]);

  const root = useRef<HTMLDivElement>(null);
  const square = useRef<HTMLDivElement | null>(null);
  const spin = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const trails = useRef<HTMLCanvasElement>(null);
  const count = useRef<SVGTextElement>(null);

  const taken = useRef<Sky | null>(sky ?? example);
  // The example holds the square only until the first sky, which comes in by first light like a sky on an empty square.
  const standIn = useRef(!sky && example !== null);
  const latest = useRef<Sky | null>(null);
  const flight = useRef<Flight | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const arrived = useRef(onArrived);
  arrived.current = onArrived;

  useWholeWords(root);

  const svg = () => plate.current?.querySelector<SVGSVGElement>("svg") ?? null;
  const marks = (sel: string): SVGElement[] => [...(svg()?.querySelectorAll<SVGElement>(sel) ?? [])];
  const bodyEl = (key: string) => svg()?.querySelector<SVGGElement>(`[data-body="${key}"]`) ?? null;

  /** Puts a body `turn` degrees along the zodiac from where it rests, on a lane of `radius`. */
  const put = (g: Geometry, key: Body, turn: number, radius: number) => {
    const el = bodyEl(key);
    const body = g.bodies.find((b) => b.key === key);
    if (!el || !body) return;
    const t = moved(restOf(el), g.scene.radii.centre, turn, radius / body.radius);
    if (t === null) el.removeAttribute("transform");
    else el.setAttribute("transform", t);
  };

  const placeAtRest = (g: Geometry) => {
    for (const { key, radius } of g.bodies) put(g, key, 0, radius);
  };

  // The layers that leave while the sky moves and come back once it lands; the Chiron and node points with them, since
  // the motion carries only the ten planets.
  const fadeable = (): SVGElement[] => [
    ...marks(LAYER_MARKS.houses),
    ...marks(LAYER_MARKS.aspects),
    ...marks("[data-horizon-line]"),
    ...marks("[data-moon-band]"),
    ...marks("[data-body]").filter((el) => !(BODIES as readonly string[]).includes(el.dataset.body ?? "")),
  ];

  // A new sky: taken at once, by first light, or by the rewind from the one on show. Before paint, so a flight starts
  // on the frame the lift ends and the old sky is never drawn over the new one.
  useLayoutEffect(() => {
    latest.current = sky;
    if (!sky || sky === taken.current) return;
    const before = taken.current;
    const flies = before !== null && rewind !== null && rewind.plan.to.getTime() === sky.at.getTime() && !reduced;
    if (stop.current && !flies) return; // settles when the motion under way ends
    const first = !before || (standIn.current && !flies);
    standIn.current = false;
    taken.current = sky;
    stop.current?.();
    stop.current = null;
    if (first) {
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

  // A guide lights one layer and fades the rest; a wheel no guide points at carries no lighting.
  useLayoutEffect(() => {
    if (lit === undefined) return;
    for (const [name, sel] of Object.entries(LAYER_MARKS) as [WheelLayer | "aspects", string][]) {
      for (const el of marks(sel)) {
        el.style.transition = `opacity .35s ${EASE_CSS}`;
        el.style.opacity = String(lit && lit !== name ? UNLIT : 1);
      }
    }
  }, [lit, geo]);

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
    const horizonLine = marks("[data-horizon-line]");
    const band = marks(LAYER_MARKS.signs)[0];
    const marker = marks("[data-rising-marker]")[0];
    const m = marker ? restOf(marker as SVGGElement) : { x: 0, y: 0 };
    const centre = g.scene.radii.centre;
    // The rising degree's angle on the plate, where every body sets out from.
    const rising = 180 + g.tilt;
    const order = [...g.bodies].sort((a, b) => norm360(rising - a.angle) - norm360(rising - b.angle));
    const part = (t: number, start: number, len: number) => ease(Math.min(1, Math.max(0, (t - start) / len)));
    const attr = (el: Element | null | undefined, name: string, value: string | null) => {
      if (!el) return;
      if (value === null) el.removeAttribute(name);
      else el.setAttribute(name, value);
    };
    const clear = () => {
      for (const el of [band, marker, ...layers]) {
        attr(el, "opacity", null);
        attr(el, "transform", null);
      }
      for (const { key } of g.bodies) attr(bodyEl(key), "opacity", null);
    };
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const b = part(t, 0, 1.6);
      attr(band, "opacity", b.toFixed(3));
      attr(band, "transform", `rotate(${f2(-24 * (1 - b))} ${centre} ${centre})`);
      const k = part(t, 1, 0.7);
      attr(marker, "opacity", k.toFixed(3));
      attr(marker, "transform", `translate(${f2(m.x)} ${f2(m.y)}) scale(${(0.2 + 0.8 * k).toFixed(3)}) translate(${f2(-m.x)} ${f2(-m.y)})`);
      for (const el of layers) attr(el, "opacity", (horizonLine.includes(el) ? part(t, 0.9, 0.7) : part(t, LAYERS_START, 0.9)).toFixed(3));
      order.forEach(({ key, angle, radius }, i) => {
        const start = BODY_START + i * BODY_STEP;
        let d = norm360(angle - rising);
        if (d > 180) d -= 360;
        attr(bodyEl(key), "opacity", t < start ? "0" : null);
        put(g, key, -d * (1 - part(t, start, BODY_RISE)), radius);
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
    const lanes = g.scene.radii.lanes;
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
    const discs = new Map(g.bodies.map(({ key }) => [key, bodyEl(key)?.querySelector("circle") ?? null]));
    const prev = new Map<Body, [number, number]>();
    const t0 = performance.now();
    let last = t0;
    let raf = 0;

    const step = (now: number) => {
      const ms = typeof run.spin?.currentTime === "number" ? run.spin.currentTime : now - t0;
      const u = Math.min(1, ms / REWIND_MS);
      const longitudes = bodiesAt(keys, u);
      const blend = ease(Math.min(1, (now - t0) / 400));
      for (const { key, lon, radius } of g.bodies) put(g, key, longitudes[key] - lon, radius + (lanes[FLIGHT_LANE[key]] - radius) * blend);
      if (ctx) {
        // The exposure fades by time, not by frame, so a slow device keeps the same length of trail; only its alpha counts.
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 1 - Math.pow(0.925, (now - last) / 16.7);
        ctx.fillStyle = c.void;
        ctx.fillRect(0, 0, px, px);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "lighter";
        // Where each body is on screen, turn and lift included, read back rather than worked out again.
        const at = box.getBoundingClientRect();
        const toCanvas = px / (at.width || 1);
        for (const { key } of g.bodies) {
          const r = discs.get(key)?.getBoundingClientRect();
          if (!r) continue;
          const x = (r.left + r.width / 2 - at.left) * toCanvas;
          const y = (r.top + r.height / 2 - at.top) * toCanvas;
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
      }
      last = now;
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
    const lanes = g.scene.radii.lanes;
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
      for (const { key, radius } of g.bodies) {
        const from = lanes[FLIGHT_LANE[key]];
        put(g, key, 0, from + (radius - from) * k);
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

  const point = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.("[data-body]");
    const key = el?.getAttribute("data-body") as Body | null | undefined;
    const box = square.current?.getBoundingClientRect();
    const disc = el?.querySelector("circle")?.getBoundingClientRect();
    // The ten planets only: the label names a body by its key, which reads well for a planet and not for a node.
    if (!key || !(BODIES as readonly string[]).includes(key) || !box?.width || !disc) return null;
    return {
      body: key,
      x: ((disc.left + disc.width / 2 - box.left) / box.width) * 100,
      y: ((disc.top + disc.height / 2 - box.top) / box.height) * 100,
    };
  };

  const drawn = geo?.drawn ?? true;
  const lines = hud && shown ? hudLines(shown, clock) : null;
  const flying = phase === "flying";
  const showHorizon = horizon && drawn && !flying;
  const horizonOpacity = showHorizon ? (lit && lit !== "horizon" ? UNLIT_HORIZON : 1) : 0;
  const plan = flight.current?.rewind.plan;
  const back = plan !== undefined && plan.to.getTime() < plan.from.getTime();
  const centre = MEASURES.radii.centre;
  const tipped = tip && phase === "rest" && shown ? shown.chart.planets[tip.body] : null;

  return (
    <div ref={root} className="relative" data-phase={phase}>
      <div className="sd-hz sd-hz-l" aria-hidden="true" style={{ opacity: horizonOpacity, transition: `opacity .6s ${EASE_CSS}` }}>
        <i />
        <b>EAST · RISING</b>
      </div>
      <div className="sd-hz sd-hz-r" aria-hidden="true" style={{ opacity: horizonOpacity, transition: `opacity .6s ${EASE_CSS}` }}>
        <i />
        <b>WEST · SETTING</b>
      </div>
      <div ref={setSquare} className="relative aspect-square" style={{ visibility: hidden ? "hidden" : undefined }}>
        {shown && geo ? (
          <>
            <div ref={spin} className="absolute inset-0">
              <div
                ref={plate}
                className={`absolute inset-0 ${phase === "rest" ? "" : "pointer-events-none [&_[data-body]_text]:opacity-0"}`}
                style={{ transform: geo.tilt ? `rotate(${geo.tilt}deg)` : undefined }}
                onPointerOver={(event) => {
                  if (phase === "rest") setTip(point(event.target));
                }}
                onPointerOut={(event) => {
                  if (!(event.relatedTarget as Element | null)?.closest?.("[data-body]")) setTip(null);
                }}
              >
                {/* The page's own label stands for the chart's chip on this wheel (PlacementLabel, O22). */}
                <Chart chart={shown.chart} state="live-sky" size={PLATE} fluid label={wheelLabel(shown)} className="[&_[data-chip]]:hidden" />
              </div>
            </div>
            <canvas ref={trails} className="pointer-events-none absolute inset-0 h-full w-full opacity-0" aria-hidden="true" />
            <svg
              viewBox={`${-MEASURES.pad} ${-MEASURES.pad} ${VIEW} ${VIEW}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ opacity: flying ? 1 : 0, transition: `opacity .4s ${EASE_CSS}` }}
              aria-hidden="true"
            >
              <text ref={count} x={centre} y={centre + 4} textAnchor="middle" fontFamily={font.mono} fontSize={27} fill={c.paper} />
              {/* Only with a flight, so a page's prerendered words never say the sky is rewinding. */}
              {plan ? (
                <text x={centre} y={centre + 30} textAnchor="middle" fontFamily={font.label} fontSize={9.5} letterSpacing={2.4} fill={c["indigo-lt"]}>
                  {back ? "REWINDING THE SKY" : "RUNNING THE SKY FORWARD"}
                </text>
              ) : null}
            </svg>
            {tip && tipped ? (
              <div
                className="pointer-events-none absolute z-3 -translate-x-1/2 -translate-y-[calc(100%+16px)]"
                style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
                aria-hidden="true"
              >
                <PlacementLabel
                  body={tip.body}
                  deg={tipped.degree}
                  sign={tipped.sign}
                  house={tipped.house}
                  houseWord={tipped.house ? HOUSE_WORDS[tipped.house - 1] : undefined}
                  retrograde={tipped.retrograde === true}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {lines ? (
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

export default HorizonWheel;
