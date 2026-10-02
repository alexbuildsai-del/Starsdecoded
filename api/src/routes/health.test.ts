import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

// The edge is judged in waitlist.ts, which shares a module with the waitlist's queries; its pool connects lazily, never here.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { HealthCheckResponse } = await import("@workspace/api-zod");
const { default: health } = await import("./health.js");

// Made up here, and past the 32 characters the variable needs to count; the edge's own lives only in the Vercel and
// Railway dashboards.
const EDGE = "edge-value-not-real-padded-to-length-x";

test("healthz says whether this one call carried the edge's value, and never sends the value back (ADR-224)", async (t) => {
  const app = express();
  app.use("/api", health);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    delete process.env.EDGE_PROXY_SECRET;
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/healthz`;
  const call = async (headers: Record<string, string> = {}) => {
    const res = await fetch(url, { headers });
    const text = await res.text();
    const body = JSON.parse(text) as Record<string, unknown>;
    assert.deepEqual(HealthCheckResponse.parse(body), body, "the contract's shape, nothing more");
    return { status: res.status, edge: body.edge, sent: [...res.headers].flat().join("\n") + text };
  };

  process.env.EDGE_PROXY_SECRET = EDGE;
  const through = await call({ "x-edge-proxy-secret": EDGE });
  assert.deepEqual([through.status, through.edge], [200, true]);
  assert.ok(!through.sent.includes(EDGE), "the value is in no header and not in the body");
  assert.equal((await call({ "x-edge-proxy-secret": "edge-value-not-ours" })).edge, false, "a wrong value");
  assert.equal((await call()).edge, false, "a call straight to Railway carries none");

  delete process.env.EDGE_PROXY_SECRET;
  assert.equal((await call({ "x-edge-proxy-secret": EDGE })).edge, false, "unset, no call is the edge's");

  // edge answers whether a guess matched, so a value short enough to guess counts as unset.
  process.env.EDGE_PROXY_SECRET = EDGE.slice(0, 31);
  assert.equal((await call({ "x-edge-proxy-secret": EDGE.slice(0, 31) })).edge, false, "31 characters is unset");
  process.env.EDGE_PROXY_SECRET = EDGE.slice(0, 32);
  assert.equal((await call({ "x-edge-proxy-secret": EDGE.slice(0, 32) })).edge, true, "32 is enough");
});

test("healthz's edge is false for a header sent twice, a near miss or an empty value, and the value is never echoed (ADR-224)", async (t) => {
  const app = express();
  app.use("/api", health);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    delete process.env.EDGE_PROXY_SECRET;
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });
  process.env.EDGE_PROXY_SECRET = EDGE;
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/healthz`;
  const edgeOf = async (headers: Headers) => {
    const res = await fetch(url, { headers });
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.ok(!text.includes(EDGE) && ![...res.headers].flat().join("\n").includes(EDGE), "the value is not echoed");
    return (JSON.parse(text) as { edge: boolean }).edge;
  };
  const twice = new Headers();
  twice.append("x-edge-proxy-secret", EDGE);
  twice.append("x-edge-proxy-secret", EDGE);
  assert.equal(await edgeOf(twice), false, "Node joins a repeated header, so it is no longer the edge's one value");
  assert.equal(await edgeOf(new Headers({ "X-Edge-Proxy-Secret": EDGE })), true, "a header name's case is nothing: HTTP lowercases it");
  assert.equal(await edgeOf(new Headers({ "x-edge-proxy-secret": `${EDGE} ` })), true, "HTTP strips the spaces round a value, as it does the edge's own");
  assert.equal(await edgeOf(new Headers({ "x-edge-proxy-secret": EDGE.toUpperCase() })), false, "another case of the value");
  assert.equal(await edgeOf(new Headers({ "x-edge-proxy-secret": "" })), false, "an empty value");
  assert.equal(await edgeOf(new Headers({ "x-vercel-forwarded-for": "203.0.113.7" })), false, "a forwarded address alone");
});
