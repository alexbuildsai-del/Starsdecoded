/**
 * The geocode route in-process (MB-49): it reads no database, so the router runs alone behind the request logger app.ts
 * puts in front of it. Nominatim is stubbed and the zone table is the one on disk, so nothing leaves the machine.
 */
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import pinoHttp from "pino-http";
import { GeocodePlaceResponse } from "@workspace/api-zod";
import { offsetAtBirth } from "@workspace/engine";
import { createLogger, httpSerializers } from "../lib/logger.js";
import geocodeRouter from "./geocode.js";

/** What the stub answers in Nominatim's place: a status and a body, or no connection at all. */
type Upstream = { status: number; body: string } | "down";

// NOT RECORDED: Nominatim is out of reach here, so these hits are built to its documented jsonv2 shape, trimmed to what
// the route reads.
const IXELLES = {
  display_name: "Ixelles - Elsene, Brussels-Capital, Belgium",
  lat: "50.8333",
  lon: "4.3667",
  category: "boundary",
  type: "administrative",
  addresstype: "town",
  importance: 0.52,
  address: { town: "Ixelles - Elsene", state: "Brussels-Capital", country: "Belgium", country_code: "be" },
};
// The middle of the North Sea, past any country's waters: the table answers Etc/GMT there.
const DOGGER_BANK = { display_name: "Dogger Bank", lat: "54.75", lon: "2.25", category: "natural", type: "shoal", importance: 0.41 };
const SILVER_PIT = { display_name: "Silver Pit", lat: "54.5", lon: "3.0", category: "natural", type: "bay", importance: 0.2 };

const answer = (hits: unknown): Upstream => ({ status: 200, body: JSON.stringify(hits) });

async function serve(t: TestContext) {
  const lines: string[] = [];
  const app = express();
  app.use(pinoHttp({ logger: createLogger({ LOG_LEVEL: "info" }, { write: (s: string) => void lines.push(s) }), serializers: httpSerializers }));
  app.use("/api", geocodeRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const realFetch = globalThis.fetch;
  const calls: Array<{ url: string; headers: Headers }> = [];
  let upstream: Upstream = answer([]);
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({ url, headers: new Headers(init?.headers) });
    if (upstream === "down") throw new TypeError("fetch failed");
    return new Response(upstream.body, { status: upstream.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  return {
    calls,
    log: () => lines.join(""),
    nominatim(next: Upstream) {
      upstream = next;
    },
    async search(q: string, headers: Record<string, string> = {}) {
      const res = await realFetch(`${base}/api/geocode?q=${encodeURIComponent(q)}`, { headers });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    },
  };
}

test("Ixelles answers Europe/Brussels from one Nominatim call, our User-Agent and the reader's language on it, and no zone service is asked", async (t) => {
  const api = await serve(t);
  api.nominatim(answer([IXELLES]));
  const { status, body } = await api.search("Ixelles", { "accept-language": "en-GB,en;q=0.9" });
  const today = new Date().toISOString().slice(0, 10);

  assert.equal(status, 200);
  assert.deepEqual(GeocodePlaceResponse.parse(body), body, "the contract's shape, nothing more");
  assert.deepEqual(body.results, [{
    name: "Ixelles - Elsene, Brussels-Capital, Belgium",
    city: "Ixelles - Elsene",
    region: "Brussels-Capital",
    country: "Belgium",
    latitude: 50.8333,
    longitude: 4.3667,
    timezoneOffset: offsetAtBirth("Europe/Brussels", today, "12:00"),
    timezone: "Europe/Brussels",
    placeType: "town",
  }]);

  assert.equal(api.calls.length, 1, "one call, to Nominatim alone: no timeapi.io");
  const [call] = api.calls;
  assert.equal(call.url, "https://nominatim.openstreetmap.org/search?q=Ixelles&format=jsonv2&limit=10&addressdetails=1");
  assert.equal(call.headers.get("user-agent"), "StarsDecoded/1.0 (natal chart app)");
  assert.equal(call.headers.get("accept-language"), "en-GB,en;q=0.9");

  await api.search("Ixelles", { "accept-language": `en-GB,en;q=0.9,${"x".repeat(200)}` });
  await api.search("Ixelles", { "accept-language": "en<script>" });
  assert.deepEqual(api.calls.slice(1).map((c) => c.headers.get("accept-language")), [null, null], "a value that is no list of language tags stays behind");
  assert.ok(!api.log().includes("Ixelles"), "what was typed is in no log line");
});

test("a hit at sea is dropped, and the town found with it stays", async (t) => {
  const api = await serve(t);
  api.nominatim(answer([DOGGER_BANK, IXELLES, SILVER_PIT]));
  const { status, body } = await api.search("Ixelles");
  assert.equal(status, 200);
  const results = GeocodePlaceResponse.parse(body).results;
  assert.deepEqual(results.map((r) => [r.name, r.timezone]), [["Ixelles - Elsene, Brussels-Capital, Belgium", "Europe/Brussels"]]);
});

test("a search whose every hit lies at sea answers 422 no_zone with the line the field shows (ADR-246)", async (t) => {
  const api = await serve(t);
  api.nominatim(answer([DOGGER_BANK, SILVER_PIT]));
  const { status, body } = await api.search("Dogger Bank");
  assert.equal(status, 422);
  assert.deepEqual(body, { error: "no_zone", message: "Pick a nearby town." });
  assert.equal(api.calls.length, 1);
});

test("Nominatim down, refusing or answering no list of places is 502; a search it finds nothing for stays 404", async (t) => {
  const api = await serve(t);
  const failures: Array<[string, Upstream]> = [
    ["no connection", "down"],
    ["a 503", { status: 503, body: "Service Unavailable" }],
    ["a 429", { status: 429, body: '{"error":"Too many requests"}' }],
    ["a body that is not JSON", { status: 200, body: "<html>Bad gateway</html>" }],
    ["an error object in place of the list", answer({ error: "Nothing to search for" })],
    ["a list holding something that is no hit", answer([IXELLES, { display_name: "Ixelles" }])],
  ];
  for (const [why, upstream] of failures) {
    api.nominatim(upstream);
    const { status, body } = await api.search("Ixelles");
    assert.equal(status, 502, why);
    assert.deepEqual(body, { error: "geocode_failed", message: "Geocoding service unavailable" }, why);
  }
  assert.equal(api.calls.length, failures.length, "one call a search, never a retry");

  api.nominatim(answer([]));
  const none = await api.search("Ixelles");
  assert.deepEqual([none.status, none.body], [404, { error: "not_found", message: "Place not found" }]);

  const log = api.log();
  assert.ok(log.includes('"msg":"Geocoding service unreachable"') && log.includes('"failure":"TypeError"'), "the failure is logged by its class");
  assert.ok(log.includes('"status":503'), "a refusal by its status");
  assert.ok(!log.includes("Ixelles") && !log.includes("Bad gateway"), "neither what was typed nor what Nominatim said");
});
