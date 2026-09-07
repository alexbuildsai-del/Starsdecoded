#!/usr/bin/env node
/**
 * sync-prompts — pull every report prompt from the source of truth into
 * bible/prompts.json, which the bible artifact is built from.
 *
 * Source of truth is two layers, exactly as the running API resolves them:
 *   1. api/src/lib/promptDefaults.ts  — 85 hardcoded defaults
 *   2. prompt_templates (Postgres)    — per-key overrides written by /admin/prompts
 * A DB row wins field-by-field, matching resolvePrompt() in promptLoader.ts.
 *
 * The DB step is skipped when DATABASE_URL is unset, and the output records
 * dbOverridesRead:false so the bible can say so on the page rather than
 * quietly presenting defaults as production truth.
 *
 * Prompts are NEVER edited here. Edit promptDefaults.ts or /admin/prompts,
 * then re-run this.
 *
 *   node bible/sync-prompts.mjs
 *   DATABASE_URL=... DATABASE_SSL=require node bible/sync-prompts.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "api/src/lib/promptDefaults.ts";
const OUT = `${ROOT}/bible/prompts.json`;

/* Keys the bible's pages depend on. If one of these disappears from the
   source file, the page that documents it is silently wrong — so fail loudly
   rather than publish a bible that describes prompts that no longer exist. */
const REQUIRED = [
  "natal:foundation", "natal:overview", "natal:triad", "natal:career",
  "natal:relationships", "natal:superpowers", "natal:discoveries", "natal:focus",
  "synastry:romantic:overview", "synastry:parent_child:overview",
  "synastry:sibling:overview", "synastry:custom:overview",
  "meaning_library:planet_sign", "meaning_library:aspect",
];
const EXPECTED_KEY_COUNT = 85;

/* max_completion_tokens, read from the three call sites. Keep in step with
   aiInterpretation.ts, synastryInterpretation.ts and meaning-library/index.ts. */
const MAXTOK = {
  "natal:foundation":1200,"natal:overview":1200,"natal:triad":1100,"natal:career":1100,
  "natal:relationships":1100,"natal:superpowers":1500,"natal:discoveries":1100,"natal:focus":1100,
  "synastry:overview":700,"synastry:emotional":500,"synastry:communication":500,
  "synastry:physical":500,"synastry:conflict":500,"synastry:growth":500,
  "meaning_library:planet_sign":500,"meaning_library:planet_house":500,
  "meaning_library:aspect":1000,"meaning_library:ascendant_sign":500,
  "meaning_library:midheaven_sign":500,"meaning_library:synastry_aspect":900,
};
const CALLSITE = {
  natal: "api/src/lib/aiInterpretation.ts:296",
  synastry: "api/src/lib/synastryInterpretation.ts:48",
  meaning_library: "packages/meaning-library/src/index.ts:178",
};
const LIVE_NATAL = ["foundation","overview","triad","career","relationships","superpowers","discoveries","focus"];

function die(msg) {
  console.error(`\n  sync-prompts FAILED\n  ${msg}\n`);
  process.exit(1);
}

/* ---- 1. file defaults ------------------------------------------------- */
let raw;
try {
  raw = readFileSync(`${ROOT}/${SRC}`, "utf8");
} catch {
  die(`Cannot read ${SRC}. Has the file moved? The bible's prompt library is built from it.`);
}

const js = raw
  .replace(/export interface PromptDefault \{[\s\S]*?\n\}\n/, "")
  .replace(/export const PROMPT_DEFAULTS: PromptDefault\[\] = \[/, "export const PROMPT_DEFAULTS = [")
  .replace(/\] as const;/g, "];")
  .replace(/export const PROMPT_DEFAULTS_BY_KEY[\s\S]*$/, "");

let mod;
try {
  mod = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
} catch (e) {
  die(`Could not parse ${SRC}: ${e.message}\n  The file's shape changed — update the strip rules in this script.`);
}
const defaults = mod.PROMPT_DEFAULTS;
if (!Array.isArray(defaults) || !defaults.length) die(`${SRC} exported no PROMPT_DEFAULTS array.`);

if (defaults.length !== EXPECTED_KEY_COUNT) {
  console.warn(`  note: expected ${EXPECTED_KEY_COUNT} keys, found ${defaults.length}. ` +
    `Update EXPECTED_KEY_COUNT once you've confirmed the change is intentional.`);
}

const lines = raw.split("\n");
const lineOf = k => { const i = lines.findIndex(l => l.includes(`key: "${k}"`)); return i < 0 ? null : i + 1; };

/* ---- 2. DB overrides -------------------------------------------------- */
const overrides = new Map();
let dbOverridesRead = false;
if (process.env.DATABASE_URL) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  try {
    await client.connect();
    const { rows } = await client.query(
      "select prompt_key, system_prompt, user_prompt, updated_at from prompt_templates"
    );
    for (const r of rows) overrides.set(r.prompt_key, r);
    dbOverridesRead = true;
    console.log(`  db: ${rows.length} override row(s) read from prompt_templates`);
  } catch (e) {
    die(`DATABASE_URL is set but the query failed: ${e.message}\n` +
        `  Re-run without DATABASE_URL to sync file defaults only.`);
  } finally {
    await client.end().catch(() => {});
  }
} else {
  console.log("  db: DATABASE_URL not set — file defaults only");
}

/* ---- 3. merge, exactly as promptLoader.resolvePrompt does -------------- */
const merged = defaults.map(p => {
  const o = overrides.get(p.key);
  const system = o?.system_prompt ?? p.systemPrompt;
  const user   = o?.user_prompt   ?? p.userPrompt;
  return {
    ...p,
    systemPrompt: system,
    userPrompt: user,
    overridden: !!o,
    overriddenAt: o?.updated_at ?? null,
    fileSystemPrompt: p.systemPrompt,
    fileUserPrompt: p.userPrompt,
    line: lineOf(p.key),
    source: o ? `prompt_templates.prompt_key = '${p.key}'` : `${SRC}:${lineOf(p.key)}`,
    vars: [...new Set([...(user || "").matchAll(/\{(\w+)\}/g)].map(m => m[1]))],
  };
});

/* ---- 4. required-key guard -------------------------------------------- */
const present = new Set(merged.map(p => p.key));
const missing = REQUIRED.filter(b => !present.has(`${b}:system`) && !present.has(`${b}:user`));
if (missing.length) {
  die(`These prompts are documented in the bible but no longer exist in the source:\n` +
      missing.map(m => `    - ${m}`).join("\n") +
      `\n\n  Either they were renamed (update REQUIRED in this script and the bible page)\n` +
      `  or they were deleted (remove them from the bible).`);
}

/* ---- 5. group into sections ------------------------------------------- */
const sections = new Map();
for (const p of merged) {
  const [, base, role] = p.key.match(/^(.*):(system|user)$/);
  if (!sections.has(base)) {
    sections.set(base, {
      base, category: p.category, subcategory: p.subcategory,
      label: p.label.replace(/\s*\((system|user)\)$/, "").replace(/\s*\(user template\)$/, ""),
      live: p.category === "natal" ? LIVE_NATAL.includes(p.subcategory) : true,
      relType: p.category === "synastry" ? p.key.split(":")[1] : null,
      maxTokens: MAXTOK[p.category === "synastry" ? `synastry:${p.subcategory}` : base] ?? null,
      callSite: CALLSITE[p.category],
      overridden: false,
      system: null, user: null, systemSource: null, userSource: null, vars: [],
    });
  }
  const s = sections.get(base);
  if (p.overridden) s.overridden = true;
  if (role === "system") { s.system = p.systemPrompt; s.systemSource = p.source; }
  else { s.user = p.userPrompt; s.userSource = p.source; s.vars = p.vars; }
}
const list = [...sections.values()];
const liveVars = new Set(list.filter(s => s.live).flatMap(s => s.vars));

let commit = "unknown", branch = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT }).toString().trim();
} catch { /* not a git checkout */ }

mkdirSync(`${ROOT}/bible`, { recursive: true });
writeFileSync(OUT, JSON.stringify({
  lastSynced: new Date().toISOString(),
  source: { file: SRC, commit, branch, dbOverridesRead },
  keyCount: merged.length,
  sectionCount: list.length,
  liveVars: [...liveVars].sort(),
  deadVars: [...new Set(list.filter(s => !s.live).flatMap(s => s.vars))].filter(v => !liveVars.has(v)).sort(),
  sections: list,
}, null, 2));

const overridden = list.filter(s => s.overridden).length;
console.log(`  ok: ${merged.length} keys / ${list.length} sections -> bible/prompts.json`);
console.log(`      ${list.filter(s => s.live).length} live, ${list.filter(s => !s.live).length} dead, ${overridden} carrying a DB override`);
if (!dbOverridesRead) console.log(`      NOTE: bible will show "database overrides read: no"`);
