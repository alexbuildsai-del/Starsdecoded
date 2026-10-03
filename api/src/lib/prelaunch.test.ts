import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrelaunch, prelaunchAllows } from "./prelaunch.js";

test("only production waits for launch", () => {
  assert.equal(isPrelaunch({ APP_ENV: "production" }, false), true);
  assert.equal(isPrelaunch({ RAILWAY_ENVIRONMENT_NAME: "production" }, false), true);
  assert.equal(isPrelaunch({ APP_ENV: "staging" }, false), false);
  assert.equal(isPrelaunch({}, false), false);
  assert.equal(isPrelaunch({ APP_ENV: "production" }, true), false);
});

test("health, the waitlist's calls, the CSP's reports, the admin routes and /sky's place search stay open to everyone", () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  for (const path of ["/healthz", "/healthz/db", "/waitlist", "/waitlist/confirm", "/waitlist/confirm/", "/csp-report", "/csp-report/", "/admin/me", "/admin/waitlist", "/admin/lab/runs", "/geocode", "/geocode/"]) {
    assert.equal(prelaunchAllows(path, null, env), true, path);
  }
});

test("the product's routes open to the admin alone", () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  for (const path of ["/reports", "/reports/abc/status", "/profiles", "/geocodes", "/geocode/abc", "/compatibility", "/invites/tok/claim", "/release/r1/verdict", "/waitlister", "/waitlist/confirmed", "/waitlist/confirm/abc", "/waitlist/other", "/csp-reports", "/csp-report/abc", "/csp", "/sky", "/skyline", "/healthzz"]) {
    assert.equal(prelaunchAllows(path, null, env), false, `anonymous ${path}`);
    assert.equal(prelaunchAllows(path, "user_other", env), false, `signed in ${path}`);
    assert.equal(prelaunchAllows(path, "user_admin", env), true, `admin ${path}`);
  }
});

test("without ADMIN_USER_ID nobody passes the gate", () => {
  assert.equal(prelaunchAllows("/reports", "user_admin", {}), false);
});

test("the CSP's reports pass for an anonymous browser even with no admin set, and only at their own path", () => {
  for (const userId of [null, "user_other"]) assert.equal(prelaunchAllows("/csp-report", userId, {}), true, String(userId));
  for (const path of ["//csp-report", "/api/csp-report", "/CSP-REPORT", "/csp-report/../reports", "/x/csp-report"]) {
    assert.equal(prelaunchAllows(path, null, { ADMIN_USER_ID: "user_admin" }), false, path);
  }
});
