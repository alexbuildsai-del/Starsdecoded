import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db, meaningLibraryTable, promptTemplatesTable } from "@workspace/db";
import type {
  AscendantSignPayload,
  AspectPayload,
  MeaningKind,
  MeaningPayload,
  MidheavenSignPayload,
  PlanetHousePayload,
  PlanetSignPayload,
  SynastryAspectPayload,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  type AspectType,
  type House,
  type Planet,
  type Sign,
  ascendantSignKey,
  aspectKey,
  midheavenSignKey,
  planetHouseKey,
  planetSignKey,
  synastryAspectKey,
} from "./keys.js";

export * from "./keys.js";

// v2 — added ascendant_sign / midheaven_sign kinds and the three-facet
// (inFlow / underStress / inConflict) extension to the aspect prompt.
//
// PROMPT_VERSION is the baseline code version. The *active* version (used for
// all cache comparisons and new insertions) is stored in the DB and can be
// bumped via the admin UI without a code change. Falls back to this constant
// when no DB row exists.
export const PROMPT_VERSION = "v2";

// ---------------------------------------------------------------------------
// DB-backed active version — allows bumping the version via admin UI.
// ---------------------------------------------------------------------------

// The key in prompt_templates that stores the active ML version string.
const ML_VERSION_KEY = "__ml_active_version__";
const ML_VERSION_TTL_MS = 30_000;
let mlVersionCache: { value: string; expiresAt: number } | null = null;

/** Returns the currently active prompt version (DB-backed, 30s cache). */
export async function getActiveVersion(): Promise<string> {
  const now = Date.now();
  if (mlVersionCache && mlVersionCache.expiresAt > now) {
    return mlVersionCache.value;
  }
  try {
    const rows = await db
      .select({ userPrompt: promptTemplatesTable.userPrompt })
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.promptKey, ML_VERSION_KEY))
      .limit(1);
    const version = rows[0]?.userPrompt ?? PROMPT_VERSION;
    mlVersionCache = { value: version, expiresAt: now + ML_VERSION_TTL_MS };
    return version;
  } catch {
    return PROMPT_VERSION;
  }
}

/** Clears the in-process version cache so the next read goes to the DB. */
export function invalidateVersionCache(): void {
  mlVersionCache = null;
}

/**
 * Increments the active prompt version (e.g. "v2" → "v3") in the DB.
 * All existing cache rows will be treated as stale on next lookup because
 * their stored version no longer matches the new active version.
 * Returns the new version string.
 */
export async function bumpVersion(): Promise<string> {
  const current = await getActiveVersion();
  const match = /^v(\d+)$/.exec(current);
  const nextNum = match ? parseInt(match[1], 10) + 1 : 3;
  const next = `v${nextNum}`;
  const now = new Date();
  await db
    .insert(promptTemplatesTable)
    .values({
      id: randomUUID(),
      category: "config",
      subcategory: "meta",
      promptKey: ML_VERSION_KEY,
      systemPrompt: null,
      userPrompt: next,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: promptTemplatesTable.promptKey,
      set: { userPrompt: next, updatedAt: now },
    });
  invalidateVersionCache();
  return next;
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert psychological astrologer. Your interpretations are:
- Precise, analytical, and psychologically grounded
- Free of mystical claims or deterministic predictions
- Written in clear, thoughtful prose for an educated adult
- Focused on behavioral patterns, psychological tendencies, and self-understanding
You write in second person. You do not mention the names of planets, signs, houses, or aspects in the body of the prose — you describe the psychological reality they represent.`;

// ---------------------------------------------------------------------------
// DB-backed prompt loading with 30s TTL in-process cache.
// ---------------------------------------------------------------------------

interface PromptCacheEntry { value: string; expiresAt: number }
const promptCache = new Map<string, PromptCacheEntry>();
const PROMPT_TTL_MS = 30_000;

async function loadPromptFromDb(key: string): Promise<string | null> {
  const now = Date.now();
  const cached = promptCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const rows = await db
      .select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.promptKey, key))
      .limit(1);
    if (rows.length > 0) {
      const val = rows[0].systemPrompt ?? rows[0].userPrompt ?? null;
      if (val) {
        promptCache.set(key, { value: val, expiresAt: now + PROMPT_TTL_MS });
        return val;
      }
    }
  } catch {
    // DB unavailable — fall through to hardcoded defaults below.
  }

  promptCache.set(key, { value: "", expiresAt: now + PROMPT_TTL_MS });
  return null;
}

function fillMlTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{${k}}`,
  );
}

/**
 * Returns [systemPrompt, userPrompt] for a meaning-library kind.
 * Falls back field-by-field to the supplied hardcoded defaults.
 */
async function resolveMlPrompts(
  userKey: string,
  fallbackSystem: string,
  fallbackUser: string,
  vars: Record<string, string>,
): Promise<[string, string]> {
  const [dbSystem, dbUser] = await Promise.all([
    loadPromptFromDb("meaning_library:system"),
    loadPromptFromDb(userKey),
  ]);
  const system = dbSystem || fallbackSystem;
  const userTemplate = dbUser || fallbackUser;
  return [system, fillMlTemplate(userTemplate, vars)];
}

interface OpenAIChatMessage {
  role: "system" | "user";
  content: string;
}

async function callAI(messages: OpenAIChatMessage[], maxTokens: number): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages,
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    return null;
  }
}

// In-process dedup for concurrent misses on the same key — multiple callers
// will await the same promise so we only fire one AI request per key per process.
const inflight = new Map<string, Promise<unknown>>();

async function lookupOrFill<T>(
  kind: MeaningKind,
  key: string,
  buildPayload: () => Promise<T>,
): Promise<T> {
  const id = `${kind}:${key}`;

  // Resolve the active version and check for an existing row in parallel.
  const [existing, activeVersion] = await Promise.all([
    db
      .select()
      .from(meaningLibraryTable)
      .where(and(eq(meaningLibraryTable.kind, kind), eq(meaningLibraryTable.key, key)))
      .limit(1),
    getActiveVersion(),
  ]);

  // Fast-path: row exists and was generated with the current active version.
  if (existing.length > 0 && existing[0].promptVersion === activeVersion) {
    return existing[0].payload as T;
  }

  // Row is either missing or stale (version mismatch). Coalesce concurrent
  // regenerations for the same key so we fire only one AI call per process.
  const existingInflight = inflight.get(id);
  if (existingInflight) {
    return existingInflight as Promise<T>;
  }

  const isStale = existing.length > 0;

  const work = (async () => {
    const payload = await buildPayload();

    if (isStale) {
      // Update the stale row in-place with the new payload and active version.
      await db
        .update(meaningLibraryTable)
        .set({
          payload: payload as unknown as object,
          promptVersion: activeVersion,
          updatedAt: new Date(),
        })
        .where(and(eq(meaningLibraryTable.kind, kind), eq(meaningLibraryTable.key, key)));
    } else {
      // Fresh miss — insert; ON CONFLICT DO NOTHING lets another process win the
      // race. We re-read below to return whichever row became canonical.
      await db
        .insert(meaningLibraryTable)
        .values({
          id,
          kind,
          key,
          payload: payload as unknown as object,
          promptVersion: activeVersion,
        })
        .onConflictDoNothing({
          target: [meaningLibraryTable.kind, meaningLibraryTable.key],
        });
    }

    const rows = await db
      .select()
      .from(meaningLibraryTable)
      .where(and(eq(meaningLibraryTable.kind, kind), eq(meaningLibraryTable.key, key)))
      .limit(1);
    return rows[0].payload as T;
  })();

  inflight.set(id, work);
  try {
    return await work;
  } finally {
    inflight.delete(id);
  }
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Prompt builders — one per kind.
// ---------------------------------------------------------------------------

const FALLBACK_PLANET_SIGN_USER = `Describe the psychology of {planet} in {sign} as a generic interpretation (not for a specific person).

Write a SINGLE short paragraph (3-5 sentences) in second person, focused on:
- How this placement colors the psychological function the planet represents
- The characteristic temperament, motivation, and behavioral signature
- A concrete example of how it shows up in everyday life
Do not mention "{planet}" or "{sign}" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`;

async function buildPlanetSignPayload(planet: Planet, sign: Sign): Promise<PlanetSignPayload> {
  const [system, userPrompt] = await resolveMlPrompts(
    "meaning_library:planet_sign:user",
    DEFAULT_SYSTEM_PROMPT,
    FALLBACK_PLANET_SIGN_USER,
    { planet: titleCase(planet), sign: titleCase(sign) },
  );

  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    500,
  );

  const parsed = safeParseJson(raw) as { summary?: string } | null;
  return { summary: parsed?.summary?.trim() || raw };
}

const FALLBACK_PLANET_HOUSE_USER = `Describe the psychology of {planet} in House {house} as a generic interpretation (not for a specific person).

Write a SINGLE short paragraph (3-5 sentences) in second person, focused on:
- The life-area this house governs and how the planet's drive is expressed there
- Where the person's energy, attention, or growth tends to concentrate
- A concrete behavioral example of how this placement shows up
Do not mention "{planet}" or "House {house}" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`;

async function buildPlanetHousePayload(planet: Planet, house: House): Promise<PlanetHousePayload> {
  const [system, userPrompt] = await resolveMlPrompts(
    "meaning_library:planet_house:user",
    DEFAULT_SYSTEM_PROMPT,
    FALLBACK_PLANET_HOUSE_USER,
    { planet: titleCase(planet), house: String(house) },
  );

  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    500,
  );

  const parsed = safeParseJson(raw) as { summary?: string } | null;
  return { summary: parsed?.summary?.trim() || raw };
}

const FALLBACK_ASPECT_USER = `Describe the psychology of the {planet1} {type} {planet2} aspect as a generic interpretation (not for a specific person).

Write 2-3 sentences each, in second person, for these facets:
- dynamic: The relational dynamic between the two psychological functions — how they interact (flowing, frictional, oppositional, fused, etc.) and the overall texture of that interaction.
- tension: The core inner tension or unresolved push-pull this configuration creates — the central inner conflict it describes.
- behavior: How this aspect tends to show up behaviorally — a single combined paragraph covering in-flow, under-stress, and in-conflict modes (kept for backward compatibility).
- growth: The growth arc encoded in this configuration — where this dynamic asks the person to evolve over time.
- inFlow: How this configuration shows up at its best — when the person is regulated, resourced, and the two functions are cooperating well.
- underStress: How this configuration shows up under load — when the person is depleted, anxious, or stretched thin.
- inConflict: How this configuration shows up in interpersonal conflict or when challenged — the recognizable behavioral pattern others would notice.

Do not name the planets, the aspect type, or any astrological terms in the prose — describe the underlying psychological reality.

Respond as JSON: {"dynamic": "...", "tension": "...", "behavior": "...", "growth": "...", "inFlow": "...", "underStress": "...", "inConflict": "..."}`;

async function buildAspectPayload(
  planet1: Planet,
  type: AspectType,
  planet2: Planet,
): Promise<AspectPayload> {
  const [system, userPrompt] = await resolveMlPrompts(
    "meaning_library:aspect:user",
    DEFAULT_SYSTEM_PROMPT,
    FALLBACK_ASPECT_USER,
    { planet1: titleCase(planet1), type, planet2: titleCase(planet2) },
  );

  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    1000,
  );

  const parsed = safeParseJson(raw) as Partial<AspectPayload> | null;
  return {
    dynamic: parsed?.dynamic?.trim() || "",
    tension: parsed?.tension?.trim() || "",
    behavior: parsed?.behavior?.trim() || "",
    growth: parsed?.growth?.trim() || "",
    inFlow: parsed?.inFlow?.trim() || undefined,
    underStress: parsed?.underStress?.trim() || undefined,
    inConflict: parsed?.inConflict?.trim() || undefined,
  };
}

const FALLBACK_ASC_SIGN_USER = `Describe the psychology of an Ascendant (rising sign) in {sign} as a generic interpretation (not for a specific person).

Write a SINGLE paragraph (4-5 sentences) in second person, focused on:
- The outward manner, body language, pacing, and tone this presentation tends to carry
- The instinctive way of meeting and arriving in new situations — how you cross the threshold
- The first impression this lens creates and the lens others see you through before they meet the inner self
- A concrete example of how this shows up in everyday life (e.g. how you walk into a room, the kind of small talk you reach for, how strangers commonly describe you on first meeting)
- At its best how it lands; at its less-resourced edge how it can be misread
Match the depth, specificity, and behavioural texture of a strong planet-in-sign interpretation. Avoid bland trait lists.

Do not mention "{sign}" or "Ascendant" or "rising" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`;

async function buildAscendantSignPayload(sign: Sign): Promise<AscendantSignPayload> {
  const [system, userPrompt] = await resolveMlPrompts(
    "meaning_library:ascendant_sign:user",
    DEFAULT_SYSTEM_PROMPT,
    FALLBACK_ASC_SIGN_USER,
    { sign: titleCase(sign) },
  );

  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    500,
  );

  const parsed = safeParseJson(raw) as { summary?: string } | null;
  return { summary: parsed?.summary?.trim() || raw };
}

const FALLBACK_MC_SIGN_USER = `Describe the psychology of a Midheaven (MC) in {sign} as a generic interpretation (not for a specific person).

Write a SINGLE paragraph (4-5 sentences) in second person, focused on:
- The public-facing direction, vocational orientation, and the highest expression of one's path
- The kinds of roles, environments, and contributions where this orientation tends to find traction
- How you want your work and contribution to be recognised — and the texture of authority you naturally carry
- A concrete example of how this shows up in working life (e.g. the kind of project you gravitate toward, how colleagues describe what you're known for, the title or contribution that feels right when it lands)
- The flavour of legacy and reputation this placement points toward at its best, and where ambition can overreach when under pressure
Match the depth, specificity, and behavioural texture of a strong planet-in-sign interpretation. Avoid generic career-list language.

Do not mention "{sign}" or "Midheaven" or "MC" by name in the prose — describe the underlying psychological reality.

Respond as JSON: {"summary": "..."}`;

async function buildMidheavenSignPayload(sign: Sign): Promise<MidheavenSignPayload> {
  const [system, userPrompt] = await resolveMlPrompts(
    "meaning_library:midheaven_sign:user",
    DEFAULT_SYSTEM_PROMPT,
    FALLBACK_MC_SIGN_USER,
    { sign: titleCase(sign) },
  );

  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    500,
  );

  const parsed = safeParseJson(raw) as { summary?: string } | null;
  return { summary: parsed?.summary?.trim() || raw };
}

// ---------------------------------------------------------------------------
// Public lookup-or-generate API.
// ---------------------------------------------------------------------------

export async function getPlanetSignMeaning(
  planet: Planet,
  sign: Sign,
): Promise<PlanetSignPayload> {
  const key = planetSignKey(planet, sign);
  return lookupOrFill<PlanetSignPayload>("planet_sign", key, () =>
    buildPlanetSignPayload(planet, sign),
  );
}

export async function getPlanetHouseMeaning(
  planet: Planet,
  house: House,
): Promise<PlanetHousePayload> {
  const key = planetHouseKey(planet, house);
  return lookupOrFill<PlanetHousePayload>("planet_house", key, () =>
    buildPlanetHousePayload(planet, house),
  );
}

export async function getAspectMeaning(
  planet1: Planet,
  type: AspectType,
  planet2: Planet,
): Promise<AspectPayload> {
  const key = aspectKey(planet1, type, planet2);
  // Re-derive sorted planet order for the prompt so prose is deterministic.
  const [a, b] = [planet1.toLowerCase(), planet2.toLowerCase()].sort() as [Planet, Planet];
  return lookupOrFill<AspectPayload>("aspect", key, () => buildAspectPayload(a, type, b));
}

export async function getAscendantSignMeaning(sign: Sign): Promise<AscendantSignPayload> {
  const key = ascendantSignKey(sign);
  return lookupOrFill<AscendantSignPayload>("ascendant_sign", key, () =>
    buildAscendantSignPayload(sign),
  );
}

export async function getMidheavenSignMeaning(sign: Sign): Promise<MidheavenSignPayload> {
  const key = midheavenSignKey(sign);
  return lookupOrFill<MidheavenSignPayload>("midheaven_sign", key, () =>
    buildMidheavenSignPayload(sign),
  );
}

const FALLBACK_SYNASTRY_ASPECT_USER = `Describe the psychology of a {planet1} {type} {planet2} CROSS-ASPECT in synastry — i.e. one person's {planet1} forming a {type} to another person's {planet2} (the inter-chart contact, NOT a within-chart aspect).

Write 2-3 sentences each, in second person plural ("you both" / "between you"), for these facets:
- dynamic: The relational dynamic this contact creates between the two people — the texture of the connection it generates and what it tends to magnetize between them.
- inFlow: How this contact lands when both people are well-resourced, regulated, and on the same page — what it gives the relationship at its best.
- underStress: How this contact distorts when either person is depleted, anxious, or stretched thin — the recognizable strain it puts on the bond.
- growth: The growth arc this contact offers — what it asks the relationship to evolve toward over time.

Do not name the planets, the aspect type, or any astrological terms in the prose — describe the underlying relational reality directly.

Respond as JSON: {"dynamic": "...", "inFlow": "...", "underStress": "...", "growth": "..."}`;

async function buildSynastryAspectPayload(
  planet1: Planet,
  type: AspectType,
  planet2: Planet,
): Promise<SynastryAspectPayload> {
  const [system, userPrompt] = await resolveMlPrompts(
    "meaning_library:synastry_aspect:user",
    DEFAULT_SYSTEM_PROMPT,
    FALLBACK_SYNASTRY_ASPECT_USER,
    { planet1: titleCase(planet1), type, planet2: titleCase(planet2) },
  );

  const raw = await callAI(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    900,
  );

  const parsed = safeParseJson(raw) as Partial<SynastryAspectPayload> | null;
  return {
    dynamic: parsed?.dynamic?.trim() || "",
    inFlow: parsed?.inFlow?.trim() || "",
    underStress: parsed?.underStress?.trim() || "",
    growth: parsed?.growth?.trim() || "",
  };
}

export async function getSynastryAspectMeaning(
  planet1: Planet,
  type: AspectType,
  planet2: Planet,
): Promise<SynastryAspectPayload> {
  const key = synastryAspectKey(planet1, type, planet2);
  const [a, b] = [planet1.toLowerCase(), planet2.toLowerCase()].sort() as [Planet, Planet];
  return lookupOrFill<SynastryAspectPayload>("synastry_aspect", key, () =>
    buildSynastryAspectPayload(a, type, b),
  );
}

// ---------------------------------------------------------------------------
// Admin helpers.
// ---------------------------------------------------------------------------

export async function getStats(): Promise<{
  total: number;
  byKind: Record<MeaningKind, number>;
}> {
  const rows = await db
    .select({ kind: meaningLibraryTable.kind, count: sql<number>`count(*)::int` })
    .from(meaningLibraryTable)
    .groupBy(meaningLibraryTable.kind);

  const byKind: Record<MeaningKind, number> = {
    planet_sign: 0,
    planet_house: 0,
    aspect: 0,
    ascendant_sign: 0,
    midheaven_sign: 0,
    synastry_aspect: 0,
  };
  for (const r of rows) {
    if (
      r.kind === "planet_sign"
      || r.kind === "planet_house"
      || r.kind === "aspect"
      || r.kind === "ascendant_sign"
      || r.kind === "midheaven_sign"
      || r.kind === "synastry_aspect"
    ) {
      byKind[r.kind] = Number(r.count);
    }
  }
  const total =
    byKind.planet_sign
    + byKind.planet_house
    + byKind.aspect
    + byKind.ascendant_sign
    + byKind.midheaven_sign
    + byKind.synastry_aspect;
  return { total, byKind };
}

// Count entries that were generated with an older prompt version (stale).
export async function getStaleCount(): Promise<number> {
  const activeVersion = await getActiveVersion();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(meaningLibraryTable)
    .where(ne(meaningLibraryTable.promptVersion, activeVersion));
  return Number(rows[0]?.count ?? 0);
}

// Mark meaning-library rows as stale so lookupOrFill will regenerate them
// lazily on next access. Marks ALL rows (or all rows of a specific kind) —
// intentionally does not filter by current version because the goal is to
// invalidate entries whose *content* is stale due to a prompt text change,
// even though the version string hasn't changed.
export async function markStale(kind?: MeaningKind): Promise<number> {
  const base = db
    .update(meaningLibraryTable)
    .set({ promptVersion: "stale", updatedAt: new Date() });
  const result = kind
    ? await base.where(eq(meaningLibraryTable.kind, kind)).returning({ id: meaningLibraryTable.id })
    : await base.returning({ id: meaningLibraryTable.id });
  return result.length;
}

// Bulk delete by (kind, key) pairs. Used by the seed script's --force flag.
export async function deleteMeanings(
  entries: ReadonlyArray<{ kind: MeaningKind; key: string }>,
): Promise<void> {
  const byKind = new Map<MeaningKind, string[]>();
  for (const e of entries) {
    const arr = byKind.get(e.kind) ?? [];
    arr.push(e.key);
    byKind.set(e.kind, arr);
  }
  const chunkSize = 500;
  for (const [kind, keys] of byKind) {
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      await db
        .delete(meaningLibraryTable)
        .where(
          and(eq(meaningLibraryTable.kind, kind), inArray(meaningLibraryTable.key, chunk)),
        );
    }
  }
}

// Close the underlying DB pool. Useful for short-lived scripts that would
// otherwise hang waiting on the persistent pool.
export async function closePool(): Promise<void> {
  const { pool } = await import("@workspace/db");
  await pool.end();
}

// ---------------------------------------------------------------------------
// Fixture-based bootstrap (no AI calls).
//
// The committed JSON fixture under data/meanings.<PROMPT_VERSION>.json holds
// the canonical pre-generated meanings. A fresh environment can hydrate the
// meaning_library table from this fixture with no per-entry OpenAI traffic
// in the request path — the seed script (or post-merge hook) just bulk
// inserts these rows.
// ---------------------------------------------------------------------------

export interface MeaningFixtureEntry {
  kind: MeaningKind;
  key: string;
  payload: MeaningPayload;
  promptVersion: string;
}

export function getFixturePath(promptVersion: string = PROMPT_VERSION): string {
  // Resolve relative to this source file so it works regardless of cwd.
  // src/index.ts -> ../data/meanings.<version>.json
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "data", `meanings.${promptVersion}.json`);
}

export function loadFixtureFromDisk(
  promptVersion: string = PROMPT_VERSION,
): MeaningFixtureEntry[] {
  const raw = readFileSync(getFixturePath(promptVersion), "utf8");
  const parsed = JSON.parse(raw) as MeaningFixtureEntry[];
  if (!Array.isArray(parsed)) {
    throw new Error(`Meaning fixture is not an array: ${getFixturePath(promptVersion)}`);
  }
  return parsed;
}

export function writeFixtureToDisk(
  entries: ReadonlyArray<MeaningFixtureEntry>,
  promptVersion: string = PROMPT_VERSION,
): void {
  const sorted = [...entries].sort((a, b) =>
    a.kind === b.kind ? a.key.localeCompare(b.key) : a.kind.localeCompare(b.kind),
  );
  const normalized = sorted.map((e) => ({
    kind: e.kind,
    key: e.key,
    payload: e.payload,
    promptVersion: e.promptVersion,
  }));
  writeFileSync(getFixturePath(promptVersion), JSON.stringify(normalized, null, 2) + "\n");
}

// Read every row currently in the meaning library, sorted deterministically.
export async function selectAllMeanings(): Promise<MeaningFixtureEntry[]> {
  const rows = await db
    .select()
    .from(meaningLibraryTable)
    .orderBy(meaningLibraryTable.kind, meaningLibraryTable.key);
  return rows.map((r) => ({
    kind: r.kind as MeaningKind,
    key: r.key,
    payload: r.payload as MeaningPayload,
    promptVersion: r.promptVersion,
  }));
}

// Bulk-upsert fixture entries. On conflict we UPDATE the payload and
// promptVersion so committed fixture changes (e.g. richer prose generated
// in a maintenance regenerate pass) actually propagate to environments
// that already have older rows. The returned counts split inserts vs.
// updates so the caller can log a meaningful summary.
export async function bulkUpsertMeanings(
  entries: ReadonlyArray<MeaningFixtureEntry>,
): Promise<{ inserted: number; updated: number; unchanged: number }> {
  if (entries.length === 0) return { inserted: 0, updated: 0, unchanged: 0 };
  const chunkSize = 100;
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    // Snapshot pre-upsert rows so we can classify each result row as
    // inserted / updated / unchanged afterwards.
    const keys = chunk.map((e) => `${e.kind}:${e.key}`);
    const existing = await db
      .select({
        id: meaningLibraryTable.id,
        payload: meaningLibraryTable.payload,
        promptVersion: meaningLibraryTable.promptVersion,
      })
      .from(meaningLibraryTable)
      .where(inArray(meaningLibraryTable.id, keys));
    const existingById = new Map(existing.map((r) => [r.id, r]));

    await db
      .insert(meaningLibraryTable)
      .values(
        chunk.map((e) => ({
          id: `${e.kind}:${e.key}`,
          kind: e.kind,
          key: e.key,
          payload: e.payload as unknown as object,
          promptVersion: e.promptVersion,
        })),
      )
      .onConflictDoUpdate({
        target: [meaningLibraryTable.kind, meaningLibraryTable.key],
        set: {
          payload: sql`excluded.payload`,
          promptVersion: sql`excluded.prompt_version`,
        },
      });

    for (const e of chunk) {
      const id = `${e.kind}:${e.key}`;
      const prev = existingById.get(id);
      if (!prev) {
        inserted++;
      } else {
        const samePayload =
          JSON.stringify(prev.payload) === JSON.stringify(e.payload);
        const sameVersion = prev.promptVersion === e.promptVersion;
        if (samePayload && sameVersion) unchanged++;
        else updated++;
      }
    }
  }
  return { inserted, updated, unchanged };
}
