import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import cookieParser from "cookie-parser";
import { sessionCookie, sessionMiddleware } from "./session.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function serve(withParser: boolean) {
  const app = express();
  if (withParser) app.use(cookieParser());
  app.use(sessionMiddleware);
  app.get("/api/whoami", (req, res) => {
    res.json({ sessionId: req.sessionId });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

async function visit(base: string, cookie?: string) {
  const res = await fetch(`${base}/api/whoami`, { headers: cookie ? { cookie } : {} });
  const { sessionId } = (await res.json()) as { sessionId: string };
  return { sessionId, setCookie: res.headers.get("set-cookie") ?? "" };
}

function attributes(setCookie: string) {
  const [pair = "", ...rest] = setCookie.split(/;\s*/);
  const value = pair.slice(pair.indexOf("=") + 1);
  return { name: pair.slice(0, pair.indexOf("=")), value, flags: rest.map((flag) => flag.toLowerCase()) };
}

// The middleware reads the environment at each request, so each case pins what it needs rather than inherit the runner's.
function withEnv(name: string, value: string) {
  const before = process.env[name];
  process.env[name] = value;
  return () => {
    if (before === undefined) delete process.env[name];
    else process.env[name] = before;
  };
}

test("the cookie is Lax and httpOnly, Secure everywhere but development", () => {
  for (const env of [{}, { NODE_ENV: "production" }, { NODE_ENV: "test" }, { NODE_ENV: "staging" }]) {
    const options = sessionCookie(env);
    assert.equal(options.sameSite, "lax", JSON.stringify(env));
    assert.equal(options.secure, true, JSON.stringify(env));
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, "/");
  }
  const dev = sessionCookie({ NODE_ENV: "development" });
  assert.equal(dev.sameSite, "lax");
  assert.equal(dev.secure, false);
});

test("a first visit gets a new id in a Lax, Secure, httpOnly cookie", async (t) => {
  t.after(withEnv("NODE_ENV", "production"));
  const { base, close } = await serve(true);
  t.after(close);

  const first = await visit(base);
  assert.match(first.sessionId, UUID);
  const cookie = attributes(first.setCookie);
  assert.equal(cookie.name, "sd_session_id");
  assert.equal(cookie.value, first.sessionId);
  for (const flag of ["httponly", "secure", "samesite=lax", "path=/", "max-age=31536000"]) {
    assert.ok(cookie.flags.includes(flag), `${flag} in ${first.setCookie}`);
  }
  assert.ok(!cookie.flags.includes("samesite=none"));
});

test("a request carrying the cookie keeps its id and gets the cookie back with the new attributes", async (t) => {
  t.after(withEnv("NODE_ENV", "production"));
  for (const withParser of [true, false]) {
    const { base, close } = await serve(withParser);
    const held = "6f1c1c1e-2d6b-4c8e-9a51-3f0f2a7d9b10";
    const again = await visit(base, `other=1; sd_session_id=${held}`);
    assert.equal(again.sessionId, held);
    const cookie = attributes(again.setCookie);
    assert.equal(cookie.value, held);
    assert.ok(cookie.flags.includes("samesite=lax"), again.setCookie);
    assert.ok(cookie.flags.includes("secure"), again.setCookie);
    assert.ok(cookie.flags.includes("max-age=31536000"), again.setCookie);
    await close();
  }
});

test("under development the cookie drops Secure, since a laptop speaks plain http", async (t) => {
  t.after(withEnv("NODE_ENV", "development"));
  const { base, close } = await serve(true);
  t.after(close);

  const first = await visit(base);
  const cookie = attributes(first.setCookie);
  assert.ok(cookie.flags.includes("samesite=lax"), first.setCookie);
  assert.ok(!cookie.flags.includes("secure"), first.setCookie);
});
