import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX_CHARTS, REPORT_TOTAL, faultsOf, gateProblems, hasVerb, isOutOfCreditMessage, measureSection, type RunNumbers } from "./labRules.js";

const claims = () => [1, 2, 3].map(() => ({ quote: "x", evidence: [{ ref: { kind: "placement", body: "sun", sign: "scorpio", house: null }, label: "Sun" }] }));

test("a section's faults are the contract failures: method talk, a banned character, too few claims, unstructured, not written", () => {
  const clean = measureSection("mind", { howYouThink: "You read first and decide late.", claims: claims() }, undefined, false);
  assert.deepEqual(faultsOf(clean), []);
  assert.deepEqual(faultsOf(measureSection("mind", { text: "In traditional practice you wait.", claims: claims() }, undefined, false)), ['method:"in traditional practice"']);
  assert.deepEqual(faultsOf(measureSection("mind", { text: "You wait — then act.", claims: claims() }, undefined, false)), ["char:em dash"]);
  assert.deepEqual(faultsOf(measureSection("mind", { text: "You wait.", claims: [] }, undefined, false)), ["claim:only 0 claims"]);
  assert.deepEqual(faultsOf(measureSection("mind", "raw string", undefined, false)), ["unstructured", "claim:only 0 claims"]);
  assert.deepEqual(faultsOf(measureSection("mind", undefined, undefined, false)), ["not written"]);
  assert.deepEqual(faultsOf(measureSection("houses", { houses: [] }, undefined, false)), [], "the house cards carry no claims by contract");
});

test("a why without a verb is a warning, not a fault", () => {
  assert.equal(hasVerb("so you stop guessing"), true);
  assert.equal(hasVerb("for clarity"), false);
  const row = measureSection("career", { actions: [{ action: "Ask.", why: "for clarity" }], claims: claims() }, undefined, false);
  assert.equal(row.whyNotes.length, 1);
  assert.deepEqual(faultsOf(row), []);
});

function run(label: string, over: Partial<Record<string, Partial<RunNumbers>>> = {}): RunNumbers[] {
  const sections = ["overview", "triad", "houses", "mind", "career", "money", "relationships", "family", "superpowers", "discoveries", "focus"];
  return MATRIX_CHARTS.flatMap((fixture) => [
    { fixture, label, section: "foundation", words: 0, costUsd: 0.03, faults: [] },
    ...sections.map((section) => ({ fixture, label, section, words: 440, costUsd: 0.022, faults: [] as string[], ...(over[`${fixture}/${section}`] ?? {}) })),
  ]);
}

test("the gate is green on a stored pair with the same numbers", () => {
  assert.deepEqual(gateProblems(run("r06"), run("r07")), []);
});

test("the gate refuses a new fault, a total outside the band, a failed section and a cost over 110%", () => {
  const seeded = gateProblems(run("r06"), run("r07", { "marie-curie/career": { faults: ["char:em dash"] } }));
  assert.deepEqual(seeded, ["marie-curie/career: new fault char:em dash"]);
  const inherited = gateProblems(run("r06", { "marie-curie/career": { faults: ["char:em dash"] } }), run("r07", { "marie-curie/career": { faults: ["char:em dash"] } }));
  assert.deepEqual(inherited, [], "a fault the reference already carried is not new");
  const short = gateProblems(run("r06"), run("r07", { "day-angular/overview": { words: 4000 } }));
  assert.match(short[0], new RegExp(`day-angular: \\d+ words, outside ${REPORT_TOTAL[0]}-${REPORT_TOTAL[1]}`));
  const failed = gateProblems(run("r06"), run("r07", { "night-angular/focus": { status: "failed" } }));
  assert.deepEqual(failed, ["night-angular/focus: failed"]);
  const dear = gateProblems(run("r06"), run("r07").map((r) => ({ ...r, costUsd: (r.costUsd ?? 0) * 1.2 })));
  assert.equal(dear.length, 1);
  assert.match(dear[0], /20% over the reference/);
  const missing = gateProblems(run("r06"), run("r07").filter((r) => r.fixture !== "audrey-hepburn"));
  assert.deepEqual(missing, ["audrey-hepburn: no candidate run"]);
  assert.deepEqual(gateProblems([], run("r07")), ["no reference run to compare cost against"]);
});

test("the out-of-credit refusal is recognised from a status message", () => {
  assert.equal(isOutOfCreditMessage("natal:career: out of credit: 429 You have no credits remaining"), true);
  assert.equal(isOutOfCreditMessage("insufficient_quota"), true);
  assert.equal(isOutOfCreditMessage("natal:career: failed validation after 3 attempts"), false);
});
