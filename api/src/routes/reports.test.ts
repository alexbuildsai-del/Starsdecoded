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
  assert.equal(sectionIdsFor("compatibility").length, 10);
  assert.ok(sectionIdsFor("compatibility").includes("links"));
  assert.ok(!sectionIdsFor("compatibility").includes("houses"));
  assert.equal(sectionIdsFor("natal", "unknown").length, 10);
  assert.ok(!sectionIdsFor("natal", "unknown").includes("houses"));
  assert.equal(sectionIdsFor("natal", "known").length, 11);
});
