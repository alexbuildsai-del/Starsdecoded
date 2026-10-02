// A temp score for timing only, synthesised from scratch so it carries no licence. Direction A, G15 as
// written: 72 BPM ambient electronic, an observatory at night. A low drone and pads from the first frame,
// a pulsar tick, the soft pulse and a bell arpeggio in on the landing (bar 2), a beat of silence before
// the pair, the pulse out for the network, the felt-piano motif A C E on the landing, the pair and the
// sign-off at bar 13.5. No drums, risers or drops. The real track replaces it (spec ask 2).
//   node score/temp-score.mjs public/temp-score.wav [seconds]
import fs from "node:fs";

const SR = 44100;
const BPM = 72, BEAT = 60 / BPM, BAR = BEAT * 4;
const LEN = Number(process.argv[3] ?? 50);
const N = Math.ceil(LEN * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const LAND = 2 * BAR, GAP = 6 * BAR - BEAT, NET = 12 * BAR, END = 13.5 * BAR;

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// The pads breathe under the pulse, gently, instead of ducking like dance music.
const breath = new Float32Array(N).fill(1);
function pulse(t, g = 1) {
  const s = Math.floor(t * SR);
  let ph = 0;
  for (let k = 0; k < SR * 0.5; k++) {
    const x = k / SR, f = 52 + 30 * Math.exp(-x * 18);
    ph += (2 * Math.PI * f) / SR;
    add(s + k, Math.sin(ph) * Math.min(1, x / 0.012) * Math.exp(-x * 6) * g * 0.55);
  }
  for (let k = 0; k < SR * BEAT; k++) { const i = s + k; if (i < N) breath[i] = Math.min(breath[i], 0.78 + 0.22 * Math.min(1, k / (SR * 0.5))); }
}
// The pulsar: a dry high click, the downbeat a little brighter.
function tick(t, g = 0.035, f = 3200) {
  const s = Math.floor(t * SR);
  for (let k = 0; k < SR * 0.025; k++) add(s + k, Math.sin((2 * Math.PI * f * k) / SR) * Math.exp(-k / SR * 220) * g);
}
// Detuned saws through a soft low-pass, slow in and slow out, for the pads.
function pad(t, dur, midi, g, cut, { att = 1.4, rel = 2.2, voices = 5, det = 0.1, pan = 0 } = {}) {
  const s = Math.floor(t * SR), n = Math.floor((dur + rel) * SR);
  const ph = Array.from({ length: voices }, (_, v) => (v * 0.37) % 1);
  let a = 0, b = 0;
  const c = (2 * Math.PI * cut) / SR;
  for (let k = 0; k < n; k++) {
    const x = k / SR;
    let v = 0;
    for (let j = 0; j < voices; j++) { const f = hz(midi + (j - (voices - 1) / 2) * det); ph[j] = (ph[j] + f / SR) % 1; v += 2 * ph[j] - 1; }
    a += c * (v / voices - a); b += c * (a - b);
    const env = x < att ? (x / att) ** 2 : x < dur ? 1 : Math.max(0, 1 - (x - dur) / rel) ** 2;
    const i = s + k, d = i < N ? breath[i] : 1;
    add(i, b * env * g * d * (1 - pan), b * env * g * d * (1 + pan));
  }
}
// A bell tone: two-operator FM, a soft strike and a long tail.
function bell(t, midi, g = 0.05, pan = 0, dec = 2.2) {
  const s = Math.floor(t * SR), f = hz(midi);
  for (let k = 0; k < SR * 2.6; k++) {
    const x = k / SR, env = Math.min(1, x / 0.004) * Math.exp(-x * dec);
    const v = Math.sin(2 * Math.PI * f * x + 1.4 * Math.exp(-x * 4) * Math.sin(2 * Math.PI * f * 3.5 * x)) * env * g;
    add(s + k, v * (1 - pan), v * (1 + pan));
  }
}
// Felt piano: a muffled hammer, slightly stretched partials that die faster as they go up.
function piano(t, midi, g = 0.2, pan = 0) {
  const s = Math.floor(t * SR), f = hz(midi);
  for (let k = 0; k < SR * 3.2; k++) {
    const x = k / SR;
    let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * (1 + 0.0004 * h * h) * x) * Math.exp(-x * (1.1 + h * 0.9)) / (h * h * 0.6 + 0.4);
    v *= Math.min(1, x / 0.008) * g;
    if (k < 400) v += rnd() * 0.02 * (1 - k / 400) * g * 5;
    add(s + k, v * (1 - pan), v * (1 + pan));
  }
}
function drone(t0, t1, midi, g) {
  const f = hz(midi);
  for (let i = Math.floor(t0 * SR); i < Math.floor(t1 * SR) && i < N; i++) {
    const x = i / SR, env = Math.min(1, (x - t0) / 4, (t1 - x) / 3);
    const lfo = 0.8 + 0.2 * Math.sin(2 * Math.PI * x / (BAR * 2));
    const v = (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(2 * Math.PI * f * 2.002 * x) + 0.12 * Math.sin(2 * Math.PI * f * 3 * x)) * env * lfo * g;
    add(i, v * 0.95, v * 1.05);
  }
}

const PROG = [[57, 60, 64, 71], [53, 57, 60, 64], [48, 55, 59, 64], [52, 55, 59, 62]]; // Am9 Fmaj7 Cmaj7 Em7
const ARP = [0, 2, 1, 3, 2, 1];

drone(0, LEN, 33, 0.16);
drone(0.5, LEN, 40, 0.06);
for (let bar = 0; bar * BAR < LEN; bar++) {
  const t = bar * BAR, cut = t < LAND ? 380 + 260 * (t / LAND) : t >= NET && t < END ? 520 : 900;
  PROG[bar % 4].forEach((m, j) => pad(t, BAR, m, 0.06, cut, { pan: [-0.35, 0.2, -0.1, 0.35][j] }));
}
for (let b = 0; b * BEAT < LEN; b++) {
  const t = b * BEAT;
  const quiet = (t >= GAP && t < GAP + BEAT) || t >= END + BAR;
  if (quiet) continue;
  tick(t, b % 4 === 0 ? 0.04 : 0.025);
  tick(t + BEAT / 2, 0.012, 2600);
  if (t >= LAND && !(t >= NET && t < END)) pulse(t, b % 4 === 0 ? 1 : 0.6);
}
// The bell arpeggio: eighths, chord tones two octaves up, sparse before the landing and quiet for the network.
for (let e = 0; e * BEAT / 2 < LEN; e++) {
  const t = e * BEAT / 2, bar = Math.floor(t / BAR);
  if ((t >= GAP && t < GAP + BEAT) || t >= END) continue;
  if (t < LAND && e % 2) continue;
  if (t < BAR) continue;
  const chord = PROG[bar % 4];
  bell(t, chord[ARP[e % ARP.length]] + 12, t >= NET ? 0.025 : t < LAND ? 0.03 : 0.045, e % 2 ? 0.4 : -0.4);
}
const motif = (t, o = 0, g = 0.2) => [69, 72, 76].forEach((m, k) => piano(t + k * BEAT, m + o - 12, g, [-0.2, 0, 0.2][k]));
motif(LAND); motif(6 * BAR, 12, 0.14); motif(END, 0, 0.22);
piano(END + BAR, 69, 0.18); piano(END + BAR, 57, 0.12);

// Space: a long Schroeder hall and a soft ping-pong delay on the dotted eighth.
function hall(x, combs, fb, g) {
  const out = new Float32Array(N);
  for (const d of combs) { const buf = new Float32Array(d); let i = 0, lp = 0; for (let n = 0; n < N; n++) { const y = buf[i]; lp = 0.55 * y + 0.45 * lp; buf[i] = x[n] + lp * fb; out[n] += y * g; i = (i + 1) % d; } }
  for (const d of [556, 441, 341]) { const buf = new Float32Array(d); let i = 0; for (let n = 0; n < N; n++) { const y = buf[i]; const v = out[n] + y * 0.5; buf[i] = v; out[n] = y - v * 0.5; i = (i + 1) % d; } }
  return out;
}
const D = Math.floor(BEAT * 0.75 * SR);
for (let n = N - 1; n >= D; n--) { L[n] += R[n - D] * 0.22; R[n] += L[n - D] * 0.22; }
const wetL = hall(L, [1557, 1617, 1491, 1422, 1277, 1356], 0.86, 0.06), wetR = hall(R, [1580, 1640, 1514, 1445, 1300, 1379], 0.86, 0.06);
let peak = 0;
for (let n = 0; n < N; n++) { L[n] += wetL[n]; R[n] += wetR[n]; peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n])); }
const fadeIn = SR * 0.4, fadeOut = SR * 2.5;
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const f = Math.min(1, n / fadeIn, (N - n) / fadeOut);
  const sl = Math.tanh((L[n] / peak) * 1.2) * 0.9 * f, sr = Math.tanh((R[n] / peak) * 1.2) * 0.9 * f;
  out.writeInt16LE(Math.round(sl * 32767), 44 + n * 4); out.writeInt16LE(Math.round(sr * 32767), 46 + n * 4);
}
fs.writeFileSync(process.argv[2] ?? "temp-score.wav", out);
console.log("wrote", process.argv[2], LEN, "s");
