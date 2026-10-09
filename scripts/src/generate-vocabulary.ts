/**
 * Regenerate the shorts in api/src/prompts/vocabulary.ts from five generation prompts.
 *
 *   pnpm --filter @workspace/scripts run generate:vocabulary            # dry run: prints a summary
 *   pnpm --filter @workspace/scripts run generate:vocabulary -- --write # overwrites vocabulary.ts
 *
 * Runs once, off the request path, and commits its output. About 60 calls.
 * The crisp lines, the `full` entries and the aspects' four lines are written
 * by hand in everyday words (ADR-257, 376) and go back into the file as they
 * are, so --write changes only the shorts. Review the diff. Requires
 * OPENAI_API_KEY.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODELS } from "../../api/src/lib/models.js";
import { SIMPLE_WORDS } from "../../api/src/prompts/system.js";
import {
  ASPECT, ASPECTS, BODIES, BODY, BODY_LABELS, HOUSE, HOUSE_WORDS, SIGN, SIGNS, STRUCTURE, ordinal,
} from "../../api/src/prompts/vocabulary.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TARGET = join(HERE, "..", "..", "api", "src", "prompts", "vocabulary.ts");
const MODEL = MODELS.vocabulary;
const CONCURRENCY = 6;

// A short is printed on the report's planet rows, so it follows the rule every reader-facing word does: name it and
// say it plain, no dignity or sect word, possibilities never forecasts (explain-like-a-friend §1, §3, §8).
const SYSTEM = `You write the one-sentence shorts in the vocabulary of a natal-report engine grounded in classical (Hellenistic) astrology as transmitted by Demetra George, Chris Brennan, and Avelar & Ribeiro. Write doctrine in your own words: never quote or paraphrase a specific author or creator. A short is printed on the reader's planet rows: name the thing, then say plainly what it means in a person's life, the way you would tell a friend. Speak to the reader as "you" where the line is about them. Never write a dignity or sect word (domicile, exaltation, exalted, detriment, fall, peregrine, sect, angular, succedent, cadent): say the plain idea instead (at home, honoured, least at ease, doubted). Possibilities, never forecasts: could, tends to, never "will". No mysticism, and no sentence about astrology as a subject. ${SIMPLE_WORDS} No em dashes, no semicolons. Return JSON only.`;

async function ask(user: string): Promise<string> {
  // Loaded on the first call, so the test can rebuild the file with no key.
  const { openai } = await import("@workspace/integrations-openai-ai-server");
  const r = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 500,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
  });
  return (JSON.parse(r.choices[0]?.message?.content ?? "{}") as { short?: string }).short ?? "";
}

const shortPrompt = (what: string, guidance: string, entry: string, crisp?: string) =>
  `Write the one-sentence short for ${what}. ${guidance}
${crisp ? `Its crisp line, which stays as written and comes first: "${crisp}". Say it another way, never word for word.\n` : ""}It sums up this entry, which stays as written: "${entry}"
Return {"short": "<one sentence, at most 15 words>"}.`;

async function mapLimit<A, B>(items: readonly A[], fn: (a: A) => Promise<B>): Promise<B[]> {
  const out: B[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

/** One new short per entry, in each table's key order. */
export interface Shorts {
  bodies: string[];
  signs: string[];
  houses: string[];
  aspects: string[];
  structure: string[];
}

/**
 * The file as --write leaves it: the shorts given, and every crisp line, full
 * entry and aspect line as the file holds them now. Everything that is not an
 * entry table (types, key lists, the house covers, the lines for going
 * backwards, helpers) is kept.
 */
export function rebuildVocabulary(src: string, shorts: Shorts): string {
  const q = (s: string) => JSON.stringify(s);
  // `crisp` is source text, so a house keeps pointing at its covers line instead of becoming a second copy of it.
  const rec = (k: string, crisp: string, short: string, full: string) =>
    `  ${k}: {\n    crisp: ${crisp},\n    short: ${q(short)},\n    full: ${q(full)},\n  },`;
  const structureKeys = Object.keys(STRUCTURE);
  const tables: Array<[string, string]> = [
    ["BODY", BODIES.map((b, i) => rec(b, q(BODY[b].crisp), shorts.bodies[i], BODY[b].full)).join("\n")],
    ["SIGN", SIGNS.map((s, i) => rec(s, q(SIGN[s].crisp), shorts.signs[i], SIGN[s].full)).join("\n")],
    ["HOUSE", shorts.houses.map((short, i) => rec(String(i + 1), `HOUSE_COVERS[${i}]`, short, HOUSE[i + 1].full)).join("\n")],
    ["ASPECT", ASPECTS.map((a, i) => {
      const e = ASPECT[a];
      return `  ${a}: {\n    short: ${q(shorts.aspects[i])},\n    dynamic: ${q(e.dynamic)},\n    inFlow: ${q(e.inFlow)},\n    underStress: ${q(e.underStress)},\n    growth: ${q(e.growth)},\n  },`;
    }).join("\n")],
    ["STRUCTURE", structureKeys.map((k, i) => rec(k, q(STRUCTURE[k].crisp), shorts.structure[i], STRUCTURE[k].full)).join("\n")],
  ];
  let out = src;
  for (const [name, body] of tables) {
    const start = out.indexOf(`export const ${name}:`);
    const open = out.indexOf("{", start);
    let depth = 0, i = open;
    for (; i < out.length; i++) { if (out[i] === "{") depth++; else if (out[i] === "}") { depth--; if (depth === 0) break; } }
    out = out.slice(0, open) + "{\n" + body + "\n}" + out.slice(i + 1);
  }
  return out;
}

async function main() {
  const write = process.argv.includes("--write");

  const bodies = await mapLimit(BODIES, (b) => ask(shortPrompt(
    `the body ${BODY_LABELS[b]}`, "Say plainly what it shows about you.", BODY[b].full, BODY[b].crisp,
  )));
  const signs = await mapLimit(SIGNS, (s) => ask(shortPrompt(
    `the sign ${s}`, "Say the style anything placed in it takes on.", SIGN[s].full, SIGN[s].crisp,
  )));
  // MB-87 provisional: the short opens with the word the page prints for the house, so a regenerated file keeps it.
  const houses = await mapLimit([1,2,3,4,5,6,7,8,9,10,11,12] as const, (h) => ask(shortPrompt(
    `the ${ordinal(h)} house in whole-sign houses`,
    `The short opens "The ${ordinal(h)} is ${HOUSE_WORDS[h - 1].toLowerCase()}:", the word the page prints for this house, then names the rest of what it covers in everyday words.`,
    HOUSE[h].full, HOUSE[h].crisp,
  )));
  const aspects = await mapLimit(ASPECTS, (a) => ask(shortPrompt(
    `the ${a} aspect between two planets`, "Say how the two planets relate.",
    [ASPECT[a].dynamic, ASPECT[a].inFlow, ASPECT[a].underStress, ASPECT[a].growth].join(" "),
  )));
  const structure = await mapLimit(Object.keys(STRUCTURE), (k) => ask(shortPrompt(
    `the structural concept "${k}"`, "Say what it is and what it shows, in plain words.", STRUCTURE[k].full, STRUCTURE[k].crisp,
  )));

  const src = rebuildVocabulary(readFileSync(TARGET, "utf8"), { bodies, signs, houses, aspects, structure })
    .replace(/\* Provenance:[\s\S]*?\*\//, `* Provenance: shorts regenerated by scripts/src/generate-vocabulary.ts on ${new Date().toISOString().slice(0, 10)} with ${MODEL}.\n */`);

  const total = bodies.length + signs.length + houses.length + aspects.length + structure.length;
  console.log(`Generated ${total} shorts; every crisp line, full entry and aspect line kept as written.`);
  if (!write) { console.log("Dry run. Re-run with --write to overwrite vocabulary.ts."); return; }
  writeFileSync(TARGET, src);
  console.log(`Wrote ${TARGET}. Run the api tests and review the diff before committing.`);
}

// Run only as a script: the test imports the rebuild without a run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
