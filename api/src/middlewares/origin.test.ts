import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express, { type Express } from "express";
import { apiHeaders, originAllowed, originGuard, webOrigins } from "./origin.js";

const EVIL = "https://evil.example";
const WRITES = ["POST", "PUT", "PATCH", "DELETE"];

async function serve(app: Express) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

function call(base: string, method: string, path: string, origin?: string, body?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin !== undefined) headers.origin = origin;
  return fetch(`${base}${path}`, { method, headers, body: body ?? (WRITES.includes(method) ? "{}" : undefined) });
}

function accessControl(res: Response): string[] {
  return [...res.headers.keys()].filter((name) => name.startsWith("access-control-"));
}

test("unset, the list is production, www, the staging alias and the previews", () => {
  const origins = webOrigins({});
  for (const ok of [
    "https://mystarsdecoded.com",
    "https://www.mystarsdecoded.com",
    "https://starsdecoded-staging.vercel.app",
    "https://starsdecoded-git-round-r13-alex.vercel.app",
    "https://starsdecoded-k3j9x2abc-alex.vercel.app",
  ]) {
    assert.equal(originAllowed(ok, origins), true, ok);
  }
  for (const foreign of [
    EVIL,
    "null",
    "",
    "http://mystarsdecoded.com",
    "https://mystarsdecoded.com.evil.example",
    "https://evil-mystarsdecoded.com",
    "https://staging.mystarsdecoded.com",
    "http://starsdecoded-staging.vercel.app",
    "https://starsdecoded-.vercel.app",
    "https://starsdecoded-a.b.vercel.app",
    "https://starsdecoded-x.vercel.app.evil.example",
    "https://evil-starsdecoded-x.vercel.app",
    "https://starsdecoded.vercel.app",
    "https://starsdecoded-x.vercel.app:8443",
    "http://localhost:5173",
    "https://mystarsdecoded.com, https://evil.example",
  ]) {
    assert.equal(originAllowed(foreign, origins), false, foreign);
  }
});

test("WEB_ORIGINS replaces the list, takes commas or spaces, and a pasted slash or capital", () => {
  const origins = webOrigins({ WEB_ORIGINS: " https://Example.org/ ,https://preview-*.example.org  https://b.example.org" });
  assert.equal(originAllowed("https://example.org", origins), true);
  assert.equal(originAllowed("https://b.example.org", origins), true);
  assert.equal(originAllowed("https://preview-abc-1.example.org", origins), true);
  assert.equal(originAllowed("https://preview-a.evil.example.org", origins), false);
  assert.equal(originAllowed("https://previewxexample.org", origins), false);
  assert.equal(originAllowed("https://mystarsdecoded.com", origins), false);
  assert.deepEqual(webOrigins({ WEB_ORIGINS: " , " }), webOrigins({}));
});

test("under development with none set every Origin passes but null; set, the list holds there too", () => {
  const dev = webOrigins({ NODE_ENV: "development" });
  for (const ok of ["http://localhost:5173", "http://127.0.0.1:8080", EVIL]) assert.equal(originAllowed(ok, dev), true, ok);
  assert.equal(originAllowed("null", dev), false);
  const listed = webOrigins({ NODE_ENV: "development", WEB_ORIGINS: "http://localhost:5173" });
  assert.equal(originAllowed("http://localhost:5173", listed), true);
  assert.equal(originAllowed("http://localhost:3000", listed), false);
  assert.equal(originAllowed("http://localhost:5173", webOrigins({ NODE_ENV: "production" })), false);
});

test("a write from a foreign Origin, null included, answers 403; ours, a preview's and none pass", async (t) => {
  const app = express();
  app.use(originGuard(webOrigins({})));
  app.all("/{*any}", (_req, res) => {
    res.json({ ok: true });
  });
  const { base, close } = await serve(app);
  t.after(close);

  for (const method of WRITES) {
    for (const origin of [EVIL, "null", "https://starsdecoded-x.vercel.app.evil.example"]) {
      const res = await call(base, method, "/api/reports", origin);
      assert.equal(res.status, 403, `${method} ${origin}`);
      const body = (await res.json()) as { error: string; message: unknown };
      assert.equal(body.error, "forbidden_origin");
      assert.equal(typeof body.message, "string");
    }
    for (const origin of [undefined, "https://mystarsdecoded.com", "https://starsdecoded-staging.vercel.app", "https://starsdecoded-git-x-alex.vercel.app"]) {
      const res = await call(base, method, "/api/reports", origin);
      assert.equal(res.status, 200, `${method} ${origin ?? "no Origin"}`);
    }
  }
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    const res = await call(base, method, "/api/reports", EVIL);
    assert.equal(res.status, 200, `${method} from a foreign Origin is a read`);
  }
});

test("every answer, Express's own 404 included, is unsniffable, unframeable and sends no CORS header", async (t) => {
  const app = express();
  app.use(apiHeaders());
  app.get("/api/ok", (_req, res) => {
    res.json({ ok: true });
  });
  // What Clerk's handshake appends on its way to a redirect.
  app.get("/api/handshake", (_req, res) => {
    res.appendHeader("Access-Control-Allow-Origin", "null");
    res.appendHeader("Access-Control-Allow-Credentials", "true");
    res.appendHeader("Location", "/api/ok");
    res.status(307).end();
  });
  const { base, close } = await serve(app);
  t.after(close);

  for (const path of ["/api/ok", "/api/missing", "/api/handshake"]) {
    const res = await fetch(`${base}${path}`, { headers: { origin: EVIL }, redirect: "manual" });
    assert.equal(res.headers.get("x-content-type-options"), "nosniff", path);
    assert.match(res.headers.get("content-security-policy") ?? "", /(^|; )frame-ancestors 'none'$/, path);
    assert.deepEqual(accessControl(res), [], path);
  }
});

test("as app.ts mounts them: no CORS anywhere, the guard ahead of the waitlist and the parsers, a 32 kB cap", async (t) => {
  process.env.OPENAI_API_KEY ??= "test-key-never-sent";
  process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
  process.env.LOG_LEVEL = "silent";
  process.env.NODE_ENV = "test";
  delete process.env.WEB_ORIGINS;
  const { default: app } = await import("../app.js");
  const { base, close } = await serve(app);
  t.after(close);

  const health = await call(base, "GET", "/api/healthz", EVIL);
  assert.equal(health.status, 200);
  assert.deepEqual(accessControl(health), []);
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.equal(health.headers.get("content-security-policy"), "frame-ancestors 'none'");

  // Health answers ahead of every middleware, so these two show that nothing later in the chain adds CORS either.
  const preflight = await fetch(`${base}/api/waitlist`, {
    method: "OPTIONS",
    headers: { origin: EVIL, "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
  });
  assert.deepEqual(accessControl(preflight), []);
  const ours = await call(base, "POST", "/api/waitlist", "https://mystarsdecoded.com");
  assert.notEqual(ours.status, 403);
  assert.deepEqual(accessControl(ours), []);

  const foreign = await call(base, "POST", "/api/waitlist", EVIL);
  assert.equal(foreign.status, 403);
  assert.equal(((await foreign.json()) as { error: string }).error, "forbidden_origin");
  assert.deepEqual(accessControl(foreign), []);
  assert.equal(foreign.headers.get("set-cookie"), null);

  const big = JSON.stringify({ email: "a@example.com", pad: "x".repeat(33 * 1024) });
  const refusedUnread = await call(base, "POST", "/api/waitlist", EVIL, big);
  assert.equal(refusedUnread.status, 403);
  const tooLarge = await call(base, "POST", "/api/waitlist", undefined, big);
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.headers.get("x-content-type-options"), "nosniff");
  assert.match(tooLarge.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
});
