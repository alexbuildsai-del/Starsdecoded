import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { PROMPT_VERSION } from "../../api/src/lib/aiInterpretation.js";
import { PAIR_PROMPT_VERSION } from "../../api/src/prompts/pair/index.js";
import { promptFamilies } from "./prompt-families.js";

// Prompts resolve from api/src/prompts at run time; a prompt_templates row
// exists only where /admin/prompts overrode one. A version bump clears the
// families prompt-families.ts names, and only those. The version seen last
// lives in a `__` row per family, which the loader's repair step leaves
// alone. Idempotent.
async function main() {
  const force = process.argv.includes("--force");
  const client = await pool.connect();
  try {
    for (const family of promptFamilies(PROMPT_VERSION, PAIR_PROMPT_VERSION)) {
      const seen = await client.query<{ version: string | null }>(
        "SELECT user_prompt AS version FROM prompt_templates WHERE prompt_key = $1 LIMIT 1",
        [family.key],
      );
      const version = seen.rows[0]?.version ?? null;
      if (!force && version === family.version) {
        console.log(`Prompt overrides (${family.label}): version ${family.version} already seen, nothing to reset.`);
        continue;
      }

      await client.query("BEGIN");
      const removed = await client.query("DELETE FROM prompt_templates WHERE prompt_key LIKE $1", [family.like]);
      await client.query(
        `INSERT INTO prompt_templates (id, category, subcategory, prompt_key, system_prompt, user_prompt, updated_at)
         VALUES ($1, 'meta', 'meta', $2, NULL, $3, NOW())
         ON CONFLICT (prompt_key) DO UPDATE SET user_prompt = EXCLUDED.user_prompt, updated_at = NOW()`,
        [randomUUID(), family.key, family.version],
      );
      await client.query("COMMIT");
      console.log(
        `Prompt overrides (${family.label}): ${version ?? "no version"} → ${family.version}${force ? " (--force)" : ""}, removed ${removed.rowCount ?? 0} stale ${family.label} override(s).`,
      );
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
