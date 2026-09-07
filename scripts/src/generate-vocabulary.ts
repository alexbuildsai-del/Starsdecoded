/**
 * Regenerate api/src/prompts/vocabulary.ts from five generation prompts.
 *
 *   pnpm --filter @workspace/scripts run generate:vocabulary            # dry run: prints a summary
 *   pnpm --filter @workspace/scripts run generate:vocabulary -- --write # overwrites vocabulary.ts
 *
 * Runs once, off the request path, and commits its output. About 60 calls.
 * Hand edits to vocabulary.ts are lost on --write, so regenerate deliberately
 * and review the diff. Requires OPENAI_API_KEY.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  BODIES, SIGNS, ASPECTS, BODY_LABELS, STRUCTURE,
  type Body, type SignName, type AspectName,
} from "../../api/src/prompts/vocabulary.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = join(HERE, "..", "..", "api", "src", "prompts", "vocabulary.ts");
const MODEL = "gpt-5.2";
const CONCURRENCY = 6;

const SYSTEM = `You write the primitive vocabulary for a natal-report engine grounded in classical (Hellenistic) astrology as transmitted by Demetra George, Chris Brennan, and Avelar & Ribeiro. Write doctrine in your own words: never quote or paraphrase a specific author. Descriptive third person. Precise, plain, no mysticism, no predictions. Never explain method or mention astrology as a subject; describe what the thing does, how it behaves, and what it costs. No em dashes, no semicolons, no lists inside prose. Return JSON only.`;

interface Out { short: string; full: string }
interface AspectOut { short: string; dynamic: string; inFlow: string; underStress: string; growth: string }

async function ask<T>(user: string): Promise<T> {
  const r = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 500,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
  });
  return JSON.parse(r.choices[0]?.message?.content ?? "{}") as T;
}

const entryPrompt = (what: string, guidance: string) =>
  `Write the vocabulary entry for ${what}. ${guidance}
Return {"short": "<one sentence, at most 20 words>", "full": "<40 to 80 words>"}.`;

async function mapLimit<A, B>(items: readonly A[], fn: (a: A) => Promise<B>): Promise<B[]> {
  const out: B[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function main() {
  const write = process.argv.includes("--write");

  const bodies = await mapLimit(BODIES, (b) => ask<Out>(entryPrompt(
    `the body ${BODY_LABELS[b]}`,
    "State the psychological function it represents, what it shows about a person, and its sect or dignity status where the tradition gives one (the outer planets, Chiron and the nodes rule nothing). For the nodes, describe them as one axis.",
  )));
  const signs = await mapLimit(SIGNS, (s) => ask<Out>(entryPrompt(
    `the sign ${s}`,
    "Name its element and modality, its ruler and any exaltation, then describe the style anything placed in it takes on, at its best and under strain.",
  )));
  const houses = await mapLimit([1,2,3,4,5,6,7,8,9,10,11,12] as const, (h) => ask<Out>(entryPrompt(
    `the ${h}th house in whole-sign houses`,
    "Name the life domain, any planetary joy, whether it is angular, succedent or cadent, and whether the tradition treats it as difficult. Describe what a placement here shows.",
  )));
  const aspects = await mapLimit(ASPECTS, (a) => ask<AspectOut>(
    `Write the vocabulary entry for the ${a} aspect between two planets. Return {"short": "<one sentence>", "dynamic": "<40-60 words: what the relationship between the two functions is>", "inFlow": "<one sentence: how it shows when working>", "underStress": "<one sentence: how it shows under pressure>", "growth": "<one sentence: what working with it looks like>"}.`,
  ));
  const structureKeys = Object.keys(STRUCTURE);
  const structure = await mapLimit(structureKeys, (k) => ask<Out>(entryPrompt(
    `the structural concept "${k}"`,
    `Current wording for reference only, do not copy: "${STRUCTURE[k].full}". Describe what it is and what it shows.`,
  )));

  const q = (s: string) => JSON.stringify(s);
  const rec = (k: string, e: Out) => `  ${k}: {\n    short: ${q(e.short)},\n    full: ${q(e.full)},\n  },`;
  const bodyBlock = BODIES.map((b, i) => rec(b, bodies[i])).join("\n");
  const signBlock = SIGNS.map((s, i) => rec(s, signs[i])).join("\n");
  const houseBlock = houses.map((e, i) => rec(String(i + 1), e)).join("\n");
  const aspectBlock = ASPECTS.map((a, i) => {
    const e = aspects[i];
    return `  ${a}: {\n    short: ${q(e.short)},\n    dynamic: ${q(e.dynamic)},\n    inFlow: ${q(e.inFlow)},\n    underStress: ${q(e.underStress)},\n    growth: ${q(e.growth)},\n  },`;
  }).join("\n");
  const structureBlock = structureKeys.map((k, i) => rec(k, structure[i])).join("\n");

  // Keep everything in the file that is not an entry table: types, key lists,
  // helpers. Only the five tables are replaced.
  let src = readFileSync(TARGET, "utf8");
  const replaceTable = (name: string, body: string) => {
    const start = src.indexOf(`export const ${name}:`);
    const open = src.indexOf("{", start);
    let depth = 0, i = open;
    for (; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (depth === 0) break; } }
    src = src.slice(0, open) + "{\n" + body + "\n}" + src.slice(i + 1);
  };
  replaceTable("BODY", bodyBlock);
  replaceTable("SIGN", signBlock);
  replaceTable("HOUSE", houseBlock);
  replaceTable("ASPECT", aspectBlock);
  replaceTable("STRUCTURE", structureBlock);
  src = src.replace(/\* Provenance:[\s\S]*?\*\//, `* Provenance: regenerated by scripts/src/generate-vocabulary.ts on ${new Date().toISOString().slice(0, 10)} with ${MODEL}.\n */`);

  const total = bodies.length + signs.length + houses.length + aspects.length + structure.length;
  console.log(`Generated ${total} entries.`);
  if (!write) { console.log("Dry run. Re-run with --write to overwrite vocabulary.ts."); return; }
  writeFileSync(TARGET, src);
  console.log(`Wrote ${TARGET}. Run the api tests and review the diff before committing.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
