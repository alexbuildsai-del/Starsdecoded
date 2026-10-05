import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

process.env.OPENAI_API_KEY ??= "test-key-never-sent";
process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
process.env.NODE_ENV = "test";
// Clerk's middleware throws without a key pair. These name no instance, and a request with no token is never verified, so
// nothing leaves the process; the admin's guard then answers for the prompt editor's path.
process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from("clerk.example.com$").toString("base64")}`;
process.env.CLERK_SECRET_KEY = "test-secret-never-sent";
process.env.CLERK_TELEMETRY_DISABLED = "1";
delete process.env.WEB_ORIGINS;
delete process.env.ADMIN_USER_ID;
const { default: app } = await import("./app.js");

async function serve() {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

function send(base: string, method: string, path: string, body: string, headers: Record<string, string> = {}) {
  return fetch(`${base}${path}`, { method, headers: { "content-type": "application/json", ...headers }, body });
}

function bodyOf(kilobytes: number): string {
  return JSON.stringify({ template: "x".repeat(kilobytes * 1024) });
}

test("a 40 kB body is refused everywhere but the prompt editor's save and Preview, which the admin's guard answers before any parse", async (t) => {
  const { base, close } = await serve();
  t.after(close);

  for (const [method, path] of [
    ["POST", "/api/waitlist"],
    ["POST", "/api/reports"],
    ["PUT", "/api/admin/promptsx/natal:system"],
    ["POST", "/api/admin/lab/runs"],
    ["POST", "/api/admin/prompts/previewx"],
  ]) {
    const res = await send(base, method!, path!, bodyOf(40));
    assert.equal(res.status, 413, `${method} ${path}`);
  }
  // Parsed ahead of the guard, 257 kB would answer 413.
  for (const [method, path] of [
    ["PUT", "/api/admin/prompts/pair:system"],
    ["POST", "/api/admin/prompts/preview"],
  ]) {
    for (const kilobytes of [40, 257]) {
      const res = await send(base, method!, path!, bodyOf(kilobytes));
      assert.equal(res.status, 503, `${method} ${path} ${kilobytes} kB`);
      assert.equal(((await res.json()) as { error: string }).error, "admin_disabled");
    }
  }
});

test("the admin's prompt save and Preview are parsed after the guard, up to 256 kB", async (t) => {
  const { default: express } = await import("express");
  const { jsonBody, requestErrorHandler } = await import("./app.js");
  const { logger } = await import("./lib/logger.js");
  const { default: adminPrompts } = await import("./routes/adminPrompts.js");
  const before = process.env.ADMIN_USER_ID;
  process.env.ADMIN_USER_ID = "user_admin";
  t.after(() => {
    if (before === undefined) delete process.env.ADMIN_USER_ID;
    else process.env.ADMIN_USER_ID = before;
  });

  // app.ts's order, with a stub where Clerk and the session stand.
  const mini = express();
  mini.use((req, _res, next) => {
    req.userId = req.header("x-user") || null;
    req.log = logger;
    next();
  });
  mini.use(jsonBody);
  mini.use("/api", adminPrompts);
  mini.use(requestErrorHandler);
  const server = mini.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const at = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const admin = { "x-user": "user_admin" };

  // An unknown key is answered past the parser, so nothing is written and no database is needed.
  const saved = await send(at, "PUT", "/api/admin/prompts/no-such-key", bodyOf(40), admin);
  assert.equal(saved.status, 404);
  assert.equal(((await saved.json()) as { error: string }).error, "not_found");
  assert.equal((await send(at, "PUT", "/api/admin/prompts/no-such-key", bodyOf(257), admin)).status, 413);
  // The body names no prompt, so Preview answers 400 past the parser and no model is called.
  const preview = await send(at, "POST", "/api/admin/prompts/preview", bodyOf(40), admin);
  assert.equal(preview.status, 400);
  assert.equal(((await preview.json()) as { error: string }).error, "bad_request");
  assert.equal((await send(at, "POST", "/api/admin/prompts/preview", bodyOf(257), admin)).status, 413);

  const other = await send(at, "PUT", "/api/admin/prompts/no-such-key", bodyOf(257), { "x-user": "user_reader" });
  assert.equal(other.status, 403, "a signed-in reader who is not the admin meets the guard first");
  const otherPreview = await send(at, "POST", "/api/admin/prompts/preview", bodyOf(257), { "x-user": "user_reader" });
  assert.equal(otherPreview.status, 403, "and so does Preview");
});

test("a CSP report is taken ahead of the origin guard and the session", async (t) => {
  const { base, close } = await serve();
  t.after(close);

  const report = JSON.stringify({
    "csp-report": {
      "document-uri": "https://mystarsdecoded.com/",
      "effective-directive": "script-src-elem",
      "blocked-uri": "inline",
    },
  });
  for (const origin of ["https://evil.example", "null"]) {
    const res = await send(base, "POST", "/api/csp-report", report, { "content-type": "application/csp-report", origin });
    assert.equal(res.status, 204, origin);
    assert.equal(res.headers.get("set-cookie"), null, origin);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  }
  const write = await send(base, "POST", "/api/waitlist", "{}", { origin: "https://evil.example" });
  assert.equal(write.status, 403, "any other write from that Origin is still refused");
});

test("a malformed or over-limit body gets a JSON refusal and nothing of it reaches the log", async (t) => {
  const { base, close } = await serve();
  t.after(close);

  // Express's default handler would print the error, with a few characters of the body, to stderr.
  const written: string[] = [];
  const { write: stderrWrite } = process.stderr;
  const { write: stdoutWrite } = process.stdout;
  // Kept and passed on: the test runner sends the result of the test before this one down stdout, and a write swallowed
  // here lost that result from the run's count.
  const capture = (stream: NodeJS.WriteStream, write: typeof stream.write) =>
    ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      written.push(String(chunk));
      return Reflect.apply(write, stream, [chunk, ...rest]);
    }) as typeof stream.write;
  process.stderr.write = capture(process.stderr, stderrWrite);
  process.stdout.write = capture(process.stdout, stdoutWrite);
  t.after(() => {
    process.stderr.write = stderrWrite;
    process.stdout.write = stdoutWrite;
  });

  const secret = "Marguerite-Oyelaran-1987";
  const malformed = await send(base, "POST", "/api/waitlist", `{"name":"${secret}",`);
  assert.equal(malformed.status, 400);
  assert.match(malformed.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await malformed.json(), { error: "bad_request" });

  const big = await send(base, "POST", "/api/waitlist", JSON.stringify({ name: secret, pad: "x".repeat(40 * 1024) }));
  assert.equal(big.status, 413);
  assert.deepEqual(await big.json(), { error: "too_large" });

  assert.equal(written.join("").includes(secret), false);
});

test("the handler logs the error's type and status, never its body or message", async (t) => {
  const { default: pinoHttp } = await import("pino-http");
  const { createLogger, httpSerializers } = await import("./lib/logger.js");
  const { requestErrorHandler } = await import("./app.js");
  const lines: string[] = [];
  const log = createLogger({ NODE_ENV: "production", LOG_LEVEL: "info" }, { write: (line: string) => void lines.push(line) });
  const { default: express } = await import("express");

  const mini = express();
  mini.use(pinoHttp({ logger: log, serializers: httpSerializers }));
  mini.use(express.json({ limit: "1kb" }));
  mini.post("/ok", (_req, res) => void res.json({}));
  mini.post("/boom", () => {
    throw Object.assign(new Error("failed for Marguerite Oyelaran"), { body: "Marguerite" });
  });
  mini.use(requestErrorHandler);
  const server = mini.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const at = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const parse = await send(at, "POST", "/ok", '{"name":"Marguerite Oyelaran",');
  assert.equal(parse.status, 400);
  const large = await send(at, "POST", "/ok", JSON.stringify({ name: "Marguerite Oyelaran", pad: "x".repeat(4096) }));
  assert.equal(large.status, 413);
  const other = await send(at, "POST", "/boom", "{}");
  assert.equal(other.status, 500);
  assert.deepEqual(await other.json(), { error: "internal_error" });

  const text = lines.join("");
  assert.equal(text.includes("Marguerite"), false);
  assert.equal(text.includes("Unexpected"), false, "a parse error's own message is not logged");
  assert.match(text, /"type":"entity\.parse\.failed","status":400/);
  assert.match(text, /"type":"entity\.too\.large","status":413/);
});

test("the API does not name its framework, on health or on a refusal", async (t) => {
  const { base, close } = await serve();
  t.after(close);

  assert.equal((await fetch(`${base}/api/healthz`)).headers.get("x-powered-by"), null);
  const refused = await send(base, "POST", "/api/waitlist", "{}", { origin: "https://evil.example" });
  assert.equal(refused.status, 403);
  assert.equal(refused.headers.get("x-powered-by"), null);
});

test("an unknown path under /api answers a JSON 404, after the routers and ahead of the error handler", async (t) => {
  const { default: express } = await import("express");
  const { apiNotFound, requestErrorHandler } = await import("./app.js");
  const mini = express();
  mini.disable("x-powered-by");
  mini.use("/api", (req, res, next) => (req.path === "/known" ? void res.json({ ok: true }) : next()));
  mini.use("/api", apiNotFound);
  mini.use(requestErrorHandler);
  const server = mini.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const at = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  assert.equal((await fetch(`${at}/api/known`)).status, 200);
  for (const path of ["/api/nothing-here", "/api/reports/x/y/z"]) {
    const res = await fetch(`${at}${path}`);
    assert.equal(res.status, 404, path);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await res.json(), { error: "not_found" });
  }
});

test("a place search from a public page sets no cookie, still meets its limit by address, and answers before launch too", async (t) => {
  const { base, close } = await serve();
  t.after(close);
  const { readFileSync } = await import("node:fs");
  const { LIMITS } = await import("./lib/limits.js");
  const audrey = JSON.parse(readFileSync(new URL("../../fixtures/charts/audrey-hepburn.json", import.meta.url), "utf8")) as {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  // Nominatim answers with the fixture's real place, so a search runs end to end and never leaves the process.
  const hit = {
    display_name: "Ixelles, Brussels-Capital, Belgium",
    lat: String(audrey.latitude),
    lon: String(audrey.longitude),
    category: "place",
    type: "town",
    address: { town: "Ixelles", region: "Brussels-Capital", country: "Belgium" },
  };
  const realFetch = globalThis.fetch;
  let asked = 0;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith(base)) return realFetch(input, init);
    asked++;
    return new Response(JSON.stringify([hit]), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const appEnv = process.env.APP_ENV;
  t.after(() => {
    globalThis.fetch = realFetch;
    if (appEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = appEnv;
  });
  // Production before launch (ADR-167), where /sky still finds places through it while the rest of the API waits (ADR-246).
  process.env.APP_ENV = "production";
  const search = (address: string) => fetch(`${base}/api/geocode?q=Ixelles`, { headers: { "x-forwarded-for": address } });

  const found = await search("203.0.113.7");
  assert.equal(found.status, 200);
  assert.equal(found.headers.get("set-cookie"), null, "no session cookie from a place search");
  assert.equal(((await found.json()) as { results: Array<{ timezone: string }> }).results[0]?.timezone, audrey.timezone);
  assert.equal(asked, 1);

  for (let i = 1; i < LIMITS.geocode.limit; i++) assert.equal((await search("203.0.113.7")).status, 200, `search ${i + 1}`);
  const refused = await search("203.0.113.7");
  assert.equal(refused.status, 429);
  assert.equal(refused.headers.get("set-cookie"), null);
  assert.equal(((await refused.json()) as { error: string }).error, "rate_limited");
  assert.equal((await search("203.0.113.8")).status, 200, "another address keeps its own count");
});

test("POST /api/checkout/test is gone: the free test checkout answers 404 with no grant, signed out or in, and each real path is still routed (ADR-276)", async (t) => {
  const { base, close } = await serve();
  t.after(close);

  for (const headers of [{}, { authorization: "Bearer not-a-token" }] as Array<Record<string, string>>) {
    const gone = await send(base, "POST", "/api/checkout/test", JSON.stringify({ count: 3 }), headers);
    assert.equal(gone.status, 404);
    assert.deepEqual(await gone.json(), { error: "not_found" });
  }
  // The real checkout is mounted: signed out it answers 401, so the 404 above is the old route's alone.
  const real = await send(base, "POST", "/api/checkout", JSON.stringify({ item: "single", ticked: true, returnTo: "/chart" }));
  assert.equal(real.status, 401);
});
