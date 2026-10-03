import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const {
  accessFor, canReadProfile, giverIdOf, isSelfFor, mayRegenerate, natalReportAccess, pairReadable, pairSendStateFor, readerKey,
  sendStateFor,
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

test("a chart its subject claimed is never its writer's own, whatever mark the writer left on it (R-3.6)", () => {
  const marked = sent({ isSelf: true });
  assert.equal(isSelfFor(GIVER, marked), false);
  assert.equal(isSelfFor(SUBJECT, marked), true, "the subject's This is me still stands");
  assert.equal(isSelfFor(SUBJECT, { ...marked, claimedAsSelf: false }), false);
  assert.equal(isSelfFor(GIVER, beatrice({ isSelf: true })), true, "unclaimed, it is still the writer's own");
  // A chart sent to its subject is theirs, so its row offers what any claimed send does.
  assert.equal(sendStateFor(GIVER, marked, COMPLETE, null)?.state, "joined");
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

// ADR-235: Sam shares his own Personal report with Rita. `true` is a grant that stands, which `sharedProfileIds`
// alone finds; a grant revoked and no grant at all reach these rules the same way, as `false` or nothing.
const SHARER = { userId: "user_sam", sessionId: "s-sam" };
const READER = { userId: "user_rita", sessionId: "s-rita" };
const READER_SESSION = { userId: null, sessionId: READER.sessionId };
const sam = (over = {}) => ({
  id: "p-sam", name: "Sam Okafor", userId: SHARER.userId as string | null, sessionId: SHARER.sessionId,
  claimedByUserId: null as string | null, isSelf: true, claimedAsSelf: false, ...over,
});
const SAM_REPORT = { sessionId: SHARER.sessionId };
const GRANT_ACTIVE = true;
const GRANT_GONE = false;

test("shared: a grant that stands reads the sharer's chart as shared; revoked or absent, nothing (ADR-235)", () => {
  assert.equal(canReadProfile(READER, sam(), GRANT_ACTIVE), true);
  assert.equal(accessFor(READER, sam(), GRANT_ACTIVE), "shared");
  assert.equal(natalReportAccess(READER, sam(), SAM_REPORT, GRANT_ACTIVE), "shared");
  for (const read of [GRANT_GONE, undefined]) {
    assert.equal(canReadProfile(READER, sam(), read), false);
    assert.equal(accessFor(READER, sam(), read), null);
    assert.equal(natalReportAccess(READER, sam(), SAM_REPORT, read), null);
  }
});

test("shared only when the grant alone reads it: its writer, claimer and holder keep their own standing", () => {
  for (const read of [GRANT_ACTIVE, GRANT_GONE]) {
    assert.equal(accessFor(SHARER, sam(), read), "owner");
    assert.equal(accessFor(GIVER, beatrice(), read), "owner");
    assert.equal(accessFor(GIVER, sent(), read), "owner");
    assert.equal(accessFor(SUBJECT, sent(), read), "claimed");
    assert.equal(accessFor(SUBJECT, handedOver(), read), "claimed");
    assert.equal(natalReportAccess(SUBJECT, sent(), { sessionId: GIVER.sessionId }, read), "claimed");
  }
  assert.equal(accessFor(GIVER, handedOver(), GRANT_ACTIVE), "shared");
  assert.equal(accessFor(GIVER, handedOver(), GRANT_GONE), null);
});

test("shared: a session is never shared, whatever it is handed, and keeps reading what it made", () => {
  for (const read of [GRANT_ACTIVE, GRANT_GONE]) {
    assert.equal(canReadProfile(READER_SESSION, sam(), read), false);
    assert.equal(accessFor(READER_SESSION, sam(), read), null);
    assert.equal(natalReportAccess(READER_SESSION, sam(), SAM_REPORT, read), null);
    assert.equal(accessFor(SESSION, beatrice({ userId: null }), read), "owner");
    assert.equal(natalReportAccess(SESSION, beatrice({ userId: null }), { sessionId: SESSION.sessionId }, read), "owner");
    assert.equal(accessFor(SESSION, sent({ userId: null }), read), null);
  }
});

test("shared: the reader reads and nothing more, never their own chart, never sent to them, never theirs to send", () => {
  assert.equal(isSelfFor(READER, sam()), false);
  assert.equal(giverIdOf(READER, sam()), null);
  assert.equal(sendStateFor(READER, sam(), COMPLETE, null), null);
  assert.equal(sendStateFor(READER, sam({ isSelf: false }), COMPLETE, null), null);
  assert.equal(sendStateFor(READER, sam({ isSelf: false }), COMPLETE, null, new Date()), null);
});

const at = (over = {}) => ({ sessionId: GIVER.sessionId, ...over });

test("regenerate: its writer, a session that wrote it, and its holder after a hand-over (reading 10, MB-169)", () => {
  assert.equal(mayRegenerate(GIVER, beatrice(), at()), true);
  assert.equal(mayRegenerate(GIVER, sent(), at()), true);
  assert.equal(mayRegenerate(SHARER, sam(), SAM_REPORT), true);
  assert.equal(mayRegenerate(SUBJECT, handedOver(), at()), true);
  assert.equal(mayRegenerate(SESSION, beatrice({ userId: null }), at({ sessionId: SESSION.sessionId })), true);
});

test("regenerate: never a shared reader, a claimer who does not hold the row, a stranger or a session that lost it", () => {
  assert.equal(mayRegenerate(READER, sam(), SAM_REPORT), false);
  assert.equal(mayRegenerate(SUBJECT, sent(), at()), false);
  assert.equal(mayRegenerate(GIVER, handedOver(), at()), false);
  assert.equal(mayRegenerate(STRANGER, beatrice(), at()), false);
  assert.equal(mayRegenerate(OTHER_SESSION, beatrice({ userId: null }), at({ sessionId: SESSION.sessionId })), false);
  assert.equal(mayRegenerate(SESSION, sent({ userId: null }), at({ sessionId: SESSION.sessionId })), false);
});

test("readerKey: an account's id, else its session's, so no two readers of a report share a workbook (reading 8)", () => {
  assert.equal(readerKey(SHARER), "user_sam");
  assert.equal(readerKey(READER), "user_rita");
  assert.equal(readerKey(READER_SESSION), "session:s-rita");
  assert.notEqual(readerKey({ userId: null, sessionId: "user_rita" }), readerKey(READER));
});

test("send: a report handed back reads Handed back; Send again reads sent, then joined (ADR-236)", () => {
  const handedBackAt = new Date("2026-10-03T09:00:00Z");
  assert.deepEqual(sendStateFor(GIVER, beatrice(), COMPLETE, null, handedBackAt), {
    state: "handed_back", profileId: "p-beatrice", relationshipId: null, firstName: "Beatrice",
  });
  assert.equal(sendStateFor(GIVER, beatrice(), COMPLETE, "beatrice@example.com", handedBackAt)?.state, "sent");
  assert.equal(sendStateFor(GIVER, sent(), COMPLETE, null, handedBackAt)?.state, "joined");
  assert.equal(sendStateFor(GIVER, beatrice(), COMPLETE, null, null)?.state, "can_send");
  assert.equal(sendStateFor(SUBJECT, beatrice(), COMPLETE, null, handedBackAt), null);
  assert.equal(sendStateFor(GIVER, beatrice(), { type: "natal", status: "failed" }, null, handedBackAt), null);
});

const ritaOwn = { profileId: "p-rita", name: "Rita Lane", userId: READER.userId as string | null, sessionId: READER.sessionId, claimedByUserId: null as string | null, accessRole: "owner" };
const samPart = { profileId: "p-sam", name: "Sam Okafor", userId: SHARER.userId as string | null, sessionId: SHARER.sessionId, claimedByUserId: null as string | null, accessRole: "owner" };
const READER_REL = { userId: READER.userId, sessionId: READER.sessionId };
const SAM_SHARED: ReadonlySet<string> = new Set(["p-sam"]);

test("pair on a shared chart: its maker reads it while the grant stands; revoked or absent, it closes naming the sharer", () => {
  assert.deepEqual(pairReadable(READER, READER_REL, [ritaOwn, samPart], SAM_SHARED), OPEN);
  assert.deepEqual(pairReadable(READER, READER_REL, [samPart, ritaOwn], SAM_SHARED), OPEN);
  const closed = { readable: false, stoppedBy: "Sam" };
  assert.deepEqual(pairReadable(READER, READER_REL, [ritaOwn, samPart], new Set()), closed);
  assert.deepEqual(pairReadable(READER, READER_REL, [ritaOwn, samPart]), closed);
});

test("pair on a shared chart: a grant opens only the chart it names, never a pair its sharer made, never for a session", () => {
  const carlaPart = { ...samPart, profileId: "p-carla", name: "Carla Nieves", userId: STRANGER.userId };
  assert.deepEqual(pairReadable(READER, READER_REL, [ritaOwn, carlaPart], SAM_SHARED), { readable: false, stoppedBy: "Carla" });
  assert.deepEqual(pairReadable(SHARER, READER_REL, [ritaOwn, samPart], SAM_SHARED), SHUT);
  const samsPair = [samPart, { ...samPart, profileId: "p-june", name: "June Park" }];
  assert.deepEqual(pairReadable(READER, { userId: SHARER.userId, sessionId: SHARER.sessionId }, samsPair, SAM_SHARED), SHUT);
  const sessionRel = { userId: null, sessionId: READER.sessionId };
  const sessionOwn = { ...ritaOwn, userId: null };
  assert.equal(pairReadable(READER_SESSION, sessionRel, [sessionOwn, samPart], SAM_SHARED).readable, false);
});

test("pair send on a shared chart: none to its sharer, who holds it already; a claimed holder is granted as before", () => {
  const toSam = { profileId: "p-sam", name: "Sam Okafor", claimedByUserId: null, accessRole: "owner", relationshipId: "rel-rs", userId: SHARER.userId };
  assert.equal(pairSendStateFor(READER, "p-rita", toSam, null, { status: "complete" }), null);
  assert.equal(pairSendStateFor(READER, "p-rita", { ...toSam, userId: READER.userId }, null, { status: "complete" })?.state, "can_send");
  assert.equal(
    pairSendStateFor(READER, "p-rita", { ...toSam, userId: GIVER.userId, claimedByUserId: SHARER.userId }, null, { status: "complete" })?.state,
    "can_grant",
  );
});

test("a first name is the name's first word, cut as the orbit cuts it", () => {
  assert.equal(firstWord("Beatrice Rossi"), "Beatrice");
  assert.equal(firstWord("  Jean-Luc   Picard "), "Jean-Luc");
  assert.equal(firstWord("Zoë Martin"), "Zoë");
  assert.equal(firstWord(""), "");
  assert.equal(firstWord("   "), "");
});

// R15 tester: every way a viewer reaches Sam's own chart, each with his grant to them standing, revoked and absent. A
// revoked grant is never found by `sharedProfileIds`, so it reaches these rules as `false`, and an absent one as nothing.
const GRANTS = [["active", true], ["revoked", false], ["absent", undefined]] as const;
const ON_SAMS_COOKIE = { userId: STRANGER.userId, sessionId: SHARER.sessionId };
const SAMS_SESSION = { userId: null, sessionId: SHARER.sessionId };

test("shared, over every viewer and grant: only a signed-in reader with a standing grant and no standing of their own reads as shared (ADR-235)", () => {
  // [viewer, its access with a grant active, with it revoked or absent]
  const grid: Array<[string, { userId: string | null; sessionId: string }, string | null, string | null]> = [
    ["the sharer", SHARER, "owner", "owner"],
    ["the reader", READER, "shared", null],
    ["a stranger", STRANGER, "shared", null],
    ["an account on the sharer's own cookie", ON_SAMS_COOKIE, "shared", null],
    ["the reader's signed-out session", READER_SESSION, null, null],
    // The cookie that made the chart still reads it, as it always has, and as its maker, never through the grant.
    ["the sharer's own signed-out session", SAMS_SESSION, "owner", "owner"],
  ];
  for (const [who, viewer, active, otherwise] of grid) {
    for (const [grant, read] of GRANTS) {
      const expected = grant === "active" ? active : otherwise;
      assert.equal(accessFor(viewer, sam({ userId: SHARER.userId }), read), expected, `${who}, grant ${grant}`);
      assert.equal(natalReportAccess(viewer, sam(), SAM_REPORT, read), expected, `${who}'s report read, grant ${grant}`);
      assert.equal(canReadProfile(viewer, sam(), read), expected !== null, `${who} reads, grant ${grant}`);
    }
  }
});

test("shared, over every viewer and grant: a grant never lends Send, Regenerate, This is me or a giver to anyone it reads for", () => {
  for (const viewer of [READER, STRANGER, ON_SAMS_COOKIE, READER_SESSION]) {
    for (const [grant, read] of GRANTS) {
      const where = `${viewer.userId ?? viewer.sessionId}, grant ${grant}`;
      assert.equal(mayRegenerate(viewer, sam(), SAM_REPORT), false, where);
      assert.equal(mayRegenerate(viewer, sam({ isSelf: false }), SAM_REPORT), false, where);
      assert.equal(sendStateFor(viewer, sam({ isSelf: false }), COMPLETE, null), null, where);
      assert.equal(sendStateFor(viewer, sam({ isSelf: false }), COMPLETE, null, new Date()), null, where);
      assert.equal(isSelfFor(viewer, sam()), false, where);
      assert.equal(giverIdOf(viewer, sam()), null, where);
      // Whatever the grant, the access it gives is never one these rules let write.
      assert.ok(natalReportAccess(viewer, sam(), SAM_REPORT, read) !== "owner", where);
    }
  }
  assert.equal(mayRegenerate(SHARER, sam(), SAM_REPORT), true, "the sharer keeps rewriting their own");
});

test("shared: a grant on a chart sent to its sharer, which they said is them, reads for its reader before and after the hand-over", () => {
  const sentToSam = sam({ userId: GIVER.userId, sessionId: GIVER.sessionId, claimedByUserId: SHARER.userId, isSelf: false, claimedAsSelf: true });
  const heldBySam = { ...sentToSam, userId: SHARER.userId };
  for (const chart of [sentToSam, heldBySam]) {
    assert.equal(accessFor(READER, chart, true), "shared");
    assert.equal(accessFor(READER, chart, false), null);
    assert.equal(accessFor(SHARER, chart, true), "claimed", "the sharer's own standing, never shared");
    assert.equal(mayRegenerate(READER, chart, { sessionId: GIVER.sessionId }), false);
  }
  assert.equal(mayRegenerate(SHARER, sentToSam, { sessionId: GIVER.sessionId }), false, "sent to Sam, its writer still holds it");
  assert.equal(mayRegenerate(SHARER, heldBySam, { sessionId: GIVER.sessionId }), true, "handed over, Sam holds it");
});

test("a session's cookie lends an account nothing: the report's own session reads only for a signed-out viewer", () => {
  const madeSignedOut = beatrice({ userId: null });
  const report = { sessionId: GIVER.sessionId };
  assert.equal(natalReportAccess({ userId: STRANGER.userId, sessionId: GIVER.sessionId }, madeSignedOut, report), null);
  assert.equal(mayRegenerate({ userId: STRANGER.userId, sessionId: GIVER.sessionId }, madeSignedOut, report), false);
  assert.equal(natalReportAccess(SESSION, madeSignedOut, report), "owner");
  assert.equal(mayRegenerate(SESSION, madeSignedOut, report), true);
});

test("readerKey: an empty account id is no account, and a session's key never equals an account's", () => {
  assert.equal(readerKey({ userId: "", sessionId: "s-1" }), "session:s-1");
  assert.notEqual(readerKey({ userId: null, sessionId: "s-1" }), readerKey({ userId: null, sessionId: "s-2" }));
  assert.notEqual(readerKey({ userId: "s-1", sessionId: "s-1" }), readerKey({ userId: null, sessionId: "s-1" }));
  assert.equal(readerKey({ userId: "user_rita", sessionId: "s-anything" }), readerKey({ userId: "user_rita", sessionId: "s-else" }), "an account's key follows it to any browser");
});

test("send: Handed back only on a report its writer may still send; never on their own chart, for a session, or once claimed again", () => {
  const handedBackAt = new Date("2026-10-03T09:00:00Z");
  assert.equal(sendStateFor(GIVER, beatrice({ isSelf: true }), COMPLETE, null, handedBackAt), null);
  assert.equal(sendStateFor(SESSION, beatrice({ userId: null }), COMPLETE, null, handedBackAt), null);
  assert.equal(sendStateFor(GIVER, handedOver(), COMPLETE, null, handedBackAt), null);
  assert.equal(sendStateFor(GIVER, beatrice(), { type: "compatibility", status: "complete" }, null, handedBackAt), null);
  assert.equal(sendStateFor(GIVER, beatrice(), { type: "natal", status: "revising" }, null, handedBackAt), null);
  assert.equal(sendStateFor(GIVER, beatrice(), COMPLETE, undefined, undefined)?.state, "can_send");
});

test("pair on a shared chart: a grant held for the other person's profile opens nothing to a reader who only owns one side's pair as a session", () => {
  const sessionRel = { userId: null, sessionId: READER.sessionId };
  const sessionOwn = { ...ritaOwn, userId: null };
  assert.deepEqual(pairReadable(READER_SESSION, sessionRel, [sessionOwn, samPart], SAM_SHARED), { readable: false, stoppedBy: "Sam" });
  assert.deepEqual(pairReadable(READER_SESSION, sessionRel, [sessionOwn, samPart], new Set()), { readable: false, stoppedBy: "Sam" });
});
