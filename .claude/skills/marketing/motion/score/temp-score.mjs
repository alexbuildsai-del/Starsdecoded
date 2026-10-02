// A temp score for timing only, synthesised from scratch so it carries no licence: 120 BPM, A minor,
// ticks for two bars, the beat lands with the chart at 0:04, a beat of silence before bar 7, the bass
// out for the coming-soon bars, the three-note sign-off at 0:27. The real track replaces it (spec ask 2).
//   node score/temp-score.mjs out/temp-score.wav [seconds]
import fs from "node:fs";

const SR = 44100;
const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
const LEN = Number(process.argv[3] ?? 30);
const N = Math.ceil(LEN * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const DROP = 2 * BAR, GAP = 6 * BAR - BEAT, SOON = 12 * BAR, SOON_END = 13.5 * BAR, END = 13.5 * BAR;

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// Sidechain: the bass and pads duck under each kick, which is most of what makes it feel like dance music.
const duck = new Float32Array(N).fill(1);
function kick(t, g = 1) {
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.35; k++) {
    const x = k / SR, f = 48 + 110 * Math.exp(-x * 28);
    ph += (2 * Math.PI * f) / SR;
    const v = Math.sin(ph) * Math.exp(-x * 7) * g * 0.9 + (k < 90 ? rnd() * 0.15 * (1 - k / 90) : 0);
    add(s + k, v);
  }
  for (let k = 0; k < SR * BEAT; k++) { const i = s + k; if (i < N) duck[i] = Math.min(duck[i], 0.25 + 0.75 * Math.min(1, k / (SR * 0.22))); }
}
function hat(t, g = 0.12, dec = 40, pan = 0) {
  const s = Math.floor(t * SR); let hp = 0, prev = 0;
  for (let k = 0; k < SR * 0.12; k++) { const n = rnd(); hp = 0.85 * (hp + n - prev); prev = n; const v = hp * Math.exp(-k / SR * dec) * g; add(s + k, v * (1 - pan), v * (1 + pan)); }
}
function tick(t, g = 0.06, f = 2600) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.03; k++) { const v = Math.sin((2 * Math.PI * f * k) / SR) * Math.exp(-k / SR * 160) * g; add(s + k, v); }
}
function clap(t, g = 0.18) {
  const s = Math.floor(t * SR); let bp = 0, lp = 0;
  for (let k = 0; k < SR * 0.25; k++) { const n = rnd(); lp += 0.35 * (n - lp); bp = n - lp; const env = (k < SR * 0.03 ? 0.6 + 0.4 * Math.sin(k / 120) : 1) * Math.exp(-k / SR * 18); add(s + k, bp * env * g * 0.9, bp * env * g * 1.1); }
}
// A detuned saw through a resonant low-pass, for the bass, the arpeggio and the pads.
function saw(t, dur, midi, g, cut, { att = 0.004, rel = 0.08, res = 0.3, pan = 0, voices = 1, det = 0.12, ducked = false, cutEnv = 0 } = {}) {
  const s = Math.floor(t * SR), n = Math.floor((dur + rel) * SR);
  const ph = Array.from({ length: voices }, (_, v) => v * 0.31);
  let low = 0, band = 0;
  for (let k = 0; k < n; k++) {
    const x = k / SR;
    let v = 0;
    for (let j = 0; j < voices; j++) { const f = hz(midi + (voices > 1 ? (j - (voices - 1) / 2) * det : 0)); ph[j] = (ph[j] + f / SR) % 1; v += 2 * ph[j] - 1; }
    v /= voices;
    const c = Math.min(0.99, (cut + cutEnv * Math.exp(-x * 14)) / SR * 2 * Math.PI);
    low += c * band; const high = v - low - res * band; band += c * high;
    const env = x < att ? x / att : x < dur ? 1 : Math.max(0, 1 - (x - dur) / rel);
    const i = s + k; const d = ducked && i < N ? duck[i] : 1;
    add(i, low * env * g * d * (1 - pan), low * env * g * d * (1 + pan));
  }
}
function pluck(t, midi, g = 0.22, pan = 0) {
  const s = Math.floor(t * SR), f = hz(midi);
  for (let k = 0; k < SR * 1.4; k++) {
    const x = k / SR, env = Math.exp(-x * 3.2);
    const v = (Math.sin(2 * Math.PI * f * x) + 0.35 * Math.sin(4 * Math.PI * f * x) * Math.exp(-x * 6) + 0.12 * Math.sin(6 * Math.PI * f * x) * Math.exp(-x * 9)) * env * g;
    add(s + k, v * (1 - pan), v * (1 + pan));
  }
}
function riser(t0, t1, g = 0.12) {
  let lp = 0;
  for (let i = Math.floor(t0 * SR); i < Math.floor(t1 * SR) && i < N; i++) {
    const p = (i / SR - t0) / (t1 - t0); lp += (0.02 + 0.5 * p * p) * (rnd() - lp);
    add(i, lp * g * p * p * 1.1, lp * g * p * p * 0.9);
  }
}

const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const ROOT = [33, 29, 36, 31];
const ARP = [0, 1, 2, 1, 2, 0, 1, 2];

for (let b = 0; b * BEAT < LEN; b++) {
  const t = b * BEAT, bar = Math.floor(b / 4), chord = PROG[bar % 4];
  const inGap = t >= GAP && t < GAP + BEAT;
  const soon = t >= SOON && t < SOON_END;
  const tail = t >= END + BAR;
  for (let q = 0; q < 4; q++) tick(t + q * BEAT / 4, q === 0 ? 0.07 : 0.03);
  if (t < DROP || inGap || tail) continue;
  kick(t, soon ? 0.6 : 1);
  hat(t + BEAT / 2, 0.16, 18, 0.15);
  if (!soon) { hat(t + BEAT / 4, 0.05, 60, -0.3); hat(t + BEAT * 0.75, 0.05, 60, 0.3); }
  if (b % 2 === 1 && !soon) clap(t);
  if (!soon) for (let e = 0; e < 4; e++) saw(t + e * BEAT / 4, BEAT / 4 * 0.8, ROOT[bar % 4] + (e === 2 ? 12 : 0), 0.32, 220, { res: 0.4, ducked: true, cutEnv: 900, rel: 0.03 });
}
// The arpeggio: in under the riser in bar 2, up an octave for the report, filtered down for coming soon.
for (let s16 = 0; s16 * BEAT / 4 < LEN; s16++) {
  const t = s16 * BEAT / 4; if (t < BAR || (t >= GAP && t < GAP + BEAT) || t >= END + BAR) continue;
  const bar = Math.floor(t / BAR), chord = PROG[bar % 4];
  const up = t >= 9 * BAR && t < 11 * BAR ? 12 : 0;
  const cut = t < DROP ? 400 + 2200 * ((t - BAR) / BAR) : t >= SOON ? 900 : 2400;
  saw(t, BEAT / 4 * 0.6, chord[ARP[s16 % 8]] + 12 + up, 0.07, cut, { res: 0.5, pan: s16 % 2 ? 0.45 : -0.45, cutEnv: 1800, rel: 0.05 });
}
// Pads under everything, ducked after the drop.
for (let bar = 0; bar * BAR < LEN; bar++) {
  const t = bar * BAR; if (t > END + BAR) break;
  for (const m of PROG[bar % 4]) saw(t, BAR, m, 0.05, t < DROP ? 500 + 300 * bar : 1100, { att: 0.4, rel: 0.6, voices: 3, det: 0.14, ducked: t >= DROP, pan: m % 2 ? 0.3 : -0.3 });
}
riser(BAR, DROP, 0.18);
riser(SOON + BAR * 0.5, END, 0.1);
// The motif: A C E on the landing, an octave up for the pair, and the sign-off.
const motif = (t, o = 0, g = 0.2) => [69, 72, 76].forEach((m, k) => pluck(t + k * BEAT / 2, m + o, g, [-0.3, 0, 0.3][k]));
motif(DROP); motif(11 * BAR, 12, 0.15); motif(END, 0, 0.24);
pluck(END + BAR, 81, 0.18);

// Space: a stereo ping-pong delay and a short Schroeder reverb.
function reverb(x, combs, g) {
  const out = new Float32Array(N);
  for (const d of combs) { const buf = new Float32Array(d); let i = 0, lp = 0; for (let n = 0; n < N; n++) { const y = buf[i]; lp = 0.7 * y + 0.3 * lp; buf[i] = x[n] + lp * 0.78; out[n] += y * g; i = (i + 1) % d; } }
  return out;
}
const wetL = reverb(L, [1557, 1617, 1491, 1422], 0.07), wetR = reverb(R, [1277, 1356, 1188, 1116], 0.07);
const D = Math.floor(BEAT * 0.75 * SR);
for (let n = N - 1; n >= D; n--) { L[n] += R[n - D] * 0.18; R[n] += L[n - D] * 0.18; }
let peak = 0;
for (let n = 0; n < N; n++) { L[n] += wetL[n]; R[n] += wetR[n]; peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
const fadeIn = SR * 0.02, fadeOut = SR * 0.6;
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const f = Math.min(1, n / fadeIn, (N - n) / fadeOut);
  const sl = Math.tanh((L[n] / peak) * 1.4) * 0.92 * f, sr = Math.tanh((R[n] / peak) * 1.4) * 0.92 * f;
  out.writeInt16LE(Math.round(sl * 32767), 44 + n * 4); out.writeInt16LE(Math.round(sr * 32767), 46 + n * 4);
}
fs.writeFileSync(process.argv[2] ?? "temp-score.wav", out);
console.log("wrote", process.argv[2], LEN, "s");
