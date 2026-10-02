// The launch trailer: the Personal report, the Compatibility report, credits and the circle. Scenes are timed in
// story seconds on a 120 BPM grid and played at 72 BPM (SLOW), so the film runs 50 s, calm, with crossfades.
// Every product surface is the web app's own component; the live ones (first light, the circle) run on the
// frame-locked clock (clock.ts), so render with concurrency 1. Storyboard: docs/specs/draft/launch-trailer.md.
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { HorizonWheel } from "@/site/components/HorizonWheel";
import { TwoPlates } from "@/site/components/TwoPlates";
import { Chapter } from "@/components/report/Chapter";
import { EvidenceCard } from "@/components/report/EvidenceCard";
import { Orbit } from "@/components/dashboard/Orbit";
import { GiftCover } from "@/components/dashboard/GiftCover";
import { CreditDots } from "@/components/dashboard/CreditPill";
import { Mark } from "@/components/Mark";
import { PLANET_RENDERS, SUN_HERO } from "@/lib/planet-renders";
import { RINGS, MEAN_MOTION, DAYS_PER_SECOND } from "@/lib/orrery";
import { CHAPTERS } from "@/lib/chapters";
import { orbitPoints, pointAngles, type OrbitGift, type OrbitProfile, type OrbitReport } from "@/lib/orbit";
import { sampleSky, type Sky } from "@/site/lib/sky";
import { SAMPLE_PEOPLE, samplePerson } from "@/site/data/people";
import type { Claim } from "@/types/chart";
import { arc, BAR, BEAT, clamp, DROP, inOut, kick, lerp, p, quadIn, SLOW, win } from "./lib/motion";
import { chartAt, PLACE, polar } from "./lib/sky";
import { useClock } from "./lib/useClock";
import { useAssets } from "./lib/useAssets";
import { Bloom, C, Caption, F, Field, Finish, HorizonRise, Layer, Sheen } from "./parts";

export interface TrailerProps { date: string; music: string | null }

const CX = 540, CY = 1010;
const GAP: [number, number] = [6 * BAR - BEAT, 6 * BAR];

// Marie Curie's report, a line quoted whole (fixtures/passes/marie-curie.r05.json, mind.claims[0]).
// Organic posts only (rule 8): the ad cut swaps this scene.
const CURIE: Claim = {
  quote: "You notice the principle, the direction, and the implication fast, then you fill in the missing steps later.",
  evidence: [
    { label: "Mercury 6.6° Sagittarius", ref: { kind: "placement", body: "mercury", sign: "sagittarius" } },
    { label: "Moon square Mercury, 3.6° orb", ref: { kind: "aspect", type: "square", body1: "moon", body2: "mercury" } },
  ],
} as unknown as Claim;

export const Trailer = ({ date, music }: TrailerProps) => {
  useAssets();
  const real = useClock();
  const t = real / SLOW;
  const k = 0.5 * kick(t, [GAP]);
  return (
    <AbsoluteFill className="dark" style={{ background: C.void, overflow: "hidden", fontFamily: F.sans }}>
      {music ? <Audio src={staticFile(music)} /> : null}
      <Field t={t} drift={t / 30} glow={t < DROP ? 0.6 + 0.4 * p(t, 0, 2) : 1} />
      <Horizon t={t} />
      <Hook t={t} />
      <OrreryScene t={t} date={date} />
      <Bloom t={t} at={DROP} x={CX} y={CY} />
      <FirstLight t={t} date={date} />
      <Chapters t={t} />
      <Pair t={t} k={k} />
      <Credits t={t} />
      <Circle t={t} />
      <Gift t={t} />
      <Network t={t} />
      <End t={t} />
      <Finish frame={Math.round(real * 30)} />
    </AbsoluteFill>
  );
};

/** The brass horizon: drawn in the first second, the line the report's name rises from, the mark's, then gone into its point. */
function Horizon({ t }: { t: number }) {
  const x0 = 92;
  const draw = p(t, 0.12, 0.95);
  const retract = p(t, 29.0, 29.85, inOut);
  const alpha = t < 2 ? 1 : t < 4 ? lerp(1, 0.25, p(t, 2, 2.6)) : t < 6 ? lerp(0.3, 1, p(t, 5.6, 6.1)) : t < 8 ? 1 : t < 27 ? lerp(1, 0.1, p(t, 8, 8.5)) : lerp(0.1, 1, p(t, 27, 27.6));
  const x1 = x0 + (1080 - x0) * draw * (1 - retract);
  const pointA = t < 2 ? 1 : t > 27.5 ? p(t, 27.5, 28.2) : Math.max(0, 1 - p(t, 2, 2.4));
  const glow = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="hz" x1="0" x2="1">
          <stop offset="0" stopColor={C.brass} stopOpacity={0.95} />
          <stop offset="1" stopColor={C.brass} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <line x1={x0} x2={x1} y1={CY} y2={CY} stroke="url(#hz)" strokeWidth={2} opacity={alpha} />
      <circle cx={x0} cy={CY} r={22 + 6 * glow} fill={C.brass} opacity={0.12 * pointA} />
      <circle cx={x0} cy={CY} r={11} fill={C.brass} opacity={pointA} />
    </svg>
  );
}

/** 0:00 Your star sign is only your Sun. The Sun rises over the horizon, then shrinks onto its ring. */
function Hook({ t }: { t: number }) {
  if (t > 2.3) return null;
  const rise = p(t, 0.2, 1.7);
  const shrink = p(t, 1.65, 2.15, inOut);
  const size = lerp(430, 60, shrink);
  const x = CX, y = lerp(lerp(CY + 240, CY - 170, rise), CY - RING_R.sun, shrink);
  const gone = 1 - p(t, 2.05, 2.2);
  return (
    <>
      <div style={{ position: "absolute", left: x - size * 1.3, top: y - size * 1.3, width: size * 2.6, height: size * 2.6, background: `radial-gradient(closest-side, rgba(255,190,110,${0.26 * rise * (1 - shrink)}), rgba(255,190,110,${0.08 * rise * (1 - shrink)}) 45%, transparent)`, opacity: gone }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: shrink > 0 ? 1920 : CY, overflow: "hidden", opacity: gone }}>
        <img src={SUN_HERO} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size }} />
      </div>
      <Caption t={t} at={0.15} out={2.25} lines={[["Your", "star", "sign"], ["is", "only", "your", { i: "Sun." }]]} />
    </>
  );
}

// The generation screen's rings (lib/orrery.ts), Moon innermost, with the real renders on them.
const RING_R: Record<string, number> = Object.fromEntries(RINGS.map((b, i) => [b, 112 + i * 34]));
const SIZE: Record<string, number> = { moon: 56, mercury: 42, venus: 50, sun: 60, mars: 48, jupiter: 74, saturn: 84, chiron: 14, uranus: 54, neptune: 54, pluto: 38 };

/** 0:03 Here's the rest of you. The sky sweeps faster and faster and every body lands on its degree as the pulse comes in. */
function OrreryScene({ t, date }: { t: number; date: string }) {
  if (t < 1.9 || t > 4.8) return null;
  const chart = chartAt(date, "09:00");
  const asc = chart.angles!.ascendant.absoluteDegree;
  const V = 12;
  const virt = (tt: number) => V * clamp((tt - 2) / 2) ** 2.4;
  const deg = (body: string, tt: number) => {
    const pl = chart.planets[body];
    const dir = pl.retrograde ? -1 : 1;
    const m = Math.abs(MEAN_MOTION[body] ?? 0) * DAYS_PER_SECOND;
    if (tt < DROP) return pl.absoluteDegree - dir * m * (V - virt(tt));
    const s = tt - DROP, amp = Math.min(5, dir * m * 0.9);
    return pl.absoluteDegree + amp * Math.exp(-s * 7) * Math.sin(s * 24);
  };
  const off0 = 90 - deg("sun", 2), off1 = 180 - asc;
  const off = (tt: number) => off0 + arc(off0, off1) * p(tt, 2.0, 3.95, inOut);
  const screen = (body: string, tt: number) => deg(body, tt) + off(tt);
  const tiltX = Math.sin(Math.PI * p(t, 2.05, 3.95, inOut)) * 52;
  const appear = p(t, 1.95, 2.5);
  const leave = p(t, 3.9, 4.75);
  const scale = lerp(0.92, 1, appear) * lerp(1, 1.35, leave);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, perspective: 1600, opacity: 1 - leave, filter: `blur(${leave * 8}px)` }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, transform: `rotateX(${tiltX}deg) scale(${scale})`, transformOrigin: `${CX}px ${CY}px` }}>
          {RINGS.map((b, i) => {
            const r = RING_R[b], c = 2 * Math.PI * r, u = p(t, 1.95 + i * 0.04, 2.6 + i * 0.04);
            return <circle key={b} cx={CX} cy={CY} r={r} fill="none" stroke={C.line} strokeWidth={1.4} strokeDasharray={c} strokeDashoffset={c * (1 - u)} transform={`rotate(${-90 - i * 18} ${CX} ${CY})`} />;
          })}
          <circle cx={CX} cy={CY} r={9} fill={C.indigo} opacity={appear} />
          {RINGS.map((b) => {
            if (!chart.planets[b]) return null;
            const r = RING_R[b];
            const now = screen(b, t), then = screen(b, t - 0.16);
            const sweep = clamp(Math.abs(now - then), 0, 300) * Math.sign(now - then);
            const segs = 8;
            const at = polar(r, now);
            return (
              <g key={b} opacity={b === "sun" ? p(t, 2.0, 2.12) : appear}>
                {Array.from({ length: segs }, (_, s) => {
                  const P0 = polar(r, now - (sweep * s) / segs), P1 = polar(r, now - (sweep * (s + 1)) / segs);
                  return <line key={s} x1={CX + P0.x} y1={CY + P0.y} x2={CX + P1.x} y2={CY + P1.y} stroke={C.indigoLt} strokeWidth={SIZE[b] * 0.35 * (1 - s / segs)} strokeLinecap="round" opacity={0.45 * (1 - s / segs) * clamp(Math.abs(sweep) / 6)} />;
                })}
                {PLANET_RENDERS[b]
                  ? <image href={PLANET_RENDERS[b]} x={CX + at.x - SIZE[b] / 2} y={CY + at.y - SIZE[b] / 2} width={SIZE[b]} height={SIZE[b]} />
                  : <circle cx={CX + at.x} cy={CY + at.y} r={6} fill={C.brass} />}
              </g>
            );
          })}
        </svg>
      </div>
      <Caption t={t} at={2.1} out={3.85} lines={[["Here's", "the", "rest"], ["of", { i: "you." }]]} />
    </>
  );
}

let SKY: Sky | undefined;
/**
 * 0:07 The landing: the home page's own wheel arrives by first light (HorizonWheel, live). Then it sets below
 * the horizon like the Sun while the report's name rises out of the same line.
 */
function FirstLight({ t, date }: { t: number; date: string }) {
  if (t < 3.8 || t > 8.2) return null;
  const chart = chartAt(date, "09:00");
  SKY ??= sampleSky("Today", "Paris, France", { birthDate: date, birthTime: "09:00", latitude: PLACE.lat, longitude: PLACE.lon, timezone: PLACE.zone, timezoneOffset: 2 }, chart);
  const set = p(t, 6.0, 7.1, (u) => u * u * (3 - 2 * u));
  const W = 1000;
  return (
    <>
      {/* Above the line the wheel stays whole; below it, it fades as it sinks, so it sets. */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: 1920,
        WebkitMaskImage: `linear-gradient(#000 ${CY - 1}px, rgba(0,0,0,${1 - p(t, 5.8, 6.2)}) ${CY}px)`,
      }}>
        <div className="sd" style={{ position: "absolute", left: CX - W / 2, top: CY - W / 2, width: W, background: "transparent", transform: `translateY(${set * 1060}px)` }}>
          <HorizonWheel sky={t >= DROP ? SKY : null} arrival="intro" />
        </div>
      </div>
      <HorizonRise t={t} at={6.15} out={8.05} line={CY - 150} words={["Your"]} size={110} rule={false} />
      <HorizonRise t={t} at={6.3} out={8.05} line={CY} words={["Personal", "report."]} size={130} italicFrom={1} rule={false} />
    </>
  );
}

/** 0:13 The chapters fly past, then one lands: a real line, its citation, and the evidence under it. */
function Chapters({ t }: { t: number }) {
  if (t < 7.6 || t > 12.3) return null;
  const leave = p(t, 11.6, 12.15, quadIn);
  const order = [0, 1, 3, 4, 5, 6, 7, 8, 9];
  const fly = order.map((ci, i) => {
    const at = 7.7 + i * 0.13;
    const u = clamp((t - at) / 0.5);
    if (u <= 0 || u >= 1) return null;
    const z = lerp(-900, 700, u);
    const x = (i % 2 ? 1 : -1) * 90 * (1 - u);
    return (
      <div key={ci} style={{ position: "absolute", left: CX - 450, top: CY - 180, width: 900, transform: `translate3d(${x}px, 0, ${z}px)`, opacity: clamp(u * 3) * (1 - p(u, 0.6, 0.95)), filter: `blur(${z > 0 ? z / 40 : 0}px)`, zIndex: Math.round(z) + 1000 }}>
        <ChapterCard ci={ci} />
      </div>
    );
  });
  const land = p(t, 8.95, 9.75);
  const under = p(t, 9.9, 10.6, inOut);
  const sup = t > 10.6 ? Math.exp(-(t - 10.6) * 4) : 0;
  const card = p(t, 10.75, 11.4);
  return (
    <>
      <Layer style={{ perspective: 1400 }}>{fly}</Layer>
      <Layer style={{ perspective: 1800, opacity: 1 - leave, filter: `blur(${leave * 14}px)` }}>
        <div style={{
          position: "absolute", left: 90, width: 900, top: 600, opacity: clamp(land * 1.5),
          transform: `translate3d(0, ${-leave * 140}px, ${lerp(-1400, 0, land)}px) rotateX(${lerp(18, 4, land)}deg) scale(${1 - leave * 0.08})`, transformOrigin: "50% 0%",
        }}>
          <div style={{ fontFamily: F.mono, fontSize: 24, letterSpacing: "0.16em", color: C.muted, marginBottom: 24 }}>FROM MARIE CURIE'S REPORT</div>
          <div className="rp-root" style={{ position: "relative", background: C.ground, border: `1px solid ${C.line}`, borderRadius: 34, padding: "40px 46px 46px", boxShadow: "0 50px 140px rgba(0,0,0,.6)", overflow: "hidden" }}>
            <Chapter number={3} total={10} eyebrow={CHAPTERS[2].eyebrow} title={CHAPTERS[2].title}>
              <div style={{ fontFamily: F.label, fontSize: 22, letterSpacing: "0.18em", color: C.indigoLt, margin: "18px 0 14px" }}>HOW YOU THINK</div>
              <p style={{ fontFamily: F.serif, fontSize: 44, lineHeight: 1.32, color: C.paper, margin: 0 }}>
                <span style={{ backgroundImage: `linear-gradient(${C.brass}, ${C.brass})`, backgroundSize: `${under * 100}% 2px`, backgroundRepeat: "no-repeat", backgroundPosition: "0 100%" }}>{CURIE.quote}</span>
                <sup style={{ fontFamily: F.mono, fontSize: 24, color: C.brass, marginLeft: 6, padding: "2px 8px", borderRadius: 99, boxShadow: `0 0 0 ${2 + sup * 14}px rgba(212,176,106,${0.15 + sup * 0.35})` }}>1</sup>
              </p>
            </Chapter>
            <Sheen t={t} at={9.3} />
          </div>
          <div className="rp-card" style={{ position: "relative", inset: "auto", marginTop: 16, transform: `translateY(${(1 - card) * 120}px)`, opacity: card, filter: `blur(${(1 - card) * 8}px)`, padding: 22, borderRadius: 28, boxShadow: "0 40px 120px rgba(0,0,0,.7)", zoom: 1.75, width: 440, marginLeft: 70 }}>
            <EvidenceCard claim={CURIE} />
          </div>
        </div>
      </Layer>
      <Caption t={t} at={7.9} out={9.9} lines={[["How", "you", { i: "think," }], [{ i: "work" }, { i: "and" }, { i: "love." }]]} />
      <Caption t={t} at={9.95} out={11.85} lines={[["Every", "line", "shows"], ["where", "it", { i: "comes" }, { i: "from." }]]} size={96} />
    </>
  );
}
function ChapterCard({ ci }: { ci: number }) {
  const ch = CHAPTERS[ci];
  return (
    <div className="rp-root" style={{ background: C.ground, border: `1px solid ${C.line}`, borderRadius: 16, padding: "18px 22px 22px", boxShadow: "0 40px 120px rgba(0,0,0,.6)", zoom: 1.9, width: 474 }}>
      <Chapter number={ci + 1} total={10} eyebrow={ch.eyebrow} title={ch.title}>{null}</Chapter>
    </div>
  );
}

const LENSES = ["Couples", "A parent and a child", "Friends, family, colleagues"];
/** 0:20 In a beat of silence the two plates glide together onto one horizon; the three kinds of pair, on the beat. */
function Pair({ t, k }: { t: number; k: number }) {
  if (t < 11.45 || t > 14.5) return null;
  const a = samplePerson("mira"), b = samplePerson("tomas");
  if (!a || !b) return null;
  const u = p(t, 11.5, 12.3);
  const settle = p(t, 11.9, 12.6);
  const leave = p(t, 13.9, 14.4, quadIn);
  const lens = t < 12.5 ? 0 : t < 13.0 ? 1 : t < 13.5 ? 2 : 0;
  const half = (side: "l" | "r") => (
    <div style={{ position: "absolute", inset: 0, clipPath: side === "l" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)", transform: `translateX(${(side === "l" ? -1 : 1) * (1 - u) * 420}px)` }}>
      <div className="sd" style={{ position: "absolute", left: 10, width: 1060, top: CY - 220, background: "transparent" }}>
        <TwoPlates a={{ name: a.name.split(" ")[0], chart: a.chart }} b={{ name: b.name.split(" ")[0], chart: b.chart }} />
      </div>
    </div>
  );
  return (
    <>
      <Layer style={{ opacity: clamp(u * 2) * (1 - leave), filter: `blur(${leave * 16}px)`, transform: `scale(${1 + leave * 0.4})`, transformOrigin: `${CX}px ${CY}px` }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(24% 15% at 50% ${CY / 19.2}%, rgba(149,117,205,${(0.22 + 0.14 * k) * settle}), transparent 70%)` }} />
        {half("l")}
        {half("r")}
        <div style={{ position: "absolute", left: 60, right: 60, top: CY + 320, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14, opacity: settle }}>
          {LENSES.map((l, i) => (
            <span key={l} style={{ fontFamily: F.sans, fontSize: 30, padding: "14px 26px", borderRadius: 99, color: i === lens ? C.paper : C.dim, border: `1.5px solid ${i === lens ? C.violet : C.line}`, background: i === lens ? "rgba(149,117,205,.16)" : "transparent" }}>{l}</span>
          ))}
        </div>
      </Layer>
      <div style={{ position: "absolute", left: 92, top: 250, fontFamily: F.label, fontSize: 26, letterSpacing: "0.22em", color: C.violet, opacity: win(t, 12.0, 14.0, 0.3, 0.3) }}>COMPATIBILITY REPORT</div>
      <Caption t={t} at={12.05} out={14.0} top={310} lines={[["Then", "read", "the"], ["two", "of", { i: "you." }]]} />
    </>
  );
}

const SLOTS = [
  { kind: "Personal report", who: "You" },
  { kind: "Personal report", who: "Tomás" },
  { kind: "Compatibility report", who: "The two of you" },
];
/** 0:23 One credit, one report of either kind: three credits find a report each and how you get along. */
function Credits({ t }: { t: number }) {
  if (t < 13.9 || t > 16.6) return null;
  const leave = p(t, 15.95, 16.45, inOut);
  return (
    <>
      <Layer style={{ opacity: 1 - leave }}>
        {SLOTS.map((s, i) => {
          const pop = p(t, 14.05 + i * 0.25, 14.5 + i * 0.25);
          const go = p(t, 14.9 + i * 0.12, 15.5 + i * 0.12, inOut);
          const sx = CX + (i - 1) * 120, sy = CY - 60;
          const ty = CY + 30 + i * 150;
          const x = lerp(sx, 230, go), y = lerp(sy, ty, go);
          const r = lerp(34, 16, go);
          return (
            <div key={i}>
              <div style={{
                position: "absolute", left: 210, right: 92, top: ty - 58, height: 116, borderRadius: 26, border: `1px solid ${C.line}`, background: C.ground,
                opacity: p(t, 15.1 + i * 0.12, 15.5 + i * 0.12), transform: `translateX(${(1 - p(t, 15.1 + i * 0.12, 15.6 + i * 0.12)) * 60}px)`,
                display: "grid", alignContent: "center", paddingLeft: 70, gap: 6,
              }}>
                <span style={{ fontFamily: F.label, fontSize: 22, letterSpacing: "0.2em", color: i === 2 ? C.violet : C.indigoLt }}>{s.kind.toUpperCase()}</span>
                <span style={{ fontFamily: F.serif, fontSize: 40, color: C.paper }}>{s.who}</span>
              </div>
              <div style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: C.brass, opacity: pop, transform: `scale(${lerp(0.2, 1, pop)})`, boxShadow: `0 0 ${30 * (1 - go)}px rgba(212,176,106,.6)` }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: CY - 230, display: "flex", justifyContent: "center", opacity: win(t, 14.0, 15.1, 0.3, 0.3) }}>
          <CreditDots count={3} className="scale-[3]" />
        </div>
        <div style={{ position: "absolute", left: 92, right: 92, top: CY + 480, fontFamily: F.mono, fontSize: 26, letterSpacing: "0.08em", color: C.dim, opacity: p(t, 15.5, 15.9) }}>
          3 CREDITS · A REPORT EACH AND HOW YOU GET ALONG
        </div>
      </Layer>
      <Caption t={t} at={14.05} out={16.0} lines={[["1", "credit,"], ["1", { i: "report." }]]} size={120} />
    </>
  );
}

// The circle as the dashboard builds it (orbitPoints), on the site's sample account, one person at a time.
const SELF = SAMPLE_PEOPLE.find((s) => s.relation === "self")!;
const ADD_ORDER = ["tomas", "june", "idris", "hanna", "noor"];
const pointsMemo = new Map<string, ReturnType<typeof orbitPoints>>();
function circleOf(n: number, pairs: string[], gifts: OrbitGift[]) {
  const key = `${n}|${pairs.join(",")}|${gifts.map((g) => g.id).join(",")}`;
  if (!pointsMemo.has(key)) {
    const people = ADD_ORDER.slice(0, n);
    const profiles: OrbitProfile[] = [{ id: SELF.id, name: SELF.name, isSelf: true }, ...people.map((id) => ({ id, name: samplePerson(id)!.name }))];
    const reports: OrbitReport[] = [
      ...people.map((id): OrbitReport => ({ id: `natal:${id}`, kind: "natal", status: "complete", profileId: id, createdAt: "", access: "owner" })),
      ...pairs.map((id): OrbitReport => ({ id: `pair:${id}`, kind: "compatibility", status: "complete", profileId: null, participants: [{ id: SELF.id, name: SELF.name }, { id, name: samplePerson(id)!.name }], createdAt: "", access: "owner" })),
    ];
    pointsMemo.set(key, orbitPoints({ profiles, reports, gifts, credits: 3, enforced: true }));
  }
  return pointsMemo.get(key)!;
}
function OrbitAt({ x, y, scale, children, style }: { x: number; y: number; scale: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ position: "absolute", left: x - 220, top: y - 220, width: 440, height: 440, transform: `scale(${scale})`, ...style }}>{children}</div>;
}

/** 0:27 Add the people you care about: the dashboard's circle fills on the beat; Share with makes a report theirs. */
function Circle({ t }: { t: number }) {
  if (t < 15.9 || t > 23.6) return null;
  const n = t < 16.5 ? 0 : Math.min(5, 1 + Math.floor((t - 16.5) / 0.5));
  const pairs = t < 17.25 ? [] : t < 18.25 ? ["tomas"] : ["tomas", "june"];
  const gifts: OrbitGift[] = t >= 22.0 ? [{ id: "g-pierre", recipientName: "Pierre", state: "waiting" } as OrbitGift] : [];
  const points = circleOf(n, pairs, gifts);
  const appear = p(t, 15.95, 16.6);
  // From 22.6 the camera dives into Pierre's waiting gift.
  const dive = p(t, 22.6, 23.4, (u) => u * u * u);
  // Where the gift sits: the ring's own angles plus the circle's 3°/s drift, in real seconds, since it mounted (Orbit.tsx DRIFT_DEG_PER_S).
  const gi = points.findIndex((q) => q.kind === "gift");
  const ga = gi < 0 ? 0 : ((pointAngles(points.length)[gi] + 3 * (t - 15.9) * SLOW) * Math.PI) / 180;
  const gx = gi < 0 ? 0 : 174 * Math.cos(ga) * 2.3, gy = gi < 0 ? 0 : 174 * Math.sin(ga) * 2.3;
  const s = lerp(lerp(0.6, 2.3, appear), 9, dive);
  const share = p(t, 18.7, 19.1), joined = t >= 19.5;
  return (
    <>
      <Layer style={{ opacity: appear * (1 - p(t, 23.1, 23.4)) * (1 - 0.7 * win(t, 20.0, 21.9, 0.4, 0.4)), filter: `blur(${dive * 10 + 6 * win(t, 20.0, 21.9, 0.4, 0.4)}px)` }}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${-gx * dive * 3.2}px, ${-gy * dive * 3.2}px)` }}>
          <OrbitAt x={CX} y={CY} scale={s}>
            <Orbit centre={{ firstName: "Mira", hasReport: true, writing: false }} points={points} selectedId={null} partners={[]} onSelect={() => {}} />
          </OrbitAt>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: CY + 560, textAlign: "center", fontFamily: F.mono, fontSize: 22, letterSpacing: "0.2em", color: C.muted, opacity: 1 - p(t, 19.8, 20.2) }}>A SAMPLE ACCOUNT</div>
        <div style={{ position: "absolute", left: CX - 230, width: 460, top: CY + 440, opacity: share * (1 - p(t, 19.9, 20.3)), transform: `translateY(${(1 - share) * 30}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 26px", borderRadius: 22, background: C.ground, border: `1px solid ${joined ? C.violet : C.line}` }}>
            <span style={{ fontFamily: F.sans, fontSize: 30, color: C.paper }}>Share with Tomás</span>
            <span style={{ fontFamily: F.sans, fontSize: 28, color: joined ? C.violet : C.indigoLt }}>{joined ? "Joined ✓" : "Share"}</span>
          </div>
        </div>
      </Layer>
      <Caption t={t} at={16.1} out={18.6} lines={[["Add", "the", "people"], ["you", { i: "care" }, { i: "about." }]]} />
      <Caption t={t} at={18.65} out={20.1} lines={[["Share", "a", "report."], ["It", "becomes", { i: "theirs." }]]} />
    </>
  );
}

/** 0:33 Or gift a report: the real cover flies in, then folds into the circle as a gift waiting. */
function Gift({ t }: { t: number }) {
  if (t < 19.9 || t > 22.4) return null;
  const inn = p(t, 20.0, 20.9);
  const fold = p(t, 21.55, 22.25, inOut);
  return (
    <>
      <Layer style={{ perspective: 1800 }}>
        <div style={{
          position: "absolute", left: 90, width: 900, top: CY - 280,
          transform: `translate3d(${fold * 240}px, ${fold * -60}px, ${lerp(-1200, 0, inn) - fold * 900}px) rotateY(${lerp(-62, -8, inn) + 8 * p(t, 20.9, 21.6)}deg) rotateX(${lerp(14, 4, inn)}deg) scale(${lerp(1, 0.2, fold)})`,
          opacity: clamp(inn * 1.6) * (1 - p(t, 22.0, 22.3)), filter: `blur(${(1 - inn) * 8}px)`, borderRadius: 20, boxShadow: "0 50px 160px rgba(0,0,0,.7)",
        }}>
          <GiftCover giverName="Mira" recipientName="Pierre" note="Happy birthday. Read the Moon part first." />
          <Sheen t={t} at={20.6} dur={1.1} />
        </div>
      </Layer>
      <Caption t={t} at={20.1} out={22.2} lines={[["Or", "gift", "a"], [{ i: "report." }]]} size={120} />
    </>
  );
}

/** 0:38 The gift becomes Pierre's own credit and his own circle; pull back and the circles keep going. */
function Network({ t }: { t: number }) {
  if (t < 23.0 || t > 27.8) return null;
  const empty = (name: string) => orbitPoints({ profiles: [{ id: name, name, isSelf: true }], reports: [], gifts: [], credits: 1, enforced: true });
  const appear = p(t, 23.1, 23.6);
  const pull = p(t, 24.6, 26.4, inOut);
  const collapse = p(t, 26.9, 27.6, inOut);
  const scale = lerp(2.3, 0.95, pull);
  const others = [
    { x: CX - 260, y: CY - 340, name: "Mira", at: 24.8 },
    { x: CX + 250, y: CY + 400, name: "Léa", at: 25.4 },
  ];
  return (
    <>
      <Layer style={{ opacity: appear * (1 - collapse), transform: `scale(${lerp(1, 0.4, collapse)})`, transformOrigin: `${CX}px ${CY}px`, filter: `blur(${collapse * 6}px)` }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {others.map((o, i) => {
            const u = p(t, o.at, o.at + 0.7);
            return <line key={i} x1={CX} y1={CY} x2={lerp(CX, o.x, u)} y2={lerp(CY, o.y, u)} stroke="#3FA796" strokeWidth={2.5} strokeDasharray="6 10" opacity={0.8 * u} />;
          })}
        </svg>
        <OrbitAt x={CX} y={CY} scale={scale}>
          <Orbit centre={{ firstName: "Pierre", hasReport: true, writing: false }} points={(NET.pierre ??= empty("pierre"))} selectedId={null} partners={[]} onSelect={() => {}} />
        </OrbitAt>
        {others.map((o) => {
          const u = p(t, o.at + 0.3, o.at + 1.0);
          if (u <= 0) return null;
          return (
            <OrbitAt key={o.name} x={o.x} y={o.y} scale={1.05 * lerp(0.6, 1, u)} style={{ opacity: u }}>
              <Orbit centre={{ firstName: o.name, hasReport: true, writing: false }} points={o.name === "Mira" ? circleOf(5, ["tomas", "june"], []) : (NET.lea ??= empty("lea"))} selectedId={null} partners={[]} onSelect={() => {}} />
            </OrbitAt>
          );
        })}
      </Layer>
      <Caption t={t} at={23.25} out={24.75} lines={[["Their", "circle", "starts"], ["with", { i: "them." }]]} />
      <Caption t={t} at={24.85} out={26.9} size={92} lines={[["Everyone", "you", "love"], ["has", "a", { i: "chart." }]]} />
    </>
  );
}
const NET: { pierre?: ReturnType<typeof orbitPoints>; lea?: ReturnType<typeof orbitPoints> } = {};

/** 0:45 Everything folds into the mark; the name; the line; then only the brass point on the horizon, where it began. */
function End({ t }: { t: number }) {
  if (t < 26.9) return null;
  const ring = p(t, 27.05, 27.75);
  const fade = 1 - p(t, 29.0, 29.6, inOut);
  const letters = "Stars Decoded".split("");
  return (
    <Layer style={{ opacity: fade }}>
      <div style={{
        position: "absolute", left: CX - 150, top: CY - 150, width: 300, height: 300, color: C.indigo,
        opacity: ring, transform: `scale(${lerp(0.6, 1, ring)}) rotate(${lerp(-40, 0, ring)}deg)`,
        WebkitMaskImage: `conic-gradient(from 270deg, #000 ${ring * 360}deg, transparent ${ring * 360 + 0.5}deg)`,
      }}>
        <Mark className="w-full h-full" />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + 230, textAlign: "center", fontFamily: F.serif, fontSize: 112, color: C.paper, letterSpacing: "-0.01em" }}>
        {letters.map((ch, i) => {
          const u = p(t, 27.45 + i * 0.03, 28.1 + i * 0.03);
          return <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: u, transform: `translateY(${(1 - u) * 40}px)`, filter: `blur(${(1 - u) * 10}px)` }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: CY + 380, textAlign: "center", fontFamily: F.serif, fontSize: 42, lineHeight: 1.25, color: C.dim, opacity: p(t, 27.95, 28.5), transform: `translateY(${(1 - p(t, 27.95, 28.5)) * 20}px)` }}>
        Find out what your birth chart says about you.
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + 470, textAlign: "center", fontFamily: F.mono, fontSize: 28, letterSpacing: "0.08em", color: C.brass, opacity: p(t, 28.35, 28.8) }}>
        GET YOUR FREE CHART · MYSTARSDECODED.COM
      </div>
    </Layer>
  );
}
