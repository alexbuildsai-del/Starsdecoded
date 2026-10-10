/**
 * The one chart as data. buildScene reads the engine's chart and a state from the ChartStates table and says what is
 * drawn where, on `wheelRadii(size)` and at `theta(longitude)`; Chart.tsx only paints it. Pure: no React, no DOM,
 * so the promise that every body sits at its true degree in every state can be checked without a browser.
 */
import { ASPECT_ORBS } from "@workspace/engine";
import type { ChartData } from "@/types/chart";
import { HOUSE_WORDS } from "@/lib/houses";
import {
  SIGN_ORDER, assignLanes, aspectStrength, firstHouseCusp, theta, wheelRadii, type WheelRadii,
} from "@/components/chart/wheel-geometry";
import {
  CHART_LAYERS, NEEDS_BIRTH_TIME, STATE_LAYERS, layerOn, type ChartLayer, type ChartState,
} from "@/ds/organisms/chart/states";

export type { ChartLayer, ChartState };

/** Chiron and the nodes: drawn points, never renders, never brass. */
export const POINTS: readonly string[] = ["chiron", "north_node", "south_node"];

/** The three things most people know; the rising sign is the horizon, never a body. */
const LIGHTS: readonly string[] = ["sun", "moon"];

/** Brass, the one lit colour; teal and rose only for at home, least at ease and a link's side. */
export type LitTone = "home" | "strain" | "this";

export interface LitSignOption {
  sign: string;
  tone: LitTone;
  explained?: boolean;
}

/** One planet of another person's chart, at its true degree, and how it meets this chart's subject (TwoCharts). */
export interface GuestOption {
  /** The guest's body key, as the other chart has it. */
  body: string;
  absoluteDegree: number;
  /** easy draws a teal side, tense a rose zigzag, same a brass dot. */
  kind: "easy" | "tense" | "same";
  /** The aspect's angle: 0, 60, 90, 120 or 180. */
  angle: number;
}

export interface SceneOptions {
  /** The subject, lit in brass in the states that light one: a house, a body or both. */
  focus?: { house?: number; body?: string };
  /** Teach: the bodies its idea needs. Defaults to every planet. */
  only?: readonly string[];
  /** Signs lit on the ring (Teach: at home, least at ease). */
  signs?: readonly LitSignOption[];
  /** Pair: the other person's planet; `focus.body` is this chart's own. */
  guest?: GuestOption;
  /** interpretation.meta.orbs, so a line's weight is measured against the orbs the report used. */
  orbs?: Record<string, number>;
}

export interface SceneBody {
  id: string;
  /** theta(absoluteDegree, frame): the same in every state and at every size. */
  angle: number;
  /** One of wheelRadii(size).lanes. */
  radius: number;
  /** As the engine marks it; whether an R is painted is the retrograde layer's to say. */
  retrograde: boolean;
  lane: number;
  /** Width of the render in plate units. */
  size: number;
  kind: "planet" | "point";
  house?: number;
  opacity: number;
  /** Ringed in brass: the subject of Focus, or this chart's own planet in Pair. */
  ringed: boolean;
}

export interface SceneSign {
  sign: string;
  from: number;
  to: number;
}

export interface SceneTick {
  longitude: number;
  angle: number;
  from: number;
  to: number;
  major: boolean;
}

export interface SceneHouse {
  house: number;
  sign: string;
  from: number;
  to: number;
  /** Brass when lit, else the paper wash. */
  lit: boolean;
  opacity: number;
}

export interface SceneWord {
  house: number;
  label: string;
  from: number;
  to: number;
  opacity: number;
}

export interface SceneLine {
  a: string;
  b: string;
  type: string;
  from: number;
  to: number;
  colour: "brass" | "line-easy" | "line-tense";
  strength: number;
  width: number;
  opacity: number;
  dashed: boolean;
}

export interface SceneGuest {
  body: string;
  angle: number;
  radius: number;
  size: number;
  kind: GuestOption["kind"];
  separation: number;
  /** This chart's own planet the link starts from, if it is drawn. */
  own: { id: string; angle: number } | null;
}

export type SceneLayer =
  | { id: "sign-slices"; signs: SceneSign[]; lit: LitSignOption[] }
  | { id: "sign-names"; radius: number; signs: SceneSign[] }
  | { id: "ticks"; ticks: SceneTick[] }
  | { id: "houses"; houses: SceneHouse[] }
  | { id: "house-words"; radius: number; words: SceneWord[] }
  | { id: "planets"; bodies: SceneBody[]; moonBand: { from: number; to: number; radius: number } | null }
  | { id: "points"; bodies: SceneBody[] }
  | { id: "retrograde"; ids: string[] }
  | { id: "lines"; lines: SceneLine[] }
  | { id: "horizon"; east: number; west: number; from: number; to: number; eastWidth: number; westWidth: number }
  | { id: "rising-marker"; angle: number; radius: number; ring: number; stroke: number; tail: number; lit: boolean }
  | { id: "lit"; houses: number[]; ids: string[] }
  | { id: "guest"; guest: SceneGuest | null };

export interface Scene {
  state: ChartState;
  size: number;
  radii: WheelRadii;
  /** Room round the plate for the marker's tail and a planet's chip, the same on every side. */
  pad: number;
  /** The degree every angle is framed on: the Ascendant, or 0 with no birth time (Aries at 9 o'clock). */
  frame: number;
  timed: boolean;
  /** Back to front, only the layers drawn. */
  layers: SceneLayer[];
  /** Every own body drawn, planets then points. */
  bodies: SceneBody[];
}

/** The band's house line: the number and the house's one word (ADR-98). */
export function houseBandLabel(house: number): string {
  return `${house} · ${HOUSE_WORDS[house - 1].toUpperCase()}`;
}

/** Thin, so a 600 px plate keeps today's widths and a 92 px one scales them down. */
const perPlate = (size: number, px: number): number => (px * size) / 600;

function lineColour(type: string): SceneLine["colour"] {
  if (type === "trine" || type === "sextile") return "line-easy";
  if (type === "square" || type === "opposition") return "line-tense";
  return "brass";
}

/** The chart in a state, at a plate of `size` pixels. */
export function buildScene(chart: ChartData, state: ChartState, size: number, options: SceneOptions = {}): Scene {
  const rules = STATE_LAYERS[state];
  const timed = chart.angles?.ascendant !== undefined;
  const frame = chart.angles?.ascendant.absoluteDegree ?? 0;
  const r = wheelRadii(size);
  const cusp = firstHouseCusp(frame);
  const on = (layer: ChartLayer): boolean =>
    layerOn(rules[layer], size) && (timed || !NEEDS_BIRTH_TIME.includes(layer));
  const some = (layer: ChartLayer): boolean => rules[layer] === "some";

  const focusHouse = timed ? options.focus?.house : undefined;
  const focusBody = options.focus?.body;
  const lights = on("lit");
  const litHouse = lights && focusHouse && focusHouse >= 1 && focusHouse <= 12 ? focusHouse : undefined;
  const litBody = lights && focusBody && chart.planets[focusBody] ? focusBody : undefined;

  const present = Object.keys(chart.planets).filter((k) => typeof chart.planets[k]?.absoluteDegree === "number");
  const planetIds = present.filter((k) => !POINTS.includes(k));
  const pointIds = on("points") ? present.filter((k) => POINTS.includes(k)) : [];
  let drawnPlanets: string[] = [];
  if (on("planets")) {
    if (!some("planets")) drawnPlanets = planetIds;
    else if (state === "sun-moon-rising") drawnPlanets = planetIds.filter((k) => LIGHTS.includes(k));
    else if (state === "teach") drawnPlanets = planetIds.filter((k) => !options.only || options.only.includes(k));
    // Small's ◐: the ten planets, no points and no R, as the phone's bar and Did you know draw them.
    else drawnPlanets = planetIds;
  }

  const scale = state === "teach" ? 1.25 : 1;
  // The Sun, Moon and rising plate is often 104 px; its two lights stay readable there, as TriadRing draws them.
  const node = state === "sun-moon-rising" ? Math.max(r.node, 16) : r.node * scale;
  const placed = assignLanes(
    [...drawnPlanets, ...pointIds].map((key) => ({ key, absoluteDegree: chart.planets[key].absoluteDegree })),
    frame,
    { lanes: r.lanes, node, gap: size * 0.01 },
  );
  const byKey = new Map(placed.map((p) => [p.key, p]));

  const dimOutside = (id: string): boolean => {
    if (state === "pair") return litBody !== undefined && id !== litBody;
    if (state !== "focus") return false;
    if (litBody) return id !== litBody;
    if (litHouse) return chart.planets[id].house !== litHouse;
    return false;
  };
  const body = (id: string, kind: SceneBody["kind"]): SceneBody => {
    const p = byKey.get(id)!;
    const planet = chart.planets[id];
    return {
      id,
      angle: p.theta,
      radius: p.radius,
      retrograde: planet.retrograde === true,
      lane: p.lane,
      size: node,
      kind,
      house: planet.house,
      opacity: dimOutside(id) ? 0.14 : 1,
      ringed: id === litBody,
    };
  };
  const planets = drawnPlanets.map((id) => body(id, "planet"));
  const points = pointIds.map((id) => body(id, "point"));

  const signs: SceneSign[] = Array.from({ length: 12 }, (_, k) => {
    const from = theta(cusp + k * 30, frame);
    return { sign: SIGN_ORDER[(cusp / 30 + k) % 12], from, to: from + 30 };
  });

  const layers: SceneLayer[] = [];
  for (const id of CHART_LAYERS) {
    if (!on(id)) continue;
    switch (id) {
      case "sign-slices":
        layers.push({ id, signs, lit: [...(options.signs ?? [])] });
        break;
      case "sign-names":
        layers.push({ id, radius: r.bandSign, signs });
        break;
      case "ticks":
        layers.push({
          id,
          ticks: Array.from({ length: 72 }, (_, i) => {
            const longitude = i * 5;
            const major = longitude % 30 === 0;
            return { longitude, angle: theta(longitude, frame), from: r.tick, to: r.tick - size * (major ? 0.02 : 0.008), major };
          }),
        });
        break;
      case "houses":
        layers.push({
          id,
          houses: signs.map((s, i) => {
            const house = i + 1;
            const lit = house === litHouse;
            return { house, sign: s.sign, from: s.from, to: s.to, lit, opacity: lit ? (state === "small" ? 0.35 : 0.22) : house % 2 ? 0.012 : 0.026 };
          }),
        });
        break;
      case "house-words":
        layers.push({
          id,
          radius: r.bandHouse,
          words: signs.map((s, i) => ({
            house: i + 1,
            label: houseBandLabel(i + 1),
            from: s.from,
            to: s.to,
            opacity: litHouse ? (i + 1 === litHouse ? 1 : 0.3) : 0.55,
          })),
        });
        break;
      case "planets": {
        const band = timed ? undefined : chart.planets.moon?.band;
        const moonDrawn = drawnPlanets.includes("moon");
        layers.push({
          id,
          bodies: planets,
          moonBand: band && moonDrawn
            ? { from: theta(band.fromDegree, frame), to: theta(band.fromDegree, frame) + ((band.toDegree - band.fromDegree + 360) % 360), radius: r.lanes[0] }
            : null,
        });
        break;
      }
      case "points":
        layers.push({ id, bodies: points });
        break;
      case "retrograde":
        layers.push({ id, ids: [...planets, ...points].filter((b) => b.retrograde).map((b) => b.id) });
        break;
      case "lines": {
        const drawn = new Set(drawnPlanets);
        const own = (a: string, b: string): boolean => {
          if (state !== "focus") return true;
          if (litBody) return a === litBody || b === litBody;
          if (litHouse) return chart.planets[a].house === litHouse || chart.planets[b].house === litHouse;
          return true;
        };
        const lines = (chart.aspects ?? [])
          .filter((a) => drawn.has(a.planet1) && drawn.has(a.planet2))
          // The Moon's degree is a stretch without a birth time, so a line to it would claim a precision it lacks.
          .filter((a) => timed || (a.planet1 !== "moon" && a.planet2 !== "moon"))
          .map((a): SceneLine => {
            const limit = options.orbs?.[a.type] ?? ASPECT_ORBS[a.type as keyof typeof ASPECT_ORBS] ?? 6;
            const strength = aspectStrength(a.orb, limit);
            return {
              a: a.planet1,
              b: a.planet2,
              type: a.type,
              from: byKey.get(a.planet1)!.theta,
              to: byKey.get(a.planet2)!.theta,
              colour: lineColour(a.type),
              strength,
              width: perPlate(size, 0.6 + 1.2 * strength),
              opacity: (0.18 + 0.42 * strength) * (own(a.planet1, a.planet2) ? 1 : 0.1),
              dashed: !a.applying,
            };
          })
          .sort((x, y) => y.strength - x.strength);
        layers.push({ id, lines });
        break;
      }
      case "horizon": {
        const east = theta(frame, frame);
        layers.push({
          id, east, west: east + 180, from: r.aspect, to: size * 0.398,
          eastWidth: perPlate(size, 1.5), westWidth: perPlate(size, 1),
        });
        break;
      }
      case "rising-marker":
        layers.push({
          id,
          angle: theta(frame, frame),
          radius: r.signOuter,
          ring: Math.max(3, size * 0.0142),
          stroke: Math.max(1.2, size * 0.003),
          tail: size * 0.02,
          // Brass only while the rising sign is the subject, with its house lit.
          lit: litHouse === 1,
        });
        break;
      case "lit":
        layers.push({ id, houses: litHouse ? [litHouse] : [], ids: litBody ? [litBody] : [] });
        break;
      case "guest": {
        const g = options.guest;
        const own = litBody ? byKey.get(litBody) : undefined;
        layers.push({
          id,
          guest: g
            ? {
              body: g.body,
              angle: theta(g.absoluteDegree, frame),
              radius: r.lanes[0],
              size: node / 2,
              kind: g.kind,
              separation: g.angle,
              own: own ? { id: own.key, angle: own.theta } : null,
            }
            : null,
        });
        break;
      }
    }
  }

  return {
    state,
    size,
    radii: r,
    pad: size * (size >= 200 ? 0.085 : 0.04),
    frame,
    timed,
    layers,
    bodies: [...planets, ...points],
  };
}

/** A layer of a scene by its id, typed. */
export function layerOf<K extends SceneLayer["id"]>(scene: Scene, id: K): Extract<SceneLayer, { id: K }> | undefined {
  return scene.layers.find((l) => l.id === id) as Extract<SceneLayer, { id: K }> | undefined;
}
