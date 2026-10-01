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

test("a 40 kB body is refused everywhere but the admin's prompt editor, which takes up to 256 kB", async (t) => {
  const { base, close } = await serve();
  t.after(close);

  for (const [method, path] of [["POST", "/api/waitlist"], ["POST", "/api/reports"], ["PUT", "/api/admin/promptsx/natal:system"], ["POST", "/api/admin/lab/runs"]]) {
    const res = await send(base, method!, path!, bodyOf(40));
    assert.equal(res.status, 413, `${method} ${path}`);
  }
  for (const [method, path] of [["PUT", "/api/admin/prompts/pair:system"], ["POST", "/api/admin/prompts/preview"]]) {
    const res = await send(base, method!, path!, bodyOf(40));
    assert.notEqual(res.status, 413, `${method} ${path}`);
    assert.equal(((await res.json()) as { error: string }).error, "admin_disabled", "past the parser, the admin's guard answers");
  }
  const tooLarge = await send(base, "PUT", "/api/admin/prompts/pair:system", bodyOf(257));
  assert.equal(tooLarge.status, 413);
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
