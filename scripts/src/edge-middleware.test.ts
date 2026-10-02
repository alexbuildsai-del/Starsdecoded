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

test("middleware headers a visitor sends are never the answer's: it rewrites nowhere and its override list is its own", () => {
  const request = visit({
    "x-middleware-rewrite": "https://evil.example/api/anything",
    "x-middleware-next": "0",
    "x-middleware-override-headers": "x-vercel-forwarded-for",
    "x-middleware-request-x-edge-proxy-secret": "forged-by-a-visitor",
    "x-middleware-set-cookie": "sd_session_id=planted",
  });
  const answer = withEdge(EDGE, () => edge.default(request));
  assert.equal(answer.headers.get("x-middleware-next"), "1", "the call goes on, as next() says, not as the visitor said");
  assert.equal(answer.headers.get("x-middleware-rewrite"), null, "no rewrite to anywhere the visitor named");
  assert.equal(answer.headers.get("x-middleware-set-cookie"), null);
  assert.equal(answer.headers.get("location"), null);
  assert.equal(answer.status, 200);
  const names = (answer.headers.get("x-middleware-override-headers") ?? "").split(",");
  for (const name of [...request.headers.keys(), "x-edge-proxy-secret"]) assert.ok(names.includes(name), `the upstream call keeps ${name}`);
  const sent = upstream(request, answer);
  assert.equal(sent.get("x-edge-proxy-secret"), EDGE, "the edge's own value, not the one forged under a middleware name");
  assert.equal(sent.get("x-vercel-forwarded-for"), "203.0.113.7", "the visitor's override list did not drop the rest");
  assert.equal(answer.headers.get("x-middleware-request-x-edge-proxy-secret"), EDGE);
});

test("unset, a visitor's middleware headers still make no answer of their own", () => {
  const request = visit({ "x-middleware-rewrite": "https://evil.example/", "x-middleware-override-headers": "cookie" });
  const answer = withEdge(undefined, () => edge.default(request));
  assert.deepEqual([...answer.headers], [["x-middleware-next", "1"]]);
});

test("a name in any case, a repeated header and a comma list reach upstream as the visitor sent them, the edge's name set once", () => {
  const request = new Request("https://starsdecoded-staging.vercel.app/api/reports", {
    method: "POST",
    headers: [
      ["X-Edge-Proxy-Secret", "forged-by-a-visitor"],
      ["x-edge-proxy-secret", "forged-again"],
      ["X-Vercel-Forwarded-For", "203.0.113.7, 76.76.21.1"],
      ["accept", "text/html"],
      ["accept", "application/json"],
      ["cookie", "sd_session_id=s-1; other=2"],
    ],
    body: "{}",
  });
  const answer = withEdge(EDGE, () => edge.default(request));
  const sent = upstream(request, answer);
  assert.equal(sent.get("x-edge-proxy-secret"), EDGE, "both forged values are gone");
  assert.equal(sent.get("x-vercel-forwarded-for"), "203.0.113.7, 76.76.21.1");
  assert.equal(sent.get("accept"), "text/html, application/json");
  assert.equal(sent.get("cookie"), "sd_session_id=s-1; other=2");
  const names = (answer.headers.get("x-middleware-override-headers") ?? "").split(",");
  assert.equal(names.filter((n) => n === "x-edge-proxy-secret").length, 1, "named once");
  assert.equal([...answer.headers].filter(([, v]) => v.includes("forged")).length, 0, "no forged value rides in the answer");
});

test("a secret with spaces or accents inside, or none of the visitor's headers at all, goes upstream as it is", () => {
  for (const value of ["two words in it", "café-edge", "a=b; c,d"]) {
    const request = visit();
    const answer = withEdge(value, () => edge.default(request));
    assert.equal(upstream(request, answer).get("x-edge-proxy-secret"), value, value);
  }
  const bare = new Request("https://starsdecoded-staging.vercel.app/api/healthz");
  const answer = withEdge(EDGE, () => edge.default(bare));
  assert.deepEqual([...upstream(bare, answer)], [["x-edge-proxy-secret", EDGE]], "a request with no headers carries the one");
  assert.equal(answer.headers.get("x-middleware-override-headers"), "x-edge-proxy-secret");
});

test("the secret rides only in a request header whatever the method or path, and the middleware reads the variable at each call", () => {
  for (const [method, path] of [["GET", "/api/healthz"], ["DELETE", "/api/reports/r-1"], ["OPTIONS", "/api"], ["GET", "/api/geocode?q=Warsaw"], ["GET", "/index.html"], ["GET", "/"]]) {
    const request = new Request(`https://mystarsdecoded.com${path}`, { method, headers: { cookie: "sd_session_id=s-1" } });
    const answer = withEdge(EDGE, () => edge.default(request));
    const holding = [...answer.headers].filter(([, value]) => value.includes(EDGE)).map(([name]) => name);
    assert.deepEqual(holding, ["x-middleware-request-x-edge-proxy-secret"], `${method} ${path}`);
    assert.equal(answer.body, null);
  }
  const request = visit();
  const first = withEdge(EDGE, () => edge.default(request));
  const second = withEdge("another-made-up-value", () => edge.default(request));
  assert.equal(first.headers.get("x-middleware-request-x-edge-proxy-secret"), EDGE);
  assert.equal(second.headers.get("x-middleware-request-x-edge-proxy-secret"), "another-made-up-value");
});

test("a secret no header can carry leaves every call as it came, never a failed one, and nothing in the answer quotes it", () => {
  for (const value of ["edge-value\u2603-not-real", "edge-value-\u{1F512}", "edge-value\nnot-real", "edge-value\rnot-real"]) {
    const request = visit();
    const answer = withEdge(value, () => edge.default(request));
    assert.deepEqual([...answer.headers], [["x-middleware-next", "1"]], JSON.stringify(value));
    assert.deepEqual([...upstream(request, answer)], [...request.headers], "the call goes upstream as it came");
  }
});

test("the secret's ends are trimmed before it is set, the same trim the API reads it with, and a blank one is unset", () => {
  for (const value of [` ${EDGE}`, `${EDGE}\t`, `\r\n${EDGE} \n`, `\u00a0${EDGE}\u00a0`, `\ufeff${EDGE}`]) {
    const request = visit();
    const answer = withEdge(value, () => edge.default(request));
    assert.equal(upstream(request, answer).get("x-edge-proxy-secret"), EDGE, JSON.stringify(value));
    assert.equal(answer.headers.get("x-middleware-request-x-edge-proxy-secret"), EDGE, JSON.stringify(value));
  }
  for (const value of [" ", "\t\n", " \r\n ", "\u00a0"]) {
    const request = visit();
    const answer = withEdge(value, () => edge.default(request));
    assert.deepEqual([...answer.headers], [["x-middleware-next", "1"]], JSON.stringify(value));
    assert.deepEqual([...upstream(request, answer)], [...request.headers]);
  }
});
