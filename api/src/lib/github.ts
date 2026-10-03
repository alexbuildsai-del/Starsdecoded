/**
 * What the release needs from GitHub (ADR-86, MB-75, ADR-247). Read from the public API with no token: what
 * production and main are at, and which brain files differ. Written with the token Railway staging holds, and only
 * twice: the fast-forward of `production` (a PATCH on its ref, never forced) and /sample's run on a new
 * `sample/<release-id>` branch (the Git data API: a blob, a tree, a commit, then the ref). Each write checks its ref
 * before any request. A message built from GitHub's answer or the network's error ends up in the release's record and
 * the log, so the token's value is cut from it, and no error carries the request or its headers (R14-14: by name and by
 * value, never by where a field sits).
 */
export const REPO = "alexbuildsai-del/Starsdecoded";
const API = "https://api.github.com";

/** The brain: what decides the words (R-4.4). */
export const BRAIN_PATHS = ["api/src/prompts/", "api/src/lib/models.ts", "api/src/lib/aiInterpretation.ts", "api/src/lib/traditional.ts", "api/src/lib/chartCalculation.ts", "packages/engine/"];
/** The pair brain: a change here adds one pair to the release lab. */
export const PAIR_BRAIN_PATHS = ["api/src/prompts/pair/", "api/src/lib/pairInterpretation.ts", "api/src/lib/pairBrief.ts"];

/** GitHub's compare API lists at most this many files, with no further page; a full list may be missing the brain. */
export const COMPARE_FILE_CAP = 300;

/** The one branch the token moves, and only forward. */
export const RELEASE_BRANCH = "production";
/** The only refs the token creates: one branch per release under sample/, named by the release's id. */
export const SAMPLE_REF = /^refs\/heads\/sample\/[A-Za-z0-9][A-Za-z0-9-]*$/;
/** The only file such a branch adds: /sample's run, one JSON file in its folder. */
export const SAMPLE_FILE = /^web\/src\/site\/data\/sample\/[A-Za-z0-9][A-Za-z0-9.-]*\.json$/;

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

export interface FileCommit {
  /** The new branch, `sample/<release-id>`; one that exists already is GitHub's 422, never overwritten. */
  branch: string;
  /** The commit the branch starts from. */
  parent: string;
  path: string;
  content: string;
  message: string;
}

export interface GithubApi {
  branchHead(branch: string): Promise<string | null>;
  /** null when GitHub does not list the diff in full. */
  changedFiles(base: string, head: string): Promise<string[] | null>;
  fastForward(branch: string, sha: string, token: string): Promise<void>;
  /** One file on top of `parent`, then a new branch at that commit; answers the commit's sha. */
  commitFile(input: FileCommit, token: string): Promise<string>;
}

export type Fetcher = typeof fetch;

const headers = { accept: "application/vnd.github+json", "user-agent": "starsdecoded-release" };

function withoutToken(text: string, token: string): string {
  return token ? text.split(token).join("[token]") : text;
}

/** A sha GitHub answered with; a reply without one would only fail later, further from its cause. */
function shaOf(body: { sha?: unknown } | undefined, doing: string): string {
  if (typeof body?.sha !== "string" || !body.sha) throw new Error(`GitHub answered with no sha ${doing}`);
  return body.sha;
}

async function authed<T>(fetcher: Fetcher, token: string, method: string, path: string, doing: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetcher(`${API}/repos/${REPO}/${path}`, {
      method,
      headers: { ...headers, authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (err) {
    // A new error, not the network's with it as the cause: the cause is where a request's headers could ride along.
    throw new Error(withoutToken(`GitHub did not answer ${doing}: ${err instanceof Error ? err.message : String(err)}`, token));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${doing}: ${withoutToken(text, token).slice(0, 200)}`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

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
      if (!body.files) return null;
      const files = body.files.map((f) => f.filename);
      return files.length >= COMPARE_FILE_CAP ? null : files;
    },
    async fastForward(branch, sha, token) {
      if (branch !== RELEASE_BRANCH) throw new Error(`refused to move ${branch}: the release token moves ${RELEASE_BRANCH} alone`);
      await authed(fetcher, token, "PATCH", `git/refs/heads/${encodeURIComponent(branch)}`, `fast-forwarding ${branch}`, { sha, force: false });
    },
    async commitFile(input, token) {
      const ref = `refs/heads/${input.branch}`;
      if (!SAMPLE_REF.test(ref)) throw new Error(`refused to write ${ref}: the release token creates sample/<release-id> branches alone (ADR-247)`);
      if (!SAMPLE_FILE.test(input.path)) throw new Error(`refused to write ${input.path}: a sample branch carries /sample's run alone`);
      const parent = await authed<{ tree?: { sha?: string } }>(fetcher, token, "GET", `git/commits/${encodeURIComponent(input.parent)}`, `reading ${input.parent.slice(0, 7)}`);
      const blob = await authed<{ sha?: string }>(fetcher, token, "POST", "git/blobs", `writing ${input.path}`, { content: input.content, encoding: "utf-8" });
      const tree = await authed<{ sha?: string }>(fetcher, token, "POST", "git/trees", "writing the tree", {
        base_tree: shaOf(parent.tree, `reading ${input.parent.slice(0, 7)}`),
        tree: [{ path: input.path, mode: "100644", type: "blob", sha: shaOf(blob, `writing ${input.path}`) }],
      });
      const commit = shaOf(await authed<{ sha?: string }>(fetcher, token, "POST", "git/commits", "writing the commit", {
        message: input.message, tree: shaOf(tree, "writing the tree"), parents: [input.parent],
      }), "writing the commit");
      await authed(fetcher, token, "POST", "git/refs", `creating ${input.branch}`, { ref, sha: commit });
      return commit;
    },
  };
}
