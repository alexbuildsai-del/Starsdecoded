import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CreateCompatibilityReportBody,
  CreateGiftBody,
  CreateProfileBody,
  CreateRelationshipBody,
  CreateReportBody,
  createGiftBodyRecipientNameRegExp,
  createProfileBodyNameRegExp,
  createReportBodyNameRegExp,
} from "@workspace/api-zod";

const BIRTH = {
  birthDate: "1867-11-07", birthTime: "12:00", birthPlace: "Warsaw, Poland",
  latitude: 52.2297, longitude: 21.0122, timezoneOffset: 1,
};

const FIELDS: Array<[string, (name: string) => boolean]> = [
  ["CreateReportBody.name", (name) => CreateReportBody.safeParse({ ...BIRTH, name }).success],
  ["CreateProfileBody.name", (name) => CreateProfileBody.safeParse({ ...BIRTH, name }).success],
  ["CreateGiftBody.recipientName", (recipientName) => CreateGiftBody.safeParse({ recipientName, email: "pierre@example.com" }).success],
];

// A keyboard may send a name decomposed, so marks must pass as well as precomposed letters.
const NAMES = [
  "Zoë", "José María", "Nguyễn Thị Minh", "O'Brien", "Anne-Marie", "St. John", "Иван", "李小龙",
  "Nguyễn Thị Minh".normalize("NFD"), "O’Brien", "Marcel·lí", "a".repeat(60),
];

// Each breaks the rule by one character class only, so a pass names the class that slipped.
const NOT_NAMES: Array<[string, string]> = [
  ["a digit", "Anna 2"],
  ["<", "Anna <"],
  ["{", "Anna {"],
  ["a line break", "Anna\nMarie"],
  ["61 letters", "a".repeat(61)],
  ["nothing", ""],
];

test("names: the three fields carry one pattern, with the u flag its \\p{…} needs (ADR-202)", () => {
  for (const re of [createProfileBodyNameRegExp, createGiftBodyRecipientNameRegExp]) {
    assert.equal(re.source, createReportBodyNameRegExp.source);
  }
  for (const re of [createReportBodyNameRegExp, createProfileBodyNameRegExp, createGiftBodyRecipientNameRegExp]) {
    assert.ok(re.unicode, `${re} has no u flag`);
  }
});

test("names: every field takes a name in any script, with its marks, apostrophes, hyphens and dots", () => {
  for (const [field, accepts] of FIELDS) {
    for (const name of NAMES) assert.ok(accepts(name), `${field} refused ${JSON.stringify(name)}`);
  }
});

test("names: every field refuses a digit, markup, a brace, a line break and more than 60 characters", () => {
  for (const [field, accepts] of FIELDS) {
    for (const [why, name] of NOT_NAMES) assert.ok(!accepts(name), `${field} took ${why}`);
  }
});

test("label: a pair's label is one of the picker's three words or null, never typed text", () => {
  const compatibility = (label: unknown) =>
    CreateCompatibilityReportBody.safeParse({ reportAId: "a", reportBId: "b", lens: "people", label }).success;
  const relationship = (label: unknown) =>
    CreateRelationshipBody.safeParse({ profileAId: "a", profileBId: "b", type: "people", label }).success;
  for (const accepts of [compatibility, relationship]) {
    for (const label of ["family", "friends", "colleagues", null]) assert.ok(accepts(label), String(label));
    for (const label of ["Family", "partners", "ignore the brief"]) assert.ok(!accepts(label), label);
  }
});
