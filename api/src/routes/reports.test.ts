import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { provisionalFor, sectionIdsFor } = await import("./reports.js");

test("status: a chartless report carries thirteen provisional bodies and no angles, at offset zero", () => {
  const p = provisionalFor({ birthDate: "1867-11-07", birthTime: "12:00", latitude: 52.2297, longitude: 21.0122 });
  assert.ok(p);
  assert.equal(Object.keys(p.bodies).length, 13);
  for (const b of Object.values(p.bodies)) {
    assert.deepEqual(Object.keys(b).sort(), ["absoluteDegree", "retrograde"]);
    assert.ok(b.absoluteDegree >= 0 && b.absoluteDegree < 360);
  }
  assert.ok(!("angles" in p));
  assert.equal(p.bodies.north_node.retrograde, true);
});

test("status: a bad date reads as null rather than failing the poll", () => {
  assert.equal(provisionalFor({ birthDate: "not-a-date", birthTime: "12:00", latitude: 0, longitude: 0 }), null);
});

test("status: the section keys come from the registry the report's type uses", () => {
  assert.equal(sectionIdsFor("natal").length, 11);
  assert.ok(sectionIdsFor("natal").includes("houses"));
  assert.equal(sectionIdsFor("compatibility").length, 8);
  assert.ok(sectionIdsFor("compatibility").includes("links"));
  assert.ok(sectionIdsFor("compatibility", undefined, "people").includes("people04"));
  assert.ok(!sectionIdsFor("compatibility", undefined, "people").includes("partners04"));
  assert.ok(!sectionIdsFor("compatibility").includes("houses"));
  assert.equal(sectionIdsFor("natal", "unknown").length, 10);
  assert.ok(!sectionIdsFor("natal", "unknown").includes("houses"));
  assert.equal(sectionIdsFor("natal", "known").length, 11);
});

test("workbook PATCH: a pair's Next time tick and a pin pass the grammar; a malformed key or size is named (ADR-24, ADR-174)", async () => {
  const { workbookPatchFault } = await import("./reports.js");
  const day = "2026-10-01T09:00:00.000Z";
  assert.equal(workbookPatchFault({ "partners02.nextTime.items.0": day }), null);
  assert.equal(workbookPatchFault({ "parentChild03.nextTime.items.2": null, "career.actions.0": day }), null);
  assert.equal(workbookPatchFault({ "pin.partners02.nextTime.items.0": day, "pin.focus.practice.bullets.0": null }), null);
  for (const bad of ["pin.pin.focus.practice.bullets.0", "pin.focus", "02partners.nextTime.items.0", "career.actions"]) {
    assert.equal(workbookPatchFault({ "career.actions.0": day, [bad]: day }), `Not a workbook item key: ${bad}`);
  }
  assert.equal(workbookPatchFault({}), "A workbook patch carries 1 to 200 items");
  const many = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`career.actions.${i}`, day]));
  assert.equal(workbookPatchFault(many), "A workbook patch carries 1 to 200 items");
});

test("a failed report answers with the coded line and never the internal message (ADR-84)", async () => {
  const { failureReasonOf, FAILURE_LINES } = await import("../lib/failureReasons.js");
  assert.deepEqual(failureReasonOf("provider_unreachable"), { code: "provider_unreachable", line: FAILURE_LINES.provider_unreachable });
  const { failReport } = await import("./reports.js");
  assert.equal(typeof failReport, "function");
});

test("regenerate cooldown: the 429 body names the seconds left and matches the Retry-After it is sent with (ADR-199)", async () => {
  const { regenerateCooldown } = await import("./reports.js");
  const c = regenerateCooldown(15_000);
  assert.ok(c);
  assert.equal(c.retryAfterSeconds, 45);
  assert.deepEqual(c.body, { error: "rate_limited", message: "Please wait 45s before regenerating again", retryAfterSeconds: 45 });
  assert.equal(regenerateCooldown(59_999)?.retryAfterSeconds, 1);
  assert.equal(regenerateCooldown(60_000), null);
});

// Reading 9: three birth times of one person, as the stored chart and the profile spell them.
const T0 = { birthTime: "09:30", birthTimeWindowMinutes: 0, datetimeUtc: "1990-05-01T08:30:00.000Z" };
const T1 = { birthTime: "14:10", birthTimeWindowMinutes: 0, datetimeUtc: "1990-05-01T13:10:00.000Z" };
const T2 = { birthTime: "14:40", birthTimeWindowMinutes: 0, datetimeUtc: "1990-05-01T13:40:00.000Z" };
type Time = typeof T0;
const chartOf = (t: Time, horizon = "known") => ({ datetimeUtc: t.datetimeUtc, windowMinutes: t.birthTimeWindowMinutes, horizon: { status: horizon } });
const profileAt = (t: Time, horizon = "known") => ({ birthTime: t.birthTime, birthTimeWindowMinutes: t.birthTimeWindowMinutes, chartData: chartOf(t, horizon) });
const at = (minute: number) => new Date(Date.UTC(2026, 9, 3, 12, minute));

test("outdated: a report stamped with its profile's birth time is current; another time, window or horizon makes it outdated (reading 9)", async () => {
  const { isOutdated, writtenForStamp } = await import("./reports.js");
  const report = (horizon = "known") => ({
    id: "r1", type: "natal", status: "complete", interpretation: { meta: { horizon } },
    computeData: writtenForStamp(T0, 0), horizonPasses: 0, createdAt: at(0),
  });
  assert.equal(isOutdated(report(), profileAt(T0), []), false);
  assert.equal(isOutdated(report(), profileAt(T1), []), true, "a changed time, even with no pass on record");
  assert.equal(isOutdated(report(), { ...profileAt(T0), birthTimeWindowMinutes: 60 }, []), true, "a changed window");
  assert.equal(isOutdated(report("unknown"), profileAt(T0), []), true, "written blind, the chart now drawn");
  assert.equal(isOutdated({ ...report(), interpretation: {} }, profileAt(T0), []), false, "no stored horizon to differ");
});

test("outdated: only a complete natal report can be; one failing, being written or revised is not (reading 9)", async () => {
  const { isOutdated, writtenForStamp } = await import("./reports.js");
  const base = { id: "r1", type: "natal", interpretation: { meta: { horizon: "known" } }, computeData: writtenForStamp(T0, 0), horizonPasses: 0, createdAt: at(0) };
  for (const status of ["failed", "interpreting", "revising", "pending", "computing"]) {
    assert.equal(isOutdated({ ...base, status }, profileAt(T1), []), false, status);
  }
  assert.equal(isOutdated({ ...base, status: "complete", type: "compatibility" }, profileAt(T1), []), false);
});

test("outdated: a birth-time change passes the newest report and leaves the older one outdated, until Regenerate stamps it again (reading 9, MB-170)", async () => {
  const { isOutdated, writtenForStamp, chartKeyOf } = await import("./reports.js");
  const older = { id: "older", type: "natal", status: "complete", interpretation: { meta: { horizon: "known" } }, computeData: writtenForStamp(T0, 0), horizonPasses: 0, createdAt: at(0) };
  const newest = { ...older, id: "newest", createdAt: at(1), horizonPasses: 1 };
  const passes = [{ reportId: "newest", at: at(5), replaced: chartKeyOf(chartOf(T0)) }];
  assert.equal(isOutdated(older, profileAt(T1), passes), true);
  assert.equal(isOutdated(newest, profileAt(T1), passes), false, "the pass wrote it for the new time");
  const regenerated = { ...older, computeData: writtenForStamp(T1, 0) };
  assert.equal(isOutdated(regenerated, profileAt(T1), passes), false);
});

test("outdated: a report passed since its stamp stays current until a later change passes another report (reading 9)", async () => {
  const { isOutdated, writtenForStamp, chartKeyOf } = await import("./reports.js");
  const passed = { id: "a", type: "natal", status: "complete", interpretation: { meta: { horizon: "known" } }, computeData: writtenForStamp(T0, 0), horizonPasses: 1, createdAt: at(0) };
  const later = { ...passed, id: "b", computeData: writtenForStamp(T1, 0), horizonPasses: 1, createdAt: at(10) };
  const first = { reportId: "a", at: at(5), replaced: chartKeyOf(chartOf(T0)) };
  assert.equal(isOutdated(passed, profileAt(T1), [first]), false);
  const second = { reportId: "b", at: at(20), replaced: chartKeyOf(chartOf(T1)) };
  assert.equal(isOutdated(passed, profileAt(T2), [first, second]), true);
  assert.equal(isOutdated(later, profileAt(T2), [first, second]), false);
});

test("outdated: a report written before stamps reads its passes; a failed pass that put the time back changed nothing (reading 9)", async () => {
  const { isOutdated, chartKeyOf } = await import("./reports.js");
  const legacy = (id: string, minute: number, horizonPasses = 0) => ({
    id, type: "natal", status: "complete", interpretation: { meta: { horizon: "known" } }, computeData: null, horizonPasses, createdAt: at(minute),
  });
  const k0 = chartKeyOf(chartOf(T0));
  assert.equal(isOutdated(legacy("a", 0), profileAt(T0), []), false, "no change since it was written");
  const passB = { reportId: "b", at: at(5), replaced: k0 };
  assert.equal(isOutdated(legacy("a", 0), profileAt(T1), [passB]), true, "written before the change that passed another");
  assert.equal(isOutdated(legacy("c", 9), profileAt(T1), [passB]), false, "written after it");
  // Before MB-170 a change passed every complete report at once: each took it.
  const together = [{ reportId: "a", at: at(5), replaced: k0 }, { reportId: "b", at: new Date(at(5).getTime() + 40), replaced: k0 }];
  assert.equal(isOutdated(legacy("a", 0, 1), profileAt(T1), together), false);
  assert.equal(isOutdated(legacy("b", 1, 1), profileAt(T1), together), false);
  // A failed pass restores the profile it started from, so the chart it replaced is the profile's still.
  const failed = [{ reportId: "b", at: at(5), replaced: k0 }];
  assert.equal(isOutdated(legacy("a", 0), profileAt(T0), failed), false);
  assert.equal(isOutdated(legacy("b", 1), profileAt(T0), failed), false);
});

// Reading 10: who rewrites. The viewer shapes are the ones the routes are handed.
const WRITER = { userId: "user_writer", sessionId: "s-writer" };
const CLAIMER = { userId: "user_claimer", sessionId: "s-claimer" };
const READER = { userId: "user_reader", sessionId: "s-reader" };
const sentAndClaimed = { userId: WRITER.userId, sessionId: WRITER.sessionId, claimedByUserId: CLAIMER.userId, isSelf: false, claimedAsSelf: true };
const handedOver = { ...sentAndClaimed, userId: CLAIMER.userId, sessionId: "s-nobody" };
const ownChart = { userId: WRITER.userId, sessionId: WRITER.sessionId, claimedByUserId: null, isSelf: true, claimedAsSelf: false };
const { PROMPT_VERSION } = await import("../lib/aiInterpretation.js");
const natalOn = (status: string, sessionId = WRITER.sessionId, promptVersion: string | null = PROMPT_VERSION) => ({
  type: "natal", status, sessionId, interpretation: promptVersion ? { meta: { promptVersion } } : null,
});

test("who rewrites: the writer and the holder after a hand-over; never a shared reader, nor a claimer who does not hold the row (reading 10, MB-169)", async () => {
  const { regenerateRefusal, rightsOf } = await import("./reports.js");
  assert.equal(regenerateRefusal(WRITER, natalOn("failed"), ownChart, false), null);
  assert.equal(regenerateRefusal(CLAIMER, natalOn("failed", "s-nobody"), handedOver, false), null, "the holder after Stop sharing");
  assert.equal(regenerateRefusal(CLAIMER, natalOn("failed"), sentAndClaimed, false)?.status, 404, "the claimer while its writer holds it");
  assert.equal(regenerateRefusal(READER, natalOn("failed"), ownChart, true)?.status, 404, "a reader through a grant");
  const signedOut = { userId: null, sessionId: "s-browser" };
  const theirs = { userId: null, sessionId: "s-browser", claimedByUserId: null };
  assert.equal(regenerateRefusal(signedOut, natalOn("failed", "s-browser"), theirs, false), null, "the session that wrote it");
  assert.equal(regenerateRefusal(WRITER, { ...natalOn("failed"), type: "compatibility" }, ownChart, false)?.status, 404);

  const canRegenerate = (viewer: typeof WRITER, profile: typeof ownChart | typeof handedOver, access: "owner" | "claimed" | "shared", sessionId = WRITER.sessionId) =>
    rightsOf(viewer, { report: natalOn("complete", sessionId), profile, access, maker: false }).regenerate;
  assert.equal(canRegenerate(WRITER, ownChart, "owner"), true);
  assert.equal(canRegenerate(CLAIMER, handedOver, "claimed", "s-nobody"), true);
  assert.equal(canRegenerate(CLAIMER, sentAndClaimed, "claimed"), false);
  assert.equal(canRegenerate(READER, ownChart, "shared"), false);
});

test("regenerate runs on a failed, an outdated or an earlier-version report: a finished one that is current is refused, one being written answers in_progress (R-6.1, reading 9, MB-45, MB-137)", async () => {
  const { regenerateRefusal } = await import("./reports.js");
  assert.equal(regenerateRefusal(WRITER, natalOn("complete"), ownChart, true), null, "Regenerate on an outdated report");
  assert.equal(regenerateRefusal(WRITER, natalOn("failed"), ownChart, false), null, "Try again");
  assert.equal(regenerateRefusal(WRITER, natalOn("complete", WRITER.sessionId, "v5"), ownChart, false), null, "the earlier-version screen's Regenerate");
  assert.equal(regenerateRefusal(WRITER, natalOn("complete", WRITER.sessionId, null), ownChart, false), null, "a report from before meta");
  assert.equal(regenerateRefusal(READER, natalOn("complete", WRITER.sessionId, "v5"), ownChart, false)?.status, 404, "still only for whoever may rewrite it");
  assert.deepEqual(regenerateRefusal(WRITER, natalOn("complete"), ownChart, false), {
    status: 409, body: { error: "up_to_date", message: "This report is already up to date" },
  });
  for (const status of ["pending", "computing", "interpreting", "revising"]) {
    assert.deepEqual(regenerateRefusal(WRITER, natalOn(status), ownChart, true), {
      status: 409, body: { error: "in_progress", message: "Report is already being generated", status },
    });
  }
});

test("a shared reader reads and nothing more: no send, delete or regenerate of the sharer's, and the sharer is the one who sent it (ADR-235)", async () => {
  const { rightsOf, sharerIdOf } = await import("./reports.js");
  assert.deepEqual(rightsOf(READER, { report: natalOn("complete"), profile: ownChart, access: "shared", maker: false }), { send: false, delete: false, regenerate: false });
  assert.deepEqual(rightsOf(WRITER, { report: natalOn("complete"), profile: ownChart, access: "owner", maker: false }), { send: true, delete: true, regenerate: true });
  assert.deepEqual(rightsOf(CLAIMER, { report: natalOn("complete"), profile: sentAndClaimed, access: "claimed", maker: false }), { send: false, delete: true, regenerate: false });
  const pair = { type: "compatibility", status: "complete", sessionId: WRITER.sessionId };
  assert.deepEqual(rightsOf(READER, { report: pair, profile: ownChart, access: "participant", maker: false }), { send: false, delete: false, regenerate: false });
  assert.deepEqual(rightsOf(WRITER, { report: pair, profile: ownChart, access: null, maker: true }), { send: false, delete: true, regenerate: false }, "a closed pair is still its maker's to delete");

  assert.equal(sharerIdOf(ownChart), WRITER.userId, "the writer's own chart");
  assert.equal(sharerIdOf(sentAndClaimed), CLAIMER.userId, "a chart sent to them and claimed as theirs");
  assert.equal(sharerIdOf({ ...sentAndClaimed, claimedAsSelf: false }), null, "nobody's own chart, so no grant of it reads");
});

test("deleting your Personal report ends your sharing of that chart at once, grants and links, and no one else's (ADR-235, R-3.6)", async () => {
  const { shareEndings } = await import("./reports.js");
  const { db } = await import("@workspace/db");
  const now = new Date("2026-10-03T12:00:00.000Z");
  const [grants, links] = shareEndings(db, "p-sharer", WRITER.userId, now).map((q) => q.toSQL());
  assert.equal(
    grants.sql,
    'update "profile_shares" set "revoked_at" = $1 where ("profile_shares"."profile_id" = $2 and "profile_shares"."owner_user_id" = $3 and "profile_shares"."revoked_at" is null)',
  );
  assert.deepEqual(grants.params, [now.toISOString(), "p-sharer", WRITER.userId]);
  // Expired as well as revoked, as Stop sharing leaves a link, so a reader that checks only the expiry refuses it too.
  assert.equal(
    links.sql,
    'update "invite_tokens" set "expires_at" = $1, "revoked_at" = $2 where ("invite_tokens"."profile_id" = $3 and "invite_tokens"."kind" = $4 and "invite_tokens"."created_by_user_id" = $5 and "invite_tokens"."revoked_at" is null)',
  );
  assert.deepEqual(links.params, [now.toISOString(), now.toISOString(), "p-sharer", "share", WRITER.userId]);
});
