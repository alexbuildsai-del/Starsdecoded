// The v5 grammar, after the reference trailer the Owner liked: one continuous shot, one sentence at a
// time built word by word, objects inline in the sentence, neighbours reflowing as each arrives.
// Layout is computed here rather than by the DOM, so an inline object can leave its sentence and fly.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { continueRender, delayRender } from "remotion";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { brand, clamp, p, quadIn } from "../lib/motion";
import { C, F } from "../parts";

/** A damped spring from 0 to 1, `t` seconds after it starts; `bounce` 0 settles without overshoot. */
export function spring(t: number, { freq = 2.2, bounce = 0.35 } = {}): number {
  if (t <= 0) return 0;
  const zeta = 1 - bounce, w = 2 * Math.PI * freq;
  if (zeta >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

/** Holds rendering until fonts and renders are decoded, then re-renders so text is measured in the real font. */
export function useReady(extra: string[] = []): boolean {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("v5 assets"));
  useEffect(() => {
    const imgs = [...Object.values(PLANET_RENDERS), SUN_HERO, ...extra].map((src) => { const i = new Image(); i.src = src; return i.decode().catch(() => undefined); });
    const fonts = ["400 100px Newsreader", "italic 400 100px Newsreader", "400 40px Inter", "500 40px Inter", "500 40px 'Space Grotesk'", "400 40px 'IBM Plex Mono'"].map((f) => document.fonts.load(f));
    Promise.all([...imgs, ...fonts]).then(() => document.fonts.ready).then(() => { setReady(true); continueRender(handle); });
  }, [handle]);
  return ready;
}

let ctx: CanvasRenderingContext2D | null = null;
export function measure(text: string, font: string): number {
  ctx ??= document.createElement("canvas").getContext("2d");
  ctx!.font = font;
  return ctx!.measureText(text).width;
}

// ---------------------------------------------------------------------------------------------
// The sentence engine.

export type Item = { text?: string; italic?: boolean; body?: string; img?: string };
export type Tok = Item & {
  id?: string;
  at: number;
  /** Reserve the space but let the caller draw it (an object that flies in or out of the sentence). */
  ghost?: boolean;
  /** Close its space again from this time, so the words around it close up. */
  collapse?: number;
  /** A slot whose content changes: each entry takes over at its time. */
  swap?: (Item & { at: number })[];
  color?: string;
};
export type SentenceSpec = {
  lines: { toks: Tok[]; size: number; color?: string; font?: "serif" | "sans" }[];
  cx: number; cy: number;
  /** When the whole sentence leaves, word by word. */
  out?: number;
};
export type Placed = { tok: Tok; x: number; y: number; w: number; h: number; e: number; line: number; index: number };

const GAP = 0.26;
const fontOf = (size: number, italic = false, family: "serif" | "sans" = "serif") =>
  `${italic ? "italic " : ""}400 ${size}px ${family === "serif" ? "Newsreader" : "Inter"}`;
const objSize = (size: number) => size * 1.05;

function itemWidth(it: Item, size: number, family: "serif" | "sans"): number {
  const obj = it.body || it.img ? objSize(size) : 0;
  const txt = it.text ? measure(it.text, fontOf(size, it.italic, family)) : 0;
  return obj && txt ? obj + size * 0.18 + txt : obj || txt;
}

/** How far a token has taken its place (0 to 1): its width and the gap before it grow with this. */
function presence(t: number, tok: Tok): number {
  const grow = p(t, tok.at, tok.at + 0.55, brand);
  return tok.collapse === undefined ? grow : grow * (1 - p(t, tok.collapse, tok.collapse + 0.5, brand));
}

function slotWidth(t: number, tok: Tok, size: number, family: "serif" | "sans"): number {
  if (!tok.swap) return itemWidth(tok, size, family);
  let w = itemWidth(tok.swap[0], size, family);
  for (let i = 1; i < tok.swap.length; i++) {
    const u = p(t, tok.swap[i].at, tok.swap[i].at + 0.5, brand);
    w += (itemWidth(tok.swap[i], size, family) - w) * u;
  }
  return w;
}

export function layout(t: number, s: SentenceSpec): Placed[] {
  const rows = s.lines.map((ln) => {
    const fam = ln.font ?? "serif";
    const toks = ln.toks.map((tok) => ({ tok, w: slotWidth(t, tok, ln.size, fam), e: presence(t, tok) }));
    const gap = ln.size * GAP;
    const width = toks.reduce((a, k) => a + (k.w + gap) * k.e, 0) - gap * Math.max(0, ...toks.map((k) => k.e));
    const e = Math.max(0, ...toks.map((k) => k.e));
    return { ln, toks, gap, width, e, h: ln.size * 1.22 };
  });
  const H = rows.reduce((a, r) => a + r.h * r.e, 0);
  let y = s.cy - H / 2;
  const out: Placed[] = [];
  rows.forEach((r, li) => {
    const yc = y + (r.h * r.e) / 2;
    let x = s.cx - r.width / 2;
    r.toks.forEach((k, i) => {
      out.push({ tok: k.tok, x: x + (k.w * k.e) / 2, y: yc, w: k.w, h: r.h, e: k.e, line: li, index: i });
      x += (k.w + r.gap) * k.e;
    });
    y += r.h * r.e;
  });
  return out;
}

function ItemView({ it, size, family, color }: { it: Item; size: number; family: "serif" | "sans"; color: string }) {
  const src = it.img ?? (it.body ? PLANET_RENDERS[it.body] : undefined);
  const o = objSize(size);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: src && it.text ? size * 0.18 : 0, whiteSpace: "pre" }}>
      {src ? <img src={src} style={{ width: o, height: o, objectFit: "contain", filter: "drop-shadow(0 8px 18px rgba(0,0,0,.45))" }} /> : null}
      {it.text ? <span style={{ fontFamily: family === "serif" ? F.serif : F.sans, fontStyle: it.italic ? "italic" : "normal", color }}>{it.text}</span> : null}
    </span>
  );
}

/** One token's look: words sharpen and rise into place, objects pop on a spring; on the way out, they blur and lift. */
export function Sentence({ t, spec }: { t: number; spec: SentenceSpec }) {
  const placed = layout(t, spec);
  let k = 0;
  return (
    <>
      {placed.map((pl) => {
        const ln = spec.lines[pl.line];
        const fam = ln.font ?? "serif";
        const color = pl.tok.color ?? ln.color ?? C.paper;
        const order = k++;
        if (t < pl.tok.at || pl.tok.ghost) return null;
        const leave = spec.out === undefined ? 0 : p(t, spec.out + order * 0.035, spec.out + order * 0.035 + 0.45, quadIn);
        const gone = pl.tok.collapse === undefined ? 0 : p(t, pl.tok.collapse, pl.tok.collapse + 0.35, quadIn);
        if (leave >= 1 || gone >= 1) return null;
        const items = pl.tok.swap ?? [{ ...pl.tok, at: pl.tok.at }];
        return items.map((it, si) => {
          const next = items[si + 1];
          const inn = p(t, it.at, it.at + 0.6, brand);
          const out = next ? p(t, next.at, next.at + 0.4, quadIn) : 0;
          if (t < it.at || out >= 1) return null;
          const obj = !!(it.body || it.img) && !it.text;
          const pop = obj ? spring(t - it.at, { freq: 2.4, bounce: 0.45 }) : 1;
          const fade = Math.max(leave, gone, out);
          const style: CSSProperties = {
            position: "absolute", left: pl.x, top: pl.y, fontSize: ln.size, lineHeight: 1,
            transform: `translate(-50%, -50%) translateY(${((1 - inn) * 0.38 - out * 0.38 - leave * 0.25) * ln.size}px) scale(${obj ? Math.max(0, pop) : 1})`,
            opacity: clamp(inn * 1.5) * (1 - fade),
            filter: `blur(${(1 - inn) * 14 + fade * 12}px)`,
            whiteSpace: "pre",
          };
          return <div key={`${order}-${si}`} style={style}><ItemView it={it} size={ln.size} family={fam} color={color} /></div>;
        });
      })}
    </>
  );
}

/** Where a token sits right now, for an object that flies into or out of the sentence. */
export function slot(t: number, spec: SentenceSpec, id: string): Placed | undefined {
  return layout(t, spec).find((pl) => pl.tok.id === id);
}

// ---------------------------------------------------------------------------------------------
// Furniture.

/** A pill in the product's own surface: the reference's labels, in our colours. */
export function Chip({ children, style, accent = C.indigoLt }: { children: ReactNode; style?: CSSProperties; accent?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 14, padding: "14px 26px", borderRadius: 99,
      background: "rgba(17,22,31,.92)", border: `1px solid ${C.line}`, boxShadow: "0 18px 50px rgba(0,0,0,.45)",
      fontFamily: F.sans, fontSize: 30, color: C.paper, whiteSpace: "nowrap", ...style,
    }}>
      <span style={{ width: 12, height: 12, borderRadius: 99, background: accent, flex: "none" }} />
      {children}
    </div>
  );
}

/** Text that types on, a character at a time, for chips. */
export const typed = (t: number, at: number, text: string, rate = 26) => text.slice(0, Math.max(0, Math.floor((t - at) * rate)));

/** The bottom glow: the reference's warm horizon, in our indigo and brass. */
export function Glow({ t, strength = 1 }: { t: number; strength?: number }) {
  const breathe = 0.85 + 0.15 * Math.sin(t * 1.1);
  return (
    <div style={{
      position: "absolute", left: -200, right: -200, bottom: -380, height: 900, opacity: strength * breathe,
      background: "radial-gradient(50% 50% at 50% 50%, rgba(92,107,192,.42), rgba(149,117,205,.16) 45%, transparent 72%)",
      filter: "blur(30px)",
    }}>
      <div style={{ position: "absolute", left: "30%", right: "30%", top: "34%", height: 220, background: "radial-gradient(50% 50% at 50% 50%, rgba(212,176,106,.22), transparent 70%)" }} />
    </div>
  );
}
