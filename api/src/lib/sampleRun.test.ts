/**
 * /sample's run from a passing Release, GitHub stubbed (ADR-247, reading 14): a pass pushes one file, Audrey Hepburn's
 * report with no foundation and no usage, on the release's own branch from the released commit; every skip says why,
 * and nothing throws, so a release never fails on /sample.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const { SAMPLE_CHART, pushSample, sampleBranch, sampleFile, samplePath, sampleRun } = await import("./sampleRun.js");
type FileCommit = import("./github.js").FileCommit;

const chart = chartFromFixture(SAMPLE_CHART);
installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "taurus", sunHouse: 4, sect: "night" }));
const audrey = await generateInterpretation(chart, "Audrey Hepburn");

const RELEASE = "0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c";
const SHA = "abcdef1234567890abcdef1234567890abcdef12";
const TOKEN = "github_pat_11ABCDEFG0123456789_secret";

function github(fail?: (input: FileCommit) => Error) {
  const pushed: Array<FileCommit & { token: string }> = [];
  return {
    pushed,
    commitFile: async (input: FileCommit, token: string) => {
      if (fail) throw fail(input);
      pushed.push({ ...input, token });
      return "c0ffee";
    },
  };
}

test("sampleRun: the natal output less its foundation and its usage, every other key where it stood", () => {
  assert.ok(audrey.foundation && audrey.meta.usage, "the engine's output carries both");
  const run = sampleRun(audrey)!;
  assert.equal("foundation" in run, false);
  assert.equal("usage" in (run.meta as object), false);
  const expected = JSON.parse(JSON.stringify(audrey)) as Record<string, unknown> & { meta: Record<string, unknown> };
  delete expected.foundation;
  delete expected.meta.usage;
  assert.equal(JSON.stringify(run), JSON.stringify(expected), "the same keys in the same order, as sample.test.ts digests them");
  assert.ok(audrey.foundation && audrey.meta.usage, "the lab's own output is left whole");
  assert.equal(sampleFile(run), `${JSON.stringify(expected, null, 2)}\n`);
  for (const other of [null, "text", [], {}, { meta: null }, { meta: { reportType: "synastry" } }]) assert.equal(sampleRun(other), null);
});

test("a pass pushes one file, Audrey Hepburn's report with no foundation and no usage, on sample/<release-id> from the released commit", async () => {
  const gh = github();
  const reads: string[] = [];
  const line = await pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: TOKEN, github: gh, read: async (label) => { reads.push(label); return audrey; } });
  assert.deepEqual(reads, ["release-abcdef1"]);
  assert.equal(gh.pushed.length, 1);
  const [push] = gh.pushed;
  assert.equal(push.branch, `sample/${RELEASE}`);
  assert.equal(push.branch, sampleBranch(RELEASE));
  assert.equal(push.path, `web/src/site/data/sample/audrey-hepburn.${RELEASE}.json`);
  assert.equal(push.path, samplePath(RELEASE));
  assert.equal(push.parent, SHA);
  assert.equal(push.token, TOKEN);
  const file = JSON.parse(push.content) as Record<string, unknown> & { meta: Record<string, unknown> };
  assert.equal("foundation" in file, false, "no foundation");
  assert.equal("usage" in file.meta, false, "no usage");
  assert.equal(file.meta.generatedAt, audrey.meta.generatedAt);
  assert.deepEqual(file.overview, JSON.parse(JSON.stringify(audrey.overview)));
  assert.ok(push.content.endsWith("}\n"));
  assert.ok(!push.message.includes(TOKEN) && !push.content.includes(TOKEN));
  assert.equal(line, `/sample: pushed web/src/site/data/sample/audrey-hepburn.${RELEASE}.json on sample/${RELEASE}, from release-abcdef1`);
});

test("a skip records why and pushes nothing: no lab ran, no token, a lab that kept no run", async () => {
  const gh = github();
  const read = async (label: string) => (label === "release-0ld0000" ? null : audrey);
  const lines = await Promise.all([
    pushSample({ releaseId: RELEASE, sha: SHA, label: null, token: TOKEN, github: gh, read }),
    pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: undefined, github: gh, read }),
    pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: "", github: gh, read }),
    pushSample({ releaseId: RELEASE, sha: SHA, label: "release-0ld0000", token: TOKEN, github: gh, read }),
    pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: TOKEN, github: gh, read: async () => ({ meta: { reportType: "synastry" } }) }),
  ]);
  assert.deepEqual(lines, [
    "/sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run",
    "/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with",
    "/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with",
    "/sample: skipped, release-0ld0000 kept no audrey-hepburn run",
    "/sample: skipped, release-abcdef1 kept no audrey-hepburn run",
  ]);
  assert.equal(gh.pushed.length, 0);
});

test("a GitHub refusal or a failed read is a line, never a throw, and the line never carries the token", async () => {
  const refused = github((input) => new Error(`GitHub 422 creating ${input.branch}: Reference already exists, auth ${TOKEN}`));
  const line = await pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: TOKEN, github: refused, read: async () => audrey });
  assert.equal(line, `/sample: not pushed, GitHub 422 creating sample/${RELEASE}: Reference already exists, auth [token]`);
  const unread = await pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: TOKEN, github: github(), read: async () => { throw new Error("connection terminated"); } });
  assert.equal(unread, "/sample: not pushed, connection terminated");
});
