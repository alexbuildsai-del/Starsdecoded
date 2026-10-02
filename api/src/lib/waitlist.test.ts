import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/never";
const {
  CONFIRM_LINK_MS,
  RELINK_AFTER_MS,
  RateLimiter,
  cameThroughEdge,
  clientKey,
  confirmUrl,
  confirmWaitlist,
  hashConfirmToken,
  joinAction,
  joinWaitlist,
  linkLive,
  newConfirmToken,
  normaliseEmail,
  publicWebBase,
  sweepBefore,
  tag,
  waitlistClosed,
  waitlistListing,
} = await import("./waitlist.js");
const { LEGAL_IDENTITY } = await import("@workspace/commerce");
type WaitlistStore = import("./waitlist.js").WaitlistStore;
type WaitlistSignup = import("@workspace/db").WaitlistSignup;

test("an address is stored one way whatever its case or spacing", () => {
  assert.equal(normaliseEmail("  Ada.Lovelace@Example.COM "), "ada.lovelace@example.com");
});

test("campaign tags keep their words and lose the rest", () => {
  assert.equal(tag("chatgpt.com"), "chatgpt.com");
  assert.equal(tag("spring launch"), "spring launch");
  assert.equal(tag("<script>x</script>"), "scriptxscript");
  assert.equal(tag("   "), null);
  assert.equal(tag(undefined), null);
  assert.equal(tag("hero-form", 4), "hero");
});

// Made up here, and past the 32 characters the variable needs to count; the edge's own lives only in the Vercel and
// Railway dashboards.
const EDGE = "edge-value-not-real-padded-to-length-x";
const NOT_EDGE = "edge-value-not-real-padded-to-length-y";
const VERCEL = "76.76.21.1";
const RAILWAY_SAW = "198.51.100.2";

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

test("a call came through the edge only when it carries the edge's value exactly", () => {
  const carrying = (value: string | string[]) => ({ "x-edge-proxy-secret": value });
  assert.equal(cameThroughEdge(carrying(EDGE), EDGE), true, "match");
  assert.equal(cameThroughEdge(carrying(NOT_EDGE), EDGE), false, "mismatch of the same length");
  for (const near of ["", EDGE.slice(0, -1), `${EDGE}x`, ` ${EDGE}`, EDGE.toUpperCase(), `${EDGE}, ${EDGE}`]) {
    assert.equal(cameThroughEdge(carrying(near), EDGE), false, `mismatch ${JSON.stringify(near)}`);
  }
  assert.equal(cameThroughEdge({}, EDGE), false, "missing");
  assert.equal(cameThroughEdge(carrying([EDGE, EDGE]), EDGE), false, "sent twice, so not the edge's");
  assert.equal(cameThroughEdge(carrying(""), ""), false, "an empty value matches nothing, not even an empty header");
  assert.equal(withEdge(EDGE, () => cameThroughEdge(carrying(EDGE))), true, "EDGE_PROXY_SECRET is read at each call");
  assert.equal(withEdge(undefined, () => cameThroughEdge(carrying(EDGE))), false, "unset");
});

test("the client is the address Vercel forwards only on a call through the edge, else the one Railway saw", () => {
  const forwarded = { "x-vercel-forwarded-for": "203.0.113.7, 76.76.21.1" };
  withEdge(EDGE, () => {
    assert.equal(clientKey({ ...forwarded, "x-edge-proxy-secret": EDGE }, VERCEL), "203.0.113.7", "through the edge");
    assert.equal(clientKey(forwarded, RAILWAY_SAW), RAILWAY_SAW, "a forged forwarded header, no edge value");
    assert.equal(clientKey({ ...forwarded, "x-edge-proxy-secret": NOT_EDGE }, RAILWAY_SAW), RAILWAY_SAW, "a wrong edge value");
    assert.equal(clientKey({ "x-edge-proxy-secret": EDGE }, VERCEL), VERCEL, "the edge, with no address forwarded");
    assert.equal(clientKey({ "x-edge-proxy-secret": EDGE, "x-vercel-forwarded-for": " , 203.0.113.7" }, VERCEL), VERCEL);
    assert.equal(clientKey({}, undefined), "unknown");
  });
  withEdge(undefined, () => {
    assert.equal(clientKey({ ...forwarded, "x-edge-proxy-secret": EDGE }, RAILWAY_SAW), RAILWAY_SAW, "unset: no call is the edge's");
  });
});

test("a new forged address on every direct call no longer dodges a limit, and through the edge each visitor keeps their own (MB-150)", () => {
  withEdge(EDGE, () => {
    const limiter = new RateLimiter(2, 60_000);
    const forged = ["192.0.2.1", "192.0.2.2", "192.0.2.3"];
    const direct = (address: string) => limiter.take(clientKey({ "x-vercel-forwarded-for": address }, RAILWAY_SAW), 0);
    assert.deepEqual(forged.map(direct), [true, true, false]);
    const edge = (address: string) => limiter.take(clientKey({ "x-vercel-forwarded-for": address, "x-edge-proxy-secret": EDGE }, VERCEL), 0);
    assert.deepEqual(forged.map(edge), [true, true, true]);
  });
});

test("the edge's value is compared as written: whitespace, case, unicode and its normal forms all count", () => {
  const carrying = (value: string) => ({ "x-edge-proxy-secret": value });
  const spaced = " two words\t";
  assert.equal(cameThroughEdge(carrying(spaced), spaced), true, "a value with spaces at its ends matches itself");
  assert.equal(cameThroughEdge(carrying(spaced.trim()), spaced), false, "and nothing trimmed from it");
  assert.equal(cameThroughEdge(carrying("two words"), "two  words"), false, "inner spacing counts");
  assert.equal(cameThroughEdge(carrying(" "), " "), true, "a single space is a value");
  assert.equal(cameThroughEdge(carrying(""), " "), false);
  const composed = "café-edge";
  const decomposed = "café-edge";
  assert.equal(cameThroughEdge(carrying(composed), composed), true, "unicode matches itself");
  assert.equal(cameThroughEdge(carrying(decomposed), composed), false, "a different spelling of the same letters is another value");
  assert.equal(cameThroughEdge(carrying("\u{1F512}edge"), "\u{1F512}edge"), true, "outside the BMP");
  assert.equal(cameThroughEdge(carrying("\u{1F512}edge"), "\u{1F513}edge"), false);
  const long = "e".repeat(10_000);
  assert.equal(cameThroughEdge(carrying(long), long), true, "a long value");
  assert.equal(cameThroughEdge(carrying(long.slice(1)), long), false, "a long value, one short");
  assert.equal(cameThroughEdge({ "x-edge-proxy-secret": undefined }, EDGE), false, "a header that is present but undefined");
  assert.equal(cameThroughEdge({ "x-edge-proxy-secret": [] }, EDGE), false, "an empty list");
  assert.equal(cameThroughEdge({ "x-edge-proxy-secret": [EDGE] }, EDGE), false, "even a list of one is not the edge's");
  assert.equal(cameThroughEdge({ "x-vercel-forwarded-for": EDGE, "x-forwarded-for": EDGE }, EDGE), false, "the value under other names");
});

test("the variable is read trimmed, as the middleware sends it, and a blank one is unset, while a secret handed in stays as written", () => {
  const carrying = (value: string) => ({ "x-edge-proxy-secret": value });
  const forwarded = { "x-vercel-forwarded-for": "203.0.113.7" };
  // What arrives from a variable with whitespace round it: the middleware trims it, as Headers.set would.
  for (const configured of [` ${EDGE}`, `${EDGE}\t`, `\r\n${EDGE} \n`, `\u00a0${EDGE}\u00a0`, `\ufeff${EDGE}`]) {
    const label = JSON.stringify(configured);
    assert.equal(withEdge(configured, () => cameThroughEdge(carrying(EDGE))), true, label);
    assert.equal(withEdge(configured, () => cameThroughEdge(carrying(configured))), false, `${label} is not what the edge sends`);
    assert.equal(withEdge(configured, () => clientKey({ ...forwarded, ...carrying(EDGE) }, RAILWAY_SAW)), "203.0.113.7", label);
  }
  for (const blank of [" ", "\t", " \r\n ", "\u00a0"]) {
    const label = JSON.stringify(blank);
    for (const sent of ["", blank, " "]) assert.equal(withEdge(blank, () => cameThroughEdge(carrying(sent))), false, `${label}, sent ${JSON.stringify(sent)}`);
    assert.equal(withEdge(blank, () => clientKey({ ...forwarded, ...carrying("") }, RAILWAY_SAW)), RAILWAY_SAW, label);
  }
  assert.equal(withEdge(EDGE, () => cameThroughEdge(carrying(`${EDGE} `))), false, "the header is compared as it arrives: HTTP has trimmed it already");
  assert.equal(withEdge(" ", () => cameThroughEdge(carrying(" "), " ")), true, "a secret handed in is not the variable");
});

test("a variable under 32 characters once trimmed is unset, since healthz would let it be guessed, and 32 is enough", () => {
  const short = EDGE.slice(0, 31);
  const enough = EDGE.slice(0, 32);
  assert.deepEqual([short.length, enough.length], [31, 32]);
  const forwarded = { "x-vercel-forwarded-for": "203.0.113.7" };
  for (const configured of [short, ` ${short} `, `\u00a0${short}\t`]) {
    const label = JSON.stringify(configured);
    assert.equal(withEdge(configured, () => cameThroughEdge({ "x-edge-proxy-secret": short })), false, label);
    assert.equal(withEdge(configured, () => clientKey({ ...forwarded, "x-edge-proxy-secret": short }, RAILWAY_SAW)), RAILWAY_SAW, label);
  }
  for (const configured of [enough, ` ${enough}\n`]) {
    const label = JSON.stringify(configured);
    assert.equal(withEdge(configured, () => cameThroughEdge({ "x-edge-proxy-secret": enough })), true, label);
    assert.equal(withEdge(configured, () => clientKey({ ...forwarded, "x-edge-proxy-secret": enough }, RAILWAY_SAW)), "203.0.113.7", label);
  }
  assert.equal(cameThroughEdge({ "x-edge-proxy-secret": short }, short), true, "a secret handed in has no floor");
});

test("a forwarded address is trusted whole as the edge wrote it: IPv6, a list, an array, spacing and an empty first entry", () => {
  const through = (forwarded: string | string[] | undefined, ip: string | undefined = RAILWAY_SAW) =>
    clientKey({ "x-edge-proxy-secret": EDGE, "x-vercel-forwarded-for": forwarded }, ip);
  withEdge(EDGE, () => {
    assert.equal(through("2001:db8::1"), "2001:db8::1", "IPv6");
    assert.equal(through("2001:db8::1, 203.0.113.7"), "2001:db8::1", "the first of a list, IPv6 or not");
    assert.equal(through("::ffff:203.0.113.7"), "::ffff:203.0.113.7", "an IPv4-mapped address is kept as sent");
    assert.equal(through("  203.0.113.7  "), "203.0.113.7", "spacing trimmed");
    assert.equal(through("203.0.113.7,"), "203.0.113.7");
    assert.equal(through(["203.0.113.7", "203.0.113.8"]), "203.0.113.7", "a header sent twice reads its first");
    assert.equal(through(["203.0.113.7, 76.76.21.1", "203.0.113.8"]), "203.0.113.7", "an array of lists reads the first list's first");
    assert.equal(through([]), RAILWAY_SAW, "an empty array names nobody");
    assert.equal(through(["", "203.0.113.7"]), RAILWAY_SAW, "an empty first entry names nobody");
    for (const empty of ["", " ", ",", " , ", "\t"]) assert.equal(through(empty), RAILWAY_SAW, JSON.stringify(empty));
    assert.equal(through(undefined), RAILWAY_SAW, "none forwarded");
  });
});

test("a forwarded value the edge set is one key whatever it holds, so garbage cannot split into many limits", () => {
  withEdge(EDGE, () => {
    const through = (forwarded: string) => clientKey({ "x-edge-proxy-secret": EDGE, "x-vercel-forwarded-for": forwarded }, RAILWAY_SAW);
    assert.equal(through("not-an-address"), "not-an-address");
    assert.equal(through("not-an-address, 203.0.113.7"), "not-an-address");
    assert.equal(through("unknown"), "unknown", "it can only name itself");
    assert.equal(typeof through("\u0000‮"), "string");
    // The same visitor always lands on the same key, whichever way the edge wrote the list after them.
    assert.equal(through("203.0.113.7, 10.0.0.1"), through("203.0.113.7, 10.0.0.2"));
  });
});

test("with no address anywhere the key is 'unknown', through the edge or not, and a socket address wins over nothing", () => {
  withEdge(EDGE, () => {
    const edge = { "x-edge-proxy-secret": EDGE };
    assert.equal(clientKey(edge, undefined), "unknown", "the edge, nothing forwarded, no req.ip");
    assert.equal(clientKey(edge, ""), "unknown", "an empty req.ip");
    assert.equal(clientKey({ "x-vercel-forwarded-for": "203.0.113.7" }, undefined), "unknown", "a forged forwarded header never fills in for a missing req.ip");
    assert.equal(clientKey({ "x-vercel-forwarded-for": "203.0.113.7" }, ""), "unknown");
    assert.equal(clientKey({}, "2001:db8::2"), "2001:db8::2", "an IPv6 req.ip");
    assert.equal(clientKey({ "x-forwarded-for": "203.0.113.7" }, RAILWAY_SAW), RAILWAY_SAW, "x-forwarded-for is never read, edge or not");
    assert.equal(clientKey({ ...edge, "x-forwarded-for": "203.0.113.7" }, RAILWAY_SAW), RAILWAY_SAW);
  });
  withEdge(undefined, () => {
    assert.equal(clientKey({ "x-edge-proxy-secret": "", "x-vercel-forwarded-for": "203.0.113.7" }, RAILWAY_SAW), RAILWAY_SAW, "unset, an empty header is not the edge");
    assert.equal(clientKey({ "x-vercel-forwarded-for": "203.0.113.7" }, undefined), "unknown");
  });
  withEdge("", () => {
    assert.equal(clientKey({ "x-edge-proxy-secret": "", "x-vercel-forwarded-for": "203.0.113.7" }, RAILWAY_SAW), RAILWAY_SAW, "set empty, the same as unset");
  });
});

test("the limit's last allowed request and its first refused one hold per key, through the edge and past it", () => {
  withEdge(EDGE, () => {
    const limiter = new RateLimiter(3, 60_000);
    const viaEdge = (address: string) => clientKey({ "x-edge-proxy-secret": EDGE, "x-vercel-forwarded-for": address }, VERCEL);
    const a = viaEdge("203.0.113.7");
    const b = viaEdge("2001:db8::1");
    assert.notEqual(a, b);
    assert.deepEqual([0, 1, 2, 3].map((i) => limiter.take(a, i)), [true, true, true, false], "the third passes, the fourth is refused");
    assert.equal(limiter.take(b, 4), true, "another visitor through the same edge address is untouched");
    // Direct calls all share the one address Railway saw, whatever they forge: one bucket.
    const direct = (forged: string) => clientKey({ "x-vercel-forwarded-for": forged }, RAILWAY_SAW);
    assert.deepEqual(["192.0.2.1", "192.0.2.2", "192.0.2.3", "192.0.2.4"].map((f, i) => limiter.take(direct(f), 10 + i)), [true, true, true, false]);
  });
});

test("the limiter admits the limit in a window, then frees as it slides", () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.take("a", 0), true);
  assert.equal(limiter.take("a", 100), true);
  assert.equal(limiter.take("a", 200), false);
  assert.equal(limiter.take("b", 200), true);
  assert.equal(limiter.take("a", 1001), true);
});

// The same rules as dbWaitlistStore's SQL, over an array.
function memoryStore(seed: WaitlistSignup[] = []): WaitlistStore & { rows: WaitlistSignup[] } {
  const rows = [...seed];
  const lastLink = (r: WaitlistSignup) => r.confirmSentAt ?? r.createdAt;
  return {
    rows,
    async sweep(before) {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].confirmedAt === null && lastLink(rows[i]) <= before) rows.splice(i, 1);
      }
    },
    async find(email) {
      return rows.find((r) => r.email === email) ?? null;
    },
    async findByTokenHash(hash) {
      return rows.find((r) => r.confirmTokenHash === hash) ?? null;
    },
    async insert(row) {
      if (rows.some((r) => r.email === row.email)) return false;
      rows.push({ ...row, createdAt: row.confirmSentAt, confirmedAt: null });
      return true;
    },
    async relink(id, link, sentBefore) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.confirmedAt || (r.confirmSentAt && r.confirmSentAt > sentBefore)) return false;
      Object.assign(r, { confirmTokenHash: link.hash, confirmSentAt: link.sentAt, consent: link.consent });
      return true;
    },
    async markConfirmed(id, at) {
      const r = rows.find((x) => x.id === id);
      if (!r) return false;
      r.confirmedAt = at;
      return true;
    },
  };
}

const T0 = new Date("2026-10-01T09:30:00Z");
const after = (ms: number) => new Date(T0.getTime() + ms);
const MINUTE = 60_000;
const DAY = 86_400_000;
const join = { email: " Ada@Example.com ", consent: "launch-email-v2", source: "nav", utmSource: "chatgpt.com", utmContent: "post-7" };

function row(over: Partial<WaitlistSignup>): WaitlistSignup {
  return {
    id: "r1",
    email: "old@example.com",
    consent: "launch-email-v2",
    source: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    createdAt: T0,
    confirmedAt: null,
    confirmTokenHash: null,
    confirmSentAt: null,
    ...over,
  };
}

test("the token: 32 random bytes in the link, only their SHA-256 in the table", async () => {
  const { token, hash } = newConfirmToken();
  assert.equal(Buffer.from(token, "base64url").length, 32);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hash, createHash("sha256").update(token).digest("hex"));
  assert.equal(hashConfirmToken(token), hash);
  assert.notEqual(newConfirmToken().token, token);

  const store = memoryStore();
  const mail = await joinWaitlist(store, join, T0);
  assert.ok(mail);
  assert.equal(mail.to, "ada@example.com");
  assert.deepEqual(mail.expiresOn, after(CONFIRM_LINK_MS));
  const [stored] = store.rows;
  assert.equal(stored.confirmTokenHash, hashConfirmToken(mail.token));
  assert.ok(!Object.values(stored).includes(mail.token), "the token itself is never stored");
  assert.equal(stored.confirmedAt, null);
  assert.deepEqual(stored.confirmSentAt, T0);
  assert.equal(stored.source, "nav");
  assert.equal(stored.utmSource, "chatgpt.com");
  assert.equal(stored.utmContent, "post-7");
});

test("the link opens the web app's /waitlist page, from configuration and never the request", () => {
  assert.equal(confirmUrl("abc_DEF-1", { PUBLIC_APP_URL: "https://mystarsdecoded.com/" }), "https://mystarsdecoded.com/waitlist?confirm=abc_DEF-1");
  assert.equal(confirmUrl("t", { APP_ENV: "production" }), "https://mystarsdecoded.com/waitlist?confirm=t");
  assert.equal(confirmUrl("t", { APP_ENV: "staging" }), "https://starsdecoded-staging.vercel.app/waitlist?confirm=t");
  assert.equal(confirmUrl("t", {}), "http://localhost:5173/waitlist?confirm=t");
});

test("every emailed link and image starts at the configured web origin, else the web app of the environment", () => {
  assert.equal(publicWebBase({ PUBLIC_APP_URL: " https://mystarsdecoded.com// " }), "https://mystarsdecoded.com");
  assert.equal(publicWebBase({ PUBLIC_APP_URL: " ", APP_ENV: "staging" }), "https://starsdecoded-staging.vercel.app");
  assert.equal(publicWebBase({ RAILWAY_ENVIRONMENT_NAME: "production" }), "https://mystarsdecoded.com");
  assert.equal(publicWebBase({}), "http://localhost:5173");
});

test("confirming: a live link confirms, a repeat answers the same, a wrong or malformed one does not", async () => {
  const store = memoryStore();
  const mail = await joinWaitlist(store, join, T0);
  assert.ok(mail);
  assert.equal(await confirmWaitlist(store, newConfirmToken().token, after(MINUTE)), false);
  assert.equal(await confirmWaitlist(store, "", after(MINUTE)), false);
  assert.equal(await confirmWaitlist(store, `${mail.token}x`, after(MINUTE)), false);
  assert.equal(store.rows[0].confirmedAt, null);

  assert.equal(await confirmWaitlist(store, mail.token, after(DAY)), true);
  assert.deepEqual(store.rows[0].confirmedAt, after(DAY));
  assert.equal(await confirmWaitlist(store, mail.token, after(30 * DAY)), true, "a confirmed address answers the same, however late");
  assert.deepEqual(store.rows[0].confirmedAt, after(DAY), "a repeat changes nothing");
});

test("confirming: a link past its seven days confirms nothing, and its address is gone", async () => {
  const store = memoryStore();
  const mail = await joinWaitlist(store, join, T0);
  assert.ok(mail);
  assert.equal(await confirmWaitlist(store, mail.token, after(CONFIRM_LINK_MS - 1)), true);

  const late = memoryStore();
  const lateMail = await joinWaitlist(late, join, T0);
  assert.ok(lateMail);
  assert.equal(await confirmWaitlist(late, lateMail.token, after(CONFIRM_LINK_MS)), false);
  assert.equal(late.rows.length, 0);
});

test("the throttle: one link per address in ten minutes, and a new link retires the old", async () => {
  const store = memoryStore();
  const first = await joinWaitlist(store, join, T0);
  assert.ok(first);
  assert.equal(await joinWaitlist(store, join, after(RELINK_AFTER_MS - 1)), null);
  assert.equal(store.rows[0].confirmTokenHash, hashConfirmToken(first.token));
  assert.equal(store.rows.length, 1);

  const second = await joinWaitlist(store, { ...join, consent: "launch-email-v1", utmContent: "post-9" }, after(RELINK_AFTER_MS));
  assert.ok(second);
  assert.notEqual(second.token, first.token);
  assert.deepEqual(second.expiresOn, after(RELINK_AFTER_MS + CONFIRM_LINK_MS));
  assert.equal(store.rows[0].consent, "launch-email-v1", "the consent is the wording the new link confirms");
  assert.equal(store.rows[0].utmContent, "post-7", "the tags stay the first join's");
  assert.equal(await confirmWaitlist(store, first.token, after(RELINK_AFTER_MS + MINUTE)), false);
  assert.equal(await confirmWaitlist(store, second.token, after(RELINK_AFTER_MS + MINUTE)), true);
});

test("a confirmed address that joins again gets no email and changes nothing", async () => {
  const store = memoryStore();
  const mail = await joinWaitlist(store, join, T0);
  assert.ok(mail);
  await confirmWaitlist(store, mail.token, after(MINUTE));
  const before = { ...store.rows[0] };
  assert.equal(await joinWaitlist(store, join, after(DAY)), null);
  assert.deepEqual(store.rows[0], before);
});

test("what a join does, by the address's standing", () => {
  assert.equal(joinAction(null, T0), "insert");
  assert.equal(joinAction(row({ confirmedAt: T0 }), after(DAY)), "none");
  assert.equal(joinAction(row({ confirmSentAt: T0 }), after(RELINK_AFTER_MS - 1)), "none");
  assert.equal(joinAction(row({ confirmSentAt: T0 }), after(RELINK_AFTER_MS)), "relink");
  assert.equal(joinAction(row({ confirmSentAt: null }), T0), "relink");
});

test("a join that loses a race to another sends nothing", async () => {
  const store = memoryStore();
  const lost: WaitlistStore = { ...store, find: async () => null, insert: async () => false };
  assert.equal(await joinWaitlist(lost, join, T0), null);
  const beaten: WaitlistStore = { ...store, find: async () => row({ confirmSentAt: T0 }), relink: async () => false };
  assert.equal(await joinWaitlist(beaten, join, after(DAY)), null);
});

test("the sweep: an unconfirmed address goes seven days after its latest link; a confirmed one stays", async () => {
  const store = memoryStore([
    row({ id: "fresh", email: "a@x.io", confirmSentAt: after(-CONFIRM_LINK_MS + 1) }),
    row({ id: "stale", email: "b@x.io", confirmSentAt: after(-CONFIRM_LINK_MS) }),
    row({ id: "unsent", email: "c@x.io", createdAt: after(-CONFIRM_LINK_MS), confirmSentAt: null }),
    row({ id: "kept", email: "d@x.io", confirmSentAt: after(-90 * DAY), confirmedAt: after(-89 * DAY) }),
    row({ id: "v1", email: "e@x.io", consent: "launch-email-v1", createdAt: after(-60 * DAY), confirmedAt: after(-60 * DAY) }),
  ]);
  await store.sweep(sweepBefore(T0));
  assert.deepEqual(store.rows.map((r) => r.id).sort(), ["fresh", "kept", "v1"]);
});

test("the sweep runs on every join and every confirmation", async () => {
  const stale = () => row({ id: "stale", email: "b@x.io", confirmSentAt: after(-CONFIRM_LINK_MS) });
  const joined = memoryStore([stale()]);
  await joinWaitlist(joined, join, T0);
  assert.deepEqual(joined.rows.map((r) => r.email), ["ada@example.com"]);
  const confirmed = memoryStore([stale()]);
  await confirmWaitlist(confirmed, "not-a-token", T0);
  assert.equal(confirmed.rows.length, 0);
});

test("a relinked address lives seven days from its latest link", async () => {
  const store = memoryStore();
  await joinWaitlist(store, join, T0);
  const second = await joinWaitlist(store, join, after(5 * DAY));
  assert.ok(second);
  await store.sweep(sweepBefore(after(CONFIRM_LINK_MS + DAY)));
  assert.equal(store.rows.length, 1);
  assert.equal(await confirmWaitlist(store, second.token, after(5 * DAY + CONFIRM_LINK_MS - 1)), true);
});

test("a link is live exactly while the sweep keeps its row", () => {
  for (const age of [0, RELINK_AFTER_MS, CONFIRM_LINK_MS - 1, CONFIRM_LINK_MS, CONFIRM_LINK_MS + 1]) {
    const sentAt = after(-age);
    const swept = sentAt <= sweepBefore(T0);
    assert.equal(linkLive({ confirmSentAt: sentAt }, T0), !swept, `age ${age}`);
  }
  assert.equal(linkLive({ confirmSentAt: null }, T0), false);
});

test("the closed state: production without a contact address takes no sign-up; staging and local always do", () => {
  const noContact = { ...LEGAL_IDENTITY, contactEmail: null };
  const blankContact = { ...LEGAL_IDENTITY, contactEmail: "  " };
  const complete = { ...LEGAL_IDENTITY, contactEmail: "hello@example.com" };
  assert.equal(waitlistClosed({ APP_ENV: "production" }, noContact), true);
  assert.equal(waitlistClosed({ RAILWAY_ENVIRONMENT_NAME: "production" }, noContact), true);
  assert.equal(waitlistClosed({ APP_ENV: "production" }, blankContact), true);
  assert.equal(waitlistClosed({ APP_ENV: "production" }, { ...complete, name: "" }), true);
  assert.equal(waitlistClosed({ APP_ENV: "production" }, complete), false);
  assert.equal(waitlistClosed({ APP_ENV: "production" }, { ...complete, postalAddress: null }), false, "the waitlist does not wait on the postal address");
  assert.equal(waitlistClosed({ APP_ENV: "staging" }, noContact), false);
  assert.equal(waitlistClosed({}, noContact), false);
});

test("the admin's list: confirmed and pending counts, the new fields, never the token's hash", () => {
  const listing = waitlistListing([
    row({ id: "a", email: "a@x.io", utmContent: "post-7", confirmTokenHash: "secret-hash-a", confirmSentAt: T0, confirmedAt: after(MINUTE) }),
    row({ id: "b", email: "b@x.io", confirmTokenHash: "secret-hash-b", confirmSentAt: T0 }),
    row({ id: "c", email: "c@x.io", consent: "launch-email-v1", confirmedAt: T0 }),
  ]);
  assert.equal(listing.total, 3);
  assert.equal(listing.confirmed, 2);
  assert.equal(listing.pending, 1);
  assert.equal(listing.signups[0].utmContent, "post-7");
  assert.equal(listing.signups[0].confirmedAt, after(MINUTE).toISOString());
  assert.equal(listing.signups[1].confirmedAt, null);
  assert.equal(listing.signups[0].createdAt, T0.toISOString());
  const leaked = JSON.stringify(listing);
  assert.ok(!leaked.includes("secret-hash") && !leaked.includes("confirmTokenHash") && !leaked.includes("confirmSentAt"));
});
