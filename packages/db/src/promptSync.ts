export interface PromptSyncRow {
  promptKey: string;
  category: string;
  subcategory: string;
  systemPrompt: string | null;
  userPrompt: string | null;
  updatedAt: Date;
}

export interface PromptSyncPlan {
  upserts: PromptSyncRow[];
  deletes: string[];
  unchanged: number;
}

function sameRow(a: PromptSyncRow, b: PromptSyncRow): boolean {
  return (
    a.category === b.category &&
    a.subcategory === b.subcategory &&
    a.systemPrompt === b.systemPrompt &&
    a.userPrompt === b.userPrompt &&
    a.updatedAt.getTime() === b.updatedAt.getTime()
  );
}

// The source (staging) is authoritative: every row it holds is written to the
// target, and target rows it no longer holds are removed. Rows already equal
// are reported, not rewritten, so a repeated run is a visible no-op.
export function planPromptSync(source: PromptSyncRow[], target: PromptSyncRow[]): PromptSyncPlan {
  const targetByKey = new Map(target.map((row) => [row.promptKey, row]));
  const sourceKeys = new Set(source.map((row) => row.promptKey));

  const upserts: PromptSyncRow[] = [];
  let unchanged = 0;
  for (const row of source) {
    const existing = targetByKey.get(row.promptKey);
    if (existing && sameRow(existing, row)) unchanged++;
    else upserts.push(row);
  }

  const deletes = target.map((row) => row.promptKey).filter((key) => !sourceKeys.has(key));

  return { upserts, deletes, unchanged };
}
