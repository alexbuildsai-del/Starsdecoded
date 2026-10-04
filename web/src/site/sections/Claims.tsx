/**
 * Every claim, cited (landing-and-ai-search scope 5, ADR-110): four lines from
 * the sample's stored run, each with the rows its evidence card lists and a
 * line ending on the body or angle it rests on, take a turn each beside her
 * wheel and then rest on the first. In view, the wheel rewinds once from the
 * sky now to her birth minute. The prerendered page, reduced motion and a
 * reader who arrives with the section already on screen all start where the
 * rewind ends: the first claim, whole.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { localParts, offsetAtBirth } from "@workspace/engine";
import { NatalWheel } from "@/components/chart/NatalWheel";
import { houseOf, pointAt, theta, wheelRadii } from "@/components/chart/wheel-geometry";
import { clockWords } from "@/lib/date-entry";
import { ORDINALS, withHouseWords } from "@/lib/evidence-glossary";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { PERSONAL_REPORT, PRODUCT } from "@/lib/product";
import { latLngLine, skySentence, sunLine, tiltToAscendant } from "@/lib/sky-now";
import { cn } from "@/lib/utils";
import { PLANET_LABELS, type ChartAngles, type ChartData } from "@/types/chart";
import { homeClaims, type HomeClaim, type ResolvedHomeClaim } from "@/site/data/claims";
import { SAMPLE, sampleChart } from "@/site/data/sample";
import { chartOf } from "@/site/lib/chart";
import { SAMPLE_LIVE, formatUpdated } from "@/site/site";

const DWELL_MS = 6500;
const REWIND_MS = 2900;
// An engine chart costs about 30 ms on a laptop and four times that on a mid-range phone, so one per display refresh would
// stall the page. The rewind plays real charts worked out ahead instead, as many as fit the budget: about eleven a second
// on a laptop, fewer on a phone, never under MIN_FRAMES.
const FRAMES = 32;
const MIN_FRAMES = 12;
const BUDGET_MS = 1200;
const LINE_DELAY_MS = 260;
// A device too slow to have the frames ready by then lands on her chart rather than keep the reader waiting.
const WAIT_MS = 2500;
// The section starts where the hero ends, so it is near from the first paint; its frames wait out first light (about
// 2.3 s, landing scope 15) so they cost it no frame.
const AFTER_FIRST_LIGHT_MS = 2500;

// The evidence card's own hues, so a row reads the same here as it does on /sample.
const ASPECT_HUE = "#63A8C4";
const KINDS: Record<string, { label: string; hue: string }> = {
  placement: { label: "Placement", hue: "var(--indigo-lt)" },
  aspect: { label: "Aspect", hue: ASPECT_HUE },
  ruler: { label: "Ruler", hue: "var(--sd-brass)" },
  angle: { label: "Angle", hue: "var(--sd-brass)" },
  sect: { label: "Sect", hue: "var(--violet)" },
  lot: { label: "Lot", hue: "#7FB08B" },
};
const kindOf = (kind: string) => KINDS[kind] ?? { label: kind, hue: "var(--indigo-lt)" };

const ANGLE_NAMES: Record<string, string> = { ascendant: "Rising", midheaven: "Midheaven", descendant: "Descendant", ic: "IC" };

const ZONE = SAMPLE.birth.timezone ?? "UTC";
const CITY = SAMPLE.place.split(",")[0];
const WHERE = `${CITY} · ${latLngLine(SAMPLE.birth.latitude, SAMPLE.birth.longitude)}`;
const BORN_ON = formatUpdated(SAMPLE.birth.birthDate);

const two = (n: number) => String(n).padStart(2, "0");
const f = (n: number) => n.toFixed(2);

function listed(names: string[]): string {
  return names.length < 3 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * A claim's tab and its brass line, said from her chart and the claim's own
 * evidence in the artifact's words ("Mars and Pluto · in Cancer, 6th house"),
 * so no sign or house on the page is typed.
 */
function tell(c: ResolvedHomeClaim, chart: ChartData): { tab: string; line: string } {
  const { kind, key } = c.target;
  if (kind === "angle") {
    const name = ANGLE_NAMES[key] ?? key;
    const angle = chart.angles?.[key as keyof ChartAngles];
    return { tab: name, line: angle ? `${name} · ${angle.sign}` : name };
  }
  const body = PLANET_LABELS[key] ?? key;
  const at = chart.planets[key];
  const house = at?.house ? `${ORDINALS[at.house - 1]} house` : "";
  const refs = c.claim.evidence.map((e) => e.ref);
  if (refs.some((r) => r.kind === "ruler" && r.house === 1 && r.ruler === key)) {
    const rising = ANGLE_NAMES.ascendant;
    return { tab: rising, line: withHouseWords(`${rising} · ruled by ${body}${house ? ` in the ${house}` : ""}`) };
  }
  const beside = refs
    .flatMap((r) => (r.kind === "placement" && r.body !== key ? [String(r.body)] : []))
    .filter((b) => chart.planets[b] && chart.planets[b].sign === at?.sign && chart.planets[b].house === at?.house);
  const names = listed([body, ...beside.map((b) => PLANET_LABELS[b] ?? b)]);
  return { tab: body, line: withHouseWords(`${names} · in ${at?.sign ?? ""}${house ? `, ${house}` : ""}`) };
}

function houseOfTarget({ kind, key }: HomeClaim["target"], chart: ChartData): number {
  if (kind === "body") return chart.planets[key]?.house ?? 0;
  const angle = chart.angles?.[key as keyof ChartAngles];
  return angle && chart.angles ? houseOf(angle.absoluteDegree, chart.angles.ascendant.absoluteDegree) : 0;
}

interface Lit {
  bodies: string[];
  aspects: [string, string][];
  angles: string[];
}

/** What a claim's evidence names on the wheel: its target, the bodies it cites, any aspect between two of them. */
function litBy(c: ResolvedHomeClaim): Lit {
  const bodies = new Set<string>();
  const angles = new Set<string>();
  const aspects: [string, string][] = [];
  (c.target.kind === "body" ? bodies : angles).add(c.target.key);
  for (const { ref } of c.claim.evidence) {
    if (ref.kind === "placement") bodies.add(String(ref.body));
    else if (ref.kind === "ruler") bodies.add(String(ref.ruler));
    else if (ref.kind === "angle") angles.add(String(ref.angle));
    else if (ref.kind === "aspect") {
      aspects.push([String(ref.body1), String(ref.body2)]);
      bodies.add(String(ref.body1));
      bodies.add(String(ref.body2));
    }
  }
  return { bodies: [...bodies], aspects, angles: [...angles] };
}

interface Spot {
  x: number;
  y: number;
  r: number;
}

interface Spots {
  viewBox: string;
  plate: number;
  bodies: Record<string, Spot>;
}

/**
 * Where the wheel drew each body, read from its own SVG rather than worked out
 * again, so a line ends where the reader sees the body, inner lane and all.
 */
function readSpots(host: HTMLElement): Spots | null {
  const svg = host.querySelector<SVGSVGElement>("svg:not([data-marks])");
  const viewBox = svg?.getAttribute("viewBox");
  if (!svg || !viewBox) return null;
  const [x, , width] = viewBox.split(/[\s,]+/).map(Number);
  const bodies: Record<string, Spot> = {};
  // By data-body, not a button's label: this wheel takes no stops (MB-177), so none of its bodies is a button.
  for (const g of svg.querySelectorAll<SVGGElement>("g[data-body]")) {
    const key = g.dataset.body;
    const disc = g.querySelector("circle");
    if (key && disc) {
      bodies[key] = { x: Number(disc.getAttribute("cx")), y: Number(disc.getAttribute("cy")), r: Number(disc.getAttribute("r")) };
    }
  }
  // The wheel pads its plate equally on each side, so the plate is the view box less both paddings.
  return { viewBox, plate: width + 2 * x, bodies };
}

/**
 * The claim's evidence on her wheel, turning with it: a ring on each body it
 * cites, its aspect's line, and the ring the claim's line ends on.
 */
function Marks({ spots, claim, chart }: { spots: Spots; claim: ResolvedHomeClaim; chart: ChartData }) {
  const lit = litBy(claim);
  const radii = wheelRadii(spots.plate);
  const c = radii.centre;
  const asc = chart.angles?.ascendant.absoluteDegree ?? 0;
  const at = (radius: number, degree: number) => pointAt(c, c, radius, theta(degree, asc));
  const { kind, key } = claim.target;
  const target = kind === "body" ? spots.bodies[key] : undefined;
  return (
    <svg data-marks="" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={spots.viewBox} aria-hidden="true">
      {lit.aspects.map(([a, b]) => {
        const pa = chart.planets[a];
        const pb = chart.planets[b];
        if (!pa || !pb) return null;
        const p = at(radii.aspect, pa.absoluteDegree);
        const q = at(radii.aspect, pb.absoluteDegree);
        return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={ASPECT_HUE} strokeWidth={2.4} strokeLinecap="round" />;
      })}
      {lit.bodies.map((b) => {
        const s = spots.bodies[b];
        if (!s || (kind === "body" && b === key)) return null;
        return <circle key={b} cx={s.x} cy={s.y} r={s.r + 5} fill="none" stroke="var(--indigo-lt)" strokeOpacity={0.6} strokeWidth={1.3} />;
      })}
      {lit.angles.map((a) => {
        const angle = chart.angles?.[a as keyof ChartAngles];
        if (!angle) return null;
        const p = at(radii.signInner, angle.absoluteDegree);
        const main = kind === "angle" && key === a;
        return (
          <circle key={a} data-target={main ? "" : undefined} cx={p.x} cy={p.y} r={radii.node * 0.55} fill="none" stroke="var(--sd-brass)" strokeWidth={1.6} />
        );
      })}
      {target && (
        <circle data-target="" cx={target.x} cy={target.y} r={target.r + 6} fill="none" stroke="var(--paper)" strokeOpacity={0.85} strokeWidth={1.6} />
      )}
    </svg>
  );
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * The line from a claim to its body. Side by side it drops under the claim's
 * number, runs past the quote's longest line and bends onto the body; stacked,
 * with the wheel above, it rises from the claim's top edge. Either way it stops
 * on the ring around the body rather than crossing into it.
 */
function routeLine(stage: Box, mark: Box, ring: Box, panel: Box, quote: Box, stacked: boolean): { d: string; x: number; y: number } {
  const bx = ring.left + ring.width / 2 - stage.left;
  const by = ring.top + ring.height / 2 - stage.top;
  const r = ring.width / 2;
  const onRing = (x: number, y: number) => {
    const t = Math.atan2(y - by, x - bx);
    return [bx + Math.cos(t) * r, by + Math.sin(t) * r] as const;
  };
  if (stacked) {
    const x1 = Math.min(Math.max(bx, panel.left - stage.left + 12), panel.right - stage.left - 12);
    const y1 = panel.top - stage.top - 6;
    const [x, y] = onRing(x1, y1);
    const bend = (y1 - y) * 0.5;
    return { d: `M${f(x1)} ${f(y1)} C ${f(x1)} ${f(y1 - bend)}, ${f(x)} ${f(y + bend)}, ${f(x)} ${f(y)}`, x, y };
  }
  const x0 = mark.left + mark.width / 2 - stage.left;
  const top = mark.bottom - stage.top;
  const y0 = top + 7;
  const xr = Math.max(x0 + 18, Math.min(quote.right - stage.left + 18, bx - r - 40));
  const [x, y] = onRing(xr, y0);
  return {
    d: `M${f(x0)} ${f(top)} Q ${f(x0)} ${f(y0)}, ${f(x0 + 7)} ${f(y0)} L ${f(xr)} ${f(y0)} C ${f(xr + (x - xr) * 0.55)} ${f(y0)}, ${f(x - (x - xr) * 0.25)} ${f(y)}, ${f(x)} ${f(y)}`,
    x,
    y,
  };
}

function birthInstant(): number {
  const { birthDate, birthTime, timezone, timezoneOffset } = SAMPLE.birth;
  const offset = timezone ? offsetAtBirth(timezone, birthDate, birthTime) : timezoneOffset;
  const [y, mo, d] = birthDate.split("-").map(Number);
  const [h, mi] = birthTime.split(":").map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) - offset * 3_600_000;
}

/** The sky over her birthplace at an instant, from the engine, as a birth at that minute would be charted. */
function skyOver(at: number): ChartData {
  const { date, time } = localParts(new Date(at), ZONE);
  return chartOf({ ...SAMPLE.birth, birthDate: date, birthTime: time });
}

const dayOf = (at: number) => localParts(new Date(at), ZONE).date.replace(/-/g, " · ");

/** A rewind frame is no one's birth, so it claims no horizon: the bodies at their degrees and no angle, house or aspect. */
function bodiesOnly(chart: ChartData): ChartData {
  const planets: ChartData["planets"] = {};
  for (const [key, p] of Object.entries(chart.planets)) {
    planets[key] = { sign: p.sign, degree: p.degree, absoluteDegree: p.absoluteDegree, retrograde: p.retrograde, speed: p.speed };
  }
  return { planets, horizon: chart.horizon, elements: chart.elements, modalities: chart.modalities, dominance: chart.dominance, aspects: [], chartShape: chart.chartShape };
}

/** The shorter signed turn between two degrees. */
const shorter = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;

interface Frame {
  chart: ChartData;
  day: string;
}

interface Rewind {
  frames: Frame[];
  /** The wheel's turn at the first frame and the last: two full turns back, ending on her rising degree. */
  from: number;
  to: number;
}

/**
 * The rewind's frames, one engine chart each, worked out while the browser is
 * idle. They close on her birth as the cube of the frames left, so the dates
 * race through the decades and slow over the last days; a frame's bodies
 * framed on 0° Aries and the wheel turned by the Ascendant look exactly like a
 * chart framed on its rising sign, which lets the last frame hand over to hers
 * without a jump.
 */
function planRewind(now: number, sky: ChartData, her: ChartData, count: number, done: (plan: Rewind) => void): () => void {
  const birth = birthInstant();
  const frames: Frame[] = [{ chart: bodiesOnly(sky), day: dayOf(now) }];
  const idle = typeof window.requestIdleCallback === "function";
  let handle = 0;
  let stopped = false;
  const later = (fn: () => void) => {
    handle = idle ? window.requestIdleCallback(fn, { timeout: 500 }) : window.setTimeout(fn, 0);
  };
  const next = () => {
    if (stopped) return;
    const k = frames.length;
    if (k < count - 1) {
      const at = birth + (now - birth) * (1 - k / (count - 1)) ** 3;
      frames.push({ chart: bodiesOnly(skyOver(at)), day: dayOf(at) });
      later(next);
      return;
    }
    frames.push({ chart: bodiesOnly(her), day: dayOf(birth) });
    const from = sky.angles?.ascendant.absoluteDegree ?? 0;
    done({ frames, from, to: from + shorter(from, her.angles?.ascendant.absoluteDegree ?? 0) - 720 });
  };
  later(next);
  return () => {
    stopped = true;
    if (idle) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
}

function hideLine(path: SVGPathElement, end: SVGCircleElement): void {
  path.style.transition = "none";
  path.setAttribute("d", "");
  end.style.opacity = "0";
}

type Phase = "landed" | "waiting" | "rewinding";

interface WheelView {
  chart: ChartData;
  shown: "her" | "now" | "frame";
  turn: number;
  spin: boolean;
}

const PANEL = "col-start-1 row-start-1 grid content-start gap-3.5 max-[900px]:gap-2.5";
const K_LINE = "flex items-baseline gap-2.5 font-label text-[10.5px] font-medium uppercase leading-none tracking-[.22em] text-[color:var(--sd-brass)]";
const K_NUM = "font-numeric tracking-[.08em] text-[color:var(--sd-muted)]";
const QUOTE =
  "max-w-[24em] font-display text-[clamp(23px,2.5vw,31px)] italic leading-[1.32] text-[color:var(--paper-hi)] max-[900px]:text-[clamp(19px,5.2vw,23px)]";
const MARK =
  "static ml-1 inline-flex h-[17px] min-w-[18px] items-center justify-center rounded px-[3px] align-super font-numeric text-[10px] not-italic leading-none text-white bg-[color:var(--indigo)]";
const ENTER = [
  "animate-[sd-swap_.5s_var(--ease)_both]",
  "animate-[sd-swap_.5s_var(--ease)_.05s_both]",
  "animate-[sd-swap_.5s_var(--ease)_.1s_both]",
  "animate-[sd-swap_.5s_var(--ease)_.15s_both]",
];
const BAR = "block h-full origin-left bg-[color:var(--indigo-lt)]";
const BAR_EASE = "transition-transform duration-[450ms] ease-[var(--ease)]";

export default function Claims() {
  const { clock } = useEntryFormat();
  // Built at render, since the clock is the reader's and only known once the page hydrates.
  const born = `${SAMPLE.name} was born at ${clockWords(SAMPLE.birth.birthTime, clock)} on ${BORN_ON} in ${SAMPLE.place}.`;
  const claims = useMemo(() => homeClaims(), []);
  const chart = useMemo(() => sampleChart(), []);
  const told = useMemo(() => claims.map((c) => tell(c, chart)), [claims, chart]);
  const landing = useMemo<WheelView>(() => ({ chart, shown: "her", turn: tiltToAscendant(chart), spin: false }), [chart]);

  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("landed");
  // -1 is the card that says whose chart it is while the wheel rewinds.
  const [cur, setCur] = useState(0);
  const [cycling, setCycling] = useState(false);
  // The first claim is whole in the HTML; only a change the reader sees slides in.
  const [changed, setChanged] = useState(false);
  const [seen, setSeen] = useState(false);
  const [near, setNear] = useState(false);
  const [plan, setPlan] = useState<Rewind | null>(null);
  const [wheel, setWheel] = useState<WheelView>(landing);
  const [day, setDay] = useState("");
  const [spots, setSpots] = useState<Spots | null>(null);

  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const tip = useRef<SVGCircleElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const still = useRef(true);
  const wanted = useRef<number | null>(null);
  const mountedAt = useRef(0);
  const planning = useRef<(() => void) | null>(null);
  const draw = useRef<(animate: boolean) => void>(() => {});

  const land = useCallback(() => {
    setPhase("landed");
    setWheel(landing);
    setDay("");
    setChanged(true);
    setCur(wanted.current ?? 0);
  }, [landing]);

  useEffect(() => {
    setMounted(true);
    mountedAt.current = performance.now();
    still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still.current) return;
    setCycling(true);
    const el = box.current;
    const onScreen = !el || el.getBoundingClientRect().top < window.innerHeight;
    if (onScreen || !("IntersectionObserver" in window)) return;
    setPhase("waiting");
    setCur(-1);
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || !("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const inView = new IntersectionObserver(([entry]) => setSeen(entry.isIntersecting), { threshold: 0.35 });
    const ahead = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        ahead.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    inView.observe(el);
    ahead.observe(el);
    return () => {
      inView.disconnect();
      ahead.disconnect();
    };
  }, []);

  useEffect(() => {
    if (phase !== "waiting" || planning.current || !(near || seen)) return;
    const wait = seen ? 0 : Math.max(0, AFTER_FIRST_LIGHT_MS - (performance.now() - mountedAt.current));
    const timer = window.setTimeout(() => {
      const now = Date.now();
      const before = performance.now();
      const sky = skyOver(now);
      const cost = Math.max(1, performance.now() - before);
      setWheel({ chart: { ...sky, aspects: [] }, shown: "now", turn: tiltToAscendant(sky), spin: false });
      const count = Math.min(FRAMES, Math.max(MIN_FRAMES, Math.round(BUDGET_MS / cost) + 2));
      planning.current = planRewind(now, sky, chart, count, setPlan);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, near, seen, chart]);

  useEffect(() => {
    if (phase !== "waiting") planning.current?.();
  }, [phase]);

  useEffect(() => () => planning.current?.(), []);

  useEffect(() => {
    if (phase !== "waiting" || !seen) return;
    if (plan) {
      setPhase("rewinding");
      return;
    }
    const timer = window.setTimeout(land, WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, seen, plan, land]);

  useEffect(() => {
    if (phase !== "rewinding" || !plan) return;
    const { frames, from, to } = plan;
    setWheel({ chart: frames[0].chart, shown: "frame", turn: from, spin: false });
    setDay(frames[0].day);
    let raf = 0;
    let t0 = 0;
    let shown = 0;
    const step = (t: number) => {
      if (!t0) {
        t0 = t;
        setWheel((w) => ({ ...w, turn: to, spin: true }));
      }
      const k = Math.min(frames.length - 1, Math.floor(((t - t0) / REWIND_MS) * frames.length));
      if (k !== shown) {
        shown = k;
        setWheel((w) => ({ ...w, chart: frames[k].chart }));
        setDay(frames[k].day);
      }
      if (t - t0 >= REWIND_MS) {
        land();
        return;
      }
      raf = requestAnimationFrame(step);
    };
    // Two frames in, so the wheel has been painted at its first turn before the spin starts from it.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, plan, land]);

  // One pass, then it rests on the first claim: a turn that never ends keeps pulling the eye from the page (/web-taste).
  useEffect(() => {
    if (phase !== "landed" || !cycling || !seen || cur < 0) return;
    const timer = window.setTimeout(() => {
      const last = cur === claims.length - 1;
      setChanged(true);
      if (last) setCycling(false);
      setCur(last ? 0 : cur + 1);
    }, DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [phase, cycling, seen, cur, claims.length]);

  useEffect(() => {
    if (!mounted || spots || wheel.shown !== "her" || !plate.current) return;
    setSpots(readSpots(plate.current));
  }, [mounted, spots, wheel.shown]);

  useEffect(() => {
    draw.current = (animate) => {
      const st = stage.current;
      const path = line.current;
      const end = tip.current;
      const wheelBox = box.current;
      if (!st || !path || !end || !wheelBox) return;
      const panel = phase === "landed" && cur >= 0 && spots ? st.querySelector<HTMLElement>(`#sd-claim-${cur}`) : null;
      const mark = panel?.querySelector("sup");
      const quote = panel?.querySelector("q");
      const ring = plate.current?.querySelector("[data-target]");
      if (!panel || !mark || !quote || !ring) {
        hideLine(path, end);
        return;
      }
      const s = st.getBoundingClientRect();
      const a = mark.getBoundingClientRect();
      const b = ring.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      if (!a.width || !b.width) {
        hideLine(path, end);
        return;
      }
      const route = routeLine(s, a, b, p, quote.getBoundingClientRect(), wheelBox.getBoundingClientRect().left < p.right - 40);
      path.style.transition = "none";
      path.setAttribute("d", route.d);
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = animate ? `${length}` : "0";
      end.setAttribute("cx", f(route.x));
      end.setAttribute("cy", f(route.y));
      end.style.opacity = "1";
      if (animate) {
        void path.getBoundingClientRect();
        path.style.transition = "stroke-dashoffset .8s var(--ease)";
        path.style.strokeDashoffset = "0";
      }
    };
  });

  useEffect(() => {
    if (line.current && tip.current) hideLine(line.current, tip.current);
    if (phase !== "landed" || cur < 0 || !spots) return;
    const timer = window.setTimeout(() => draw.current(!still.current), still.current ? 0 : LINE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [phase, cur, spots]);

  useEffect(() => {
    const st = stage.current;
    if (!st || !("ResizeObserver" in window)) return;
    let timer = 0;
    // Only a line already drawn follows the layout; one waiting to be drawn will measure it then.
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (line.current?.getAttribute("d")) draw.current(false);
      }, 120);
    });
    ro.observe(st);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const pick = (i: number) => {
    setCycling(false);
    setChanged(true);
    if (phase === "landed") {
      setCur(i);
      return;
    }
    wanted.current = i;
    land();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = claims.length;
    const to =
      event.key === "ArrowRight" ? (i + 1) % n
      : event.key === "ArrowLeft" ? (i + n - 1) % n
      : event.key === "Home" ? 0
      : event.key === "End" ? n - 1
      : -1;
    if (to < 0) return;
    event.preventDefault();
    pick(to);
    tabs.current[to]?.focus();
  };

  const showing = wheel.shown === "her" && phase === "landed" && cur >= 0 ? claims[cur] : undefined;
  const hud =
    wheel.shown === "her" ? [`${SAMPLE.name} · ${BORN_ON} · ${clockWords(SAMPLE.birth.birthTime, clock)}`, WHERE, `Birth time · ${SAMPLE.source}`, sunLine(chart)]
    : wheel.shown === "now" ? ["The sky now", `Over ${WHERE}`, "", ""]
    : [`Rewinding to ${BORN_ON}`, WHERE, "", ""];

  return (
    <section className="relative overflow-clip bg-[linear-gradient(180deg,var(--void)_0%,var(--bg)_22%)]" aria-labelledby="sd-claims-h">
      <div ref={stage} className="relative py-[112px] max-[760px]:py-[72px]">
        <div className="sd-wrap grid grid-cols-[minmax(0,1fr)_minmax(0,540px)] items-center gap-x-14 max-[900px]:grid-cols-[minmax(0,1fr)] max-[900px]:items-start max-[900px]:gap-y-2">
          <div className="grid min-w-0 content-center gap-4 max-[900px]:contents">
            <p className="sd-eyebrow max-[900px]:order-1">A real example</p>
            {/* MB-160 provisional: the small number marks a claim, and a sentence can hold none. */}
            <h2 id="sd-claims-h" className="sd-h2 text-[clamp(32px,3.8vw,48px)] max-[900px]:order-2 max-[900px]:text-[clamp(26px,7vw,34px)]">
              You can see where every claim comes from
            </h2>
            <p className="sd-sub max-w-[30em] text-[17.5px] max-[900px]:hidden">
              Each claim in your report has a small number that shows which part of your chart it's based on. We check every one
              before you see it.
            </p>
            <div className="grid pt-2 max-[900px]:order-4" onClick={() => setCycling(false)}>
              <div className={cn(PANEL, cur < 0 ? "visible" : "invisible")}>
                {/* The flex gap spaces the number on screen; the space keeps it a word apart for a crawler or a screen reader. */}
                <p className={K_LINE}>
                  <span className={K_NUM}>{two(0)}</span> A real report
                </p>
                <p className={QUOTE}>{born}</p>
              </div>
              {claims.map((c, i) => {
                const on = i === cur;
                const enter = on && changed;
                return (
                  <div
                    key={c.claimId}
                    id={`sd-claim-${i}`}
                    role="tabpanel"
                    aria-labelledby={`sd-claim-tab-${i}`}
                    className={cn(PANEL, on ? "visible" : "invisible")}
                  >
                    <p className={cn(K_LINE, enter && ENTER[0])}>
                      <span className={K_NUM}>{two(i + 1)}</span> {told[i].line}
                    </p>
                    <p className={cn(QUOTE, enter && ENTER[1])}>
                      <q>{c.claim.quote}</q>
                      <sup aria-hidden="true" className={MARK}>
                        {i + 1}
                      </sup>
                    </p>
                    <ul className={cn("m-0 grid list-none gap-[7px] p-0", enter && ENTER[2])}>
                      {c.claim.evidence.map((e, j) => {
                        const k = kindOf(e.ref.kind);
                        return (
                          <li key={j} className="flex items-baseline gap-2.5 font-numeric text-[12.5px] leading-[1.4] text-[color:var(--paper-dim)]">
                            <span
                              className="inline-flex w-[86px] flex-none items-center gap-1.5 font-label text-[9px] font-medium uppercase leading-none tracking-[.18em]"
                              style={{ color: k.hue }}
                            >
                              <span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: k.hue }} />
                              {k.label}
                            </span>
                            <span className="min-w-0">{withHouseWords(e.label)}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <p
                      className={cn(
                        "font-numeric text-[10.5px] uppercase leading-[1.4] tracking-[.12em] text-[color:var(--sd-muted)]",
                        enter && ENTER[3],
                      )}
                    >
                      Checked against her chart
                    </p>
                  </div>
                );
              })}
            </div>
            <div
              role="tablist"
              aria-label="Claims"
              className="flex flex-wrap gap-1.5 max-[900px]:order-5"
              style={{ ["--dwell" as string]: `${DWELL_MS}ms` }}
              onFocus={() => setCycling(false)}
            >
              {claims.map((c, i) => {
                const on = i === cur;
                const running = on && phase === "landed" && cycling && seen;
                return (
                  <button
                    key={c.claimId}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`sd-claim-tab-${i}`}
                    aria-controls={`sd-claim-${i}`}
                    aria-selected={on}
                    tabIndex={on || (cur < 0 && i === 0) ? 0 : -1}
                    onClick={() => pick(i)}
                    onKeyDown={(event) => onKey(event, i)}
                    className="grid min-w-[78px] cursor-pointer gap-[7px] border-0 bg-transparent py-1.5 text-left font-label text-[10px] font-medium uppercase leading-none tracking-[.2em] text-[color:var(--sd-muted)] aria-selected:text-[color:var(--paper)]"
                  >
                    {told[i].tab}
                    <span aria-hidden="true" className="block h-0.5 overflow-hidden rounded-sm bg-[color:var(--line)]">
                      <span
                        key={running ? `run-${cur}` : "idle"}
                        className={cn(
                          BAR,
                          running
                            ? "[transform:scaleX(0)] animate-[sd-tocprog_var(--dwell)_linear_both]"
                            : on
                              ? cn("[transform:scaleX(1)]", BAR_EASE)
                              : cn("[transform:scaleX(0)]", BAR_EASE),
                        )}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="max-w-[44em] text-[12.5px] leading-[1.55] text-[color:var(--sd-muted)] max-[900px]:order-6 max-[900px]:text-[11.5px]">
              These lines are copied word for word from {SAMPLE.name}'s {PERSONAL_REPORT}. Her birth time comes from her public
              birth record ({SAMPLE.source}). {PRODUCT} has no connection to her family or estate.
            </p>
            {SAMPLE_LIVE && (
              <Link className="sd-more mt-0 justify-self-start max-[900px]:order-7" href="/sample">
                Read her sample report
              </Link>
            )}
          </div>
          <div
            ref={box}
            className="relative min-w-0 py-[30px] max-[900px]:order-3 max-[900px]:w-[min(100%,460px)] max-[900px]:justify-self-center max-[900px]:py-3"
          >
            <div className="sd-hz sd-hz-l left-[-44px] max-[900px]:left-[-100vw]" aria-hidden="true">
              <i />
            </div>
            <div className="sd-hz sd-hz-r" aria-hidden="true">
              <i />
            </div>
            {/* Drawn on the client into a square the HTML already holds, so the page never shifts and ids stay the browser's own. */}
            <div className="relative aspect-square [container-type:inline-size]">
              {mounted && (
                <div
                  ref={plate}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${wheel.turn}deg)`, transition: wheel.spin ? `transform ${REWIND_MS}ms var(--ease)` : "none" }}
                >
                  <NatalWheel
                    chartData={wheel.chart}
                    orbs={wheel.shown === "her" ? SAMPLE.run.meta.orbs : undefined}
                    selectedHouse={showing ? houseOfTarget(showing.target, chart) : 0}
                    // Nothing here answers a house or a planet, so Tab passes the wheel rather than 25 stops that do nothing (MB-177).
                    stops={false}
                  />
                  {showing && spots && <Marks spots={spots} claim={showing} chart={chart} />}
                </div>
              )}
              {wheel.shown === "frame" && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="font-numeric text-[3.2cqi] leading-none tracking-[.06em] text-[color:var(--paper-hi)]">{day}</span>
                </div>
              )}
            </div>
            <p className="sr-only">{`${SAMPLE.name}'s birth chart: ${skySentence(chart)}`}</p>
            <div className="sd-hud tl animate-none max-[900px]:hidden" aria-hidden="true">{hud[0]}</div>
            <div className="sd-hud tr animate-none max-[900px]:hidden" aria-hidden="true">{hud[1]}</div>
            <div className="sd-hud bl animate-none max-[900px]:hidden" aria-hidden="true">{hud[2]}</div>
            <div className="sd-hud br animate-none max-[900px]:hidden" aria-hidden="true">{hud[3]}</div>
          </div>
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path ref={line} fill="none" stroke="var(--indigo-lt)" strokeWidth={1.3} strokeLinecap="round" opacity={0.9} />
          <circle ref={tip} r={3} fill="var(--indigo-lt)" style={{ opacity: 0 }} />
        </svg>
      </div>
    </section>
  );
}
