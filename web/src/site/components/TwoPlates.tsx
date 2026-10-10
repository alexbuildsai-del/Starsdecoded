/**
 * Two people's charts on one horizon (ADR-113, landing scope 8): the one
 * Chart twice, each in its Sun, Moon and rising state and tilted so its
 * rising degree sits on one level line through both. Each chart stands alone:
 * nothing joins a body of one to the other (ADR-97), and nothing scores the
 * two. Names and readouts are text under the drawing, so they stay legible on
 * a phone and a crawler reads the placements.
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { animate } from "framer-motion";
import { NOT_DRAWN } from "@/components/report/pair-hero-layout";
import { TriadRow } from "@/components/TriadRow";
import { Chart } from "@/ds/organisms/chart/Chart";
import { buildScene } from "@/ds/organisms/chart/scene";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { first } from "@/lib/share-card";
import { tiltToAscendant } from "@/lib/sky-now";
import { triadRowsOf } from "@/lib/triad-row";
import type { ChartData } from "@/types/chart";
import { moved, restOf } from "@/site/components/HorizonWheel";

export interface PlatePerson {
  name: string;
  chart: ChartData;
}

export interface TwoPlatesProps {
  /** On the left; under parent and child, the parent. */
  a: PlatePerson;
  b: PlatePerson;
  /** Said under the two readouts, where a page labels its people as samples. */
  caption?: string;
}

/** Each plate's box as a share of the figure's width, centred a quarter in from each side, as the plates always stood. */
const BOX = 36;
const CENTRES = [25, 75] as const;
/** The plate's size before the browser measures it: a desktop's, so the prerender draws the sign names a desktop shows. */
const FIRST_SIZE = 240;
const GLIDE_S = 0.9;
const EASE = [0.16, 1, 0.3, 1] as const;
const LIGHTS = ["sun", "moon"] as const;

/** The plate in pixels as drawn, so the Chart's layers follow the size the reader sees (ChartStates: names from 200 px). */
function usePlateSize(box: RefObject<HTMLDivElement | null>): number {
  const [size, setSize] = useState(FIRST_SIZE);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setSize(Math.max(1, Math.round((el.getBoundingClientRect().width * BOX) / 100)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box]);
  return size;
}

function Plate({ person, size, centre, plateRef }: { person: PlatePerson; size: number; centre: number; plateRef?: RefObject<HTMLDivElement | null> }) {
  const tilt = tiltToAscendant(person.chart);
  return (
    <div
      ref={plateRef}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${centre}%`, width: `${BOX}%` }}
    >
      <div style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
        <Chart chart={person.chart} state="sun-moon-rising" size={size} fluid label={`${first(person.name)}'s Sun, Moon and rising`} />
      </div>
    </div>
  );
}

function Readout({ person }: { person: PlatePerson }) {
  return (
    <div className="grid min-w-0 content-start justify-items-center gap-1.5 px-1 text-center">
      <p className="font-display text-card-title leading-tight text-paper sm:text-sheet-title">{first(person.name)}</p>
      {/* Two readouts share a phone's width, so a value that does not fit beside its label drops under it whole. */}
      <TriadRow rows={triadRowsOf(person.chart, { blind: NOT_DRAWN })} compact className="w-auto! max-[460px]:[&_.lr]:flex-wrap max-[460px]:[&_.lr]:gap-y-0.5" />
    </div>
  );
}

/** Narrower than the gap between the rings, so on a phone a label wraps rather than touch a ring. */
const CENTRE_LABEL = "absolute left-1/2 w-[20%] -translate-x-1/2 text-center font-label text-label uppercase leading-[1.3]";

type Spots = Map<string, { x: number; y: number }>;

/** Where B's lights are on screen, as shares of the figure's width, so a glide can start there after a scroll or a resize. */
function spotsOf(figure: HTMLElement, plate: HTMLElement): Spots {
  const box = figure.getBoundingClientRect();
  const out: Spots = new Map();
  for (const key of LIGHTS) {
    const r = plate.querySelector(`[data-body="${key}"] circle`)?.getBoundingClientRect();
    if (r && box.width) out.set(key, { x: (r.left + r.width / 2 - box.left) / box.width, y: (r.top + r.height / 2 - box.top) / box.width });
  }
  return out;
}

export function TwoPlates({ a, b, caption }: TwoPlatesProps) {
  const reduced = useReducedMotion();
  const figure = useRef<HTMLDivElement>(null);
  const plateB = useRef<HTMLDivElement>(null);
  const size = usePlateSize(figure);
  const last = useRef<Spots | null>(null);
  const scene = buildScene(a.chart, "sun-moon-rising", size);
  // The ring's edge as a share of the figure's width: the shared line runs up to each ring and never across one.
  const ring = (BOX * scene.radii.signOuter) / (size + 2 * scene.pad);

  // When the second person changes, their Sun and Moon glide from where the last person's stood, so the change reads as one.
  useLayoutEffect(() => {
    const host = figure.current;
    const plate = plateB.current;
    const svg = plate?.querySelector<SVGSVGElement>("svg");
    if (!host || !plate || !svg) return;
    const from = last.current;
    const record = () => {
      last.current = spotsOf(host, plate);
    };
    const els = LIGHTS.map((key) => plate.querySelector<SVGGElement>(`[data-body="${key}"]`));
    for (const el of els) el?.removeAttribute("transform");
    const toUser = svg.getScreenCTM()?.inverse();
    const box = host.getBoundingClientRect();
    if (!from || reduced || !toUser) {
      record();
      return;
    }
    const centre = scene.radii.centre;
    const polar = (x: number, y: number) => ({ angle: (Math.atan2(centre - y, x - centre) * 180) / Math.PI, radius: Math.hypot(x - centre, y - centre) });
    const moves = LIGHTS.flatMap((key, i) => {
      const el = els[i];
      const was = from.get(key);
      if (!el || !was) return [];
      const rest = restOf(el);
      const start = new DOMPoint(box.left + was.x * box.width, box.top + was.y * box.width).matrixTransform(toUser);
      const p0 = polar(start.x, start.y);
      const p1 = polar(rest.x, rest.y);
      const turn = ((((p1.angle - p0.angle) % 360) + 540) % 360) - 180;
      if (Math.abs(turn) < 1e-3 && Math.abs(p1.radius - p0.radius) < 1e-3) return [];
      return [{ el, rest, turn, r0: p0.radius, r1: p1.radius }];
    });
    if (moves.length === 0) {
      record();
      return;
    }
    const draw = (u: number) => {
      for (const { el, rest, turn, r0, r1 } of moves) {
        const t = moved(rest, centre, -turn * (1 - u), (r1 + (r0 - r1) * (1 - u)) / r1);
        if (t === null) el.removeAttribute("transform");
        else el.setAttribute("transform", t);
      }
      record();
    };
    draw(0);
    const glide = animate(0, 1, { duration: GLIDE_S, ease: EASE, onUpdate: draw });
    return () => glide.stop();
  }, [b.chart]);

  const segment = (from: number, to: number) => (
    <span aria-hidden="true" className="absolute top-1/2 h-px bg-paper/35" style={{ left: `${from}%`, width: `${Math.max(0, to - from)}%` }} />
  );

  return (
    <figure className="m-0 mx-auto w-full max-w-[720px]" aria-label={`${first(a.name)} and ${first(b.name)}, two charts on one horizon`}>
      <div ref={figure} className="relative aspect-[8/3]">
        {segment(0, CENTRES[0] - ring)}
        {segment(CENTRES[0] + ring, CENTRES[1] - ring)}
        {segment(CENTRES[1] + ring, 100)}
        <div aria-hidden="true">
          <Plate person={a} size={size} centre={CENTRES[0]} />
          <Plate person={b} size={size} centre={CENTRES[1]} plateRef={plateB} />
        </div>
        <span className={`${CENTRE_LABEL} -translate-y-full text-violet`} style={{ top: "calc(50% - 8.33%)" }}>
          One horizon
        </span>
        <span className={`${CENTRE_LABEL} text-muted`} style={{ top: "calc(50% + 8.33%)" }}>
          No score
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Readout person={a} />
        <Readout person={b} />
      </div>
      {caption && (
        <figcaption className="mt-5 text-center font-numeric text-data-sm uppercase leading-[1.5] text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default TwoPlates;
