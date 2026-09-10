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

// Two Supabase projects in one region share the pooler host and the `postgres`
// path; only the username (`postgres.<project ref>`) tells them apart. Host
// and path alone therefore call staging and production the same database
// and refuse a legitimate sync, which is what crashed the first production
// deploy with a source configured.
export function sameDatabase(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.username === ub.username && ua.host === ub.host && ua.pathname === ub.pathname;
  } catch {
    return false;
  }
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
