/**
 * The sample branch and Mira's week at their edges (R16-05, ADR-247, ADR-250, readings 14 and 22): the Monday a release
 * moves the week to, every date a week could be asked for, the file's format kept so an unchanged week is not pushed
 * again, the week's changes counted as its sentence counts them, what each outcome says when both files fail or one
 * skips, and a process that runs outside the checkout. GitHub is stubbed; nothing here calls the model.
 * `sampleRun.test.ts` recomputes the committed file and drives the push end to end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { weekSentence, type ContactEvent } from "@workspace/engine";
import { SAMPLE_FILE, SAMPLE_REF, type FileCommit } from "./github.js";
import {
  MIRA_DAYS, MIRA_FIXTURE, MIRA_WEEK_PATH, SAMPLE_CHART, liveMira, miraWeek, miraWeekFile, mondayAfter, pushSample, sampleBranch,
  samplePath, sampleRun, type MiraBirth, type MiraSource, type MiraWeek,
} from "./sampleRun.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const birth = JSON.parse(readFileSync(join(ROOT, MIRA_FIXTURE), "utf8")) as MiraBirth;
const week = miraWeek("2026-10-05", birth);

const RELEASE = "0b9e7c1a-2f4d-4e8a-9c3b-5d6e7f8a9b0c";
const SHA = "abcdef1234567890abcdef1234567890abcdef12";
const TOKEN = "github_pat_11ABCDEFG0123456789_secret";
const AT = new Date("2026-10-07T10:00:00Z");
const MONDAY = "2026-10-12";
const DAY_MS = 86_400_000;

test("the branch, the run's file and Mira's file are the names GitHub's guards admit, for a release id as the release makes one", () => {
  for (const id of [RELEASE, "00000000-0000-4000-8000-000000000000", "a", "R16-final"]) {
    assert.ok(SAMPLE_REF.test(`refs/heads/${sampleBranch(id)}`), id);
    assert.ok(SAMPLE_FILE.test(samplePath(id)), id);
  }
  assert.ok(SAMPLE_FILE.test(MIRA_WEEK_PATH));
  assert.equal(MIRA_WEEK_PATH, "web/src/site/data/timeline/mira-week.json");
  assert.equal(samplePath(RELEASE), `web/src/site/data/sample/${SAMPLE_CHART}.${RELEASE}.json`);
  assert.equal(sampleBranch(RELEASE), `sample/${RELEASE}`);
  assert.ok(readFileSync(join(ROOT, MIRA_FIXTURE), "utf8").length > 50, "her fixture is where the live source reads it");
});

test("mondayAfter is always a Monday, always after the day itself, never more than a week on, whatever the hour or the zone it was written in", () => {
  const start = Date.UTC(2026, 0, 1);
  for (let i = 0; i < 800; i++) {
    const day = new Date(start + i * DAY_MS);
    for (const [h, m, s, ms] of [[0, 0, 0, 0], [12, 0, 0, 0], [23, 59, 59, 999]]) {
      const at = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m, s, ms));
      const monday = mondayAfter(at);
      const days = (Date.parse(monday) - Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())) / DAY_MS;
      assert.equal(new Date(`${monday}T12:00:00Z`).getUTCDay(), 1, `${at.toISOString()} -> ${monday}`);
      assert.ok(days >= 1 && days <= 7, `${at.toISOString()} -> ${monday} is ${days} days on`);
    }
  }
  // The release's UTC day decides, not the zone the instant was written in.
  assert.equal(mondayAfter(new Date("2026-10-05T23:30:00-05:00")), "2026-10-12", "Tuesday 04:30 UTC");
  assert.equal(mondayAfter(new Date("2026-10-06T00:30:00+05:00")), "2026-10-12", "Monday 19:30 UTC");
  assert.equal(mondayAfter(new Date("2026-10-04T23:59:59.999Z")), "2026-10-05", "a Sunday's last millisecond: the Monday next");
  assert.equal(mondayAfter(new Date("2026-10-05T00:00:00.000Z")), "2026-10-12", "a Monday's first: a week on");
  assert.equal(mondayAfter(new Date("2024-02-28T10:00:00Z")), "2024-03-04", "across a leap day");
  assert.equal(mondayAfter(new Date("2026-12-31T10:00:00Z")), "2027-01-04", "across a year");
});

test("a week can only be asked for by a real Monday: a Tuesday, a malformed day and a date the calendar does not have are refused", () => {
  for (const bad of ["2026-10-06", "2026-10-04", "2026-10-5", "26-10-05", "2026/10/05", "2026-13-01", "2026-00-10", "", "Monday", "2026-10-05T00:00:00Z", " 2026-10-05"]) {
    assert.throws(() => miraWeek(bad, birth), /is not a Monday$/, JSON.stringify(bad));
  }
});

test("a date the calendar does not have is refused even where rolling it over lands on a Monday (2026-02-30 is 2 March)", () => {
  assert.equal(new Date("2026-03-02T12:00:00Z").getUTCDay(), 1, "the day it rolls over to is a Monday");
  assert.throws(() => miraWeek("2026-02-30", birth), /is not a Monday$|not a (calendar )?date|not a real day/);
  assert.throws(() => miraWeek("2026-02-31", birth));
});

test("any Monday gives the same shape: its own week, six months of six planets, and the changes and the next three inside their days", () => {
  for (const monday of ["2026-10-26", "2027-01-04", "2027-03-29", "2028-02-28"]) {
    const w = miraWeek(monday, birth);
    assert.equal(w.week, monday);
    assert.equal(w.zone, "Europe/Lisbon");
    assert.deepEqual(w.sky.map((s) => s.lon.length), Array(6).fill(MIRA_DAYS), monday);
    const sunday = new Date(Date.parse(monday) + 7 * DAY_MS).toISOString().slice(0, 10);
    for (const c of w.changes) assert.ok(c.day >= monday && c.day <= sunday, `${monday}: ${c.key} ${c.day}`);
    const last = new Date(Date.parse(monday) + MIRA_DAYS * DAY_MS).toISOString().slice(0, 10);
    assert.ok(w.next.length <= 3);
    for (const c of w.next) assert.ok(c.day > monday && c.day <= last, `${monday}: next ${c.key} ${c.day}`);
    assert.deepEqual(w.next.map((c) => c.day), [...w.next.map((c) => c.day)].sort());
    assert.match(w.sentence, /^[A-Z]/);
    assert.ok(w.contacts.every((c) => c.runs.length > 0), monday);
  }
});

test("the same Monday gives the same week every time, and a week later moves the days and the progress, not the birth", () => {
  const again = miraWeek("2026-10-05", birth);
  assert.equal(miraWeekFile(again), miraWeekFile(week));
  const later = miraWeek("2026-10-12", birth);
  assert.equal(later.born, week.born);
  assert.deepEqual(later.points, week.points);
  assert.deepEqual(later.angles, week.angles);
  assert.deepEqual(later.waves, week.waves);
  assert.notDeepEqual(later.sky[0].lon, week.sky[0].lon);
  assert.deepEqual(later.sky[0].lon.slice(0, MIRA_DAYS - 7), week.sky[0].lon.slice(7), "the same sky, seven days on");
  assert.deepEqual(later.cycles, week.cycles);
});

test("the file is JSON a person can diff: one line for each point, body, contact and cycle, a newline at the end, and the same bytes when read and written again", () => {
  const text = miraWeekFile(week);
  assert.ok(text.endsWith("}\n") && !text.endsWith("\n\n"));
  assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(week)));
  assert.equal(miraWeekFile(JSON.parse(text) as MiraWeek), text, "writing what was read gives the same file, so an unchanged week is never pushed again");
  const lines = text.split("\n");
  assert.equal(lines[0], "{");
  for (const key of Object.keys(week)) assert.ok(lines.some((l) => l.startsWith(`  ${JSON.stringify(key)}: `)), key);
  const itemLine = (key: string) => lines.filter((l) => l.startsWith(`    {"key":${JSON.stringify(key)},`));
  for (const c of week.contacts) assert.equal(itemLine(c.key).length, 1, `${c.key} on one line`);
  for (const c of week.cycles) assert.equal(itemLine(c.key).length, 1, `${c.key} on one line`);
  assert.equal(miraWeekFile({ ...week, next: [] }).includes(`"next": []`), true, "an empty list stays on its line");
  assert.doesNotMatch(text, /\t|\r/);
});

test("the week's changes are the things its sentence counts: rebuilt from them, weekSentence says the same words", () => {
  const open = Date.UTC(2026, 9, 4, 23);
  const inWeek = (n: number) => new Date(open + (n + 0.5) * DAY_MS);
  const keys = [...new Set(week.changes.map((c) => c.key))];
  const events = keys.map((key): ContactEvent => {
    const mine = week.changes.filter((c) => c.key === key);
    const starts = mine.some((c) => c.change === "starts");
    const eases = mine.some((c) => c.change === "eases");
    return {
      key, kind: "contact", body: "saturn", aspect: "square", target: "sun", orb: 2, house: null, tone: "mixed",
      window: {
        start: starts ? inWeek(1) : new Date(open - 30 * DAY_MS),
        end: eases ? inWeek(5) : new Date(open + 90 * DAY_MS),
        exact: mine.some((c) => c.change === "peaks") ? [inWeek(3)] : [],
      },
    };
  });
  assert.ok(events.length > 0, "something moves in the week");
  assert.equal(weekSentence(events, new Date(open)), week.sentence);
  assert.deepEqual(week.changes.map((c) => c.day), [...week.changes.map((c) => c.day)].sort());
});

test("her known ages come with a progress that is a fraction of a round, a cycle count for each, and a finder that opens on the same four", () => {
  for (const a of week.ages) assert.ok(a.progress >= 0 && a.progress < 1 && Math.abs(a.progress * 1000 - Math.round(a.progress * 1000)) < 1e-6, a.id);
  assert.deepEqual(week.finder.rounds.map((r) => r.id), week.ages.map((a) => a.id));
  for (const id of week.ages.map((a) => a.id)) {
    assert.ok(week.cycles.some((c) => c.id === id), `${id} for her chart`);
    assert.ok(week.finder.cycles.some((c) => c.id === id), `${id} for her birth date at midday`);
  }
  const sorted = (list: typeof week.cycles) => list.map((c) => c.start);
  assert.deepEqual(sorted(week.cycles), [...sorted(week.cycles)].sort());
});

const miraSource = (over: Partial<MiraSource> = {}): MiraSource => ({ week: async (m) => `{"week":"${m}"}\n`, current: async () => null, ...over });
const gh = (fail?: Error) => {
  const pushed: FileCommit[] = [];
  return { pushed, commitFile: async (input: FileCommit) => { if (fail) throw fail; pushed.push(input); return "c0ffee"; } };
};
const push = (over: Partial<Parameters<typeof pushSample>[0]> = {}) =>
  pushSample({ releaseId: RELEASE, sha: SHA, label: null, token: TOKEN, github: gh(), read: async () => null, at: AT, mira: miraSource(), ...over });

test("with no run and a week that cannot be computed, nothing is committed and the line says both", async () => {
  const github = gh();
  const line = await push({ github, mira: miraSource({ week: async () => { throw new Error("no fixture"); } }) });
  assert.equal(line, "/sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; Mira's week: not pushed, no fixture");
  assert.equal(github.pushed.length, 0);
});

test("a run that is skipped keeps its reason when the week's commit then fails, and the week's keeps its own", async () => {
  const line = await push({ github: gh(new Error(`GitHub 422 creating sample/${RELEASE}: nope ${TOKEN}`)) });
  assert.equal(line, `/sample: skipped, no lab ran for this release (the brain is unchanged), so there is no new run; Mira's week: not pushed, GitHub 422 creating sample/${RELEASE}: nope [token]`);
});

test("a lab with no sample run and a week already on the commit commits nothing and says so for both", async () => {
  const github = gh();
  const line = await push({ github, label: "release-abcdef1", read: async () => null, mira: miraSource({ current: async () => `{"week":"${MONDAY}"}\n` }) });
  assert.equal(line, `/sample: skipped, release-abcdef1 kept no ${SAMPLE_CHART} run; Mira's week: unchanged, the week of ${MONDAY} is already on abcdef1`);
  assert.equal(github.pushed.length, 0);
});

test("the same week with different bytes is a changed week, and the week asked for is the Monday after the release's day", async () => {
  const asked: string[] = [];
  const github = gh();
  const mira = miraSource({ week: async (m) => { asked.push(m); return `{"week":"${m}"}\n`; }, current: async () => `{"week":"${MONDAY}"}` });
  await push({ github, mira });
  assert.deepEqual(asked, [MONDAY]);
  assert.equal(github.pushed.length, 1, "a missing newline is a difference");
  assert.deepEqual(github.pushed[0].files.map((f) => f.path), [MIRA_WEEK_PATH]);
  const sunday = new Date("2026-10-11T23:59:59Z");
  await push({ github, at: sunday, mira });
  assert.equal(asked.at(-1), "2026-10-12");
  await push({ github, at: new Date("2026-10-12T00:00:00Z"), mira });
  assert.equal(asked.at(-1), "2026-10-19", "on the Monday itself: the next one");
});

test("the token is cut from a line the stub echoes however many times, and the run is read only for the label given", async () => {
  const reads: string[] = [];
  const line = await push({
    label: "release-abcdef1", read: async (label) => { reads.push(label); throw new Error(`read ${TOKEN} ${TOKEN}`); },
    mira: miraSource({ week: async () => { throw new Error(`week ${TOKEN}`); } }),
  });
  assert.equal(line, "/sample: not pushed, read [token] [token]; Mira's week: not pushed, week [token]");
  assert.deepEqual(reads, ["release-abcdef1"]);
});

test("sampleRun cuts nothing but the foundation and the usage, whatever else the output holds, and refuses what is not a natal report", () => {
  const output = { meta: { reportType: "natal", usage: { tokens: 1 }, foundationNote: "stays" }, foundation: {}, usage: { top: "stays" }, sections: [{ foundation: "stays" }] };
  assert.deepEqual(sampleRun(output), { meta: { reportType: "natal", foundationNote: "stays" }, usage: { top: "stays" }, sections: [{ foundation: "stays" }] });
  for (const other of [undefined, null, 0, "natal", [], [{ meta: { reportType: "natal" } }], { meta: { reportType: "pair" } }, { meta: { reportType: "natal " } }, { meta: "natal" }]) {
    assert.equal(sampleRun(other), null, JSON.stringify(other));
  }
  const nested = { meta: { reportType: "natal" }, deep: { a: [1, { b: new Date(0).toISOString() }] } };
  const cut = sampleRun(nested)!;
  assert.notEqual(cut, nested);
  assert.notEqual(cut.deep, nested.deep, "a copy, so cutting it never touches the lab's row");
});

test("outside the checkout the live source cannot compute the week and reads no file; inside, it reads the committed one", async () => {
  const here = process.cwd();
  const away = mkdtempSync(join(tmpdir(), "sd-nowhere-"));
  try {
    process.chdir(away);
    await assert.rejects(() => liveMira.week("2026-10-12"), new RegExp(`no ${MIRA_FIXTURE.replace(/[./]/g, "\\$&")} beside the process`));
    assert.equal(await liveMira.current(), null);
  } finally {
    process.chdir(here);
  }
  for (const dir of [ROOT, join(ROOT, "api"), join(ROOT, "api", "src")]) {
    try {
      process.chdir(dir);
      const text = await liveMira.current();
      assert.ok(text && text.startsWith("{\n"), `from ${dir}`);
    } finally {
      process.chdir(here);
    }
  }
});

test("the live source refuses a day that is not a Monday and writes the file the push compares", async () => {
  await assert.rejects(() => liveMira.week("2026-10-13"), /is not a Monday$/);
  const text = await liveMira.week("2026-10-12");
  assert.equal(JSON.parse(text).week, "2026-10-12");
  assert.ok(text.endsWith("}\n"));
  assert.equal(miraWeekFile(JSON.parse(text) as MiraWeek), text);
});
