/**
 * The two things the release needs from GitHub (ADR-86, MB-75): what
 * production and main are at and which brain files differ, read from the
 * public API with no token; and the fast-forward of `production`, a PATCH
 * on the ref with the token Railway staging holds, never forced.
 */
export const REPO = "alexbuildsai-del/Starsdecoded";
const API = "https://api.github.com";

/** The brain: what decides the words (R-4.4). */
export const BRAIN_PATHS = ["api/src/prompts/", "api/src/lib/models.ts", "api/src/lib/aiInterpretation.ts", "api/src/lib/traditional.ts", "api/src/lib/chartCalculation.ts", "packages/engine/"];
/** The pair brain: a change here adds one pair to the release lab. */
export const PAIR_BRAIN_PATHS = ["api/src/prompts/pair/", "api/src/lib/pairInterpretation.ts", "api/src/lib/pairBrief.ts"];

/** GitHub's compare API lists at most this many files, with no further page; a full list may be missing the brain. */
export const COMPARE_FILE_CAP = 300;

export interface BrainDiff {
  brainChanged: boolean;
  pairChanged: boolean;
  files: string[];
}

/** Pure: which of the changed files are the brain's, and whether any is the pair's. */
export function brainDiff(changed: string[]): BrainDiff {
  const hit = (paths: string[]) => changed.filter((f) => paths.some((p) => (p.endsWith("/") ? f.startsWith(p) : f === p)));
  const files = hit(BRAIN_PATHS);
  return { brainChanged: files.length > 0, pairChanged: hit(PAIR_BRAIN_PATHS).length > 0, files };
}

export interface GithubApi {
  branchHead(branch: string): Promise<string | null>;
  /** null when the diff is too large for GitHub to list in full. */
  changedFiles(base: string, head: string): Promise<string[] | null>;
  fastForward(branch: string, sha: string, token: string): Promise<void>;
}

export type Fetcher = typeof fetch;

const headers = { accept: "application/vnd.github+json", "user-agent": "starsdecoded-release" };

export function githubApi(fetcher: Fetcher = fetch): GithubApi {
  return {
    async branchHead(branch) {
      const res = await fetcher(`${API}/repos/${REPO}/branches/${encodeURIComponent(branch)}`, { headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub ${res.status} reading ${branch}`);
      const body = (await res.json()) as { commit?: { sha?: string } };
      return body.commit?.sha ?? null;
    },
    async changedFiles(base, head) {
      const res = await fetcher(`${API}/repos/${REPO}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=250`, { headers });
      if (!res.ok) throw new Error(`GitHub ${res.status} comparing ${base}...${head}`);
      const body = (await res.json()) as { files?: Array<{ filename: string }> };
      const files = (body.files ?? []).map((f) => f.filename);
      return files.length >= COMPARE_FILE_CAP ? null : files;
    },
    async fastForward(branch, sha, token) {
      const res = await fetcher(`${API}/repos/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: "PATCH",
        headers: { ...headers, authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ sha, force: false }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GitHub ${res.status} fast-forwarding ${branch}: ${text.slice(0, 200)}`);
      }
    },
  };
}
