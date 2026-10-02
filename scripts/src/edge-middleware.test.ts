import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// ADR-224, MB-150: the root middleware.ts runs at Vercel's edge ahead of every /api call. Its answer is read the way the
// types of @vercel/functions/middleware describe it: `x-middleware-override-headers` names the headers of the call
// upstream and `x-middleware-request-<name>` gives each value, while `next()`'s own headers go to the visitor. Vercel's
// docs cannot be reached from here, so the hop from Vercel to Railway is proven on staging, by the probe (MB-167).

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FILE = `${ROOT}middleware.ts`;
// The root package is CommonJS: an ESM import would see module.exports as `default`, and require sees what Vercel does.
const edge = createRequire(import.meta.url)(FILE) as typeof import("../../middleware.js");

// Made up here; the edge's own value lives only in the Vercel and Railway dashboards.
const EDGE = "edge-value-not-real";

/** Runs with EDGE_PROXY_SECRET set to `value`, or unset for undefined, and puts back what was there. */
function withEdge<T>(value: string | undefined, run: () => T): T {
  const before = process.env.EDGE_PROXY_SECRET;
  if (value === undefined) delete process.env.EDGE_PROXY_SECRET;
  else process.env.EDGE_PROXY_SECRET = value;
  try {
    return run();
  } finally {
    if (before === undefined) delete process.env.EDGE_PROXY_SECRET;
    else process.env.EDGE_PROXY_SECRET = before;
  }
}

function visit(extra: Record<string, string> = {}): Request {
  return new Request("https://starsdecoded-staging.vercel.app/api/reports", {
    method: "POST",
    headers: { cookie: "sd_session_id=s-1", "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.7", ...extra },
    body: "{}",
  });
}

/** The call upstream as the answer sets it: the override replaces the visitor's headers whole, and none leaves them be. */
function upstream(request: Request, answer: Response): Headers {
  const names = answer.headers.get("x-middleware-override-headers");
  if (names === null) return new Headers(request.headers);
  const headers = new Headers();
  for (const name of names.split(",")) headers.set(name, answer.headers.get(`x-middleware-request-${name}`) ?? "");
  return headers;
}

test("set, the secret rides only on the call upstream, with every header the visitor sent", () => {
  const request = visit();
  const answer = withEdge(EDGE, () => edge.default(request));
  assert.equal(answer.headers.get("x-middleware-next"), "1", "the call goes on to the rewrite");
  const sent = upstream(request, answer);
  assert.equal(sent.get("x-edge-proxy-secret"), EDGE);
  for (const [name, value] of request.headers) assert.equal(sent.get(name), value, name);
  const holding = [...answer.headers].filter(([, value]) => value.includes(EDGE)).map(([name]) => name);
  assert.deepEqual(holding, ["x-middleware-request-x-edge-proxy-secret"], "no header of the visitor's response holds it");
});

test("a value a visitor sends under the edge's name is replaced, not joined", () => {
  const request = visit({ "x-edge-proxy-secret": "forged-by-a-visitor" });
  const sent = upstream(request, withEdge(EDGE, () => edge.default(request)));
  assert.equal(sent.get("x-edge-proxy-secret"), EDGE);
});

test("unset or empty, the middleware sets nothing and the call goes upstream as it came", () => {
  for (const value of [undefined, ""]) {
    const request = visit();
    const answer = withEdge(value, () => edge.default(request));
    assert.deepEqual([...answer.headers], [["x-middleware-next", "1"]], String(value));
    assert.deepEqual([...upstream(request, answer)], [...request.headers]);
  }
});

test("it runs on /api alone, and the edge bundle is this file and one module that loads nothing", () => {
  assert.deepEqual(edge.config, { matcher: "/api/:path*" });
  const imports = (text: string) => ts.preProcessFile(text, true, true).importedFiles.map((f) => f.fileName);
  assert.deepEqual(imports(readFileSync(FILE, "utf8")), ["@vercel/functions/middleware"]);
  // The package's index and its /oidc entry pull in Node-only code that the edge runtime cannot load.
  const entry = createRequire(FILE).resolve("@vercel/functions/middleware");
  assert.deepEqual(imports(readFileSync(entry, "utf8")), []);
});
