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

test("health, the waitlist page's calls and the admin routes stay open to everyone", () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  for (const path of ["/healthz", "/healthz/db", "/waitlist", "/sky", "/admin/me", "/admin/waitlist", "/admin/lab/runs"]) {
    assert.equal(prelaunchAllows(path, null, env), true, path);
  }
});

test("the product's routes open to the admin alone", () => {
  const env = { ADMIN_USER_ID: "user_admin" };
  for (const path of ["/reports", "/reports/abc/status", "/profiles", "/geocode", "/compatibility", "/invites/tok/claim", "/release/r1/verdict", "/waitlister", "/skyline", "/healthzz"]) {
    assert.equal(prelaunchAllows(path, null, env), false, `anonymous ${path}`);
    assert.equal(prelaunchAllows(path, "user_other", env), false, `signed in ${path}`);
    assert.equal(prelaunchAllows(path, "user_admin", env), true, `admin ${path}`);
  }
});

test("without ADMIN_USER_ID nobody passes the gate", () => {
  assert.equal(prelaunchAllows("/reports", "user_admin", {}), false);
});
