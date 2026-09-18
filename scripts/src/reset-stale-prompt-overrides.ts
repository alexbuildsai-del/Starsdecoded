import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { PROMPT_VERSION } from "../../api/src/lib/aiInterpretation.js";

// Prompts resolve from api/src/prompts at run time; a prompt_templates row
// exists only where /admin/prompts overrode one. An override written against
// an earlier prompt version targets a contract that no longer exists, so a
// version bump clears every natal override. The version seen last lives in a
// `__` row, which the loader's repair step leaves alone. Idempotent.
const VERSION_KEY = "__prompt_version";

async function main() {
  const force = process.argv.includes("--force");
  const client = await pool.connect();
  try {
    const seen = await client.query<{ version: string | null }>(
      "SELECT user_prompt AS version FROM prompt_templates WHERE prompt_key = $1 LIMIT 1",
      [VERSION_KEY],
    );
    const version = seen.rows[0]?.version ?? null;
    if (!force && version === PROMPT_VERSION) {
      console.log(`Prompt overrides: version ${PROMPT_VERSION} already seen, nothing to reset.`);
      return;
    }

    await client.query("BEGIN");
    const removed = await client.query("DELETE FROM prompt_templates WHERE prompt_key LIKE 'natal:%'");
    await client.query(
      `INSERT INTO prompt_templates (id, category, subcategory, prompt_key, system_prompt, user_prompt, updated_at)
       VALUES ($1, 'meta', 'meta', $2, NULL, $3, NOW())
       ON CONFLICT (prompt_key) DO UPDATE SET user_prompt = EXCLUDED.user_prompt, updated_at = NOW()`,
      [randomUUID(), VERSION_KEY, PROMPT_VERSION],
    );
    await client.query("COMMIT");
    console.log(
      `Prompt overrides: ${version ?? "no version"} → ${PROMPT_VERSION}${force ? " (--force)" : ""}, removed ${removed.rowCount ?? 0} stale natal override(s).`,
    );
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
