import { randomUUID } from "node:crypto";
import { db, promptTemplatesTable } from "@workspace/db";
import { pool } from "@workspace/db";
import { PROMPT_DEFAULTS } from "../../api/src/lib/promptDefaults.js";

async function main() {
  const force = process.argv.includes("--force");

  if (force) {
    console.log("--force: deleting all existing prompt_templates rows…");
    await db.delete(promptTemplatesTable);
  }

  console.log(`Seeding ${PROMPT_DEFAULTS.length} prompt templates (ON CONFLICT DO NOTHING)…`);

  let inserted = 0;
  let skipped = 0;

  for (const def of PROMPT_DEFAULTS) {
    const result = await db
      .insert(promptTemplatesTable)
      .values({
        id: randomUUID(),
        category: def.category,
        subcategory: def.subcategory,
        promptKey: def.key,
        systemPrompt: def.systemPrompt,
        userPrompt: def.userPrompt,
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: promptTemplatesTable.promptKey })
      .returning({ key: promptTemplatesTable.promptKey });

    if (result.length > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Done: ${inserted} inserted, ${skipped} skipped (already present).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
