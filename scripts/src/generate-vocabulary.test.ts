/**
 * The vocabulary's full entries and aspect lines are written by hand in
 * everyday words (ADR-257), so a regeneration must give them back word for
 * word and change only the shorts. No model is called: the rebuild is pure.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as V from "../../api/src/prompts/vocabulary.js";
import { TARGET, rebuildVocabulary } from "./generate-vocabulary.js";

test("--write keeps every full entry and aspect line as written, so the system block is unchanged, and takes the new shorts", async () => {
  const keys = Object.keys(V.STRUCTURE);
  const shorts = {
    bodies: V.BODIES.map((b) => `A new short for ${b}.`),
    signs: V.SIGNS.map((s) => `A new short for ${s}.`),
    houses: Array.from({ length: 12 }, (_, i) => `The ${V.ordinal(i + 1)} is ${V.HOUSE_WORDS[i].toLowerCase()}: a new short.`),
    aspects: V.ASPECTS.map((a) => `A new short for ${a}.`),
    structure: keys.map((k) => `A new short for ${k}.`),
  };
  const dir = mkdtempSync(join(tmpdir(), "vocabulary-"));
  const file = join(dir, "vocabulary.ts");
  writeFileSync(file, rebuildVocabulary(readFileSync(TARGET, "utf8"), shorts));
  const R = (await import(pathToFileURL(file).href)) as typeof V;

  assert.equal(R.renderVocabularyBlock(), V.renderVocabularyBlock());
  V.BODIES.forEach((b, i) => assert.deepEqual(R.BODY[b], { short: shorts.bodies[i], full: V.BODY[b].full }, b));
  V.SIGNS.forEach((s, i) => assert.deepEqual(R.SIGN[s], { short: shorts.signs[i], full: V.SIGN[s].full }, s));
  for (let h = 1; h <= 12; h++) assert.deepEqual(R.HOUSE[h], { short: shorts.houses[h - 1], full: V.HOUSE[h].full }, String(h));
  V.ASPECTS.forEach((a, i) => assert.deepEqual(R.ASPECT[a], { ...V.ASPECT[a], short: shorts.aspects[i] }, a));
  keys.forEach((k, i) => assert.deepEqual(R.STRUCTURE[k], { short: shorts.structure[i], full: V.STRUCTURE[k].full }, k));
  assert.deepEqual(R.HOUSE_WORDS, V.HOUSE_WORDS, "what is not an entry table stays");
});
