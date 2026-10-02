import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

// The edge is judged in waitlist.ts, which shares a module with the waitlist's queries; its pool connects lazily, never here.
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const { HealthCheckResponse } = await import("@workspace/api-zod");
const { default: health } = await import("./health.js");

// Made up here; the edge's own value lives only in the Vercel and Railway dashboards.
const EDGE = "edge-value-not-real";

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
});
