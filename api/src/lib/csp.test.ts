import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { blockedOf, cspCounts, cspWindowStart, ourPage, parseCspReport, parseCspReports, utcDay } from "./csp.js";
import { webOrigins } from "../middlewares/origin.js";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
const { cspReportRouter } = await import("../routes/cspReport.js");
type CspStore = import("../routes/cspReport.js").CspStore;

const OURS = webOrigins({});
const REPORT_URI = "application/csp-report";
const REPORTING_API = "application/reports+json";

function reportUri(fields: Record<string, unknown>) {
  return {
    "csp-report": {
      "document-uri": "https://mystarsdecoded.com/sample?utm_source=x",
      referrer: "",
      "violated-directive": "script-src-elem",
      "effective-directive": "script-src-elem",
      "original-policy": "script-src 'self'; report-uri /api/csp-report",
      disposition: "report",
      "blocked-uri": "https://cdn.evil.example/lib/x.js?token=secret",
      "status-code": 200,
      "script-sample": "",
      ...fields,
    },
  };
}

function reportingApi(body: Record<string, unknown>, url = "https://www.mystarsdecoded.com/app/report/abc?id=1") {
  return {
    age: 12,
    type: "csp-violation",
    url,
    user_agent: "Mozilla/5.0",
    body: {
      documentURL: url,
      referrer: "",
      blockedURL: "inline",
      effectiveDirective: "style-src-attr",
      originalPolicy: "style-src 'self'",
      sourceFile: "https://www.mystarsdecoded.com/assets/index.js",
      sample: "color: red",
      disposition: "report",
      statusCode: 200,
      lineNumber: 1,
      columnNumber: 2,
      ...body,
    },
  };
}

test("report-uri's format gives the directive, the blocked host and the page's host, and no path or query", () => {
  const report = parseCspReport(`${REPORT_URI}; charset=utf-8`, reportUri({}));
  assert.deepEqual(report, { directive: "script-src-elem", blocked: "cdn.evil.example", documentHost: "mystarsdecoded.com" });
  assert.doesNotMatch(JSON.stringify(report), /lib|x\.js|token|secret|sample|utm/);
});

test("the Reporting API's batch gives each CSP violation and skips the other kinds of report", () => {
  const batch = [
    reportingApi({}),
    { type: "deprecation", url: "https://mystarsdecoded.com/", body: { id: "x", message: "y" } },
    reportingApi({ blockedURL: "https://clerk.example.com:8443/npm/clerk.js?v=5", effectiveDirective: "script-src-elem" }, "https://starsdecoded-staging.vercel.app/"),
  ];
  assert.deepEqual(parseCspReports(REPORTING_API, batch), [
    { directive: "style-src-attr", blocked: "inline", documentHost: "www.mystarsdecoded.com" },
    { directive: "script-src-elem", blocked: "clerk.example.com:8443", documentHost: "starsdecoded-staging.vercel.app" },
  ]);
  assert.deepEqual(parseCspReport(REPORTING_API, reportingApi({ blockedURL: "eval", effectiveDirective: "script-src" })), {
    directive: "script-src",
    blocked: "eval",
    documentHost: "www.mystarsdecoded.com",
  });
  assert.equal(parseCspReports(REPORTING_API, reportingApi({})).length, 1, "a lone report outside a batch still counts");
});

test("a foreign page's report is read but never counted", () => {
  const foreign = parseCspReport(REPORT_URI, reportUri({ "document-uri": "https://evil.example/page" }));
  assert.deepEqual(foreign, { directive: "script-src-elem", blocked: "cdn.evil.example", documentHost: "evil.example" });
  assert.deepEqual(cspCounts([foreign!], OURS), []);
  for (const host of ["evil.example", "mystarsdecoded.com.evil.example", "starsdecoded-x.vercel.app.evil.example", "starsdecoded.vercel.app", "starsdecoded-x.vercel.app:8443"]) {
    assert.equal(ourPage(host, OURS), false, host);
  }
  for (const host of ["mystarsdecoded.com", "www.mystarsdecoded.com", "starsdecoded-staging.vercel.app", "starsdecoded-git-round-r13-alex.vercel.app"]) {
    assert.equal(ourPage(host, OURS), true, host);
  }
  const batch = [reportingApi({}, "https://evil.example/"), reportingApi({})];
  assert.deepEqual(cspCounts(parseCspReports(REPORTING_API, batch), OURS), [{ directive: "style-src-attr", blocked: "inline", count: 1 }]);
});

test("a page served from anywhere but http or https is nobody's page", () => {
  for (const page of ["about:srcdoc", "chrome-extension://abc/popup.html", "file:///tmp/x.html", "", "/sample"]) {
    assert.equal(parseCspReport(REPORT_URI, reportUri({ "document-uri": page })), null, page);
  }
});

test("what was blocked becomes a host or one of five words", () => {
  const cases: Array<[string | undefined, string | null]> = [
    ["inline", "inline"],
    ["", "inline"],
    [undefined, "inline"],
    ["self", "inline"],
    ["eval", "eval"],
    ["wasm-eval", "eval"],
    ["data", "data"],
    ["data:image/png;base64,iVBORw0KGgo=", "data"],
    ["blob", "blob"],
    ["blob:https://mystarsdecoded.com/7f1c", "blob"],
    ["chrome-extension", "extension"],
    ["chrome-extension://abcdefgh/content.js", "extension"],
    ["moz-extension://1234/inject.js", "extension"],
    ["safari-web-extension://x/y.js", "extension"],
    ["webkit-masked-url://hidden/", "extension"],
    ["https://Nominatim.OpenStreetMap.org/search?q=Paris", "nominatim.openstreetmap.org"],
    ["https://img.clerk.com", "img.clerk.com"],
    ["wss://socket.example/live?k=1", "socket.example"],
    ["trusted-types-sink", null],
    ["about:blank", null],
    ["javascript:alert(1)", null],
    ["mystarsdecoded.com", null],
    ["toString", null],
    ["__proto__", null],
    [`https://${"a".repeat(300)}.example/`, null],
  ];
  for (const [raw, blocked] of cases) assert.equal(blockedOf(raw), blocked, String(raw));
});

test("the directive is CSP's own name, from CSP3's effective directive or CSP2's whole violated one", () => {
  const csp2 = reportUri({ "effective-directive": undefined, "violated-directive": "script-src 'self' https://x.example" });
  assert.equal(parseCspReport(REPORT_URI, csp2)?.directive, "script-src");
  assert.equal(parseCspReport(REPORT_URI, reportUri({ "effective-directive": "IMG-SRC" }))?.directive, "img-src");
  assert.equal(parseCspReport(REPORT_URI, reportUri({ "effective-directive": "made-up-src", "violated-directive": "made-up-src" })), null);
  assert.equal(parseCspReport(REPORTING_API, reportingApi({ effectiveDirective: "frame-ancestors", blockedURL: "https://evil.example" }))?.blocked, "evil.example");
});

test("anything that is not a CSP report of either format is nothing", () => {
  assert.equal(parseCspReport("application/json", reportUri({})), null);
  assert.equal(parseCspReport(undefined, reportUri({})), null);
  assert.equal(parseCspReport(REPORTING_API, reportUri({})), null);
  assert.equal(parseCspReport(REPORT_URI, reportingApi({})), null);
  for (const body of [null, "x", 1, [], [reportUri({})], { "csp-report": "x" }, { "csp-report": [] }]) {
    assert.equal(parseCspReport(REPORT_URI, body), null, JSON.stringify(body));
  }
  assert.equal(parseCspReport(REPORTING_API, { ...reportingApi({}), type: "permissions-policy-violation" }), null);
  assert.deepEqual(parseCspReports(REPORT_URI, [reportUri({})]), []);
});

test("one request counts each directive and blocked value once per report", () => {
  const reports = parseCspReports(REPORTING_API, [reportingApi({}), reportingApi({}), reportingApi({ blockedURL: "data:," })]);
  assert.deepEqual(cspCounts(reports, OURS), [
    { directive: "style-src-attr", blocked: "inline", count: 2 },
    { directive: "style-src-attr", blocked: "data", count: 1 },
  ]);
});

test("days are UTC, and the admin's week is today and the six days before it", () => {
  assert.equal(utcDay(new Date("2026-10-01T00:00:00Z")), "2026-10-01");
  assert.equal(utcDay(new Date("2026-10-01T01:30:00+02:00")), "2026-09-30");
  assert.equal(cspWindowStart(new Date("2026-10-07T23:59:59Z")), "2026-10-01");
  assert.equal(cspWindowStart(new Date("2026-03-02T00:00:00Z")), "2026-02-24");
});

async function serve(store: CspStore) {
  const app = express();
  app.use("/api", cspReportRouter(store, OURS));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", () => resolve()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/csp-report`;
  const close = () => {
    server.closeAllConnections();
    return new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return { base, close };
}

function post(url: string, type: string, body: unknown, client = "203.0.113.9") {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": type, "x-vercel-forwarded-for": client },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("the route counts our pages' reports in either format and answers 204 to everything it reads", async (t) => {
  const added: Array<{ day: string; counts: unknown }> = [];
  const { base, close } = await serve({ add: async (day, counts) => void added.push({ day, counts }) });
  t.after(close);

  assert.equal((await post(base, REPORT_URI, reportUri({}))).status, 204);
  assert.equal((await post(base, REPORTING_API, [reportingApi({}), reportingApi({})])).status, 204);
  assert.deepEqual(added, [
    { day: utcDay(), counts: [{ directive: "script-src-elem", blocked: "cdn.evil.example", count: 1 }] },
    { day: utcDay(), counts: [{ directive: "style-src-attr", blocked: "inline", count: 2 }] },
  ]);

  added.length = 0;
  assert.equal((await post(base, REPORT_URI, reportUri({ "document-uri": "https://evil.example/" }))).status, 204);
  assert.equal((await post(base, "application/json", reportUri({}))).status, 204);
  assert.equal((await post(base, "text/plain", "x")).status, 204);
  assert.deepEqual(added, [], "a foreign page, a plain JSON body and text count nothing");

  assert.equal((await post(base, REPORT_URI, "{not json")).status, 400);
  const big = reportUri({ "script-sample": "x".repeat(9 * 1024) });
  assert.equal((await post(base, REPORT_URI, big)).status, 413);
  assert.deepEqual(added, []);
});

test("the route holds one client to 60 reports a minute, and a store that fails still answers 204", async (t) => {
  let tries = 0;
  const { base, close } = await serve({
    add: async () => {
      tries += 1;
      throw new Error("database unreachable");
    },
  });
  t.after(close);

  for (let i = 0; i < 60; i += 1) assert.equal((await post(base, REPORT_URI, reportUri({}))).status, 204, `report ${i + 1}`);
  assert.equal(tries, 60);
  const limited = await post(base, REPORT_URI, reportUri({}));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.equal(tries, 60);
  assert.equal((await post(base, REPORT_URI, reportUri({}), "198.51.100.4")).status, 204, "another client is not held");
});
