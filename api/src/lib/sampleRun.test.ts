/**
 * The sample branch a passing Release leaves, GitHub stubbed (ADR-247, ADR-250, readings 14 and 22): one commit carries
 * Audrey Hepburn's report with no foundation and no usage, and Mira's week moved to the Monday after the release, on
 * the release's own branch from the released commit; every skip says why, and nothing throws, so a release never fails
 * on either. Mira's week is the engine's own: the committed file is recomputed here, and MIRA_WEEK=write rewrites it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CYCLE_WORDS, KNOWN_AGES } from "@workspace/engine";
import { chartFromFixture } from "./testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "./testModel.js";

const { generateInterpretation } = await import("./aiInterpretation.js");
const {
  MIRA_BODIES, MIRA_DAYS, MIRA_FIXTURE, MIRA_WEEK_PATH, SAMPLE_CHART, liveMira, miraWeek, miraWeekFile, mondayAfter, pushSample,
  sampleBranch, sampleFile, samplePath, sampleRun,
} = await import("./sampleRun.js");
type FileCommit = import("./github.js").FileCommit;
type MiraBirth = import("./sampleRun.js").MiraBirth;
type MiraSource = import("./sampleRun.js").MiraSource;
type MiraWeek = import("./sampleRun.js").MiraWeek;

const chart = chartFromFixture(SAMPLE_CHART);
installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "taurus", sunHouse: 4, sect: "night" }));
const audrey = await generateInterpretation(chart, "Audrey Hepburn");

const RELEASE = "0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c";
const SHA = "abcdef1234567890abcdef1234567890abcdef12";
const TOKEN = "github_pat_11ABCDEFG0123456789_secret";
/** A Wednesday: Mira's week moves to the Monday after it. */
const AT = new Date("2026-10-07T10:00:00Z");
const MONDAY = "2026-10-12";
const RUN_PATH = samplePath(RELEASE);
const MIRA_PUSHED = `Mira's week: pushed ${MIRA_WEEK_PATH} on sample/${RELEASE}, the week of ${MONDAY}`;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
/** The first week the page shows (reading 22), for a file not written yet. */
const FIRST_WEEK = "2026-10-05";

const miraText = (monday: string) => `{"week":"${monday}"}\n`;
function mira(over: Partial<MiraSource> = {}): MiraSource & { asked: string[] } {
  const asked: string[] = [];
  return { asked, week: async (monday) => { asked.push(monday); return miraText(monday); }, current: async () => null, ...over };
}

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

const push = (over: Partial<Parameters<typeof pushSample>[0]> = {}) =>
  pushSample({ releaseId: RELEASE, sha: SHA, label: "release-abcdef1", token: TOKEN, github: github(), read: async () => audrey, at: AT, mira: mira(), ...over });

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

test("a pass pushes one commit, Audrey Hepburn's report with no foundation and no usage and Mira's week, on sample/<release-id> from the released commit", async () => {
  const gh = github();
  const reads: string[] = [];
  const week = mira();
  const line = await push({ github: gh, read: async (label) => { reads.push(label); return audrey; }, mira: week });
  assert.deepEqual(reads, ["release-abcdef1"]);
  assert.deepEqual(week.asked, [MONDAY], "the Monday after the release");
  assert.equal(gh.pushed.length, 1, "one commit");
  const [commit] = gh.pushed;
  assert.equal(commit.branch, `sample/${RELEASE}`);
  assert.equal(commit.branch, sampleBranch(RELEASE));
  assert.deepEqual(commit.files.map((f) => f.path), [`web/src/site/data/sample/audrey-hepburn.${RELEASE}.json`, MIRA_WEEK_PATH]);
  assert.equal(commit.files[0].path, RUN_PATH);
  assert.equal(commit.parent, SHA);
  assert.equal(commit.token, TOKEN);
  const file = JSON.parse(commit.files[0].content) as Record<string, unknown> & { meta: Record<string, unknown> };
  assert.equal("foundation" in file, false, "no foundation");
  assert.equal("usage" in file.meta, false, "no usage");
  assert.equal(file.meta.generatedAt, audrey.meta.generatedAt);
  assert.deepEqual(file.overview, JSON.parse(JSON.stringify(audrey.overview)));
  assert.ok(commit.files[0].content.endsWith("}\n"));
  assert.equal(commit.files[1].content, miraText(MONDAY));
  assert.ok(!commit.message.includes(TOKEN) && commit.files.every((f) => !f.content.includes(TOKEN)));
  assert.equal(line, `/sample: pushed web/src/site/data/sample/audrey-hepburn.${RELEASE}.json on sample/${RELEASE}, from release-abcdef1; ${MIRA_PUSHED}`);
});

test("a skip records why: no lab ran, no token, a lab that kept no run; with a token, Mira's week still moves alone", async () => {
  const gh = github();
  const read = async (label: string) => (label === "release-0ld0000" ? null : audrey);
  const lines = await Promise.all([
    push({ label: null, github: gh, read }),
    push({ token: undefined, github: gh, read }),
    push({ token: "", github: gh, read }),
    push({ label: "release-0ld0000", github: gh, read }),
    push({ github: gh, read: async () => ({ meta: { reportType: "synastry" } }) }),
  ]);
  assert.deepEqual(lines, [
    `/sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; ${MIRA_PUSHED}`,
    "/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with; Mira's week: skipped, no GITHUB_RELEASE_TOKEN to push it with",
    "/sample: skipped, no GITHUB_RELEASE_TOKEN to push it with; Mira's week: skipped, no GITHUB_RELEASE_TOKEN to push it with",
    `/sample: skipped, release-0ld0000 kept no audrey-hepburn run; ${MIRA_PUSHED}`,
    `/sample: skipped, release-abcdef1 kept no audrey-hepburn run; ${MIRA_PUSHED}`,
  ]);
  assert.equal(gh.pushed.length, 3);
  assert.ok(gh.pushed.every((c) => c.files.length === 1 && c.files[0].path === MIRA_WEEK_PATH), "no run, only the week");
  assert.ok(gh.pushed.every((c) => /^Mira's week from release /.test(c.message)));
});

test("the week is the Monday after the release's UTC day, never that day itself", () => {
  const cases: Array<[string, string]> = [
    ["2026-10-07T10:00:00Z", "2026-10-12"],
    ["2026-10-05T00:00:00Z", "2026-10-12"],
    ["2026-10-05T23:59:00Z", "2026-10-12"],
    ["2026-10-11T23:59:00Z", "2026-10-12"],
    ["2026-10-10T12:00:00Z", "2026-10-12"],
    ["2026-12-29T09:00:00Z", "2027-01-04"],
    ["2028-02-28T09:00:00Z", "2028-03-06"],
  ];
  for (const [at, monday] of cases) assert.equal(mondayAfter(new Date(at)), monday, at);
});

test("an unchanged week is not pushed again; with no run either there is no commit at all", async () => {
  const gh = github();
  const same = mira({ current: async () => miraText(MONDAY) });
  const alone = await push({ label: null, github: gh, mira: same });
  assert.equal(alone, `/sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; Mira's week: unchanged, the week of ${MONDAY} is already on abcdef1`);
  assert.equal(gh.pushed.length, 0, "nothing to commit, no branch");
  const withRun = await push({ github: gh, mira: same });
  assert.equal(withRun, `/sample: pushed ${RUN_PATH} on sample/${RELEASE}, from release-abcdef1; Mira's week: unchanged, the week of ${MONDAY} is already on abcdef1`);
  assert.deepEqual(gh.pushed.map((c) => c.files.map((f) => f.path)), [[RUN_PATH]]);
  assert.match(gh.pushed[0].message, /^\/sample: Audrey Hepburn's run from release /);
  const unread = await push({ label: null, github: gh, mira: mira({ current: async () => { throw new Error("EACCES"); } }) });
  assert.equal(unread, `/sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; ${MIRA_PUSHED}`, "a file it cannot read is pushed, not taken as the same");
});

test("a GitHub refusal or a failed read is a line, never a throw, and the line never carries the token; one file's failure leaves the other", async () => {
  const refused = github((input) => new Error(`GitHub 422 creating ${input.branch}: Reference already exists, auth ${TOKEN}`));
  const line = await push({ github: refused });
  assert.equal(line, `/sample: not pushed, GitHub 422 creating sample/${RELEASE}: Reference already exists, auth [token]; Mira's week: not pushed, GitHub 422 creating sample/${RELEASE}: Reference already exists, auth [token]`);
  const gh = github();
  const unread = await push({ github: gh, read: async () => { throw new Error("connection terminated"); } });
  assert.equal(unread, `/sample: not pushed, connection terminated; ${MIRA_PUSHED}`);
  const uncomputed = await push({ github: gh, mira: mira({ week: async () => { throw new Error(`no ${MIRA_FIXTURE} beside the process ${TOKEN}`); } }) });
  assert.equal(uncomputed, `/sample: pushed ${RUN_PATH} on sample/${RELEASE}, from release-abcdef1; Mira's week: not pushed, no ${MIRA_FIXTURE} beside the process [token]`);
  assert.deepEqual(gh.pushed.map((c) => c.files.map((f) => f.path)), [[MIRA_WEEK_PATH], [RUN_PATH]]);
});

const { githubApi } = await import("./github.js");

test("only the top-level foundation and meta.usage go: every other meta key stays, a foundation key inside a section stays, and the input is never touched", () => {
  const output = {
    meta: { reportType: "natal", promptVersion: "v9", model: "mixed", usage: { costUsd: 0.03 }, wordCount: 4200 },
    foundation: { chartThesis: "internal" },
    overview: { headline: "Depth over display.", foundation: "a field of the same name, not the handoff" },
  };
  const before = JSON.stringify(output);
  assert.deepEqual(sampleRun(output), {
    meta: { reportType: "natal", promptVersion: "v9", model: "mixed", wordCount: 4200 },
    overview: { headline: "Depth over display.", foundation: "a field of the same name, not the handoff" },
  });
  assert.equal(JSON.stringify(output), before, "the lab's own row is left whole");
  assert.deepEqual(sampleRun({ meta: { reportType: "natal" }, overview: {} }), { meta: { reportType: "natal" }, overview: {} }, "a run with neither is cut of nothing");
  for (const other of [undefined, 0, { meta: [] }, { meta: { reportType: "Natal" } }, { meta: { reportType: "compatibility" } }, { reportType: "natal" }]) {
    assert.equal(sampleRun(other), null, JSON.stringify(other));
  }
});

test("the branch and both files a release id names pass GitHub's own guards, through the real client on a stubbed fetch", async () => {
  const sent: Array<{ method: string; path: string; body: unknown }> = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const path = url.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\//, "");
    sent.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === "GET") return Response.json({ sha: SHA, tree: { sha: "tree-0" } });
    return Response.json({ sha: `${path}-sha-${sent.length}` }, { status: 201 });
  }) as unknown as typeof fetch;
  const line = await push({ github: githubApi(fetcher) });
  assert.equal(line, `/sample: pushed ${samplePath(RELEASE)} on ${sampleBranch(RELEASE)}, from release-abcdef1; ${MIRA_PUSHED}`);
  assert.deepEqual(sent.map((s) => `${s.method} ${s.path}`), [`GET git/commits/${SHA}`, "POST git/blobs", "POST git/blobs", "POST git/trees", "POST git/commits", "POST git/refs"]);
  const blob = JSON.parse((sent[1].body as { content: string }).content) as Record<string, unknown> & { meta: Record<string, unknown> };
  assert.equal("foundation" in blob, false);
  assert.equal("usage" in blob.meta, false);
  assert.equal((sent[2].body as { content: string }).content, miraText(MONDAY));
  assert.deepEqual((sent[3].body as { tree: Array<{ path: string }> }).tree.map((t) => t.path), [RUN_PATH, MIRA_WEEK_PATH]);
  assert.deepEqual(sent[5].body, { ref: `refs/heads/sample/${RELEASE}`, sha: "git/commits-sha-5" });
});

test("a release id GitHub's guard refuses is a line naming the refusal for each file, and nothing leaves", async () => {
  let sent = 0;
  const fetcher = (async () => { sent += 1; return Response.json({ sha: "x" }); }) as unknown as typeof fetch;
  for (const releaseId of ["../main", "a/b", "x y", ""]) {
    const line = await push({ releaseId, github: githubApi(fetcher) });
    assert.match(line, /^\/sample: not pushed, refused to write .*; Mira's week: not pushed, refused to write /, releaseId);
  }
  assert.equal(sent, 0);
});

test("a thrown value that is not an Error is still a line, the token cut from it; nothing is read or computed with no token or no lab", async () => {
  const odd = github(() => { throw `stub threw ${TOKEN}`; });
  assert.equal(await push({ github: odd }), "/sample: not pushed, stub threw [token]; Mira's week: not pushed, stub threw [token]");
  let reads = 0;
  const read = async () => { reads += 1; return audrey; };
  const week = mira();
  await push({ label: null, read, mira: week });
  assert.equal(reads, 0, "no lab, no read");
  await push({ token: undefined, read, mira: week });
  assert.equal(reads, 0, "no token, no read");
  assert.deepEqual(week.asked, [MONDAY], "the week is computed only where it can be pushed");
});

test("the commit message names the release, the label, the week and the short sha, and never the token", async () => {
  const gh = github();
  await push({ github: gh });
  const [commit] = gh.pushed;
  assert.match(commit.message, new RegExp(`^/sample and Mira's week from release ${RELEASE}\n\n`));
  assert.match(commit.message, /release-abcdef1 run at abcdef1,/);
  assert.match(commit.message, /ADR-247/);
  assert.match(commit.message, new RegExp(`Mira's week: the week of ${MONDAY}, computed by the engine at abcdef1 \\(ADR-250\\)\\.$`));
  assert.ok(!commit.message.includes(TOKEN));
});

const birth = JSON.parse(readFileSync(join(ROOT, MIRA_FIXTURE), "utf8")) as MiraBirth;
const fresh = miraWeek(FIRST_WEEK, birth);
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

test("Mira's week is the engine's, from her fixture: six months of Mars to Pluto, the contacts with their days, her known ages, waves and the finder's answer", () => {
  assert.equal(fresh.week, FIRST_WEEK);
  assert.equal(fresh.zone, "Europe/Lisbon");
  assert.equal(fresh.age, 35, "born March 1991");
  assert.deepEqual(fresh.points.map((p) => p.body), ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]);
  assert.ok(fresh.angles && fresh.angles.ascendant > 0, "a drawn chart has angles");
  assert.deepEqual(fresh.sky.map((s) => s.body), [...MIRA_BODIES]);
  for (const s of fresh.sky) {
    assert.equal(s.lon.length, MIRA_DAYS, s.body);
    assert.ok(s.lon.every((lon) => lon >= 0 && lon <= 360), s.body);
    assert.ok(s.retrograde.every(([a, b]) => a <= b && a >= 0 && b < MIRA_DAYS), s.body);
  }
  assert.ok(fresh.contacts.length > 0, "slow planets touch her chart in six months");
  for (const c of fresh.contacts) {
    assert.ok(c.headline && c.facts.sky, c.key);
    assert.ok(c.start <= c.end, c.key);
    assert.ok(c.runs.length > 0, `${c.key} holds days`);
    // Her days are Lisbon's, the window's ends UTC instants: a day either side at most.
    for (const [from, to] of c.runs) assert.ok(from <= to && days(c.start.slice(0, 10), from) >= -1 && days(to, c.end.slice(0, 10)) >= -1, `${c.key}: ${from} to ${to}`);
    for (const day of c.exact) assert.ok(c.runs.some(([from, to]) => from <= day && day <= to), `${c.key}: exact on ${day} inside a run`);
  }
  const known = new Set<string>(KNOWN_AGES.map((a) => a.id));
  assert.ok(fresh.cycles.length > 0 && fresh.cycles.every((c) => known.has(c.id)), "the four known ages' cycles alone");
  for (const c of [...fresh.cycles, ...fresh.finder.cycles]) {
    assert.equal(c.name, CYCLE_WORDS[c.id].name);
    assert.equal(c.word, CYCLE_WORDS[c.id].word);
    assert.equal(c.passes, c.exact.length);
  }
  assert.deepEqual(fresh.ages.map((a) => a.id), KNOWN_AGES.map((a) => a.id));
  assert.ok(fresh.ages.every((a) => a.progress >= 0 && a.progress < 1));
  assert.deepEqual(fresh.waves.map((w) => [w.body, w.distances.length]), [["jupiter", 1081], ["saturn", 1081]]);
  assert.ok(fresh.finder.cycles.every((c) => known.has(c.id)));
  assert.deepEqual(fresh.finder.rounds.map((r) => r.id), KNOWN_AGES.map((a) => a.id));
  assert.ok(fresh.finder.rounds.every((r) => r.progress >= 0 && r.progress < 1));
  const saturn = fresh.finder.cycles.filter((c) => c.id === "saturn-return").map((c) => c.start.slice(0, 7));
  const full = fresh.cycles.filter((c) => c.id === "saturn-return").map((c) => c.start.slice(0, 7));
  assert.deepEqual(saturn, full, "midday on her birth date gives her Saturn returns to the month");
  assert.throws(() => miraWeek("2026-10-06", birth), /not a Monday/);
});

/** Equal, or within what a last floating digit on another machine could move: a hundredth of a degree, two minutes. */
function near(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === "number" && typeof actual === "number") {
    assert.ok(Math.abs(actual - expected) <= 0.0101, `${path}: ${actual} against ${expected}`);
  } else if (typeof expected === "string" && typeof actual === "string" && /^\d{4}-\d{2}-\d{2}T/.test(expected)) {
    assert.ok(Math.abs(Date.parse(actual) - Date.parse(expected)) <= 120_000, `${path}: ${actual} against ${expected}`);
  } else if (Array.isArray(expected) && Array.isArray(actual)) {
    assert.equal(actual.length, expected.length, `${path}: length`);
    expected.forEach((item, i) => near(actual[i], item, `${path}[${i}]`));
  } else if (expected && typeof expected === "object" && actual && typeof actual === "object") {
    assert.deepEqual(Object.keys(actual), Object.keys(expected), `${path}: keys`);
    for (const key of Object.keys(expected)) near((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], `${path}.${key}`);
  } else {
    assert.deepEqual(actual, expected, path);
  }
}

test("the committed mira-week.json is the engine's own for its week, never typed: after an engine change, MIRA_WEEK=write rewrites it", async () => {
  const file = join(ROOT, MIRA_WEEK_PATH);
  const committed = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as MiraWeek) : null;
  const week = committed?.week ?? FIRST_WEEK;
  const now = week === FIRST_WEEK ? fresh : miraWeek(week, birth);
  if (process.env.MIRA_WEEK === "write") writeFileSync(file, miraWeekFile(now));
  assert.ok(existsSync(file), `${MIRA_WEEK_PATH} is missing: run this test with MIRA_WEEK=write`);
  const text = readFileSync(file, "utf8");
  near(JSON.parse(text), JSON.parse(JSON.stringify(now)), "mira-week");
  assert.equal(await liveMira.current(), text, "the live source reads the committed file");
  assert.equal(await liveMira.week(week), miraWeekFile(now), "and computes the week from her fixture");
});
