/**
 * The package's front door (R16-01 to 04): every name the five Timeline files pin is exported once and is the file's
 * own, so a name two files share (which `export *` drops without a word) fails here, and the files the browser bundles
 * import nothing from Node.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as index from "./index.js";
import * as transits from "./transits.js";
import * as doctrine from "./doctrine.js";
import * as tone from "./tone.js";
import * as cycles from "./cycles.js";
import * as plainWords from "./plainWords.js";
import * as chartCalculation from "./chartCalculation.js";
import * as chiron from "./chiron.js";
import * as sky from "./sky.js";

const PINNED = [
  // transits.ts
  "longitudeAt", "speedAt", "exactHits", "inOrb", "stations", "ingresses", "eclipses", "SKY_BODIES",
  // doctrine.ts and tone.ts
  "DOCTRINE", "skyEvents", "inEffect", "readsAs", "TONE_TABLE", "toneOf", "dayTone",
  // cycles.ts
  "lifeCycles", "natalLongitudes", "noonLongitudes", "noonOf", "KNOWN_AGES", "waves", "roundProgress", "ageAt", "CYCLE_BODIES",
  // plainWords.ts
  "headlineOf", "factsOf", "weekSentence", "CYCLE_WORDS",
  // what the page and the API already read
  "calculateNatalChart", "hasHorizon", "CHART_VERSION", "offsetAtBirth",
];

test("every pinned name is exported from the package's index", () => {
  for (const name of PINNED) assert.notEqual((index as Record<string, unknown>)[name], undefined, name);
});

test("every export of every file is on the index and is the file's own: no two files give one name two meanings", () => {
  const files = { transits, doctrine, tone, cycles, plainWords, chartCalculation, chiron, sky } as Record<string, Record<string, unknown>>;
  const owners = new Map<string, string>();
  for (const [file, exports] of Object.entries(files)) {
    for (const [name, value] of Object.entries(exports)) {
      const other = owners.get(name);
      assert.equal(other, undefined, `${name} is exported by ${other} and by ${file}`);
      owners.set(name, file);
      assert.equal((index as Record<string, unknown>)[name], value, `${file}.${name} is not what the index exports`);
    }
  }
});

test("the files the browser bundles import only the engine's own files and astronomy-engine, and use no Node API", () => {
  const allowed: Record<string, string[]> = {
    "transits.ts": ["astronomy-engine"],
    "doctrine.ts": ["./chartCalculation.js", "./tone.js", "./transits.js"],
    "tone.ts": ["./doctrine.js"],
    "cycles.ts": ["./chartCalculation.js", "./doctrine.js", "./transits.js"],
    "plainWords.ts": ["./cycles.js", "./doctrine.js"],
  };
  for (const [file, imports] of Object.entries(allowed)) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    const found = [...source.matchAll(/^import (?:type )?(?:[^;]*?) from "([^"]+)";$/gms)].map((m) => m[1]);
    assert.deepEqual([...new Set(found)].sort(), imports.sort(), file);
    assert.doesNotMatch(source, /from "node:|\b(process|Buffer|require|__dirname)\b|\bfs\b/, file);
  }
});

test("the page's words import no function from the doctrine, so they run where the doctrine has not loaded", () => {
  // plainWords reads the doctrine's types only; a value import would pull the sky search into a bundle that needs a sentence.
  const source = readFileSync(new URL("./plainWords.ts", import.meta.url), "utf8");
  for (const line of source.split("\n").filter((l) => l.startsWith("import "))) assert.match(line, /^import type /, line);
});
