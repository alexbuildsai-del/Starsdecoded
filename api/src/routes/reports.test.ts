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
