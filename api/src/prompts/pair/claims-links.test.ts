/**
 * The pair side of the annex, one test per row touched (ADR-81, ADR-82):
 * claims snap or drop against the pair, link cards are dropped, snapped
 * and tagged in code, and the foundation is reconciled rather than retried.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chartFromFixture } from "../../lib/testFixtures.js";
import { cannedNatalReplies, installFakeModel } from "../../lib/testModel.js";

const { generateInterpretation } = await import("../../lib/aiInterpretation.js");
const { buildPairBrief } = await import("../../lib/pairBrief.js");
const { pairSectionById, reconcilePairClaims, foundationChecks, PAIR_FOUNDATION } = await import("./index.js");
const { linkList, linksChecks, normaliseEnding, LINK_CARD_BUFFER } = await import("./sections/links.js");
const { pairReplies } = await import("../../lib/testPair.js");
type PairBrief = import("../../lib/pairBrief.js").PairBrief;

const fake = installFakeModel(cannedNatalReplies({ drawn: true, sunSign: "scorpio", sunHouse: 11 }));
const curieReport = await generateInterpretation(chartFromFixture("marie-curie"), "Marie Curie");
fake.replies = cannedNatalReplies({ drawn: true, sunSign: "aquarius", sunHouse: 3, sect: "night" });
const winfreyReport = await generateInterpretation(chartFromFixture("oprah-winfrey"), "Oprah Winfrey");

const pair = (): PairBrief => buildPairBrief({
  lens: "partners",
  a: { name: "Marie Curie", chart: chartFromFixture("marie-curie"), interpretation: curieReport },
  b: { name: "Oprah Winfrey", chart: chartFromFixture("oprah-winfrey"), interpretation: winfreyReport },
});

const PROSE = { headline: "You meet at the door and stay there.", pattern: "You both decide late and then all at once.", claims: [] };
const cross = (b: PairBrief, i: number) => ({ kind: "cross" as const, planetA: b.cross[i].planetA, planetB: b.cross[i].planetB, aspect: b.cross[i].type, orb: b.cross[i].orb });
const source = { kind: "source" as const, report: "A" as const, section: "overview", claim: 1 };
const rules = (r: { checks: Array<{ rule: string; cls: string }> }) => r.checks.map((c) => `${c.rule}:${c.cls}`);

test("chk-01 to chk-04 (pair): refs cut, claims cut, a short quote dropped, a near-verbatim quote snapped", () => {
  const b = pair();
  const q = "You meet at the door and stay there.";
  const many = Array.from({ length: 9 }, () => ({ quote: q, evidence: [cross(b, 0), cross(b, 0), cross(b, 0), cross(b, 0)] }));
  const r = reconcilePairClaims(PROSE, many, b);
  assert.equal(r.claims.length, 8);
  assert.equal(r.claims[0].evidence.length, 3);
  assert.ok(rules(r).includes("chk-02:fix") && rules(r).includes("chk-01:fix"));
  const snap = reconcilePairClaims(PROSE, [{ quote: "you meet at the door, and stay there", evidence: [source] }, { quote: "Yo", evidence: [source] }, { quote: q, evidence: [source] }, { quote: q, evidence: [source] }], b);
  assert.equal(snap.claims[0].quote, q);
  assert.equal(snap.claims.length, 3);
  assert.ok(rules(snap).includes("chk-04:fix") && rules(snap).includes("chk-03:fix"));
});

test("chk-06, chk-08 (pair): a source that does not resolve drops its reference; an orb snaps", () => {
  const b = pair();
  const q = "You meet at the door and stay there.";
  const r = reconcilePairClaims(PROSE, [
    { quote: q, evidence: [{ ...source, section: "houses" }, source] },
    { quote: q, evidence: [{ ...cross(b, 0), orb: cross(b, 0).orb + 1 }] },
    { quote: q, evidence: [source] },
  ], b);
  assert.deepEqual(r.claims[0].evidence, [source]);
  assert.equal((r.claims[1].evidence[0] as { orb: number }).orb, b.cross[0].orb);
  assert.ok(rules(r).includes("chk-06:fix") && rules(r).includes("chk-08:fix"));
});

test("chk-09, chk-11 (pair): a cross ref outside the allocation drops; under three valid claims is a repair, never a block", () => {
  const b = pair();
  b.allocation = { partners02: [b.links[0].key] };
  const q = "You meet at the door and stay there.";
  const r = reconcilePairClaims(PROSE, [{ quote: q, evidence: [cross(b, 1)] }, { quote: q, evidence: [source] }], b, "partners02");
  assert.equal(r.claims.length, 1);
  assert.ok(rules(r).includes("chk-11:fix") && rules(r).includes("chk-09:repair"));
  assert.ok(!r.checks.some((c) => c.cls === "block"));
});

const reading = (bodies: string, tail = "Behaviour check: notice who books the table this week.") => `${bodies} meet in the small hours, when one wants the talk finished and the other wants it opened. The weekend plan gets made twice, once out loud and once in private, and the private one wins. ${tail}`;

function fullLinks(b: PairBrief) {
  return (pairReplies(b).pair_links as { links: Array<Record<string, unknown> & { reading: string }> }).links;
}

test("chk-31, chk-34: an extra, a duplicate and an unmatched card drop, a missing one is logged", () => {
  const b = pair();
  const links = fullLinks(b);
  const r = linksChecks({ links: [...links, links[0], { ...links[0], planetA: "pluto", planetB: "chiron", aspect: "square" }] } as never, b);
  assert.equal(r.output.links.length, linkList(b).length);
  assert.ok(rules(r).includes("chk-31:fix") && rules(r).includes("chk-34:fix"));
  const missing = linksChecks({ links: links.slice(1) } as never, b);
  assert.ok(missing.checks.some((c) => c.rule === "chk-31" && c.cls === "warn"));
  assert.ok(!missing.checks.some((c) => c.cls === "block"));
});

test("chk-32: a 78-word card passes inside the buffer, 90 words blocks", () => {
  const b = pair();
  const links = fullLinks(b);
  const pad = (n: number) => `Your two ${Array.from({ length: n }, () => "again").join(" ")}`;
  const base = reading("Your two").trim().split(/\s+/).length;
  const seventyEight = { ...links[0], reading: reading(pad(78 - base)) };
  const r = linksChecks({ links: [seventyEight, ...links.slice(1)] } as never, b);
  assert.ok(r.checks.some((c) => c.rule === "chk-32" && c.cls === "buffer"));
  assert.ok(!r.checks.some((c) => c.cls === "block"), r.checks.map((c) => c.message).join("\n"));
  const ninety = { ...links[0], reading: reading(pad(90 - base)) };
  assert.ok(linksChecks({ links: [ninety, ...links.slice(1)] } as never, b).checks.some((c) => c.rule === "chk-32" && c.cls === "block"));
  assert.deepEqual(LINK_CARD_BUFFER, [32, 84]);
});

test("chk-33: 'Behavior check' in any case and a two-sentence ending are normalised; no ending is logged", () => {
  assert.equal(normaliseEnding("One sentence. behavior check - notice who books."), "One sentence. Behaviour check: notice who books.");
  assert.equal(normaliseEnding("One sentence. BEHAVIOUR CHECK: notice who books. Then say so."), "One sentence. Behaviour check: notice who books. Then say so.");
  assert.equal(normaliseEnding("No ending here."), null);
  const b = pair();
  const links = fullLinks(b);
  const r = linksChecks({ links: [{ ...links[0], reading: reading("Your two", "Behavior check: notice who books the table this week. Then say so.") }, ...links.slice(1)] } as never, b);
  assert.match(r.output.links[0].reading, /Behaviour check: notice who books the table this week\. Then say so\.$/);
  assert.ok(rules(r).includes("chk-33:fix"));
  const none = linksChecks({ links: [{ ...links[0], reading: reading("Your two", "Nothing to test this week.") }, ...links.slice(1)] } as never, b);
  assert.ok(none.checks.some((c) => c.rule === "chk-33" && c.cls === "warn"));
});

test("chk-35, chk-36: flows or rubs is set from the aspect; a card naming another card's body blocks", () => {
  const b = pair();
  const links = fullLinks(b);
  const flipped = { ...links[0], kind: links[0].kind === "flows" ? "rubs" : "flows" };
  const r = linksChecks({ links: [flipped, ...links.slice(1)] } as never, b);
  assert.equal(r.output.links[0].kind, links[0].kind);
  assert.ok(rules(r).includes("chk-35:fix"));
  const third = linksChecks({ links: [{ ...links[0], reading: reading("Your Saturn and their Chiron") }, ...links.slice(1)] } as never, b);
  assert.ok(third.checks.some((c) => c.rule === "chk-36" && c.cls === "block"));
});

test("chk-37, chk-38: the foundation's numbers, duplicates, owners and scene picks are fixed in code; a rating word is logged", () => {
  const b = pair();
  const good = pairReplies(b).pair_foundation as { owners: Array<{ link: number; chapters: number[] }>; scenes: Array<{ chapter: number; index: number }>; pairThesis: string };
  const messy = {
    ...good,
    pairThesis: "Two slow deciders, rated highly.",
    owners: [...good.owners.slice(1), { link: 2, chapters: [1, 2, 3] }, { link: b.links.length + 5, chapters: [4] }],
    scenes: good.scenes.slice(1).concat([{ chapter: 2, index: 7 }]),
  };
  const r = foundationChecks(messy as never, b);
  assert.equal(r.output.owners.length, b.links.length, "every link once");
  assert.ok(r.output.owners.every((o) => o.chapters.filter((c) => c <= 6).length <= 2));
  assert.deepEqual(r.output.scenes.map((s) => s.chapter), [2, 3, 4, 5, 6]);
  assert.equal(r.output.scenes.find((s) => s.chapter === 2)!.index, 0);
  assert.ok(rules(r).includes("chk-38:fix") && rules(r).includes("chk-37:warn"));
  assert.ok(!r.checks.some((c) => c.cls === "block"));
  assert.equal(PAIR_FOUNDATION.validate, foundationChecks);
  assert.equal(pairSectionById("links")!.validate, linksChecks);
});
