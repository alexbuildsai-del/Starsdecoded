import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import {
  CreateCompatibilityReportBody,
  CreateGiftBody,
  CreateProfileBody,
  CreateRelationshipBody,
  CreateReportBody,
  GeocodePlaceQueryParams,
  HealthCheckResponse,
  createGiftBodyRecipientNameRegExp,
  createProfileBodyNameRegExp,
  createReportBodyNameRegExp,
} from "@workspace/api-zod";
import geocodeRouter from "./routes/geocode.js";
import { VALIDATION_LINE } from "./lib/validation.js";

const BIRTH = {
  birthDate: "1867-11-07", birthTime: "12:00", birthPlace: "Warsaw, Poland",
  latitude: 52.2297, longitude: 21.0122, timezoneOffset: 1,
};

const FIELDS: Array<[string, (name: string) => boolean]> = [
  ["CreateReportBody.name", (name) => CreateReportBody.safeParse({ ...BIRTH, name }).success],
  ["CreateProfileBody.name", (name) => CreateProfileBody.safeParse({ ...BIRTH, name }).success],
  ["CreateGiftBody.recipientName", (recipientName) => CreateGiftBody.safeParse({ recipientName, email: "pierre@example.com" }).success],
];

// A keyboard may send a name decomposed, so marks must pass as well as precomposed letters. A Japanese name is split by
// ・ or by the ideographic space, and Persian keeps the parts of a name like Hosseinzadeh apart with a zero-width non-joiner.
const NAMES = [
  "Zoë", "José María", "Nguyễn Thị Minh", "O'Brien", "Anne-Marie", "St. John", "Иван", "李小龙",
  "Nguyễn Thị Minh".normalize("NFD"), "O’Brien", "Marcel·lí", "a".repeat(60),
  "山田・太郎", "山田\u3000太郎", "サラ・ヤマダ".normalize("NFD"), "سارا حسین\u200Cزاده",
];

// Each breaks the rule by one character class only, so a pass names the class that slipped.
const NOT_NAMES: Array<[string, string]> = [
  ["a digit", "Anna 2"],
  ["<", "Anna <"],
  ["{", "Anna {"],
  ["a line break", "Anna\nMarie"],
  ["61 letters", "a".repeat(61)],
  ["nothing", ""],
  ["only a space", " "],
  ["only dots", "..."],
  ["only hyphens and apostrophes", "-'’-"],
  ["no letter, only a middle dot", "·"],
  ["a leading space", " Anna"],
  ["a trailing space", "Anna "],
  ["only ideographic spaces", "\u3000\u3000"],
  ["only a zero-width non-joiner", "\u200C"],
  ["no letter, only joiners around an ideographic space", "\u200C\u3000\u200C"],
  ["no letter, only the katakana middle dot", "・"],
  ["a leading ideographic space", "\u3000山田"],
  ["a trailing ideographic space", "山田\u3000"],
  ["a zero-width joiner, which the rule leaves out", "Anna\u200DMarie"],
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

test("names: every field refuses a digit, markup, a brace, a line break, a name with no letter, a space of either width at either end and more than 60 characters", () => {
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

test("geocode: the contract's q takes two characters at least, counted after the route trims it (MB-165)", () => {
  for (const q of ["", "a", "李"]) assert.ok(!GeocodePlaceQueryParams.safeParse({ q }).success, JSON.stringify(q));
  for (const q of ["ab", "東京", "Paris"]) assert.ok(GeocodePlaceQueryParams.safeParse({ q }).success, q);
});

// The route alone, so the refusal is shown to be its own and not a limit's or the prelaunch gate's in front of it.
async function serveGeocode() {
  const app = express();
  app.use(geocodeRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

test("geocode: one letter answers 400 in the plain JSON shape before Nominatim is asked, and two letters go through (MB-165)", async (t) => {
  const { base, close } = await serveGeocode();
  t.after(close);
  const realFetch = globalThis.fetch;
  const asked: string[] = [];
  // Nominatim finds nothing, so a search that passes the door ends in the route's own 404 and never leaves the process.
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith(base)) return realFetch(input, init);
    asked.push(url);
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });

  for (const query of ["?q=a", "?q=%20a%20", "?q=", ""]) {
    const res = await fetch(`${base}/geocode${query}`);
    assert.equal(res.status, 400, query);
    assert.match(res.headers.get("content-type") ?? "", /^application\/json/, query);
    const body = (await res.json()) as { error: string; message: string; issues: Array<{ path: string }> };
    assert.equal(body.error, "validation_error", query);
    assert.equal(body.message, VALIDATION_LINE, query);
    assert.deepEqual(body.issues.map((issue) => issue.path), ["q"], query);
  }
  assert.deepEqual(asked, []);

  const res = await fetch(`${base}/geocode?q=ab`);
  assert.equal(res.status, 404);
  assert.equal(asked.length, 1);
  assert.match(asked[0]!, /^https:\/\/nominatim\.openstreetmap\.org\/search\?q=ab&/);
});

test("healthz: edge is an optional yes or no, kept when the route sends it (ADR-224)", () => {
  assert.equal(HealthCheckResponse.parse({ status: "ok", edge: true }).edge, true);
  assert.equal(HealthCheckResponse.parse({ status: "ok", edge: false }).edge, false);
  assert.ok(!("edge" in HealthCheckResponse.parse({ status: "ok" })));
  for (const edge of ["true", 1, null]) {
    assert.ok(!HealthCheckResponse.safeParse({ status: "ok", edge }).success, JSON.stringify(edge));
  }
});
