import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const {
  accessFor, giverIdOf, isSelfFor, natalReportAccess, pairReadable, pairSendStateFor, sendStateFor,
} = await import("./access.js");
const { firstWord } = await import("./names.js");

const GIVER = { userId: "user_giver", sessionId: "s-giver" };
const SUBJECT = { userId: "user_subject", sessionId: "s-subject" };
const STRANGER = { userId: "user_stranger", sessionId: "s-stranger" };
const SESSION = { userId: null, sessionId: "s-giver" };
const OTHER_SESSION = { userId: null, sessionId: "s-elsewhere" };

/** Beatrice's chart as her giver wrote it; each test moves it through Send, claim and Stop sharing. */
function beatrice(over: Partial<{ userId: string | null; sessionId: string; claimedByUserId: string | null; isSelf: boolean; claimedAsSelf: boolean }> = {}) {
  return {
    id: "p-beatrice", name: "Beatrice Rossi", userId: GIVER.userId as string | null, sessionId: GIVER.sessionId,
    claimedByUserId: null as string | null, isSelf: false, claimedAsSelf: false, ...over,
  };
}
const sent = (over = {}) => beatrice({ claimedByUserId: SUBJECT.userId, claimedAsSelf: true, ...over });
const handedOver = (over = {}) => sent({ userId: SUBJECT.userId, ...over });
const COMPLETE = { type: "natal", status: "complete" };

test("access: its writer owns it; a stranger and another account on the same cookie read nothing", () => {
  assert.equal(accessFor(GIVER, beatrice()), "owner");
  assert.equal(accessFor(STRANGER, beatrice()), null);
  assert.equal(accessFor({ userId: STRANGER.userId, sessionId: GIVER.sessionId }, beatrice()), null);
});

test("access: the claimer holds a sent report and the giver keeps reading it until Stop sharing (ADR-139, MB-84)", () => {
  assert.equal(accessFor(SUBJECT, sent()), "claimed");
  assert.equal(accessFor(GIVER, sent()), "owner");
  assert.equal(accessFor(SUBJECT, handedOver()), "claimed");
  assert.equal(accessFor(GIVER, handedOver()), null);
});

test("access: a session reads what it made until an account claims it", () => {
  const made = beatrice({ userId: null });
  assert.equal(accessFor(SESSION, made), "owner");
  assert.equal(accessFor(OTHER_SESSION, made), null);
  assert.equal(accessFor(SESSION, sent({ userId: null })), null);
});

test("access: a session's natal read follows the report's own session, as before, but never a claimed one", () => {
  const elsewhere = beatrice({ userId: null, sessionId: "s-first" });
  assert.equal(natalReportAccess(SESSION, elsewhere, { sessionId: SESSION.sessionId }), "owner");
  assert.equal(natalReportAccess(OTHER_SESSION, elsewhere, { sessionId: SESSION.sessionId }), null);
  assert.equal(natalReportAccess(SESSION, sent(), { sessionId: SESSION.sessionId }), null);
  assert.equal(natalReportAccess(SUBJECT, sent(), { sessionId: GIVER.sessionId }), "claimed");
  assert.equal(natalReportAccess(GIVER, handedOver(), { sessionId: GIVER.sessionId }), null);
});

test("isSelf is the viewer's own chart from their side: the writer's mark or the claimer's This is me (reading 16)", () => {
  assert.equal(isSelfFor(GIVER, beatrice({ isSelf: true })), true);
  assert.equal(isSelfFor(SUBJECT, sent()), true);
  assert.equal(isSelfFor(GIVER, sent()), false);
  assert.equal(isSelfFor(SUBJECT, sent({ claimedAsSelf: false })), false);
  assert.equal(isSelfFor(STRANGER, sent()), false);
});

test("the giver is named to the subject only while the giver still reads it", () => {
  assert.equal(giverIdOf(SUBJECT, sent()), GIVER.userId);
  assert.equal(giverIdOf(GIVER, sent()), null);
  assert.equal(giverIdOf(SUBJECT, handedOver()), null);
  assert.equal(giverIdOf(STRANGER, sent()), null);
});

test("send: a complete report its writer made about someone else can be sent, then reads sent, then joined", () => {
  assert.deepEqual(sendStateFor(GIVER, beatrice(), COMPLETE, null), {
    state: "can_send", profileId: "p-beatrice", relationshipId: null, firstName: "Beatrice",
  });
  assert.equal(sendStateFor(GIVER, beatrice(), COMPLETE, "beatrice@example.com")?.state, "sent");
  assert.equal(sendStateFor(GIVER, sent(), COMPLETE, null)?.state, "joined");
});

test("send: none on the viewer's own chart, before the report is complete, or for anyone but its signed-in writer", () => {
  assert.equal(sendStateFor(GIVER, beatrice({ isSelf: true }), COMPLETE, null), null);
  for (const status of ["pending", "computing", "interpreting", "revising", "failed"]) {
    assert.equal(sendStateFor(GIVER, beatrice(), { type: "natal", status }, null), null, status);
  }
  assert.equal(sendStateFor(GIVER, beatrice(), { type: "compatibility", status: "complete" }, null), null);
  assert.equal(sendStateFor(SUBJECT, sent(), COMPLETE, null), null);
  assert.equal(sendStateFor(STRANGER, beatrice(), COMPLETE, null), null);
  assert.equal(sendStateFor(SESSION, beatrice({ userId: null }), COMPLETE, null), null);
  assert.equal(sendStateFor(GIVER, handedOver(), COMPLETE, null), null);
});

const other = (over = {}) => ({
  profileId: "p-beatrice", name: "Beatrice Rossi", claimedByUserId: null as string | null, accessRole: "owner", relationshipId: "rel-1", ...over,
});

test("pair send: from one of its two to the other, at once to someone already holding their profile (ADR-133, MB-82)", () => {
  assert.deepEqual(pairSendStateFor(GIVER, "p-alex", other(), null, { status: "complete" }), {
    state: "can_send", profileId: "p-beatrice", relationshipId: "rel-1", firstName: "Beatrice",
  });
  assert.equal(pairSendStateFor(GIVER, "p-alex", other(), "beatrice@example.com")?.state, "sent");
  assert.equal(pairSendStateFor(GIVER, "p-alex", other({ claimedByUserId: SUBJECT.userId }), null)?.state, "can_grant");
  assert.equal(pairSendStateFor(GIVER, "p-alex", other({ claimedByUserId: SUBJECT.userId, accessRole: "participant" }), null)?.state, "joined");
  assert.equal(pairSendStateFor(GIVER, "p-alex", other({ relationshipId: undefined }), null)?.relationshipId, null);
});

test("pair send: none unless the viewer is one of the two, signed in, and the pair is complete", () => {
  assert.equal(pairSendStateFor(GIVER, null, other(), null), null);
  assert.equal(pairSendStateFor(GIVER, "p-beatrice", other(), null), null);
  assert.equal(pairSendStateFor(SESSION, "p-alex", other(), null), null);
  assert.equal(pairSendStateFor(GIVER, "p-alex", other({ claimedByUserId: GIVER.userId }), null), null);
  for (const status of ["interpreting", "failed"]) {
    assert.equal(pairSendStateFor(GIVER, "p-alex", other(), null, { status }), null, status);
  }
});

const REL = { userId: GIVER.userId, sessionId: GIVER.sessionId };
const alex = { profileId: "p-alex", name: "Alex Moreau", userId: GIVER.userId as string | null, sessionId: GIVER.sessionId, claimedByUserId: null as string | null, accessRole: "owner" };
const bea = { ...alex, profileId: "p-beatrice", name: "Beatrice Rossi" };
const carla = { ...alex, profileId: "p-carla", name: "Carla Nieves" };
const OPEN = { readable: true, stoppedBy: null };
const SHUT = { readable: false, stoppedBy: null };

test("pair open: its maker reads it and nobody else does", () => {
  assert.deepEqual(pairReadable(GIVER, REL, [alex, bea]), OPEN);
  assert.deepEqual(pairReadable(SUBJECT, REL, [alex, bea]), SHUT);
  assert.deepEqual(pairReadable(STRANGER, REL, [alex, bea]), SHUT);
});

test("pair shared: the other of its two reads it once it is sent, and not from a natal send alone", () => {
  const shared = { ...bea, claimedByUserId: SUBJECT.userId, accessRole: "participant" };
  assert.deepEqual(pairReadable(SUBJECT, REL, [alex, shared]), OPEN);
  assert.deepEqual(pairReadable(GIVER, REL, [alex, shared]), OPEN);
  assert.deepEqual(pairReadable(SUBJECT, REL, [alex, { ...bea, claimedByUserId: SUBJECT.userId }]), SHUT);
});

test("pair closed on either side: its maker's pair closes when either person stops sharing, naming them (MB-103)", () => {
  const beaStopped = { ...bea, userId: SUBJECT.userId, claimedByUserId: SUBJECT.userId, accessRole: "participant" };
  assert.deepEqual(pairReadable(GIVER, REL, [alex, beaStopped]), { readable: false, stoppedBy: "Beatrice" });
  assert.deepEqual(pairReadable(SUBJECT, REL, [alex, beaStopped]), OPEN);

  const carlaStopped = { ...carla, userId: STRANGER.userId, claimedByUserId: STRANGER.userId };
  assert.deepEqual(pairReadable(GIVER, REL, [carlaStopped, bea]), { readable: false, stoppedBy: "Carla" });
  assert.deepEqual(pairReadable(GIVER, REL, [bea, carlaStopped]), { readable: false, stoppedBy: "Carla" });
});

test("pair closed by its sender: Stop sharing ends the other's reading at once and leaves the maker's", () => {
  const stopped = { ...bea, claimedByUserId: SUBJECT.userId, accessRole: "owner" };
  assert.deepEqual(pairReadable(SUBJECT, REL, [alex, stopped]), SHUT);
  assert.deepEqual(pairReadable(GIVER, REL, [alex, stopped]), OPEN);
});

test("pair: a session reads its own pair until a person in it is claimed, and never names anyone", () => {
  const rel = { userId: null, sessionId: SESSION.sessionId };
  const a = { ...alex, userId: null };
  const b = { ...bea, userId: null };
  assert.deepEqual(pairReadable(SESSION, rel, [a, b]), OPEN);
  assert.deepEqual(pairReadable(OTHER_SESSION, rel, [a, b]), SHUT);
  assert.deepEqual(pairReadable(SESSION, rel, [a, { ...b, claimedByUserId: SUBJECT.userId }]), SHUT);
});

test("a gift's giver reaches nothing its recipient writes (ADR-139)", () => {
  const own = { id: "p-recipient", name: "Pierre Laurent", userId: SUBJECT.userId, sessionId: SUBJECT.sessionId, claimedByUserId: null, isSelf: true, claimedAsSelf: false };
  assert.equal(accessFor(GIVER, own), null);
  assert.equal(natalReportAccess(GIVER, own, { sessionId: SUBJECT.sessionId }), null);
  assert.equal(sendStateFor(GIVER, own, COMPLETE, null), null);
  assert.equal(isSelfFor(GIVER, own), false);
  const theirs = { userId: SUBJECT.userId, sessionId: SUBJECT.sessionId };
  const person = { profileId: "p-recipient", name: "Pierre Laurent", userId: SUBJECT.userId, sessionId: SUBJECT.sessionId, claimedByUserId: null, accessRole: "owner" };
  assert.deepEqual(pairReadable(GIVER, theirs, [person, { ...person, profileId: "p-friend", name: "Ines" }]), SHUT);
});

test("a first name is the name's first word, cut as the orbit cuts it", () => {
  assert.equal(firstWord("Beatrice Rossi"), "Beatrice");
  assert.equal(firstWord("  Jean-Luc   Picard "), "Jean-Luc");
  assert.equal(firstWord("Zoë Martin"), "Zoë");
  assert.equal(firstWord(""), "");
  assert.equal(firstWord("   "), "");
});
