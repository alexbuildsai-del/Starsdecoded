/**
 * Ask at its edges (R16-25; ADR-201, 213, 235, 263; readings 12 to 16): the month's cap at its boundaries, what a tool
 * refuses when the plan names what the reader cannot read, a share stopped in the middle of a call, an answer a stop took
 * away (B-02), the 31 days a thread is kept, and that nothing the reader typed reaches a log line, a failure row or the
 * spend ledger. `ask.test.ts` has the access cases; the cases here need no database until a part says so, and the rest
 * run on a scratch Postgres when WALK_DATABASE_URL names a bootstrapped one and skip, saying why, without it.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";

const { installFakeModel, failureRows } = await import("./testModel.js");
const A = await import("./ask.js");
const { setSpendSink } = await import("./spendLedger.js");
const { logger } = await import("./logger.js");
const T = await import("./timeline.js");
const { chartForProfile } = await import("./profiles.js");
const { chartFromFixture } = await import("./testFixtures.js");
const { FALLBACK_LINE, HARM_REPLY, capLine } = await import("../prompts/ask/index.js");
const E = await import("@workspace/engine");

type Library = import("./ask.js").Library;
type NatalRow = import("./ask.js").NatalRow;
type PairRow = import("./ask.js").PairRow;
type PersonBirth = import("./ask.js").PersonBirth;
type ToolScope = import("./ask.js").ToolScope;
type Viewer = { userId: string | null; sessionId: string };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOW = new Date("2026-10-20T12:00:00Z");
const MIN = 60_000;

// --- the month's cap, over its boundaries -------------------------------------------------------------------------

test("the month is the UTC month: the last millisecond of October is October's, the first of November is November's", () => {
  assert.deepEqual(A.monthOf(new Date("2026-10-31T23:59:59.999Z")), { start: new Date("2026-10-01T00:00:00.000Z"), resetsOn: "2026-11-01" });
  assert.deepEqual(A.monthOf(new Date("2026-11-01T00:00:00.000Z")), { start: new Date("2026-11-01T00:00:00.000Z"), resetsOn: "2026-12-01" });
  assert.deepEqual(A.monthOf(new Date("2026-10-01T00:00:00.000Z")).start, new Date("2026-10-01T00:00:00.000Z"));
  // A reader east or west of Greenwich is counted by the UTC clock, not by theirs.
  assert.equal(A.monthOf(new Date("2026-10-31T23:30:00-05:00")).resetsOn, "2026-12-01", "that is 4:30 on 1 November in UTC");
  assert.equal(A.monthOf(new Date("2026-11-01T01:00:00+02:00")).resetsOn, "2026-11-01", "that is 23:00 on 31 October in UTC");
});

test("the reset date crosses a year and a short February", () => {
  assert.equal(A.monthOf(new Date("2026-12-31T23:59:59.999Z")).resetsOn, "2027-01-01");
  assert.equal(A.monthOf(new Date("2028-02-29T12:00:00Z")).resetsOn, "2028-03-01", "a leap year's 29th is still February");
  assert.equal(A.monthOf(new Date("2027-02-28T23:59:59.999Z")).resetsOn, "2027-03-01");
  assert.equal(A.monthOf(new Date("2026-01-31T00:00:00Z")).resetsOn, "2026-02-01");
});

test("left is the cap less the used, never below 0: the 49th leaves 1, the 50th leaves 0, a 51st never counts", () => {
  const at = new Date("2026-10-20T12:00:00Z");
  assert.deepEqual([0, 1, 49, 50, 51, 500].map((used) => A.usageFrom(used, at).left), [50, 49, 1, 0, 0, 0]);
  assert.deepEqual(A.usageFrom(50, at), { used: 50, left: 0, cap: 50, resetsOn: "2026-11-01" });
});

test("the cap's body is the fixed line with its date, and its date is the first of the next UTC month", () => {
  assert.deepEqual(A.capOf(new Date("2026-12-31T23:59:59.999Z")), { error: "ask_cap", message: capLine("2027-01-01"), resetsOn: "2027-01-01" });
  assert.match(A.capOf(NOW).message, /come back on 1 November\./);
});

// --- what sendAsk takes before it reads anything ------------------------------------------------------------------

const ANON: Viewer = { userId: null, sessionId: "s-anonymous" };

test("a body holds text or a choice, never neither and never both; 500 characters go on, 501 do not", async () => {
  const empty = { kind: "invalid", error: "validation_error", message: A.ASK_EMPTY_LINE };
  assert.deepEqual(await A.sendAsk(ANON, {}), empty);
  assert.deepEqual(await A.sendAsk(ANON, { text: "   \n\t " }), empty, "spaces are not a question");
  assert.deepEqual(await A.sendAsk(ANON, { text: "" , choiceId: "" }), empty);
  assert.deepEqual(await A.sendAsk(ANON, { text: "Why?", choiceId: "c1" }), empty, "both is as bad as neither");
  assert.deepEqual(await A.sendAsk(ANON, { text: "x".repeat(501) }), { kind: "invalid", error: "validation_error", message: A.ASK_TOO_LONG_LINE });
  // The length is the trimmed text's, as the box counts it: padding does not make a 500-character question too long.
  assert.deepEqual(await A.sendAsk(ANON, { text: ` ${"x".repeat(500)} ` }), { kind: "no_personal_report" }, "500 passes the check; an account with no chart comes next");
  assert.deepEqual(await A.sendAsk(ANON, { text: `${"x".repeat(500)}\n\n   ` }), { kind: "no_personal_report" });
  assert.deepEqual(await A.sendAsk(ANON, { choiceId: "c1" }), { kind: "no_personal_report" });
  assert.deepEqual(await A.sendAsk(ANON, { text: "   ", choiceId: "c1" }), { kind: "no_personal_report" }, "a blank text beside a tap is a tap");
});

test("a session with no account has no thread, no count used and the whole month left", async () => {
  const now = new Date("2026-10-31T23:59:59.999Z");
  assert.deepEqual(await A.askThread(ANON, { now }), { messages: [], usage: { used: 0, left: 50, cap: 50, resetsOn: "2026-11-01" } });
  assert.deepEqual(await A.askUsage(ANON, now), { used: 0, left: 50, cap: 50, resetsOn: "2026-11-01" });
});

// --- libraries over rows: more of who can be read -----------------------------------------------------------------

const ME: Viewer = { userId: "user_reader", sessionId: "s-reader" };
const NO_BIRTH: PersonBirth = {
  birthDate: "1990-01-01", birthTime: "12:00", birthTimeWindowMinutes: 0, latitude: 0, longitude: 0, timezoneOffset: 0, timezone: null, chartData: null,
};
const holder = (id: string, name: string, over: Partial<NatalRow["profile"]> = {}): NatalRow["profile"] => ({
  id, name, userId: null, sessionId: `s-${id}`, claimedByUserId: null, isSelf: false, claimedAsSelf: false, ...over,
});
const OWN = holder("p-own", "Ana Lima", { userId: ME.userId, sessionId: ME.sessionId, isSelf: true });
const SHARED = holder("p-shared", "Cleo Dias", { userId: "user_sharer", sessionId: "s-sharer", isSelf: true });
const OTHER_SHARED = holder("p-other", "Eli Pinto", { userId: "user_other", sessionId: "s-other", isSelf: true });
const TOMAS = holder("p-tomas", "Tomás Reyes", { userId: ME.userId, sessionId: ME.sessionId });
const UMA = holder("p-uma", "Uma Vaz", { userId: ME.userId, sessionId: ME.sessionId });
const SENDER = holder("p-sender", "Rui Sá", { userId: "user_sender", sessionId: "s-sender", isSelf: true });

let clock = Date.parse("2026-09-01T10:00:00Z");
const tick = () => new Date((clock += MIN));
const natal = (profile: NatalRow["profile"], over: Partial<NatalRow> = {}): NatalRow => ({
  reportId: `r-${profile.id}-${clock}`, status: "complete", sessionId: profile.sessionId, createdAt: tick(), horizon: "known", profile, ...over,
});
const part = (profile: NatalRow["profile"], accessRole = "owner") => ({
  profileId: profile.id, name: profile.name, userId: profile.userId, sessionId: profile.sessionId, claimedByUserId: profile.claimedByUserId,
  accessRole, birth: NO_BIRTH,
});
const pairOf = (relId: string, parts: ReturnType<typeof part>[], over: Partial<PairRow> = {}): PairRow => ({
  reportId: `r-${relId}`, status: "complete", createdAt: tick(), promptVersion: "p6",
  relationship: { id: relId, type: "partners", userId: ME.userId, sessionId: ME.sessionId }, parts, ...over,
});
const NONE: ReadonlySet<string> = new Set();
const ids = (lib: Library) => lib.reports.map((r) => r.reportId);

test("a grant opens the profile it names and no other: the sharer's chart reads, a different sharer's does not", () => {
  const grant = new Set([SHARED.id]);
  assert.deepEqual(ids(A.libraryOf(ME, [natal(SHARED), natal(OTHER_SHARED)], [], grant, OWN.id)).length, 1);
  assert.deepEqual(A.libraryOf(ME, [natal(SHARED), natal(OTHER_SHARED)], [], grant, OWN.id).reports[0].names, ["Cleo Dias"]);
});

test("only a finished natal report is read: complete and revising are, every other state is not", () => {
  for (const status of ["complete", "revising"]) assert.equal(A.libraryOf(ME, [natal(OWN, { status })], [], NONE, OWN.id).reports.length, 1, status);
  for (const status of ["pending", "queued", "interpreting", "failed", "cancelled", ""]) {
    assert.deepEqual(A.libraryOf(ME, [natal(OWN, { status })], [], NONE, OWN.id).reports, [], status);
  }
  const unfinished = A.libraryOf(ME, [], [pairOf("rel-a", [part(OWN), part(TOMAS)], { status: "interpreting" })], NONE, OWN.id);
  assert.deepEqual([unfinished.reports, unfinished.people], [[], []], "a Compatibility report still being written is not one to read");
});

test("a pair needs exactly two people; one or three open nothing and name no one", () => {
  for (const people of [[part(OWN)], [part(OWN), part(TOMAS), part(UMA)], []]) {
    const lib = A.libraryOf(ME, [], [pairOf("rel-n", people)], NONE, OWN.id);
    assert.deepEqual([lib.reports, lib.people], [[], []], `${people.length} people`);
  }
});

test("a pair someone else made opens to the person it was sent to, and to no other reader", () => {
  const sentTo = { ...part(OWN, "participant"), claimedByUserId: ME.userId };
  const theirs = { userId: "user_sender", sessionId: "s-sender" };
  const open = A.libraryOf(ME, [], [pairOf("rel-sent", [part(SENDER), sentTo], { relationship: { id: "rel-sent", type: "partners", ...theirs } })], NONE, OWN.id);
  assert.deepEqual(ids(open), ["r-rel-sent"]);
  assert.deepEqual(open.people.map((p) => p.profileId), [SENDER.id], "the sender is the one to ask about, never the reader");
  // The same pair, with the reader only a name in it: a grant or a claim they do not hold opens nothing.
  const stranger = { userId: "user_x", sessionId: "s-x" };
  const closed = A.libraryOf(ME, [], [pairOf("rel-x", [part(SENDER), part(TOMAS)], { relationship: { id: "rel-x", type: "partners", ...stranger } })], NONE, OWN.id);
  assert.deepEqual([closed.reports, closed.people], [[], []]);
  // A participant row on a chart sent to the reader and not yet claimed is not theirs; on the chart they keep, it is (ADR-285).
  const waiting = holder("p-waiting", "Ana Lima", { userId: SENDER.userId, sessionId: SENDER.sessionId });
  const unclaimed = A.libraryOf(ME, [], [pairOf("rel-u", [part(SENDER), part(waiting, "participant")], { relationship: { id: "rel-u", type: "partners", ...theirs } })], NONE, OWN.id);
  assert.deepEqual(unclaimed.reports, []);
  const kept = A.libraryOf(ME, [], [pairOf("rel-k", [part(SENDER), part(OWN, "participant")], { relationship: { id: "rel-k", type: "partners", ...theirs } })], NONE, OWN.id);
  assert.deepEqual(ids(kept), ["r-rel-k"]);
});

test("a grant never opens a pair its sharer made: the sharer's own pair stays shut to the reader", () => {
  const theirs = { userId: SHARED.userId, sessionId: SHARED.sessionId };
  const lib = A.libraryOf(ME, [], [pairOf("rel-sharer", [part(SHARED), part(TOMAS)], { relationship: { id: "rel-sharer", type: "partners", ...theirs } })], new Set([SHARED.id]), OWN.id);
  assert.deepEqual([lib.reports, lib.people], [[], []]);
});

test("someone in two readable pairs is one person, listed under the first report; the reader is never listed", () => {
  const first = pairOf("rel-1", [part(OWN), part(TOMAS)]);
  const second = pairOf("rel-2", [part(OWN), part(TOMAS)]);
  const third = pairOf("rel-3", [part(UMA), part(TOMAS)]);
  const lib = A.libraryOf(ME, [natal(OWN)], [first, second, third], NONE, OWN.id);
  assert.deepEqual(lib.people.map((p) => [p.id, p.profileId, p.report]), [["p1", TOMAS.id, "r2"], ["p2", UMA.id, "r4"]]);
  assert.ok(!lib.people.some((p) => p.profileId === OWN.id));
});

test("the newest finished report of each person is the one read, and ids are r1.. then p1.. with no gap or repeat", () => {
  const old = natal(OWN, { createdAt: new Date("2026-08-01T00:00:00Z") });
  const fresh = natal(OWN, { createdAt: new Date("2026-09-30T00:00:00Z") });
  const lib = A.libraryOf(ME, [old, natal(TOMAS), fresh], [pairOf("rel-1", [part(OWN), part(TOMAS)])], NONE, OWN.id);
  assert.deepEqual(lib.reports.filter((r) => r.kind === "personal" && r.own).map((r) => r.reportId), [fresh.reportId]);
  assert.deepEqual(lib.reports.map((r) => r.id), lib.reports.map((_, i) => `r${i + 1}`));
  assert.deepEqual(lib.reports.map((r) => r.kind), ["personal", "personal", "compatibility"], "the reader's own first, then the others, then the pairs");
  assert.equal(new Set(lib.reports.map((r) => r.reportId)).size, lib.reports.length);
});

test("a session with no account reads the reports its session made until an account claims them, and no grant", () => {
  const session: Viewer = { userId: null, sessionId: "s-guest" };
  const mine = holder("p-guest", "Gus Lobo", { sessionId: "s-guest", isSelf: true });
  const claimed = holder("p-claimed", "Ivo Reis", { sessionId: "s-guest", claimedByUserId: "user_claimed" });
  const lib = A.libraryOf(session, [natal(mine), natal(claimed)], [], new Set([mine.id, claimed.id, SHARED.id]), null);
  assert.deepEqual(lib.reports.map((r) => r.names), [["Gus Lobo"]]);
});

// --- the pair offer: whom it may name, and once (Review 05/10 §8) --------------------------------------------------

const circleFrom = (rows: NatalRow[], pairs: PairRow[], shared: ReadonlySet<string> = NONE) =>
  A.circleOf(ME, rows, pairs, shared, OWN.id, A.libraryOf(ME, rows, pairs, shared, OWN.id));
const offerable = (circle: ReturnType<typeof circleFrom>) =>
  Object.fromEntries(circle.map((m) => [m.name, m.offerable])) as Record<string, boolean>;

test("the offer's circle: a readable report and no pair offers; a pair with the reader, written or being written, or one Ask reads them through, does not", () => {
  const natalRows = [natal(OWN), natal(TOMAS), natal(UMA)];
  assert.deepEqual(offerable(circleFrom(natalRows, [])), { "Tomás Reyes": true, "Uma Vaz": true }, "the reader is never in it");
  for (const status of ["complete", "interpreting", "pending"]) {
    assert.deepEqual(offerable(circleFrom(natalRows, [pairOf("rel-t", [part(OWN), part(TOMAS)], { status })])), { "Tomás Reyes": false, "Uma Vaz": true }, status);
  }
  assert.deepEqual(offerable(circleFrom(natalRows, [pairOf("rel-t", [part(OWN), part(TOMAS)], { status: "failed" })])), { "Tomás Reyes": true, "Uma Vaz": true }, "a failed pair can be asked for again");
  // A pair of two other people Ask can read is the one R19-17's plan quotes, so neither of them is offered one.
  assert.deepEqual(offerable(circleFrom(natalRows, [pairOf("rel-tu", [part(TOMAS), part(UMA)])])), { "Tomás Reyes": false, "Uma Vaz": false });
  assert.deepEqual(offerable(circleFrom([natal(OWN), natal(TOMAS, { status: "revising" })], [])), { "Tomás Reyes": false }, "a pair waits for a complete report");
  assert.deepEqual(offerable(circleFrom([natal(OWN), natal(SHARED)], [], new Set([SHARED.id]))), { "Cleo Dias": true }, "a chart shared with the reader");
  assert.deepEqual(circleFrom([natal(OWN), natal(SHARED)], []), [], "and without the grant, no one");
});

const member = (profileId: string, name: string, open = true) => ({ profileId, name, offerable: open });
const CIRCLE = [member("p-tomas", "Tomás Reyes"), member("p-uma", "Uma Vaz"), member("p-george", "George Windsor", false)];
const named = (asked: string[], circle = CIRCLE, offered: ReadonlySet<string> = NONE, reader = "Ana Lima") =>
  A.offerTarget(asked, circle, offered, reader)?.profileId ?? null;

test("the offer names whom the reader's words name: a first or full name, in any case or accent, as a whole word", () => {
  assert.equal(named(["Tomás and I keep arguing about the flat. Why?"]), "p-tomas");
  assert.equal(named(["why does tomas go quiet on me"]), "p-tomas", "case and accents fold");
  assert.equal(named(["Is it Tomás's fault or mine?"]), "p-tomas");
  assert.equal(named(["Is it Tomas’s fault?"]), "p-tomas", "a curly apostrophe too");
  assert.equal(named(["uma vaz and Tomás"]), "p-uma", "the first one named");
  assert.equal(named(["Tomásito called me"]), null, "never inside another word");
  assert.equal(named(["How is George doing?"]), null, "someone Ask reads through a pair is never offered");
  assert.equal(named(["What does my week look like?"]), null);
});

test("the offer comes once a person: someone offered in the thread is passed over for the next one named, then no one", () => {
  assert.equal(named(["Tomás and Uma"], CIRCLE, new Set(["p-tomas"])), "p-uma");
  assert.equal(named(["Tomás and Uma"], CIRCLE, new Set(["p-tomas", "p-uma"])), null);
});

test("a name two people could carry offers neither: a first name the reader or another shares counts only in full", () => {
  const circle = [member("p-ana", "Ana Souza"), member("p-sam", "Sam Hill"), member("p-sam2", "Sam Ruiz")];
  assert.equal(named(["Ana and I argued"], circle), null, "Ana is the reader's own first name too");
  assert.equal(named(["Ana Souza and I argued"], circle), "p-ana");
  assert.equal(named(["Sam is upset"], circle), null);
  assert.equal(named(["sam  ruiz is upset"], circle), "p-sam2");
  assert.equal(named(["Lena Park"], [member("p-1", "Lena Park"), member("p-2", "Lena Park")]), null, "two profiles of one name");
});

test("the newest words come first: the message, then the question back it answers", () => {
  assert.equal(named(["Fri 16 Oct", "Tomás and I argued on Friday. Why?"]), "p-tomas");
  assert.equal(named(["And Uma?", "Tomás and I argued on Friday. Why?"]), "p-uma");
});

// --- the tools, with the plan naming what the reader cannot read -------------------------------------------------

const birthOf = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as {
  name: string; birthDate: string; birthTime: string; birthTimeWindowMinutes?: number; latitude: number; longitude: number;
  timezoneOffset: number; timezone?: string;
};
const personBirth = (path: string): PersonBirth => {
  const f = birthOf(path);
  return {
    birthDate: f.birthDate, birthTime: f.birthTime, birthTimeWindowMinutes: f.birthTimeWindowMinutes ?? 0, latitude: f.latitude,
    longitude: f.longitude, timezoneOffset: f.timezoneOffset, timezone: f.timezone ?? null, chartData: null,
  };
};

const MIRA_PATH = "fixtures/sample-people/mira.json";
const mira = (() => {
  const f = birthOf(MIRA_PATH);
  const birth = personBirth(MIRA_PATH);
  const profile = { id: "p-mira", userId: "user_mira", sessionId: "s-mira", claimedByUserId: null, isSelf: true, claimedAsSelf: false, ...birth };
  const row = { report: { id: "r-mira", status: "complete", sessionId: "s-mira", createdAt: new Date("2026-09-01T10:00:00Z") }, profile };
  return { f, reader: T.readerOf("user_mira", row, chartForProfile(profile)), viewer: { userId: "user_mira", sessionId: "s-mira" } as Viewer };
})();

const TOMAS_BIRTH = personBirth("fixtures/sample-people/tomas.json");
const FORGED: Library = {
  reports: [
    { id: "r1", reportId: "rep-own", kind: "personal", own: true, names: ["Mira Costa"], sections: [{ id: "overview", title: "Chart Overview" }, { id: "house-1", title: "1st house" }] },
    { id: "r2", reportId: "rep-pair", kind: "compatibility", own: false, names: ["Mira Costa", "Tomás Reyes"], sections: [{ id: "twoCharts", title: "Your two charts" }] },
    { id: "r3", reportId: "rep-other", kind: "personal", own: false, names: ["Dan Faro"], sections: [{ id: "overview", title: "Chart Overview" }] },
  ],
  people: [{ id: "p1", profileId: "prof-tomas", name: "Tomás Reyes", report: "r2", reportId: "rep-pair", relationshipId: "rel-1", birth: TOMAS_BIRTH }],
};
const scopeOf = (library: Library, fresh: Library = library): ToolScope => ({
  viewer: mira.viewer, reader: mira.reader, zone: mira.reader.zone, now: NOW, library, fresh,
});
const without = (lib: Library, over: Partial<Library>): Library => ({ ...lib, ...over });
const COUNTS = (cards: Awaited<ReturnType<typeof A.runTools>>) => cards.map((c) => `${c.prompt.id} ${c.prompt.kind}`);

test("a tool naming a report or section the plan invented is refused: an id not in the list, a section not in the report", async () => {
  const refused = [
    { tool: "quote" as const, report: "r99", section: "overview" },
    { tool: "quote" as const, report: "", section: "overview" },
    { tool: "quote" as const, report: "r1", section: "nope" },
    { tool: "quote" as const, report: "r1", section: "house-13" },
    { tool: "quote" as const, report: "r1", section: "house-0" },
    { tool: "quote" as const, report: "r2", section: "overview" },
    // Another reader's Personal report lists chapters only, so one of its house cards is not a section.
    { tool: "quote" as const, report: "r3", section: "house-1" },
    { tool: "quote" as const, report: "__proto__", section: "overview" },
  ];
  for (const tool of refused) assert.deepEqual(await A.runTools([tool], scopeOf(FORGED)), [], JSON.stringify(tool));
});

test("a quote is read from the library the tools run against, so a report gone from it is refused whatever the plan was shown", async () => {
  const gone = without(FORGED, { reports: FORGED.reports.filter((r) => r.reportId !== "rep-other") });
  assert.deepEqual(await A.runTools([{ tool: "quote", report: "r3", section: "overview" }], scopeOf(FORGED, gone)), []);
  // The plan's r2 can stand for a different report by the time the tools run; the report's own id decides, not the short one.
  const swapped = without(FORGED, { reports: [{ ...FORGED.reports[0], id: "r2" }] });
  assert.deepEqual(await A.runTools([{ tool: "quote", report: "r2", section: "twoCharts" }], scopeOf(FORGED, swapped)), []);
});

test("a person the plan invented, or one no longer in any readable pair, gives no card", async () => {
  assert.deepEqual(await A.runTools([{ tool: "person", person: "p99", date: "2026-10-20" }], scopeOf(FORGED)), []);
  assert.deepEqual(await A.runTools([{ tool: "person", person: "r2", date: "2026-10-20" }], scopeOf(FORGED)), [], "a report's id is not a person's");
  assert.deepEqual(await A.runTools([{ tool: "person", person: "p1", date: "2026-10-20" }], scopeOf(FORGED, without(FORGED, { people: [] }))), []);
  // A different person under the same short id by the time the tools run is a different profile: refused.
  const swapped = without(FORGED, { people: [{ ...FORGED.people[0], profileId: "prof-someone-else" }] });
  assert.deepEqual(await A.runTools([{ tool: "person", person: "p1", date: "2026-10-20" }], scopeOf(FORGED, swapped)), []);
});

test("a person's day is computed from their own chart on a day they lived, and kept as who and which day", async () => {
  const [card] = await A.runTools([{ tool: "person", person: "p1", date: "2026-10-20" }], scopeOf(FORGED));
  assert.deepEqual(card.stored, { kind: "person", profileId: "prof-tomas", date: "2026-10-20", zone: mira.reader.zone });
  assert.ok(card.prompt.kind === "person" && card.prompt.person === "p1");
  const born = personBirth("fixtures/sample-people/tomas.json").birthDate;
  const before = `${Number(born.slice(0, 4)) - 2}${born.slice(4)}`;
  const after = `${Number(born.slice(0, 4)) + 125}${born.slice(4)}`;
  for (const date of [before, after, "2026-02-30", "20261020", "", "tomorrow"]) {
    assert.deepEqual(await A.runTools([{ tool: "person", person: "p1", date }], scopeOf(FORGED)), [], date || "(empty)");
  }
});

test("the day tool takes only a calendar day within the reader's life; the window tool the same, at most six months", async () => {
  const day = (date: string) => A.runTools([{ tool: "day", date }], scopeOf(FORGED));
  assert.equal((await day("2026-10-20")).length, 1);
  for (const date of ["2026-02-30", "2026-13-01", "2026-1-5", "20261020", "", " 2026-10-20", "1850-01-01", "2400-01-01"]) {
    assert.deepEqual(await day(date), [], date || "(empty)");
  }
  const window = (from: string, to: string) => A.runTools([{ tool: "window", from, to }], scopeOf(FORGED));
  const length = async (from: string, to: string) => {
    const [card] = await window(from, to);
    assert.ok(card?.stored.kind === "window", `${from} to ${to}`);
    return card.stored.days.length;
  };
  assert.equal(await length("2026-10-20", "2026-10-20"), 1);
  assert.equal(await length("2026-10-26", "2026-10-20"), 7, "a window named backwards is the same window");
  assert.equal(await length("2026-10-20", "2027-10-20"), 182, "a year is cut to the six months a window may be");
  assert.deepEqual(await window("1850-01-01", "1850-01-10"), []);
  assert.deepEqual(await window("2026-10-20", "2026-02-30"), []);
});

test("the same tool twice computes once; a refused tool takes no card id, so the ids stay c1, c2 in the plan's order", async () => {
  const cards = await A.runTools([
    { tool: "quote", report: "r99", section: "overview" },
    { tool: "day", date: "2026-10-20" },
    { tool: "day", date: "2026-10-20" },
    { tool: "reports" },
    { tool: "window", from: "2026-10-20", to: "2026-10-22" },
  ], scopeOf(FORGED));
  assert.deepEqual(COUNTS(cards), ["c1 day", "c2 window"]);
});

test("the cycle tool answers the last cycle to start before today or the next to end after it, and no other kind of day", async () => {
  const ids = Object.keys(E.CYCLE_WORDS) as (keyof typeof E.CYCLE_WORDS)[];
  const today = T.dayIn(NOW, mira.reader.zone);
  for (const cycle of ids) {
    const [last] = await A.runTools([{ tool: "cycle", cycle, which: "last" }], scopeOf(FORGED));
    const [next] = await A.runTools([{ tool: "cycle", cycle, which: "next" }], scopeOf(FORGED));
    if (last) assert.ok(last.prompt.kind === "cycle" && last.prompt.cycle.from <= today, `${cycle} last`);
    if (next) assert.ok(next.prompt.kind === "cycle" && next.prompt.cycle.to >= today, `${cycle} next`);
    for (const card of [last, next]) if (card) assert.equal(card.prompt.kind === "cycle" && card.prompt.cycle.name, E.CYCLE_WORDS[cycle].name);
  }
});

// --- the database parts -------------------------------------------------------------------------------------------

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the cap, the thread and Stop sharing run on a scratch Postgres";
const run = randomUUID().slice(0, 8);
const id = (name: string) => `r16c-${run}-${name}`;
const READER: Viewer = { userId: id("u-reader"), sessionId: id("s-reader") };
const SHARER: Viewer = { userId: id("u-sharer"), sessionId: id("s-sharer") };
const CLOSING: Viewer = { userId: id("u-closer"), sessionId: id("s-closer") };
const BYSTANDER: Viewer = { userId: id("u-bystander"), sessionId: id("s-bystander") };
const P = { reader: id("p-reader"), shared: id("p-shared"), closer: id("p-closer"), tomas: id("p-tomas") };
const R = { reader: id("r-reader"), shared: id("r-shared"), closer: id("r-closer"), tomas: id("r-tomas"), open: id("r-open"), closing: id("r-closing") };
const REL = { open: id("rel-open"), closing: id("rel-closing") };
const grant = { shared: "", closer: "" };

const PARAGRAPH = (who: string) =>
  `${who}, you take your time before you decide, and you like to see the whole picture before you choose. Once you have chosen you move steadily, and you rarely turn back. People learn to trust that pace.`;
const PATTERN = "When one of you goes quiet the other reads it as distance, and the gap grows until someone names it out loud. Saying it early keeps it small for both of you.";
const natalText = (who: string) => ({
  overview: { headline: "Steady first, quick later.", concentration: PARAGRAPH(who), claims: [] },
  houses: { houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, reading: `${PARAGRAPH(who)} House ${i + 1}.` })) },
});
const pairText = (a: string, b: string) => ({
  meta: { promptVersion: "p6", reportType: "compatibility", lens: "partners", names: { a, b } },
  twoCharts: { headline: "Two careful people who need to say things sooner.", claims: [] },
  partners02: { headline: "Quiet is not distance.", scene: `${a} goes quiet. ${b} waits.`, pattern: PATTERN, claims: [] },
});

const dbm = () => import("@workspace/db");
let seeded: Promise<void> | null = null;

function seed(): Promise<void> {
  seeded ??= (async () => {
    const { db, profilesTable, reportsTable, relationshipsTable, relationshipParticipantsTable } = await dbm();
    const fx = (name: string) => JSON.parse(readFileSync(join(ROOT, "fixtures", "charts", `${name}.json`), "utf8"));
    const row = (profileId: string, fixture: string, who: Viewer, over: Record<string, unknown> = {}) => {
      const f = fx(fixture);
      return {
        id: profileId, sessionId: who.sessionId, userId: who.userId, name: f.name, birthDate: f.birthDate, birthTime: f.birthTime,
        birthPlace: "fixture", latitude: f.latitude, longitude: f.longitude, timezoneOffset: f.timezoneOffset, timezone: f.timezone ?? null,
        chartData: chartFromFixture(fixture) as unknown as object, ...over,
      };
    };
    await db.insert(profilesTable).values([
      row(P.reader, "beatrice", READER, { isSelf: true }),
      row(P.shared, "oprah-winfrey", SHARER, { isSelf: true }),
      row(P.closer, "george", CLOSING, { isSelf: true }),
      row(P.tomas, "william", READER),
    ]);
    const at = (minute: number) => new Date(Date.UTC(2026, 8, 1, 10, minute));
    const natalRow = (reportId: string, profileId: string, who: Viewer, name: string, minute: number) => ({
      id: reportId, profileId, sessionId: who.sessionId, type: "natal", status: "complete", interpretation: natalText(name), createdAt: at(minute),
    });
    await db.insert(reportsTable).values([
      natalRow(R.reader, P.reader, READER, "Beatrice", 0),
      natalRow(R.shared, P.shared, SHARER, "Oprah", 1),
      natalRow(R.closer, P.closer, CLOSING, "George", 2),
      natalRow(R.tomas, P.tomas, READER, "William", 3),
    ]);
    await db.insert(relationshipsTable).values([
      { id: REL.open, sessionId: READER.sessionId, userId: READER.userId, type: "partners" },
      { id: REL.closing, sessionId: READER.sessionId, userId: READER.userId, type: "partners" },
    ]);
    await db.insert(relationshipParticipantsTable).values([
      { id: `${REL.open}-a`, relationshipId: REL.open, profileId: P.reader, role: "primary", position: "0" },
      { id: `${REL.open}-b`, relationshipId: REL.open, profileId: P.tomas, role: "secondary", position: "1" },
      { id: `${REL.closing}-a`, relationshipId: REL.closing, profileId: P.reader, role: "primary", position: "0" },
      { id: `${REL.closing}-b`, relationshipId: REL.closing, profileId: P.closer, role: "secondary", position: "1" },
    ]);
    const pairRow = (reportId: string, relationshipId: string, b: string, minute: number) => ({
      id: reportId, profileId: P.reader, sessionId: READER.sessionId, type: "compatibility", relationshipId, status: "complete",
      interpretation: pairText("Beatrice York", b), createdAt: at(minute),
    });
    await db.insert(reportsTable).values([pairRow(R.open, REL.open, "William Windsor", 4), pairRow(R.closing, REL.closing, "George Windsor", 5)]);
  })();
  return seeded;
}

/** Both grants standing, and the reader's thread empty. */
async function fresh(): Promise<void> {
  await seed();
  const { db, askMessagesTable } = await dbm();
  const { eq, inArray } = await import("drizzle-orm");
  const { grantShare } = await import("./shares.js");
  grant.shared = await grantShare(db, { profileId: P.shared, ownerUserId: SHARER.userId as string, readerUserId: READER.userId as string, inviteId: null });
  grant.closer = await grantShare(db, { profileId: P.closer, ownerUserId: CLOSING.userId as string, readerUserId: READER.userId as string, inviteId: null });
  await db.delete(askMessagesTable).where(inArray(askMessagesTable.userId, [READER.userId as string, BYSTANDER.userId as string]));
  void eq;
}

after(async () => {
  if (!SCRATCH || !seeded) return;
  const { db, pool, askMessagesTable, profileSharesTable, profilesTable, relationshipsTable, usersTable } = await dbm();
  const { inArray } = await import("drizzle-orm");
  await db.delete(askMessagesTable).where(inArray(askMessagesTable.userId, [READER.userId as string, BYSTANDER.userId as string]));
  // The reader's account row holds the offer test's credits, which go with it.
  await db.delete(usersTable).where(inArray(usersTable.id, [READER.userId as string]));
  await db.delete(profileSharesTable).where(inArray(profileSharesTable.profileId, Object.values(P)));
  await db.delete(relationshipsTable).where(inArray(relationshipsTable.id, Object.values(REL)));
  await db.delete(profilesTable).where(inArray(profilesTable.id, Object.values(P)));
  await pool.end();
});

async function readerRows(userId: string, createdAts: readonly string[], role: "reader" | "ask" = "reader"): Promise<void> {
  const { db, askMessagesTable } = await dbm();
  if (!createdAts.length) return;
  const body = role === "reader" ? { text: "earlier" } : { said: "answer", text: "earlier", cards: [], choices: [] };
  await db.insert(askMessagesTable).values(createdAts.map((iso) => ({ id: randomUUID(), userId, role, body, createdAt: new Date(iso) })));
}

async function rowTimes(userId: string): Promise<number[]> {
  const { db, askMessagesTable } = await dbm();
  const { eq } = await import("drizzle-orm");
  const rows = await db.select({ createdAt: askMessagesTable.createdAt }).from(askMessagesTable).where(eq(askMessagesTable.userId, userId));
  return rows.map((r) => r.createdAt.getTime()).sort((a, b) => a - b);
}

const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
const planOf = (over: Record<string, unknown>) => ({ intent: "harm", tools: [], question: "", choices: [], ...over });

test("db, the count is the reader's reader messages in the UTC month: the edges, Ask's own replies and another account's rows left out", { skip: NO_DB }, async () => {
  await fresh();
  // Each query is made at the moment its rows end, as the clock moves: a count never looks at a message from its future.
  await readerRows(READER.userId as string, ["2026-09-30T23:59:59.999Z"]); // September's last millisecond
  await readerRows(READER.userId as string, ["2026-10-10T10:00:00Z", "2026-10-11T10:00:00Z"], "ask");
  await readerRows(BYSTANDER.userId as string, ["2026-10-12T10:00:00Z", "2026-10-13T10:00:00Z"]);
  assert.equal((await A.askUsage(READER, new Date("2026-09-30T23:59:59.999Z"))).used, 1);
  assert.equal((await A.askUsage(READER, new Date("2026-10-01T00:00:00.000Z"))).used, 0, "the first instant of October starts at none");
  await readerRows(READER.userId as string, ["2026-10-01T00:00:00.000Z"]); // October's first
  assert.equal((await A.askUsage(READER, new Date("2026-10-01T00:00:00.000Z"))).used, 1);
  assert.deepEqual(await A.askUsage(READER, NOW), { used: 1, left: 49, cap: 50, resetsOn: "2026-11-01" });
  assert.equal((await A.askUsage(BYSTANDER, NOW)).used, 2);
  await readerRows(READER.userId as string, ["2026-10-31T23:59:59.999Z"]); // October's last
  assert.deepEqual(await A.askUsage(READER, new Date("2026-10-31T23:59:59.999Z")), { used: 2, left: 48, cap: 50, resetsOn: "2026-11-01" });
  assert.deepEqual(await A.askUsage(READER, new Date("2026-11-01T00:00:00.000Z")), { used: 0, left: 50, cap: 50, resetsOn: "2026-12-01" });
  await readerRows(READER.userId as string, ["2026-11-01T00:00:00.000Z"]); // November's first
  assert.deepEqual(await A.askUsage(READER, new Date("2026-11-01T00:00:00.000Z")), { used: 1, left: 49, cap: 50, resetsOn: "2026-12-01" });
});

test("db, a tapped choice counts as a message: the 49th, the 50th by tap, and the 51st by tap refused with no call", { skip: NO_DB }, async () => {
  await fresh();
  const first = Array.from({ length: 48 }, (_, i) => `2026-10-01T00:${String(i).padStart(2, "0")}:00Z`);
  await readerRows(READER.userId as string, first);
  const ask = (n: number) => planOf({ intent: "ask_back", question: `Which day, number ${n}?`, choices: [{ kind: "date", date: `2026-10-${10 + n}` }] });
  let turn = 0;
  const fake = installFakeModel({ ask_plan: () => ask(++turn) });
  try {
    const typed = await A.sendAsk(READER, { text: "We fought on a day I can't place." }, { now: at(0) });
    assert.ok(typed.kind === "thread");
    assert.equal(typed.thread.usage.used, 49);
    const choice = typed.thread.messages.at(-1)!.choices[0];
    assert.ok(choice, "Ask offered a day to tap");
    const tapped = await A.sendAsk(READER, { choiceId: choice.id }, { now: at(MIN) });
    assert.ok(tapped.kind === "thread", "the 50th message is a tap, and it goes");
    assert.deepEqual(tapped.thread.usage, { used: 50, left: 0, cap: 50, resetsOn: "2026-11-01" });
    const again = tapped.thread.messages.at(-1)!.choices[0];
    assert.ok(again);
    const calls = fake.calls.length;
    const refused = await A.sendAsk(READER, { choiceId: again.id }, { now: at(2 * MIN) });
    assert.deepEqual(refused, { kind: "cap", cap: { error: "ask_cap", message: capLine("2026-11-01"), resetsOn: "2026-11-01" } });
    assert.deepEqual(await A.sendAsk(READER, { text: "One more?" }, { now: at(3 * MIN) }), refused);
    assert.deepEqual(await A.sendAsk(READER, { choiceId: "no-such-choice" }, { now: at(4 * MIN) }), refused, "the cap is read before the choice is");
    assert.equal(fake.calls.length, calls, "no call is made once the month is spent");
    assert.deepEqual(await A.askUsage(READER, at(5 * MIN)), { used: 50, left: 0, cap: 50, resetsOn: "2026-11-01" });
  } finally {
    fake.restore();
  }
});

test("db, a choice that closed or a body Ask cannot take costs the reader nothing; a message that fails to be answered does", { skip: NO_DB }, async () => {
  await fresh();
  const fake = installFakeModel({ ask_plan: planOf({ intent: "harm" }) });
  try {
    assert.deepEqual(await A.sendAsk(READER, { choiceId: "never-offered" }, { now: at(0) }), { kind: "invalid", error: "choice_not_offered", message: A.ASK_CHOICE_GONE_LINE });
    assert.equal((await A.sendAsk(READER, { text: "x".repeat(501) }, { now: at(MIN) })).kind, "invalid");
    assert.equal((await A.sendAsk(READER, {}, { now: at(2 * MIN) })).kind, "invalid");
    assert.equal((await A.askUsage(READER, at(3 * MIN))).used, 0);
    assert.deepEqual(fake.calls, []);
    // The outage is Ask's, not the reader's, but the message was sent and read: it counts, and the reader is told so in the fixed line.
    fake.failOn = "ask_plan";
    const down = await A.sendAsk(READER, { text: "Is anyone there?" }, { now: at(4 * MIN) });
    assert.ok(down.kind === "thread");
    assert.equal(down.thread.messages.at(-1)!.text, FALLBACK_LINE);
    assert.equal(down.thread.usage.used, 1);
  } finally {
    fake.restore();
  }
});

test("db, the count starts again on the first of the month, to the millisecond, with the reset day in the refusal", { skip: NO_DB }, async () => {
  await fresh();
  await readerRows(READER.userId as string, Array.from({ length: 50 }, (_, i) => `2026-10-15T10:${String(i).padStart(2, "0")}:00Z`));
  const fake = installFakeModel({ ask_plan: planOf({ intent: "harm" }) });
  try {
    const lastOfOctober = await A.sendAsk(READER, { text: "Still here?" }, { now: new Date("2026-10-31T23:59:59.999Z") });
    assert.deepEqual(lastOfOctober, { kind: "cap", cap: { error: "ask_cap", message: capLine("2026-11-01"), resetsOn: "2026-11-01" } });
    assert.deepEqual(fake.calls, []);
    const firstOfNovember = await A.sendAsk(READER, { text: "New month." }, { now: new Date("2026-11-01T00:00:00.000Z") });
    assert.ok(firstOfNovember.kind === "thread");
    assert.deepEqual(firstOfNovember.thread.usage, { used: 1, left: 49, cap: 50, resetsOn: "2026-12-01" });
    assert.equal(firstOfNovember.thread.messages.at(-1)!.text, HARM_REPLY);
  } finally {
    fake.restore();
  }
});

test("db, a thread keeps 31 days to the millisecond, on a read and on a send, and forgets only the reader's own", { skip: NO_DB }, async () => {
  await fresh();
  const cutoff = NOW.getTime() - 31 * 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString();
  await readerRows(READER.userId as string, [iso(cutoff - 1), iso(cutoff), iso(cutoff + 1)]);
  await readerRows(READER.userId as string, [iso(cutoff - 2 * MIN)], "ask");
  await readerRows(BYSTANDER.userId as string, [iso(cutoff - 90 * 86_400_000)]);
  const thread = await A.askThread(READER, { now: NOW });
  assert.deepEqual(thread.messages.map((m) => m.createdAt.getTime()), [cutoff, cutoff + 1], "31 days old to the millisecond is kept; a millisecond more is gone");
  assert.deepEqual(await rowTimes(READER.userId as string), [cutoff, cutoff + 1]);
  assert.equal((await rowTimes(BYSTANDER.userId as string)).length, 1, "another account's thread is not this reader's to clear");
  // A send clears the same way, and a day past 31 goes with it.
  await readerRows(READER.userId as string, [iso(NOW.getTime() + 5 * MIN - 31 * 86_400_000 - 1)]);
  const fake = installFakeModel({ ask_plan: planOf({ intent: "off_topic" }) });
  try {
    await A.sendAsk(READER, { text: "Hello" }, { now: at(5 * MIN) });
  } finally {
    fake.restore();
  }
  const kept = await rowTimes(READER.userId as string);
  assert.ok(kept.every((ms) => ms >= NOW.getTime() + 5 * MIN - 31 * 86_400_000), "nothing past 31 days from the send");
  assert.ok(!kept.includes(cutoff), "the row that was exactly 31 days old at the read is 31 days and 5 minutes old at the send");
  assert.ok(!kept.includes(cutoff + 1));
});

/** Runs a message while the plan call is under way, and stops the share the moment after it began. */
async function sendWhileStopping(text: string, plan: unknown, stop: () => Promise<unknown>): Promise<{ result: Awaited<ReturnType<typeof A.sendAsk>>; answerPrompts: string[] }> {
  const answerPrompts: string[] = [];
  const fake = installFakeModel({
    ask_plan: plan,
    ask_answer: (req: { messages: Array<{ content: string }> }) => {
      answerPrompts.push(req.messages[1].content);
      return { text: "Your report says you take your time before you decide.", cards: [] };
    },
  });
  fake.delays.ask_plan = 200;
  const stopped = new Promise<void>((resolve, reject) => setTimeout(() => stop().then(() => resolve(), reject), 40));
  try {
    const result = await A.sendAsk(READER, { text }, { now: NOW });
    await stopped;
    return { result, answerPrompts };
  } finally {
    fake.restore();
  }
}

test("db, Stop sharing in the middle of a call: the report the plan chose is not quoted, and the answer is not shown it", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const shared = lib.reports.find((r) => r.reportId === R.shared)!;
  assert.ok(shared);
  const plan = planOf({ intent: "answer", tools: [{ tool: "quote", report: shared.id, section: "overview" }] });

  // The control: the grant stands for the whole call, the quote is made and the answer is shown its sharer.
  const standing = await sendWhileStopping("What does the shared report say?", plan, async () => undefined);
  assert.ok(standing.result.kind === "thread");
  assert.ok(standing.answerPrompts[0].includes("Oprah"), "while the grant stands the answer call is told whose report it is");
  assert.ok(standing.answerPrompts[0].includes("you take your time before you decide, and you like to see"), "and is given the passage the quote tool made");

  await fresh();
  const stopped = await sendWhileStopping("What does the shared report say?", plan, () => revokeShare(grant.shared, SHARER.userId as string));
  assert.ok(stopped.result.kind === "thread");
  const reply = stopped.result.thread.messages.at(-1)!;
  assert.deepEqual(reply.cards, []);
  assert.equal(stopped.answerPrompts.length, 1);
  assert.ok(!/Oprah/.test(stopped.answerPrompts[0]), "the answer call no longer holds the sharer's name");
  assert.ok(!stopped.answerPrompts[0].includes("you like to see the whole picture"), "or a word of their report");
});

test("db, Stop sharing in the middle of a call closes a pair and the person in it: no card, and the person is not in the answer call", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const george = lib.people.find((p) => p.profileId === P.closer)!;
  assert.ok(george);
  const plan = planOf({ intent: "answer", tools: [{ tool: "person", person: george.id, date: "2026-10-20" }, { tool: "quote", report: lib.reports.find((r) => r.reportId === R.closing)!.id, section: "partners02" }] });

  const standing = await sendWhileStopping("How was Tuesday for them?", plan, async () => undefined);
  assert.ok(standing.result.kind === "thread");
  assert.ok(standing.answerPrompts[0].includes("George"), "the person is named in the answer call while the pair reads");

  await fresh();
  const stopped = await sendWhileStopping("How was Tuesday for them?", plan, () => revokeShare(grant.closer, CLOSING.userId as string));
  assert.ok(stopped.result.kind === "thread");
  assert.deepEqual(stopped.result.thread.messages.at(-1)!.cards, []);
  assert.ok(!/George/.test(stopped.answerPrompts[0]), "neither person nor pair reaches the answer call");
  // The thread read afterwards shows nothing of them either.
  const read = await A.askThread(READER, { now: at(MIN) });
  assert.ok(read.messages.every((m) => m.cards.every((c) => c.kind !== "person" && c.kind !== "quote")));
});

test("db, a choice naming someone whose pair has since closed is refused as closed, costs nothing, and is gone from the thread", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const george = lib.people.find((p) => p.profileId === P.closer)!;
  const fake = installFakeModel({ ask_plan: planOf({ intent: "ask_back", question: "Who do you mean?", choices: [{ kind: "person", person: george.id }, { kind: "date", date: "2026-10-16" }] }) });
  try {
    const back = await A.sendAsk(READER, { text: "How was Friday for them?" }, { now: NOW });
    assert.ok(back.kind === "thread");
    const offered = back.thread.messages.at(-1)!.choices;
    assert.deepEqual(offered.map((c) => c.kind), ["person", "date"]);
    assert.equal(await revokeShare(grant.closer, CLOSING.userId as string), true);
    const used = (await A.askUsage(READER, at(MIN))).used;
    const calls = fake.calls.length;
    const tapped = await A.sendAsk(READER, { choiceId: offered[0].id }, { now: at(MIN) });
    assert.deepEqual(tapped, { kind: "invalid", error: "choice_not_offered", message: A.ASK_CHOICE_GONE_LINE });
    assert.equal((await A.askUsage(READER, at(2 * MIN))).used, used, "a refused tap is not a message");
    assert.equal(fake.calls.length, calls);
    const read = await A.askThread(READER, { now: at(3 * MIN) });
    assert.deepEqual(read.messages.at(-1)!.choices.map((c) => c.kind), ["date"], "the person's choice no longer shows");
  } finally {
    fake.restore();
  }
});

test("db, a stop hides each answer written from what it took: the fixed line, its words sent to no model, the count as it was (B-02)", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const own = lib.reports.find((r) => r.reportId === R.reader)!;
  const shared = lib.reports.find((r) => r.reportId === R.shared)!;
  const george = lib.people.find((p) => p.profileId === P.closer)!;
  assert.ok(own && shared && george);
  const mark = { own: `Own${run}Mk`, shared: `Shared${run}Mk`, george: `Day${run}Mk` };
  const turns = [
    { text: "What does my report say?", tools: [{ tool: "quote", report: own.id, section: "overview" }], answer: { text: `Your report says you take your time before you decide. ${mark.own}.`, cards: ["c1"] } },
    // Its card is not shown, but the text was written from it all the same.
    { text: "What does the other report say?", tools: [{ tool: "quote", report: shared.id, section: "overview" }], answer: { text: `That report says she takes her time before she decides. ${mark.shared}.`, cards: [] } },
    { text: "How was that day for him?", tools: [{ tool: "person", person: george.id, date: "2026-10-20" }], answer: { text: `The card below shows that day for him. ${mark.george}.`, cards: ["c1"] } },
    { text: "What else should I know?", tools: [], answer: { text: "Your report says you take your time before you decide.", cards: [] } },
  ];
  let turn = 0;
  const sent: string[] = [];
  const fake = installFakeModel({
    ask_plan: (req: { messages: Array<{ content: string }> }) => (sent.push(JSON.stringify(req.messages)), planOf({ intent: "answer", tools: turns[turn].tools })),
    ask_answer: (req: { messages: Array<{ content: string }> }) => (sent.push(JSON.stringify(req.messages)), turns[turn].answer),
  });
  try {
    let thread: Awaited<ReturnType<typeof A.askThread>> | null = null;
    for (turn = 0; turn < 3; turn++) {
      const result = await A.sendAsk(READER, { text: turns[turn].text }, { now: at(turn * MIN) });
      assert.ok(result.kind === "thread");
      thread = result.thread;
    }
    const answers = (t: typeof thread) => t!.messages.filter((m) => m.role === "ask");
    assert.deepEqual(answers(thread).map((m) => m.text), turns.slice(0, 3).map((t) => t.answer.text), "each answer shows while what it was written from reads");
    const used = thread!.usage.used;
    assert.equal(used, 3);

    assert.equal(await revokeShare(grant.shared, SHARER.userId as string), true);
    assert.equal(await revokeShare(grant.closer, CLOSING.userId as string), true);
    const read = await A.askThread(READER, { now: at(4 * MIN) });
    assert.deepEqual(answers(read).map((m) => m.text), [turns[0].answer.text, A.ASK_HIDDEN_LINE, A.ASK_HIDDEN_LINE]);
    assert.deepEqual(answers(read).map((m) => [m.cards.length, m.choices.length]), [[1, 0], [0, 0], [0, 0]], "the reader's own report keeps its card");
    assert.deepEqual(read.messages.filter((m) => m.role === "reader").map((m) => m.text), turns.slice(0, 3).map((t) => t.text), "the reader's own messages stay");
    assert.equal(read.usage.used, used, "hiding takes nothing off the month's count");

    sent.length = 0;
    turn = 3;
    const next = await A.sendAsk(READER, { text: turns[3].text }, { now: at(5 * MIN) });
    assert.ok(next.kind === "thread");
    assert.deepEqual(fake.calls.slice(-2), ["ask_plan", "ask_answer"]);
    const prompts = sent.join("\n");
    assert.ok(prompts.includes(mark.own), "the answer still standing goes back with the conversation");
    assert.ok(!prompts.includes(mark.shared) && !prompts.includes(mark.george), "no word of a hidden answer reaches the model");
    assert.equal(next.thread.usage.used, used + 1, "the new message counts, and only it");
  } finally {
    fake.restore();
  }
});

test("db, a stop in the middle of a call keeps an answer it took out of the answer call, though the plan was sent it (B-02)", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  await fresh();
  const lib = await A.readableLibrary(READER, P.reader);
  const shared = lib.reports.find((r) => r.reportId === R.shared)!;
  const mark = `Mid${run}Mk`;
  const first = installFakeModel({
    ask_plan: planOf({ intent: "answer", tools: [{ tool: "quote", report: shared.id, section: "overview" }] }),
    ask_answer: { text: `That report says she takes her time before she decides. ${mark}.`, cards: ["c1"] },
  });
  try {
    assert.equal((await A.sendAsk(READER, { text: "What does the other report say?" }, { now: NOW })).kind, "thread");
  } finally {
    first.restore();
  }
  const prompts = { plan: "", answer: "" };
  const second = installFakeModel({
    ask_plan: (req: { messages: Array<{ content: string }> }) => ((prompts.plan = JSON.stringify(req.messages)), planOf({ intent: "answer" })),
    ask_answer: (req: { messages: Array<{ content: string }> }) => ((prompts.answer = JSON.stringify(req.messages)), { text: "Your report says you take your time before you decide.", cards: [] }),
  });
  second.delays.ask_plan = 200;
  // The share stops once the plan call is under way: its prompt is made, and the tools and the answer call are still to come.
  const stopped = (async () => {
    for (let i = 0; i < 1000 && !second.calls.includes("ask_plan"); i++) await new Promise((resolve) => setTimeout(resolve, 2));
    await revokeShare(grant.shared, SHARER.userId as string);
  })();
  try {
    const result = await A.sendAsk(READER, { text: "And what else?" }, { now: at(MIN) });
    await stopped;
    assert.ok(result.kind === "thread");
    assert.equal(result.thread.messages[1].text, A.ASK_HIDDEN_LINE);
  } finally {
    second.restore();
  }
  assert.ok(prompts.plan.includes(mark), "the plan call began while the grant stood, so it was sent the answer");
  assert.ok(prompts.answer && !prompts.answer.includes(mark), "the answer call came after the stop, and was not");
});

test("db, a report page's report is read while the reader can read it and not after Stop sharing", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  await fresh();
  const prompts: string[] = [];
  const fake = installFakeModel({
    ask_plan: (req: { messages: Array<{ content: string }> }) => {
      prompts.push(req.messages[1].content);
      return planOf({ intent: "off_topic" });
    },
  });
  try {
    await A.sendAsk(READER, { text: "What does this say?", reportId: R.shared }, { now: NOW });
    assert.equal(await revokeShare(grant.shared, SHARER.userId as string), true);
    await A.sendAsk(READER, { text: "And now?", reportId: R.shared }, { now: at(MIN) });
  } finally {
    fake.restore();
  }
  assert.match(prompts[0], /SENT FROM REPORT: r\d/);
  assert.ok(!prompts[1].includes("SENT FROM REPORT"));
  assert.ok(!/Oprah/.test(prompts[1]));
});

test("db, a plan that names ids the call never listed gets no card: the strict shape refuses it and the reader gets the fixed line", { skip: NO_DB }, async () => {
  await fresh();
  const spent: unknown[] = [];
  const restore = setSpendSink(async (entry) => { spent.push(entry); });
  const fake = installFakeModel({
    ask_plan: planOf({ intent: "answer", tools: [{ tool: "quote", report: "r99", section: "overview" }, { tool: "person", person: "p99", date: "2026-10-20" }] }),
    ask_answer: { text: "Your report says you take your time before you decide.", cards: ["c1", "c2"] },
  });
  let result;
  try {
    result = await A.sendAsk(READER, { text: "What does the other report say?" }, { now: NOW });
  } finally {
    fake.restore();
    restore();
  }
  assert.ok(result.kind === "thread");
  const reply = result.thread.messages.at(-1)!;
  assert.deepEqual(reply.cards, []);
  assert.ok(!fake.calls.includes("ask_answer") || reply.text !== FALLBACK_LINE, "if the plan got through, the answer was written with no card to show");
  assert.ok(spent.length >= 1 && spent.every((e) => (e as { kind: string }).kind === "ask"));
});

test("db, a person's name the reader typed or Ask echoed reaches no log line, failure row or ledger entry on any path", { skip: NO_DB }, async () => {
  await fresh();
  const marker = `Zq${run}Wk`;
  const lines: string[] = [];
  const levels = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
  const loud = logger as unknown as Record<string, (...args: unknown[]) => void>;
  const kept = levels.map((level) => [level, loud[level]] as const);
  for (const level of levels) {
    loud[level] = (...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}\n${a.stack}` : typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    };
  }
  const entries: string[] = [];
  const restoreSpend = setSpendSink(async (entry) => { entries.push(JSON.stringify(entry)); });
  const failuresBefore = failureRows.length;
  const lib = await A.readableLibrary(READER, P.reader);
  const tomas = lib.people.find((p) => p.profileId === P.tomas)!;
  const fake = installFakeModel({
    ask_plan: planOf({ intent: "ask_back", question: `Did you mean <<name>> ${marker}?`, choices: [{ kind: "person", person: tomas.id }] }),
  });
  try {
    // An ask back, a tap, a tap that is not offered, a text too long, a plan that cannot be reached, a thread read.
    const back = await A.sendAsk(READER, { text: `${marker} said something on Friday`, reportId: marker }, { now: NOW });
    assert.ok(back.kind === "thread");
    await A.sendAsk(READER, { choiceId: back.thread.messages.at(-1)!.choices[0].id }, { now: at(MIN) });
    await A.sendAsk(READER, { choiceId: marker }, { now: at(2 * MIN) });
    await A.sendAsk(READER, { text: `${marker}${"x".repeat(500)}` }, { now: at(3 * MIN) });
    fake.failOn = "ask_plan";
    fake.failWith = () => Object.assign(new Error(`could not reach the model about ${marker}`), { name: "APIConnectionError" });
    await A.sendAsk(READER, { text: `${marker} again` }, { now: at(4 * MIN) });
    await A.askThread(READER, { now: at(5 * MIN) });
  } finally {
    fake.restore();
    restoreSpend();
    for (const [level, fn] of kept) loud[level] = fn;
  }
  assert.ok(lines.length > 0, "the outage was logged, by its class alone");
  assert.ok(!lines.some((l) => l.includes(marker)), "no log line holds the reader's words");
  assert.ok(!entries.some((e) => e.includes(marker)), "no ledger entry does");
  const rows = failureRows.slice(failuresBefore);
  assert.ok(rows.length > 0);
  assert.ok(!rows.some((r) => JSON.stringify(r).includes(marker)), "no failure row does");
});

test("db, the pair offer: after an answer only, once a person in a thread, with the reader's credits as the thread is read, gone with the report", { skip: NO_DB }, async () => {
  const { revokeShare } = await import("./shares.js");
  const { grantBundle } = await import("./credits.js");
  await fresh();
  const { db, usersTable, bundlesTable } = await dbm();
  const { eq } = await import("drizzle-orm");
  await db.insert(usersTable).values({ id: READER.userId as string }).onConflictDoNothing();
  await db.delete(bundlesTable).where(eq(bundlesTable.userId, READER.userId as string));
  const ANSWER = { text: "Your report says you take your time before you decide.", cards: [] };
  // Oprah's chart is shared with the reader and has no pair with her; George is in a pair Ask reads.
  const turns = [
    { text: "Oprah keeps shouting at me.", plan: planOf({ intent: "harm" }) },
    { text: "What does my week look like?", plan: planOf({ intent: "answer" }) },
    { text: "Oprah and I argued on Friday. Why?", plan: planOf({ intent: "ask_back", question: "Which Friday?", choices: [{ kind: "date", date: "2026-10-16" }] }) },
    { tap: true, plan: planOf({ intent: "answer" }) },
    { text: "What else would Oprah's chart say about it?", plan: planOf({ intent: "answer" }) },
    { text: "And George, how is he?", plan: planOf({ intent: "answer" }) },
  ];
  let turn = 0;
  const fake = installFakeModel({ ask_plan: () => turns[turn].plan, ask_answer: ANSWER });
  const offers: unknown[] = [];
  let thread: Awaited<ReturnType<typeof A.askThread>> | null = null;
  try {
    for (turn = 0; turn < turns.length; turn++) {
      const t = turns[turn];
      const body = t.tap ? { choiceId: thread!.messages.at(-1)!.choices[0].id } : { text: t.text };
      const result = await A.sendAsk(READER, body, { now: at(turn * MIN) });
      assert.ok(result.kind === "thread", `turn ${turn}`);
      thread = result.thread;
      offers.push(thread.messages.at(-1)!.offer ?? null);
    }
  } finally {
    fake.restore();
  }
  const oprah = { profileId: P.shared, name: "Oprah", credits: 0 };
  // No offer on a fixed line or a question back, nor for a name a fixed line already closed; the tap's answer offers
  // one, since the question it answers named her, and at no credits it carries 0, which the card reads as Get a credit.
  assert.deepEqual(offers, [null, null, null, oprah, null, null]);
  const offered = (t: typeof thread) => t!.messages.filter((m) => m.offer).map((m) => m.offer);
  assert.deepEqual(offered(thread), [oprah], "the first offer stays under its answer; a second answer about her offers nothing");
  assert.ok(thread!.messages.filter((m) => m.role === "reader").every((m) => m.offer === null));

  await grantBundle(READER.userId as string, "family", { test: true });
  assert.deepEqual(offered(await A.askThread(READER, { now: at(10 * MIN) })), [{ ...oprah, credits: 5 }], "the credits are the reader's as the thread is read");
  assert.equal(await revokeShare(grant.shared, SHARER.userId as string), true);
  assert.deepEqual(offered(await A.askThread(READER, { now: at(11 * MIN) })), [], "once her report closes to the reader, so does the offer");
});
