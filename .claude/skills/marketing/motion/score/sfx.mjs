// The v5 mix: the 72 BPM bed (temp-score.mjs) with a sound under every arrival, cued from the same
// timeline as the picture (src/v5/opening.json): a soft tick per word, a pop per object, a swish per swap,
// whooshes for the burst, the collapse and the morph, and the piano motif on the Mark. All synthesised.
//   node score/sfx.mjs public/v5-mix.wav
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const TL = JSON.parse(fs.readFileSync(path.join(here, "../src/v5/opening.json"), "utf8"));
const SR = 44100, LEN = TL.duration, N = Math.ceil(LEN * SR);
const bedPath = path.join(here, "../out/bed-72.wav");
execFileSync("node", [path.join(here, "temp-score.mjs"), bedPath, String(Math.ceil(LEN) + 2)]);
const bed = fs.readFileSync(bedPath);

const L = new Float32Array(N), R = new Float32Array(N);
let seed = 3;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function tick(t, g = 0.05) {
  const s = Math.floor(t * SR); let hp = 0, prev = 0;
  for (let k = 0; k < SR * 0.04; k++) { const n = rnd(); hp = 0.6 * (hp + n - prev); prev = n; add(s + k, hp * Math.exp(-k / SR * 120) * g); }
}
function pop(t, g = 0.3, f0 = 820, pan = 0) {
  const s = Math.floor(t * SR); let ph = 0;
  for (let k = 0; k < SR * 0.18; k++) {
    const x = k / SR, f = f0 * (0.42 + 0.58 * Math.exp(-x * 45));
    ph += (2 * Math.PI * f) / SR;
    const v = Math.sin(ph) * Math.min(1, x / 0.002) * Math.exp(-x * 26) * g;
    add(s + k, v * (1 - pan), v * (1 + pan));
  }
}
function whoosh(t, dur, g = 0.25, rising = true) {
  const s = Math.floor(t * SR); let lo = 0, bp = 0;
  for (let k = 0; k < SR * dur; k++) {
    const u = k / (SR * dur), env = Math.sin(Math.PI * (rising ? u ** 0.7 : 1 - (1 - u) ** 0.7)) ** 2;
    const fc = rising ? 300 + 3200 * u : 3500 - 3200 * u, c = Math.min(0.9, (2 * Math.PI * fc) / SR);
    const n = rnd(); lo += c * (n - lo); bp += c * (lo - bp);
    const pan = (u - 0.5) * 0.6;
    add(s + k, (lo - bp) * env * g * (1 - pan), (lo - bp) * env * g * (1 + pan));
  }
}
function piano(t, midi, g = 0.2, pan = 0) {
  const s = Math.floor(t * SR), f = hz(midi);
  for (let k = 0; k < SR * 3; k++) {
    const x = k / SR; let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * (1 + 0.0004 * h * h) * x) * Math.exp(-x * (1.1 + h * 0.9)) / (h * h * 0.6 + 0.4);
    v *= Math.min(1, x / 0.008) * g;
    add(s + k, v * (1 - pan), v * (1 + pan));
  }
}

// Every token: words tick, objects pop, swaps swish and pop.
for (const key of ["hook", "rest", "report"]) {
  for (const line of TL[key].lines) for (const tok of line.toks) {
    if (tok.swap) tok.swap.forEach((it, i) => { if (i) whoosh(it.at - 0.12, 0.3, 0.12); pop(it.at + 0.05, 0.22, 700 + i * 60); });
    else if (tok.body) pop(tok.at, 0.3, 640);
    else tick(tok.at, 0.06);
  }
}
const { at, collapse, land } = TL.burst;
whoosh(at - 0.35, 0.9, 0.32);
for (let i = 0; i < 26; i++) pop(at + 0.05 + i * 0.022 + Math.abs(rnd()) * 0.02, 0.07, 900 + rnd() * 300, rnd() * 0.7);
whoosh(collapse, land - collapse, 0.22, false);
whoosh(TL.morph.at - 0.1, 0.7, 0.18, false);
TL.bubble.forEach((b, i) => { pop(b.at, 0.26, 560 + i * 40); for (let c = 0; c < b.label.length; c += 3) tick(b.at + 0.15 + c / 40, 0.025); });
pop(TL.end.at + 0.25, 0.32, 520);
[69, 72, 76].forEach((m, k) => piano(TL.end.word + k * 0.833, m - 12, 0.2, [-0.2, 0, 0.2][k]));
piano(TL.end.url + 0.4, 69 - 12, 0.14); piano(TL.end.url + 0.4, 57 - 12, 0.1);

// Mix: the bed a little under the effects, a gentle limiter, a fade at the end.
const out = Buffer.alloc(44 + N * 4);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
const fadeOut = SR * 1.2;
for (let n = 0; n < N; n++) {
  const bl = bed.readInt16LE(44 + n * 4) / 32767, br = bed.readInt16LE(46 + n * 4) / 32767;
  const f = Math.min(1, (N - n) / fadeOut);
  const l = Math.tanh((bl * 0.8 + L[n]) * 1.1) * f, r = Math.tanh((br * 0.8 + R[n]) * 1.1) * f;
  out.writeInt16LE(Math.round(l * 30000), 44 + n * 4); out.writeInt16LE(Math.round(r * 30000), 46 + n * 4);
}
// Social apps play at about -14 LUFS, so the mix is brought up to that with a true-peak ceiling.
const dest = process.argv[2] ?? "v5-mix.wav", raw = `${dest}.raw.wav`;
fs.writeFileSync(raw, out);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", String(SR), dest]);
fs.unlinkSync(raw);
console.log("wrote", dest, LEN, "s");
