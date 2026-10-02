import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { CSP_ROWS_PER_DAY, blockedOf, cspCounts, cspKey, cspWindowStart, foldCounts, ourPage, parseCspReport, parseCspReports, utcDay } from "./csp.js";
import { webOrigins } from "../middlewares/origin.js";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
process.env.LOG_LEVEL = "silent";
const { cspReportRouter } = await import("../routes/cspReport.js");
type CspStore = import("../routes/cspReport.js").CspStore;
type CspCount = import("./csp.js").CspCount;

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
  const { base, close } = await serve({ keys: async () => [], add: async (day, counts) => void added.push({ day, counts }) });
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
    keys: async () => [],
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

test("a page's host is judged whole: userinfo, a port, a look-alike prefix or a path that names ours does not make a page ours", () => {
  for (const page of [
    "https://mystarsdecoded.com@evil.example/",
    "https://evil.example/https://mystarsdecoded.com/",
    "https://evil.example/?next=mystarsdecoded.com",
    "https://mystarsdecoded.com:8443/",
    "https://[::1]/",
  ]) {
    const report = parseCspReport(REPORT_URI, reportUri({ "document-uri": page }));
    assert.deepEqual(cspCounts(report ? [report] : [], OURS), [], page);
  }
  const upper = parseCspReport(REPORT_URI, reportUri({ "document-uri": "https://MyStarsDecoded.com/Sample" }));
  assert.equal(upper?.documentHost, "mystarsdecoded.com");
  assert.equal(cspCounts([upper!], OURS).length, 1);
});

test("a blocked URL's credentials, path and query never reach the count; only host and port stay", () => {
  assert.equal(blockedOf("https://user:secret@host.example:8443/a/b?token=1#frag"), "host.example:8443");
  assert.equal(blockedOf("HTTPS://Host.Example/"), "host.example");
  const report = parseCspReport(REPORT_URI, reportUri({ "blocked-uri": "https://user:secret@host.example/a?token=1" }));
  assert.doesNotMatch(JSON.stringify(report), /user|secret|token|\/a/);
});

test("an empty batch, an empty object and a batch of other reports count nothing", () => {
  assert.deepEqual(parseCspReports(REPORTING_API, []), []);
  assert.deepEqual(parseCspReports(REPORTING_API, {}), []);
  assert.deepEqual(parseCspReports(REPORTING_API, [null, "x", 1, [], { type: "csp-violation" }, { type: "csp-violation", body: null }]), []);
  assert.deepEqual(cspCounts([], OURS), []);
});

test("a report with a missing field is nothing: no directive, no blocked value, no page", () => {
  assert.equal(parseCspReport(REPORT_URI, reportUri({ "effective-directive": undefined, "violated-directive": undefined })), null);
  assert.equal(parseCspReport(REPORT_URI, reportUri({ "blocked-uri": "about:blank" })), null);
  assert.equal(parseCspReport(REPORT_URI, reportUri({ "document-uri": undefined })), null);
  assert.equal(parseCspReport(REPORTING_API, reportingApi({ documentURL: undefined }, "")), null);
});

test("the Reporting API's entry falls back on its own url when the body has no documentURL", () => {
  const entry = reportingApi({ documentURL: undefined });
  const report = parseCspReport(REPORTING_API, entry);
  assert.equal(report?.documentHost, "www.mystarsdecoded.com");
});

test("the admin's week crosses a month and a year", () => {
  assert.equal(cspWindowStart(new Date("2027-01-03T10:00:00Z")), "2026-12-28");
  assert.equal(cspWindowStart(new Date("2024-03-03T00:00:00Z")), "2024-02-26", "a leap year's 29th is a day of the week");
  assert.equal(utcDay(new Date("2026-12-31T23:59:59.999Z")), "2026-12-31");
});

function ofSize(bytes: number): string {
  const base = JSON.stringify(reportUri({ "script-sample": "" }));
  return JSON.stringify(reportUri({ "script-sample": "x".repeat(bytes - Buffer.byteLength(base)) }));
}

test("the route's 8 kB limit: a body of exactly 8192 bytes is read, one byte more is refused with 413", async (t) => {
  const added: unknown[] = [];
  const { base, close } = await serve({ keys: async () => [], add: async (_day, counts) => void added.push(counts) });
  t.after(close);
  const exact = ofSize(8192);
  assert.equal(Buffer.byteLength(exact), 8192);
  assert.equal((await post(base, REPORT_URI, exact)).status, 204);
  assert.equal(added.length, 1, "the last allowed report is counted");
  const over = ofSize(8193);
  assert.equal(Buffer.byteLength(over), 8193);
  assert.equal((await post(base, REPORT_URI, over)).status, 413);
  assert.equal(added.length, 1);
  assert.equal((await post(base, REPORTING_API, ofSize(8193))).status, 413);
});

test("the route answers a report with no Origin and no cookie, and an empty batch with 204", async (t) => {
  const added: unknown[] = [];
  const { base, close } = await serve({ keys: async () => [], add: async (_day, counts) => void added.push(counts) });
  t.after(close);
  const res = await fetch(base, { method: "POST", headers: { "content-type": `${REPORTING_API}; charset=utf-8`, origin: "null" }, body: JSON.stringify([reportingApi({})]) });
  assert.equal(res.status, 204);
  assert.equal(added.length, 1);
  assert.equal((await post(base, REPORTING_API, [])).status, 204);
  assert.equal(added.length, 1);
});

test("a report that fails the rate limit is refused before its body is read, so a flood of junk costs no parsing", async (t) => {
  const { base, close } = await serve({ keys: async () => [], add: async () => {} });
  t.after(close);
  for (let i = 0; i < 60; i += 1) await post(base, REPORT_URI, reportUri({}), "203.0.113.50");
  assert.equal((await post(base, REPORT_URI, "{not json", "203.0.113.50")).status, 429, "junk past the limit is a 429, not a 400");
});

function flood(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({
    type: "csp-violation",
    url: "https://mystarsdecoded.com/",
    body: { blockedURL: `https://h${offset + i}.example/x.js`, effectiveDirective: "script-src-elem" },
  }));
}

test("one request counts at most five reports and drops the rest, so a flooded batch adds five rows", async (t) => {
  const counts = cspCounts(parseCspReports(REPORTING_API, flood(70)), OURS);
  assert.equal(counts.length, 5);
  assert.deepEqual(counts.map((c) => c.blocked), ["h0.example", "h1.example", "h2.example", "h3.example", "h4.example"]);

  const foreignFirst = [...flood(10).map((entry) => ({ ...entry, url: "https://evil.example/" })), ...flood(7, 100)];
  assert.equal(cspCounts(parseCspReports(REPORTING_API, foreignFirst), OURS).length, 5, "foreign pages' reports do not use up the five");

  const added: CspCount[][] = [];
  const { base, close } = await serve({ keys: async () => [], add: async (_day, rows) => void added.push(rows) });
  t.after(close);
  const batch = JSON.stringify(flood(50));
  assert.ok(Buffer.byteLength(batch) < 8192, "the batch fits the route's body limit");
  assert.equal((await post(base, REPORTING_API, batch)).status, 204);
  assert.equal(added.length, 1);
  assert.equal(added[0]!.length, 5);
});

test("a day that holds 200 distinct rows folds a new host into one other row per directive and lets known rows keep counting", () => {
  const known = new Set(Array.from({ length: CSP_ROWS_PER_DAY }, (_, i) => cspKey("script-src-elem", `h${i}.example`)));
  const folded = foldCounts(
    [
      { directive: "script-src-elem", blocked: "h7.example", count: 2 },
      { directive: "script-src-elem", blocked: "new-a.example", count: 1 },
      { directive: "script-src-elem", blocked: "new-b.example", count: 3 },
      { directive: "img-src", blocked: "new-c.example", count: 1 },
    ],
    known,
  );
  assert.deepEqual(folded, [
    { directive: "script-src-elem", blocked: "h7.example", count: 2 },
    { directive: "script-src-elem", blocked: "other", count: 4 },
    { directive: "img-src", blocked: "other", count: 1 },
  ]);
  assert.deepEqual(foldCounts([{ directive: "script-src-elem", blocked: "other", count: 1 }], new Set([...known, cspKey("script-src-elem", "other")])), [
    { directive: "script-src-elem", blocked: "other", count: 1 },
  ]);
});

test("below the threshold a new host keeps its own row, and the row that reaches 200 is the last one", () => {
  const known = new Set(Array.from({ length: CSP_ROWS_PER_DAY - 1 }, (_, i) => cspKey("img-src", `h${i}.example`)));
  const folded = foldCounts(
    [
      { directive: "img-src", blocked: "last.example", count: 1 },
      { directive: "img-src", blocked: "late.example", count: 1 },
    ],
    known,
  );
  assert.deepEqual(folded, [
    { directive: "img-src", blocked: "last.example", count: 1 },
    { directive: "img-src", blocked: "other", count: 1 },
  ]);
});

test("through the route, a day at 200 rows stores new hosts under other and a known host under its own name", async (t) => {
  const day = new Set(Array.from({ length: CSP_ROWS_PER_DAY }, (_, i) => cspKey("script-src-elem", `h${i}.example`)));
  const added: CspCount[][] = [];
  const { base, close } = await serve({ keys: async () => [...day], add: async (_day, rows) => void added.push(rows) });
  t.after(close);
  assert.equal((await post(base, REPORTING_API, [...flood(1, 3), ...flood(2, 900)])).status, 204);
  assert.deepEqual(added, [
    [
      { directive: "script-src-elem", blocked: "h3.example", count: 1 },
      { directive: "script-src-elem", blocked: "other", count: 2 },
    ],
  ]);
});
