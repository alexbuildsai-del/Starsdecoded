/**
 * History's lines without a database (reading 9): which rows make a line,
 * what each line reads, and the order. The guarded updates run against a
 * scratch Postgres in the round's walk (R10-22).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
// The pool connects lazily and nothing here queries it.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { historyLines } = await import("./credits.js");
type HistoryRow = import("./credits.js").HistoryRow;

const at = (iso: string) => new Date(iso);
const GONE = "A report you no longer have";
const GRANTED = at("2026-09-26T10:00:00Z");

function spentOn(iso: string, names: string[], opts: { pair?: boolean; stillYours?: boolean; test?: boolean } = {}): HistoryRow {
  return {
    kind: "spent",
    grantedAt: GRANTED,
    test: opts.test ?? false,
    report: { at: at(iso), names, pair: opts.pair ?? false, stillYours: opts.stillYours ?? true },
  };
}

test("bought: a bundle is one line, its count bought", () => {
  assert.deepEqual(historyLines([{ kind: "bundle", at: GRANTED, count: 3, test: false }]), [
    { kind: "bought", count: 3, date: "2026-09-26T10:00:00.000Z", label: "3 credits bought", test: false },
  ]);
  assert.equal(historyLines([{ kind: "bundle", at: GRANTED, count: 1, test: false }])[0].label, "1 credit bought");
});

test("test: a test bundle says so and is marked, and so is a spend of one of its credits (ADR-138)", () => {
  const [five] = historyLines([{ kind: "bundle", at: GRANTED, count: 5, test: true }]);
  assert.deepEqual(five, { kind: "bought", count: 5, date: "2026-09-26T10:00:00.000Z", label: "5 test credits", test: true });
  assert.equal(historyLines([{ kind: "bundle", at: GRANTED, count: 1, test: true }])[0].label, "1 test credit");
  const [spent] = historyLines([spentOn("2026-09-27T09:00:00Z", ["Beatrice"], { test: true })]);
  assert.equal(spent.test, true);
});

test("gift: the recipient's line names the giver, the giver's is Gift to {name}, both dated the claim", () => {
  const claimedAt = at("2026-10-01T08:30:00Z");
  const received = historyLines([{ kind: "gift", side: "recipient", claimedAt, credit: { test: false }, name: "Alex" }]);
  assert.deepEqual(received, [
    { kind: "gift", count: 1, date: "2026-10-01T08:30:00.000Z", label: "A gift from Alex", test: false },
  ]);
  const given = historyLines([{ kind: "gift", side: "giver", claimedAt, credit: { test: true }, name: "Pierre" }]);
  assert.deepEqual(given, [
    { kind: "spent", count: 1, date: "2026-10-01T08:30:00.000Z", label: "Gift to Pierre", test: true },
  ]);
  assert.equal(historyLines([{ kind: "gift", side: "recipient", claimedAt, credit: { test: false }, name: null }])[0].label, "A gift");
  assert.equal(historyLines([{ kind: "gift", side: "giver", claimedAt, credit: { test: false }, name: "  " }])[0].label, "A gift you gave");
});

test("spent: a report still the viewer's reads as the report list names it, on the day it was written", () => {
  const lines = historyLines([
    spentOn("2026-09-26T11:00:00Z", ["Beatrice Young"]),
    spentOn("2026-09-27T11:00:00Z", ["Alex", "Beatrice Young"], { pair: true }),
    spentOn("2026-09-28T11:00:00Z", ["Alex"], { pair: true }),
  ]);
  assert.deepEqual(lines.map((l) => [l.kind, l.count, l.label, l.date]), [
    ["spent", 1, "Compatibility", "2026-09-28T11:00:00.000Z"],
    ["spent", 1, "Alex & Beatrice Young", "2026-09-27T11:00:00.000Z"],
    ["spent", 1, "Beatrice Young", "2026-09-26T11:00:00.000Z"],
  ]);
});

test("spent: a report that left the viewer reads like a deleted one, label and date, so no later step shows (ADR-139)", () => {
  const [moved, deleted] = historyLines([
    spentOn("2026-09-29T11:00:00Z", ["Beatrice"], { stillYours: false }),
    { kind: "spent", grantedAt: GRANTED, test: false, report: null },
  ]);
  assert.deepEqual(moved, deleted);
  assert.equal(moved.label, GONE);
  assert.equal(moved.date, GRANTED.toISOString());
});

test("returned: a gift taken back or expired makes no line, nor a waiting one, nor a claim that moved no credit", () => {
  const claimedAt = at("2026-10-01T08:30:00Z");
  const none: HistoryRow[] = [
    { kind: "gift", side: "giver", claimedAt: null, credit: null, name: "Pierre" },
    { kind: "gift", side: "giver", claimedAt: null, credit: { test: false }, name: "Marie" },
    { kind: "gift", side: "giver", claimedAt, credit: null, name: "George" },
    { kind: "gift", side: "recipient", claimedAt, credit: null, name: "Alex" },
  ];
  assert.deepEqual(historyLines(none), []);
});

test("a gift to oneself is one line each way and nets to nothing", () => {
  const claimedAt = at("2026-10-01T08:30:00Z");
  const lines = historyLines([
    { kind: "gift", side: "giver", claimedAt, credit: { test: false }, name: "Alex" },
    { kind: "gift", side: "recipient", claimedAt, credit: { test: false }, name: "Alex" },
  ]);
  const net = lines.reduce((sum, l) => sum + (l.kind === "spent" ? -l.count : l.count), 0);
  assert.equal(lines.length, 2);
  assert.equal(net, 0);
});

test("newest first; at the same instant a spend reads above the purchase; every count is positive", () => {
  const lines = historyLines([
    { kind: "bundle", at: GRANTED, count: 5, test: false },
    spentOn(GRANTED.toISOString(), ["Beatrice"]),
    { kind: "gift", side: "giver", claimedAt: at("2026-09-29T12:00:00Z"), credit: { test: false }, name: "Pierre" },
    { kind: "bundle", at: at("2026-10-02T10:00:00Z"), count: 3, test: true },
    spentOn("2026-09-27T10:00:00Z", ["Alex", "Beatrice"], { pair: true }),
  ]);
  assert.deepEqual(lines.map((l) => l.label), [
    "3 test credits",
    "Gift to Pierre",
    "Alex & Beatrice",
    "Beatrice",
    "5 credits bought",
  ]);
  assert.ok(lines.every((l) => l.count > 0));
});
