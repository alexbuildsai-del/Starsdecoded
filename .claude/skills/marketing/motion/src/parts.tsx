// The trailer's own furniture: kinetic captions, the quiet star field, grain and the readout chip.
// Everything is a pure function of the frame, so any frame renders the same in any tab.
import type { CSSProperties, ReactNode } from "react";
import { BEAT, brand, clamp, kick, p, quadIn, rng } from "./lib/motion";

export const C = {
  void: "#06080C", ground: "#0D1117", surface: "#11161F", line: "#242C3B",
  paper: "#E8EBF2", dim: "#AEB6C6", muted: "#7C859A",
  indigo: "#5C6BC0", indigoLt: "#9FA8DA", violet: "#9575CD", brass: "#D4B06A",
};
export const F = {
  serif: "'Newsreader', Georgia, serif",
  sans: "'Inter', system-ui, sans-serif",
  label: "'Space Grotesk', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

export type Word = string | { i: string };
/**
 * Lines that rise word by word out of their own mask, sharpening as they land, and leave upwards.
 * `at` is when the first word starts, `out` when the last has gone.
 */
export function Caption({ t, lines, at, out, top = 250, size = 104, style }: {
  t: number; lines: Word[][]; at: number; out: number; top?: number; size?: number; style?: CSSProperties;
}) {
  if (t < at - 0.01 || t > out + 0.01) return null;
  let k = 0;
  const leave = p(t, out - 0.4, out, quadIn);
  return (
    <div style={{ position: "absolute", left: 92, right: 150, top, fontFamily: F.serif, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.015em", color: C.paper, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", columnGap: size * 0.24 }}>
          {line.map((w, wi) => {
            const start = at + li * 0.16 + (k++) * 0.045;
            const u = p(t, start, start + 0.7);
            const italic = typeof w !== "string";
            return (
              <span key={wi} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
                <span style={{
                  display: "inline-block",
                  transform: `translateY(${(1 - u) * 105 - leave * 105}%)`,
                  filter: `blur(${(1 - u) * 14 + leave * 8}px)`,
                  opacity: clamp(u * 1.6) * (1 - leave),
                  fontStyle: italic ? "italic" : "normal",
                  color: italic ? "#F4F1E8" : undefined,
                }}>{italic ? (w as { i: string }).i : (w as string)}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** A line of Plex Mono that types itself on, one character per frame-ish, with a block cursor while it types. */
export function Typed({ t, at, text, rate = 42, style }: { t: number; at: number; text: string; rate?: number; style?: CSSProperties }) {
  if (t < at) return null;
  const n = Math.min(text.length, Math.floor((t - at) * rate));
  const typing = n < text.length;
  return (
    <div style={{ fontFamily: F.mono, letterSpacing: "0.06em", whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      <span style={{ opacity: typing ? 1 : 0, background: "currentColor", display: "inline-block", width: "0.6em", height: "1em", verticalAlign: "-0.12em", marginLeft: 2 }} />
    </div>
  );
}

const STARS = (() => {
  const r = rng(11);
  return Array.from({ length: 240 }, () => ({ x: r() * 1080, y: r() * 1920, s: 0.6 + r() * r() * 2.2, a: 0.12 + r() * 0.5, w: 0.6 + r() * 2.2, ph: r() * 6.28, d: 0.3 + r() * 0.7 }));
})();

/** The kit's quiet field: dim, slow, never behind words at strength (rule 16). */
export function Field({ t, drift = 0, glow = 1 }: { t: number; drift?: number; glow?: number }) {
  const k = kick(t, [[5.75 * 2, 6 * 2]]);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: C.void }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {STARS.map((s, i) => {
          const y = (((s.y - drift * s.d * 120 - t * 6 * s.d) % 1920) + 1920) % 1920;
          return <circle key={i} cx={s.x} cy={y} r={s.s} fill="#C9D1E4" opacity={s.a * (0.65 + 0.35 * Math.sin(t * s.w + s.ph))} />;
        })}
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(52% 30% at 50% 52%, rgba(92,107,192,${(0.16 + 0.07 * k) * glow}), transparent 72%)`,
      }} />
    </>
  );
}

/** Film grain and a soft vignette over everything: the frame reads as photographed, not exported. */
export function Finish({ frame }: { frame: number }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)", pointerEvents: "none" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none" }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 9} stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </>
  );
}

/** A readout: a label, a value that counts up to its computed figure, and a quieter line under it. */
export function Readout({ t, at, label, value, unit, sub, brass = false, align = "center" }: {
  t: number; at: number; label: string; value: number; unit: string; sub?: string; brass?: boolean; align?: "center" | "left";
}) {
  const u = p(t, at, at + 0.45);
  const n = p(t, at + 0.05, at + 0.55, (x) => 1 - (1 - x) ** 3) * value;
  return (
    <div style={{
      display: "grid", gap: 10, justifyItems: align === "center" ? "center" : "start",
      opacity: u, transform: `translateY(${(1 - u) * 30}px)`, filter: `blur(${(1 - u) * 8}px)`,
    }}>
      <div style={{ fontFamily: F.label, fontSize: 28, letterSpacing: "0.22em", color: brass ? C.brass : C.indigoLt }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontSize: 70, color: brass ? C.brass : C.paper, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
        {n.toFixed(2)}° {unit}
      </div>
      {sub ? <div style={{ fontFamily: F.mono, fontSize: 28, letterSpacing: "0.12em", color: C.dim }}>{sub}</div> : null}
    </div>
  );
}

/** A brass lock-on ring that draws itself, with four ticks, as a measured point is found. */
export function Reticle({ t, at, x, y, r = 58, color = C.brass }: { t: number; at: number; x: number; y: number; r?: number; color?: string }) {
  const u = p(t, at, at + 0.45);
  if (u <= 0) return null;
  const c = 2 * Math.PI * r;
  const pulse = Math.exp(-Math.max(0, t - at) * 3);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <circle cx={x} cy={y} r={r + 40 * (1 - u)} fill="none" stroke={color} strokeWidth={2.4} strokeDasharray={c} strokeDashoffset={c * (1 - u)} transform={`rotate(-90 ${x} ${y})`} />
      <circle cx={x} cy={y} r={r + 26 * (1 - pulse)} fill="none" stroke={color} strokeWidth={1.2} opacity={pulse * 0.7} />
      {[0, 90, 180, 270].map((a) => {
        const rad = (a * Math.PI) / 180, i0 = r + 8, i1 = r + 8 + 18 * u;
        return <line key={a} x1={x + Math.cos(rad) * i0} y1={y + Math.sin(rad) * i0} x2={x + Math.cos(rad) * i1} y2={y + Math.sin(rad) * i1} stroke={color} strokeWidth={2.4} opacity={u} />;
      })}
    </svg>
  );
}

export function Layer({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", inset: 0, ...style }}>{children}</div>;
}

/** A breath of first light as the wheel lands, with one faint ring going out: G15 has no drops. */
export function Bloom({ t, at, x, y }: { t: number; at: number; x: number; y: number }) {
  const u = p(t, at, at + 1.6, brand);
  if (t < at || u >= 1) return null;
  const light = Math.sin(Math.PI * p(t, at - 0.2, at + 1.4, (v) => v));
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(40% 25% at ${x / 10.8}% ${y / 19.2}%, rgba(159,168,218,${0.22 * light}), transparent 70%)` }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={x} cy={y} r={300 + u * 420} fill="none" stroke={C.brass} strokeWidth={1.2} opacity={0.35 * (1 - u)} />
      </svg>
    </>
  );
}

export const beatIn = (t: number, beat: number) => t >= beat * BEAT;

/**
 * The signature move: words rise out of a brass horizon like the Sun, clipped at the line, which draws
 * itself first. `line` is the horizon's y; the words sit just above it. They sink back below it to leave.
 */
export function HorizonRise({ t, at, out, line, words, size = 150, align = "left", italicFrom = 99, color = C.paper, rule = true }: {
  t: number; at: number; out: number; line: number; words: string[]; size?: number; align?: "left" | "center"; italicFrom?: number; color?: string; rule?: boolean;
}) {
  if (t < at - 0.05 || t > out + 0.05) return null;
  const draw = p(t, at, at + 0.5);
  const sink = p(t, out - 0.45, out, quadIn);
  const h = size * 1.25;
  return (
    <>
      {rule ? (
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line x1={align === "center" ? 540 - 470 * draw : 92} x2={align === "center" ? 540 + 470 * draw : 92 + 896 * draw} y1={line} y2={line} stroke={C.brass} strokeWidth={2} opacity={0.9 * (1 - sink)} />
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: 92, right: 92, top: line - h, height: h, overflow: "hidden", display: "flex", justifyContent: align === "center" ? "center" : "flex-start", alignItems: "flex-end", columnGap: size * 0.24 }}>
        {words.map((w, i) => {
          const u = p(t, at + 0.12 + i * 0.07, at + 0.9 + i * 0.07);
          return (
            <span key={i} style={{
              display: "inline-block", fontFamily: F.serif, fontSize: size, lineHeight: 1.0, letterSpacing: "-0.02em", color,
              fontStyle: i >= italicFrom ? "italic" : "normal", paddingBottom: size * 0.08,
              transform: `translateY(${(1 - u) * 110 + sink * 110}%)`,
            }}>{w}</span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: line - 160, height: 320, background: `radial-gradient(50% 30% at 50% 50%, rgba(212,176,106,${0.09 * draw * (1 - sink)}), transparent 70%)`, pointerEvents: "none" }} />
    </>
  );
}

/** A sheen that crosses a card once as it lands: light on glass would be banned; this is light on paper. */
export function Sheen({ t, at, dur = 0.9 }: { t: number; at: number; dur?: number }) {
  const u = p(t, at, at + dur, (x) => x);
  if (u <= 0 || u >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", background: `linear-gradient(105deg, transparent ${u * 140 - 30}%, rgba(232,235,242,.07) ${u * 140 - 15}%, transparent ${u * 140}%)` }} />;
}
