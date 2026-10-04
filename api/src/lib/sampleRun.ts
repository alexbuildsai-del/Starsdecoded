/**
 * /sample's run from a passing Release (ADR-223, ADR-247; MB-182, reading 14). The release lab keeps Audrey Hepburn's
 * natal report whole; once production has moved, the report less its foundation (the model's internal handoff, never
 * shown) and its usage is committed as one file on a new `sample/<release-id>` branch from the released commit, and the
 * session opens the pull request that points /sample at it. No key leaves Railway and no one carries a file. Nothing
 * here fails a release: every outcome, a skip and its reason included, is one line in the forward step's detail.
 */
import type { GithubApi } from "./github.js";

/** The chart /sample shows (ADR-119), one of the five the release lab writes. */
export const SAMPLE_CHART = "audrey-hepburn";

const SAMPLE_DIR = "web/src/site/data/sample";

export function sampleBranch(releaseId: string): string {
  return `sample/${releaseId}`;
}

export function samplePath(releaseId: string): string {
  return `${SAMPLE_DIR}/${SAMPLE_CHART}.${releaseId}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The report as /sample commits it: the natal output less `foundation` and `meta.usage`, every other key where it
 * stood, as r06's run was cut (`sample.test.ts` digests it the same way). Null for anything that is not a natal report.
 */
export function sampleRun(output: unknown): Record<string, unknown> | null {
  if (!isRecord(output) || !isRecord(output.meta) || output.meta.reportType !== "natal") return null;
  const run = structuredClone(output);
  delete run.foundation;
  delete (run.meta as Record<string, unknown>).usage;
  return run;
}

/** Two-space JSON and a closing newline, as the committed sample is written. */
export function sampleFile(run: Record<string, unknown>): string {
  return `${JSON.stringify(run, null, 2)}\n`;
}

export interface SamplePush {
  releaseId: string;
  /** The released commit, where the new branch starts. */
  sha: string;
  /** The label whose lab wrote this release's reports, its own or the reused one's; null when no lab ran. */
  label: string | null;
  token: string | undefined;
  github: Pick<GithubApi, "commitFile">;
  /** The sample chart's whole natal output under a label, or null when that lab kept none. */
  read: (label: string) => Promise<unknown>;
}

/** Pushes /sample's run and says in one line what happened; never throws, so a release never fails on it. */
export async function pushSample(input: SamplePush): Promise<string> {
  const token = input.token;
  // The line is stored on the release and shown in the admin, so a token GitHub or a stub echoes is cut by its value.
  const line = (text: string) => `/sample: ${token ? text.split(token).join("[token]") : text}`;
  if (!input.label) return line("skipped, no lab ran for this release (the brain is unchanged), so there is no new run");
  if (!token) return line("skipped, no GITHUB_RELEASE_TOKEN to push it with");
  try {
    const run = sampleRun(await input.read(input.label));
    if (!run) return line(`skipped, ${input.label} kept no ${SAMPLE_CHART} run`);
    const branch = sampleBranch(input.releaseId);
    const path = samplePath(input.releaseId);
    await input.github.commitFile({
      branch, parent: input.sha, path, content: sampleFile(run),
      message: `/sample: Audrey Hepburn's run from release ${input.releaseId}\n\nThe release lab's ${input.label} run at ${input.sha.slice(0, 7)}, less its foundation and usage (ADR-247).`,
    }, token);
    return line(`pushed ${path} on ${branch}, from ${input.label}`);
  } catch (err) {
    return line(`not pushed, ${err instanceof Error ? err.message : String(err)}`);
  }
}
