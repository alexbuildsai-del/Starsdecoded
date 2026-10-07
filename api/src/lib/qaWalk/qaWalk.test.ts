/**
 * The staging walk (R17-25) on a stubbed page, a stubbed Stripe and a stubbed Clerk under the pair's real hold, with a
 * model client that fails if called. Pinned: the list walked in its order with the local steps named, a deploy's walk
 * on a stored seed and with none (reading 11), its one write at Idris's zero balance (reading 17), a Release's walk
 * writing each stored step once and its hold keeping those reports alone for the seed, a failure stopping the rest,
 * findings with no email, token, link or Clerk id (R14-14), the door in front of every write, no Chromium as
 * `unconfigured`, and the walk refused off staging. The pair: the walk resets nothing itself (walkOnce does, B-39),
 * signs each reader in with a ticket made for their account alone after both bans lift, and bans both again whatever
 * happened; a page hands Clerk's helper that ticket and nothing else. The pictures (ADR-360): each step that ran leaves
 * one, taken by ChromiumPage itself on a stubbed page with reading 14's masks, of the tab whose screen it read, kept
 * under its walk, and the next walk's replace them. Nothing here opens a browser or reaches Clerk or Stripe, and no
 * picture reaches the database: qa.test.ts alone writes qa_shots. The lockfile's additions for @clerk/testing are
 * pinned too, and on a scratch Postgres named by WALK_DATABASE_URL the ledger's own reads and writes; without one that
 * test skips, saying why.
 */
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRATCH = process.env.WALK_DATABASE_URL;
// Only the ledger's own test queries, and only a database handed over for it; without one the pool points nowhere.
process.env.DATABASE_URL = SCRATCH ?? "postgres://test:test@127.0.0.1:1/never";
process.env.OPENAI_API_KEY ??= "sk-dummy-never-sent";
// Nothing listens there, so even a call that slipped past the stub below would reach no one.
process.env.OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.LOG_LEVEL ??= "silent";
// The pair's hold is qaPair.ts's own, which reads the host's APP_ENV; the walk itself reads the env each test hands it.
delete process.env.RAILWAY_ENVIRONMENT_NAME;
process.env.APP_ENV = "staging";

const { openai } = await import("@workspace/integrations-openai-ai-server");
const modelCalls: unknown[] = [];
(openai.chat.completions as unknown as { create: unknown }).create = async (req: unknown) => {
  modelCalls.push(req);
  throw new Error("the staging walk called the model");
};

const W = await import("./index.js");
const { ChromiumPage, SpendGuard, paidRoute } = await import("./browser.js");
const { STEPS } = await import("../../walk/steps.js");
const Q = await import("../qaPair.js");
const { QA_PAIR } = Q;
const { pool } = await import("@workspace/db");

type ApiAnswer = import("./browser.js").ApiAnswer;
type WalkBrowser = import("./browser.js").WalkBrowser;
type WalkPage = import("./browser.js").WalkPage;
type SignInTickets = import("./browser.js").SignInTickets;
type TicketSignIn = import("./browser.js").TicketSignIn;
type Guard = InstanceType<typeof SpendGuard>;
type WalkStripe = import("./steps.js").WalkStripe;
type WalkLedger = import("./steps.js").WalkLedger;
type QaPair = import("../qaPair.js").QaPair;
type QaClerk = import("../qaPair.js").QaClerk;
type QaWalkVerdict = import("./index.js").QaWalkVerdict;
type QaPairDoors = import("./index.js").QaPairDoors;
type WalkShots = import("./index.js").WalkShots;
type Role = "mira" | "idris";

const STAGING = { APP_ENV: "staging" } as NodeJS.ProcessEnv;
const WEB = "https://starsdecoded-staging.vercel.app";
const DAY = 86_400_000;
const LOCAL = ["tomas-report", "tomas-pair", "tomas-sends", "tomas-claims"];
const STORED = ["own-report", "idris-report", "pair"];
const SEED_READERS = ["no-credit", "share", "share-back", "pair-shared", "timeline"];
// Clerk's ids are long, so the walk's findings are pinned against ids shaped as Clerk makes them.
const PAIR: QaPair = {
  mira: { userId: "user_2mGqYxQaWalkMira01", email: QA_PAIR.mira.email, name: QA_PAIR.mira.name },
  idris: { userId: "user_2mGqYxQaWalkIdris02", email: QA_PAIR.idris.email, name: QA_PAIR.idris.name },
};
const TIMES = { poll: 1, webhook: 250, report: 250, once: 0 };

const dayOf = (at: Date) => at.toISOString().slice(0, 10);
const ok = (body: unknown): ApiAnswer => ({ status: 200, body });
const made = (body: unknown): ApiAnswer => ({ status: 201, body });

interface FakeReport {
  id: string;
  owner: Role;
  name: string;
  type: "natal" | "compatibility";
  profileId: string | null;
  readers: Map<Role, "owner" | "shared" | "participant">;
  send: "can_send" | "sent" | "joined" | null;
}

/** The live API as the walk meets it, kept to what its steps read, with the reset's balances to start from. */
class FakeSite {
  readonly calls: string[] = [];
  readonly screens: string[] = [];
  readonly paid: string[] = [];
  readonly signedIn: Record<Role, boolean> = { mira: false, idris: false };
  readonly balance: Record<Role, { available: number; used: number; held: number }> = {
    mira: { available: 20, used: 0, held: 0 },
    idris: { available: 0, used: 0, held: 0 },
  };
  readonly history: Record<Role, Array<{ kind: string; count: number; label: string }>> = { mira: [], idris: [] };
  readonly reports = new Map<string, FakeReport>();
  readonly invites = new Map<string, { kind: "gift" | "share" | "send"; from: Role; claimed: boolean; report?: string }>();
  readonly purchases = new Map<string, { item: string; status: "granted" | "refunded"; credits: number | null; returnTo: string; unused: number }>();
  plan: { periodEnd: Date; cancel: boolean } | null = null;
  emailDelivered = true;
  fail: { method: string; path: string; status: number; body: unknown } | null = null;
  /** A request the page makes on its own as a screen opens, as an app's code might. */
  pageAsks: { role: Role; screen: RegExp; method: string; path: string } | null = null;

  own(role: Role): FakeReport | undefined {
    return [...this.reports.values()].find((r) => r.owner === role && r.type === "natal");
  }

  addReport(owner: Role, type: "natal" | "compatibility"): FakeReport {
    const report: FakeReport = {
      id: randomUUID(),
      owner,
      name: type === "natal" ? PAIR[owner].name : `${PAIR.mira.name} & ${PAIR.idris.name}`,
      type,
      profileId: type === "natal" ? `profile-${owner}` : null,
      readers: new Map([[owner, "owner"]]),
      send: type === "compatibility" ? "can_send" : null,
    };
    this.reports.set(report.id, report);
    return report;
  }

  spend(role: Role, what: string): boolean {
    const me = this.balance[role];
    if (me.available <= 0) return false;
    me.available -= 1;
    me.used += 1;
    this.history[role].unshift({ kind: "spent", count: 1, label: what });
    return true;
  }

  private link(kind: "gift" | "share" | "send", from: Role, report?: string): string {
    const token = `${randomUUID().replaceAll("-", "")}.${randomUUID().replaceAll("-", "")}`;
    this.invites.set(token, { kind, from, claimed: false, report });
    return `${WEB}/claim?token=${encodeURIComponent(token)}`;
  }

  private access(role: Role) {
    const hasPersonalReport = Boolean(this.own(role));
    if (role !== "mira" || !this.plan) return { access: false, source: null, hasPersonalReport, ask: null };
    const day = dayOf(this.plan.periodEnd);
    return {
      access: true,
      source: "subscription",
      hasPersonalReport,
      ask: { used: 0, left: 50, cap: 50, resetsOn: "2026-11-01" },
      plan: { item: "timeline_year", status: "active", renewsOn: this.plan.cancel ? null : day, endsOn: this.plan.cancel ? day : null },
    };
  }

  answer(role: Role, method: string, path: string, body: unknown): ApiAnswer {
    this.calls.push(`${role} ${method} ${path}`);
    if (paidRoute(method, path)) this.paid.push(`${role} ${method} ${path}`);
    if (this.fail && this.fail.method === method && this.fail.path === path) return { status: this.fail.status, body: this.fail.body };
    if (!this.signedIn[role]) return { status: 401, body: { error: "sign_in_required", message: "Sign in to pay." } };
    const me = this.balance[role];
    const at = new Date().toISOString();
    let m: RegExpExecArray | null;
    if (method === "GET" && path === "/api/credits") return ok({ ...me, lastBundle: null });
    if (method === "GET" && path === "/api/credits/history") return ok(this.history[role].map((line) => ({ ...line, date: at, test: true })));
    if (method === "GET" && path === "/api/timeline/access") return ok(this.access(role));
    if (method === "GET" && path === "/api/home") {
      const own = this.own(role);
      const timeline = role === "mira" && this.plan ? { week: { days: [] } } : own ? { teaser: { cycles: [] } } : {};
      return ok({ you: own ? { reportId: own.id, profileId: own.profileId } : null, people: [], pairs: [], ...timeline });
    }
    if (method === "GET" && path === "/api/reports") return ok([...this.reports.values()].filter((r) => r.readers.has(role)).map((r) => ({ id: r.id })));
    if (method === "POST" && path === "/api/reports") {
      if (!this.spend(role, PAIR[role].name)) return { status: 402, body: { error: "no_credit", message: "You have no credits left." } };
      const report = this.addReport(role, "natal");
      return made({ id: report.id, kind: "natal", name: report.name, status: "interpreting", createdAt: at });
    }
    if (method === "POST" && path === "/api/compatibility") {
      if (!this.spend(role, "Mira Costa & Idris Costa")) return { status: 402, body: { error: "no_credit", message: "You have no credits left." } };
      return made({ id: this.addReport(role, "compatibility").id, relationshipId: "relationship-1", status: "interpreting" });
    }
    if ((m = /^\/api\/reports\/([^/]+)\/status$/.exec(path))) {
      return this.reports.get(m[1])?.readers.has(role) ? ok({ id: m[1], status: "complete", chartReady: true }) : { status: 404, body: null };
    }
    if (method === "GET" && (m = /^\/api\/reports\/([^/]+)$/.exec(path))) {
      const report = this.reports.get(m[1]);
      const access = report?.readers.get(role);
      if (!report || !access) return { status: 404, body: { error: "not_found", message: "Report not found" } };
      return ok({
        id: report.id,
        name: report.name,
        type: report.type,
        status: "complete",
        profileId: report.profileId,
        lens: report.type === "compatibility" ? "parent_child" : null,
        access,
        send: report.send && access === "owner" ? { state: report.send, profileId: "profile-idris", relationshipId: "relationship-1", firstName: "Idris" } : null,
        participants: report.type === "compatibility" ? [{ name: PAIR.mira.name }, { name: PAIR.idris.name }] : [],
      });
    }
    if (method === "POST" && path === "/api/gifts") {
      if (me.available <= 0) return { status: 402, body: { error: "no_credit", message: "You have no credits left." } };
      me.available -= 1;
      me.held += 1;
      const gift = body as { recipientName: string; email: string; note?: string };
      return made({
        id: randomUUID(), recipientName: gift.recipientName, email: gift.email, note: gift.note ?? null, sentAt: at, returnsAt: at,
        remindedAt: null, state: "waiting", creditHeld: true, claimUrl: this.link("gift", role), emailDelivered: this.emailDelivered,
      });
    }
    if ((m = /^\/api\/invites\/([^/]+)(\/claim)?$/.exec(path))) {
      const token = decodeURIComponent(m[1]);
      const invite = this.invites.get(token);
      if (!invite) return { status: 404, body: { error: "not_found" } };
      if (!m[2]) return ok({ token, email: PAIR.idris.email, profileName: null, expiresAt: at, alreadyClaimed: invite.claimed, kind: invite.kind });
      if (invite.claimed) return { status: 409, body: { error: "already_claimed" } };
      invite.claimed = true;
      if (invite.kind === "gift") {
        this.balance[invite.from].held -= 1;
        me.available += 1;
        this.history[role].unshift({ kind: "gift", count: 1, label: "A gift from Mira" });
        return ok({ profileId: null, redirectTo: "/dashboard", kind: "gift" });
      }
      const report = this.reports.get(invite.report ?? "");
      if (!report) return { status: 404, body: null };
      if (invite.kind === "share") {
        report.readers.set(role, "shared");
        return ok({ profileId: report.profileId, relationshipId: null, redirectTo: "/dashboard", kind: "share", askSelf: false, shareBack: true });
      }
      report.readers.set(role, "participant");
      report.send = "joined";
      return ok({ profileId: null, relationshipId: "relationship-1", relationshipReportId: report.id, redirectTo: `/compatibility/${report.id}`, kind: "send", askSelf: false });
    }
    if (method === "POST" && path === "/api/shares") {
      const own = this.own(role);
      if (!own) return { status: 409, body: { error: "no_personal_report" } };
      return made({ id: randomUUID(), email: (body as { email: string }).email, claimUrl: this.link("share", role, own.id), expiresAt: at, emailDelivered: this.emailDelivered });
    }
    if (method === "POST" && path === "/api/shares/back") {
      const own = this.own(role);
      if (!own) return { status: 409, body: { error: "no_personal_report" } };
      own.readers.set(role === "idris" ? "mira" : "idris", "shared");
      return made({ id: randomUUID(), email: "", readerName: "Mira", state: "active", sentAt: at });
    }
    if (method === "POST" && (m = /^\/api\/compatibility\/([^/]+)\/send$/.exec(path))) {
      const report = this.reports.get(m[1]);
      if (!report || report.owner !== role) return { status: 403, body: { error: "forbidden" } };
      report.send = "sent";
      const claimUrl = this.link("send", role, report.id);
      const token = new URL(claimUrl).searchParams.get("token");
      return made({
        state: "invited",
        invite: { id: randomUUID(), token, email: (body as { email: string }).email, profileId: "profile-idris", relationshipId: "relationship-1", expiresAt: at, claimUrl, emailDelivered: this.emailDelivered },
      });
    }
    if (method === "GET" && (m = /^\/api\/checkout\/([^/]+)$/.exec(path))) {
      const purchase = this.purchases.get(m[1]);
      return purchase ? ok({ status: purchase.status, item: purchase.item, returnTo: purchase.returnTo, credits: purchase.credits }) : { status: 404, body: null };
    }
    return { status: 404, body: { error: "not_found" } };
  }

  /** What the webhook does once the test card pays: a bundle's credits, or the yearly plan with its credit. */
  pay(role: Role, item: string, returnTo: string): string {
    const id = randomUUID();
    const me = this.balance[role];
    if (item === "family") {
      me.available += 5;
      this.history[role].unshift({ kind: "bought", count: 5, label: "5 test credits" });
      this.purchases.set(id, { item, status: "granted", credits: 5, returnTo, unused: 5 });
    } else {
      this.plan = { periodEnd: new Date(Date.now() + 365 * DAY), cancel: false };
      me.available += 1;
      this.history[role].unshift({ kind: "granted", count: 1, label: "With Timeline" });
      this.purchases.set(id, { item, status: "granted", credits: null, returnTo, unused: 0 });
    }
    return id;
  }
}

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
type Size = { width: number; height: number };
const sizeOf = (size: Size) => `${size.width}×${size.height}`;

interface Taken {
  role: Role;
  /** The tab's size as the picture was taken. */
  size: string;
  type?: string;
  quality?: number;
  masks: string[];
  fullPage?: boolean;
}

/** Each reader's tab as ChromiumPage's own picture() meets Playwright's page: a size, locators and a screenshot it records. */
class Camera {
  readonly taken: Taken[] = [];
  readonly size: Record<Role, Size> = { mira: { width: 1280, height: 900 }, idris: { width: 1280, height: 900 } };
  /** Every size each tab was set to, in order. */
  readonly resized: Record<Role, string[]> = { mira: [], idris: [] };

  tab(role: Role): InstanceType<typeof ChromiumPage> {
    const page = {
      viewportSize: () => this.size[role],
      setViewportSize: async (size: Size) => {
        this.size[role] = size;
        this.resized[role].push(sizeOf(size));
      },
      waitForTimeout: async () => undefined,
      locator: (selector: string) => ({ selector }),
      screenshot: async (options: { type?: string; quality?: number; mask?: Array<{ selector: string }>; fullPage?: boolean }) => {
        const masks = (options.mask ?? []).map((mask) => mask.selector);
        this.taken.push({ role, size: sizeOf(this.size[role]), type: options.type, quality: options.quality, masks, fullPage: options.fullPage });
        return Buffer.concat([JPEG, Buffer.from(role)]);
      },
    };
    const never = async (): Promise<never> => {
      throw new Error("a picture signs no one in");
    };
    return new ChromiumPage(page as unknown as ConstructorParameters<typeof ChromiumPage>[0], WEB, never, never);
  }
}

/** qa_shots as dbWalkShots keeps it: one picture a step, and a walk's first picture clears every other walk's. */
class FakeShots implements WalkShots {
  readonly rows = new Map<string, { walkId: string; jpeg: Buffer }>();
  readonly kept: Array<{ step: string; walkId: string }> = [];

  async keep(step: string, walkId: string, jpeg: Buffer): Promise<void> {
    for (const [at, row] of this.rows) if (row.walkId !== walkId) this.rows.delete(at);
    this.rows.set(step, { walkId, jpeg });
    this.kept.push({ step, walkId });
  }

  /** Whose tab a kept picture is of, as the camera wrote it. */
  tabOf(step: string): string | undefined {
    return this.rows.get(step)?.jpeg.subarray(JPEG.length).toString();
  }
}

function fakeBrowser(site: FakeSite, opened: Guard[] = [], camera = new Camera()): WalkBrowser {
  const page = (role: Role, guard: Guard, tickets: SignInTickets): WalkPage => ({
    async signIn(email) {
      assert.equal(email, PAIR[role].email);
      // Only a ticket made for this reader's own account signs them in.
      const ticket = await tickets(email);
      if (!new RegExp(`^ticket-${role}-\\d+$`).test(ticket)) throw new Error(`${role} was handed another account's ticket`);
      site.signedIn[role] = true;
    },
    async api(method, path, body) {
      // The context's door, as Chromium's route holds it.
      if (!guard.allows(method, path)) throw new TypeError("Failed to fetch");
      return site.answer(role, method, path, body);
    },
    async screen(path, shows) {
      site.screens.push(`${role} ${path ?? "(here)"} ${JSON.stringify(shows)}`);
      const asks = site.pageAsks;
      if (asks && asks.role === role && path && asks.screen.test(path)) guard.allows(asks.method, asks.path);
    },
    async pay(item, returnTo) {
      return site.pay(role, item, returnTo);
    },
  });
  return {
    async open(guard, tickets) {
      opened.push(guard);
      const tabs = { mira: camera.tab("mira"), idris: camera.tab("idris") };
      return {
        mira: page("mira", guard, tickets),
        idris: page("idris", guard, tickets),
        picture: (who) => tabs[who].picture(),
        close: async () => undefined,
      };
    },
  };
}

/** Clerk as the pair's hold meets it, both accounts banned between walks, as a start leaves them. */
function fakeClerk(log: string[]) {
  const roleOf = (userId: string) => (userId === PAIR.mira.userId ? "mira" : userId === PAIR.idris.userId ? "idris" : "someone else");
  const banned = new Set([PAIR.mira.userId, PAIR.idris.userId]);
  const refuse: { ban?: string; unban?: string } = {};
  let tokens = 0;
  const clerk: QaClerk = {
    async find(email) {
      return email === PAIR.mira.email ? PAIR.mira.userId : email === PAIR.idris.email ? PAIR.idris.userId : null;
    },
    async create() {
      throw new Error("the walk's ensure is a stand-in, so no account is made here");
    },
    async ban(userId) {
      log.push(`ban ${roleOf(userId)}`);
      if (refuse.ban === userId) throw new Error(`Clerk answered 503 for ${userId}`);
      banned.add(userId);
    },
    async unban(userId) {
      log.push(`unban ${roleOf(userId)}`);
      if (refuse.unban === userId) throw new Error(`Clerk answered 503 for ${userId}`);
      banned.delete(userId);
    },
    async signInToken(userId) {
      log.push(`token ${roleOf(userId)}`);
      if (banned.has(userId)) throw new Error("a sign-in token for a banned account");
      tokens += 1;
      return `ticket-${roleOf(userId)}-${tokens}`;
    },
  };
  return { clerk, banned, refuse };
}

const BOTH = [PAIR.idris.userId, PAIR.mira.userId].sort();
const bannedNow = (clerk: ReturnType<typeof fakeClerk>) => [...clerk.banned].sort();

function fakeStripe(site: FakeSite, log: string[]): WalkStripe {
  return {
    async makeClock() {
      log.push("make clock");
      return "clock_test_1";
    },
    async makeCustomer(clock) {
      log.push(`make customer on ${clock}`);
      return "cus_test_1";
    },
    async advance(_clock, to) {
      log.push("advance");
      const plan = site.plan;
      if (!plan || to <= plan.periodEnd) return;
      if (plan.cancel) {
        site.plan = null;
        return;
      }
      plan.periodEnd = new Date(plan.periodEnd.getTime() + 365 * DAY);
      site.balance.mira.available += 1;
      site.history.mira.unshift({ kind: "granted", count: 1, label: "With Timeline" });
    },
    async deleteClock(clock) {
      log.push(`delete ${clock}`);
    },
    async refund() {
      log.push("refund");
      const purchase = [...site.purchases.values()].find((p) => p.item === "family");
      if (!purchase) return;
      purchase.status = "refunded";
      site.balance.mira.available -= purchase.unused;
      site.history.mira.unshift({ kind: "refunded", count: purchase.unused, label: "Refunded" });
      purchase.unused = 0;
    },
    async subscriptionOf() {
      return site.plan ? { id: "sub_test_1", status: "active", periodEnd: site.plan.periodEnd } : null;
    },
    async cancelAtPeriodEnd() {
      log.push("cancel");
      if (site.plan) site.plan.cancel = true;
    },
  };
}

function fakeLedger(site: FakeSite, log: string[]): WalkLedger {
  return {
    async useCustomer(userId, customer) {
      log.push(`use ${customer} for ${userId}`);
    },
    async forgetCustomer(userId, customer) {
      log.push(`forget ${customer} for ${userId}`);
    },
    async paymentOf() {
      return "pi_test_1";
    },
    async unusedOf(purchase) {
      return { available: site.purchases.get(purchase)?.unused ?? 0, held: 0 };
    },
    async receiptOf() {
      return true;
    },
  };
}

/** The pair's doors: ensure and place stand in for the database, and the hold is qaPair.ts's own over the stubbed Clerk. */
function fakePair(site: FakeSite, seeded: boolean, log: string[], wrote: Array<[string, string]> = []): QaPairDoors {
  return {
    async ensure() {
      log.push("ensure");
      return PAIR;
    },
    async open(pair) {
      const hold = await Q.openQaPair(pair);
      return {
        ...hold,
        wrote(step, reportId) {
          wrote.push([step, reportId]);
          hold.wrote(step, reportId);
        },
      };
    },
    async place(_pair, step) {
      log.push(`place ${step}`);
      if (!seeded) return null;
      // A copy takes the credit its write would, as placeSeed does (2026-10-06).
      const role = step === "idris-report" ? "idris" : "mira";
      if (!site.spend(role, step === "pair" ? "Mira Costa & Idris Costa" : PAIR[role].name)) throw new Error(`no credit was left to copy ${step} with`);
      return site.addReport(role, step === "pair" ? "compatibility" : "natal").id;
    },
  };
}

interface Walked {
  verdict: QaWalkVerdict;
  site: FakeSite;
  log: string[];
  clerk: ReturnType<typeof fakeClerk>;
  /** What the hold kept for the seed: each stored step and the report its write answered. */
  wrote: Array<[string, string]>;
  /** Every picture the stubbed tabs took, unless the test brought its own browser. */
  camera: Camera;
  shots: FakeShots;
}

interface WalkOptions {
  seeded?: boolean;
  site?: FakeSite;
  signal?: AbortSignal;
  browser?: WalkBrowser;
  /** Set on the stubbed Clerk before the walk starts. */
  refuse?: { ban?: string; unban?: string };
  /** One store across walks, as qa_shots is. */
  shots?: FakeShots;
}

async function walk(mode: "deploy" | "release", options: WalkOptions = {}): Promise<Walked> {
  const site = options.site ?? new FakeSite();
  const log: string[] = [];
  const wrote: Array<[string, string]> = [];
  const camera = new Camera();
  const shots = options.shots ?? new FakeShots();
  const clerk = fakeClerk(log);
  Object.assign(clerk.refuse, options.refuse);
  const restore = Q.setQaClerk(clerk.clerk);
  try {
    const verdict = await W.runQaWalk({
      mode,
      signal: options.signal,
      deps: {
        env: STAGING,
        browser: options.browser ?? fakeBrowser(site, [], camera),
        stripe: fakeStripe(site, log),
        ledger: fakeLedger(site, log),
        pair: fakePair(site, options.seeded ?? true, log, wrote),
        shots,
        times: TIMES,
        sleep: async () => undefined,
      },
    });
    return { verdict, site, log, clerk, wrote, camera, shots };
  } finally {
    restore();
  }
}

const statusOf = (verdict: QaWalkVerdict) => Object.fromEntries(verdict.steps.map((step) => [step.id, step.status]));

test("a deploy's walk on a stored seed runs the list in its order: the live steps pass, the stored ones are the seed's", async () => {
  const { verdict, site, log, clerk, wrote } = await walk("deploy", { seeded: true });
  assert.deepEqual(verdict.findings, []);
  assert.equal(verdict.status, "pass");
  assert.deepEqual(verdict.steps.map((step) => step.id), STEPS.map((step) => step.id));
  assert.deepEqual(verdict.steps.map((step) => step.label), STEPS.map((step) => step.label));
  for (const step of verdict.steps) {
    const want = LOCAL.includes(step.id) ? "local" : STORED.includes(step.id) ? "stored" : "pass";
    assert.equal(step.status, want, step.id);
    if (want === "local") assert.ok(step.reason?.includes("Tomás"), step.id);
  }
  // Reading 17: one write, Idris's, at a zero balance, answered by the 402; no pair is written and no Timeline page opens.
  assert.deepEqual(site.paid, ["idris POST /api/reports"]);
  // His copied report took the gifted credit, so the 402 met an empty balance.
  assert.deepEqual(site.balance.idris, { available: 0, used: 1, held: 0 });
  assert.deepEqual(log.filter((line) => line.startsWith("place")), ["place own-report", "place idris-report", "place pair"]);
  // The refund took the five unused credits back; the plan opened, renewed a year on, and closed at the end it was set to.
  assert.equal(site.purchases.size, 2);
  assert.equal(site.plan, null);
  // walkOnce put the pair back at the walk's start, so the walk resets nothing (B-39). Both bans lift before the first
  // token, each reader's token is made as they sign in, and both are banned again before the clock goes.
  assert.deepEqual(log.filter((line) => !line.startsWith("place")), [
    "ensure", "unban mira", "unban idris", "token mira",
    "make clock", "make customer on clock_test_1", `use cus_test_1 for ${PAIR.mira.userId}`,
    "token idris", "refund", "advance", "cancel", "advance",
    "ban mira", "ban idris", "delete clock_test_1", `forget cus_test_1 for ${PAIR.mira.userId}`,
  ]);
  assert.deepEqual(bannedNow(clerk), BOTH);
  assert.deepEqual(wrote, [], "a deploy's walk writes nothing, so its hold keeps nothing for the seed");
  assert.deepEqual(modelCalls, []);
});

test("with no seed yet, the stored steps and every step that reads their reports wait for the first Release", async () => {
  const { verdict, site, log, clerk } = await walk("deploy", { seeded: false });
  assert.equal(verdict.status, "unseeded");
  assert.deepEqual(verdict.findings, []);
  const status = statusOf(verdict);
  for (const id of ["sign-in", "buy", "gift", "gift-claimed", "refund"]) assert.equal(status[id], "pass", id);
  for (const id of [...STORED, ...SEED_READERS]) {
    assert.equal(status[id], "not_run", id);
    assert.equal(verdict.steps.find((step) => step.id === id)?.reason, W.WAITING_LINE, id);
  }
  // The pair is never asked for once the reports it goes over are missing.
  assert.deepEqual(log.filter((line) => line.startsWith("place")), ["place own-report", "place idris-report"]);
  // Idris still holds the gift with no report to spend it, so the 402 waits too and the walk asks to write nothing.
  assert.deepEqual(site.paid, []);
  assert.ok(log.includes("delete clock_test_1"));
  assert.deepEqual(bannedNow(clerk), BOTH);
  assert.deepEqual(modelCalls, []);
});

test("a Release's walk writes each stored step once, for real, never copies a seed, and its hold keeps those three reports alone for the seed", async () => {
  const { verdict, site, log, clerk, wrote } = await walk("release");
  assert.deepEqual(verdict.findings, []);
  assert.equal(verdict.status, "pass");
  for (const id of STORED) assert.equal(statusOf(verdict)[id], "pass", id);
  assert.deepEqual(site.paid, ["mira POST /api/reports", "idris POST /api/reports", "idris POST /api/reports", "mira POST /api/compatibility"]);
  assert.equal(log.some((line) => line.startsWith("place")), false);
  // Mira's own report and the pair took two of her credits; Idris's took the gifted one.
  assert.deepEqual([site.balance.mira.used, site.balance.idris], [2, { available: 0, used: 1, held: 0 }]);
  // Each the report its step's own write answered: storeQaSeed keeps these and no other.
  const reports = [...site.reports.values()];
  const natalOf = (role: Role) => reports.find((report) => report.owner === role && report.type === "natal")?.id;
  assert.equal(reports.length, 3);
  assert.deepEqual(wrote, [["own-report", natalOf("mira")], ["idris-report", natalOf("idris")], ["pair", reports.find((report) => report.type === "compatibility")?.id]]);
  assert.deepEqual(bannedNow(clerk), BOTH);
});

test("the first step that fails stops the rest, and its finding holds no email, token, link or Clerk id", async () => {
  const site = new FakeSite();
  const token = "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6.q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2";
  site.fail = {
    method: "POST",
    path: "/api/gifts",
    status: 500,
    body: {
      error: "internal_error",
      message:
        `${PAIR.idris.email} for ${PAIR.mira.userId} at ${WEB}/claim?token=${token} ` +
        "with eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzIifQ.c2lnbmF0dXJlLXNpZ25hdHVyZQ and sk_test_51NfakeKeyForTheWalk",
    },
  };
  const { verdict, log, clerk } = await walk("deploy", { site });
  assert.equal(verdict.status, "fail");
  const status = statusOf(verdict);
  assert.deepEqual([status["sign-in"], status.buy, status["own-report"], status.gift], ["pass", "pass", "stored", "fail"]);
  for (const step of STEPS.slice(4)) assert.equal(status[step.id], LOCAL.includes(step.id) ? "local" : "not_run", step.id);
  assert.equal(verdict.steps.find((step) => step.id === "no-credit")?.reason, "an earlier step failed");
  assert.equal(verdict.findings.length, 1);
  assert.equal(verdict.findings[0].step, "gift");
  assert.equal(verdict.findings[0].title, "the gift");
  // Nothing after the failure ran: Idris never signed in nor asked to write, and the clock still went.
  assert.equal(site.signedIn.idris, false);
  assert.deepEqual(site.paid, []);
  assert.ok(log.includes("delete clock_test_1"));
  // No token was made for him, and both are banned again all the same.
  assert.deepEqual(log.filter((line) => /^(unban|token|ban) /.test(line)), ["unban mira", "unban idris", "token mira", "ban mira", "ban idris"]);
  assert.deepEqual(bannedNow(clerk), BOTH);

  const said = JSON.stringify(verdict);
  for (const leak of [/@/, /https?:/, /user_[A-Za-z0-9]{6}/, /eyJ/, /sk_test_/, /a1B2c3D4/, /q7R8s9T0/, /mystarsdecoded/]) {
    assert.doesNotMatch(said, leak);
  }
  assert.match(verdict.findings[0].detail, /answered 500 \(internal_error/);
  assert.match(verdict.steps.find((step) => step.id === "gift")?.reason ?? "", /^the gift: answered 500/);
});

test("an email that wasn't delivered is a finding on its step, and the walk still passes", async () => {
  const site = new FakeSite();
  site.emailDelivered = false;
  const { verdict } = await walk("deploy", { site });
  assert.equal(verdict.status, "pass");
  assert.deepEqual(
    verdict.findings.map((finding) => [finding.step, finding.title]),
    [["gift", "the gift's email wasn't delivered"], ["share", "the share's email wasn't delivered"], ["pair-shared", "the pair's email wasn't delivered"]],
  );
  assert.doesNotMatch(JSON.stringify(verdict.findings), /@|https?:|token/);
});

test("a page that asks on its own for a route that writes or reads ahead is stopped, and its step fails", async () => {
  const site = new FakeSite();
  site.pageAsks = { role: "idris", screen: /^\/report\//, method: "GET", path: "/api/timeline/now?range=six-months" };
  const { verdict, clerk } = await walk("deploy", { site });
  assert.equal(verdict.status, "fail");
  // Idris's first report screen is his own, in the idris-report step.
  assert.equal(statusOf(verdict)["idris-report"], "fail");
  assert.match(verdict.findings[0].detail, /asked for \/api\/timeline\/\*, which a walk never lets through/);
  assert.equal(statusOf(verdict).share, "not_run");
  assert.deepEqual(bannedNow(clerk), BOTH);
});

test("each step that ran leaves one picture with reading 14's masks, at a phone's size, of the tab whose screen it read, kept under the walk its line names", async () => {
  const { verdict, camera, shots } = await walk("deploy", { seeded: true });
  assert.equal(verdict.status, "pass");
  const ran = verdict.steps.filter((step) => step.status !== "local" && step.status !== "not_run").map((step) => step.id);
  assert.deepEqual(ran, STEPS.filter((step) => !LOCAL.includes(step.id)).map((step) => step.id));
  // One picture a step that ran, in the list's order, each under this walk; a local step has none.
  assert.deepEqual(shots.kept.map((shot) => shot.step), ran);
  const walkIds = [...new Set(shots.kept.map((shot) => shot.walkId))];
  assert.equal(walkIds.length, 1);
  for (const step of verdict.steps) assert.equal(step.shot, ran.includes(step.id) ? walkIds[0] : undefined, step.id);

  // Every picture: a JPEG at quality 60 of a 390 × 844 screen, the screen alone, with every input, textarea, editable
  // area and frame masked (Stripe's fields and Clerk's checks are frames).
  assert.equal(camera.taken.length, ran.length);
  for (const [n, taken] of camera.taken.entries()) {
    assert.deepEqual(
      { type: taken.type, quality: taken.quality, size: taken.size, masks: taken.masks, fullPage: taken.fullPage },
      { type: "jpeg", quality: 60, size: "390×844", masks: ["input", "textarea", "[contenteditable]", "iframe"], fullPage: undefined },
      `picture ${n + 1}`,
    );
  }
  // Each tab goes back to its own size after every picture, so the next step reads the layout it was written for.
  for (const role of ["mira", "idris"] as const) {
    const pictures = camera.taken.filter((taken) => taken.role === role).length;
    assert.deepEqual(camera.resized[role], Array.from({ length: pictures }, () => ["390×844", "1280×900"]).flat(), role);
  }
  // The tab whose screen the step read: Idris's own at the gift's claim and the 402, Mira's as she reads his report, and
  // Mira's Account page in Timeline though Idris is asked after it.
  assert.deepEqual(
    ["gift", "gift-claimed", "no-credit", "share", "share-back", "timeline"].map((id) => shots.tabOf(id)),
    ["mira", "idris", "idris", "idris", "mira", "mira"],
  );
  assert.deepEqual(modelCalls, []);
});

test("a failed step is pictured and the steps after it aren't, and the next walk's pictures replace the last walk's, so only the newest walk is kept", async () => {
  const shots = new FakeShots();
  const first = await walk("deploy", { shots });
  assert.equal(first.verdict.status, "pass");
  const firstId = first.verdict.steps[0].shot;
  assert.ok(firstId);
  assert.equal(shots.rows.get("timeline")?.walkId, firstId);

  const site = new FakeSite();
  site.fail = { method: "POST", path: "/api/gifts", status: 500, body: { error: "internal_error" } };
  const second = await walk("deploy", { site, shots });
  assert.equal(second.verdict.status, "fail");
  const secondId = second.verdict.steps[0].shot;
  assert.ok(secondId && secondId !== firstId, "each walk keeps its pictures under an id of its own");
  // The gift failed and still left its picture; nothing after it ran, so nothing after it was pictured.
  assert.deepEqual(
    second.verdict.steps.filter((step) => step.shot !== undefined).map((step) => [step.id, step.status, step.shot]),
    [["sign-in", "pass", secondId], ["buy", "pass", secondId], ["own-report", "stored", secondId], ["gift", "fail", secondId]],
  );
  assert.equal(second.camera.taken.length, 4);
  // Only the newest walk's pictures are kept: the first walk's of the later steps went with its first one replaced.
  assert.deepEqual([...shots.rows.keys()].sort(), ["buy", "gift", "own-report", "sign-in"]);
  for (const [step, row] of shots.rows) assert.equal(row.walkId, secondId, step);
});

test("the door: a deploy's walk writes once, at the 402, and nothing else that spends gets through on either walk", () => {
  assert.equal(paidRoute("POST", "/api/reports"), "POST /api/reports");
  assert.equal(paidRoute("post", "/API/Reports/"), "POST /api/reports");
  assert.equal(paidRoute("POST", "/api/compatibility"), "POST /api/compatibility");
  assert.equal(paidRoute("POST", "/api/reports/0a1b/regenerate"), "POST /api/reports/:id/regenerate");
  assert.equal(paidRoute("PATCH", "/api/profiles/0a1b/birth-time"), "PATCH /api/profiles/:id/birth-time");
  assert.equal(paidRoute("POST", "/api/ask"), "POST /api/ask");
  assert.equal(paidRoute("GET", "/api/timeline/now?range=six-months"), "/api/timeline/*");
  assert.equal(paidRoute("POST", "/api/timeline/readings/contact:x"), "/api/timeline/*");
  for (const [method, path] of [["GET", "/api/timeline/access"], ["GET", "/api/ask"], ["POST", "/api/gifts"], ["GET", "/api/reports/0a1b"], ["POST", "/api/compatibility/0a1b/send"]]) {
    assert.equal(paidRoute(method, path), null, `${method} ${path}`);
  }

  const deploy = new SpendGuard("deploy");
  assert.equal(deploy.allows("POST", "/api/reports"), false);
  deploy.arm("/api/reports");
  assert.equal(deploy.allows("GET", "/api/timeline/now?range=week"), false);
  assert.equal(deploy.allows("POST", "/api/reports"), true);
  assert.equal(deploy.allows("POST", "/api/reports"), false);
  assert.throws(() => deploy.arm("/api/reports"), /once/);
  assert.throws(() => new SpendGuard("deploy").arm("/api/compatibility"), /once/);
  assert.deepEqual(deploy.refused, ["POST /api/reports", "/api/timeline/*", "POST /api/reports"]);

  const release = new SpendGuard("release");
  for (const path of ["/api/reports", "/api/reports", "/api/compatibility"] as const) {
    release.arm(path);
    assert.equal(release.allows("POST", path), true);
  }
  assert.equal(release.allows("POST", "/api/reports/0a1b/regenerate"), false);
  assert.equal(release.allows("POST", "/api/ask"), false);
});

test("no Chromium is unconfigured: nothing is asked of the pair, Stripe or the browser", async () => {
  const asked: string[] = [];
  const refuse = (what: string) => async (): Promise<never> => {
    asked.push(what);
    throw new Error(`${what} was asked`);
  };
  const absent = W.liveWalkBrowser({ PATH: "", QA_BROWSER_PATH: "/nowhere/chromium" });
  assert.ok("unconfigured" in absent);
  const verdict = await W.runQaWalk({
    mode: "deploy",
    deps: {
      env: STAGING,
      browser: absent,
      stripe: fakeStripe(new FakeSite(), asked),
      pair: { ensure: refuse("ensure"), open: refuse("open"), place: refuse("place") },
    },
  });
  assert.equal(verdict.status, "unconfigured");
  assert.deepEqual(asked, []);
  for (const step of verdict.steps) {
    assert.equal(step.status, LOCAL.includes(step.id) ? "local" : "not_run", step.id);
    if (!LOCAL.includes(step.id)) assert.match(step.reason ?? "", /no Chromium/);
  }
  assert.deepEqual(verdict.findings.map((finding) => [finding.step, finding.title]), [[null, "the walk can't run on this host"]]);
});

test("a pair that can't be made ready fails the first step, and a stopped walk stops where it is", async () => {
  const site = new FakeSite();
  const verdict = await W.runQaWalk({
    mode: "deploy",
    deps: {
      env: STAGING,
      browser: fakeBrowser(site),
      stripe: fakeStripe(site, []),
      ledger: fakeLedger(site, []),
      pair: {
        ensure: async () => {
          throw new Error(`Clerk refused ${PAIR.mira.email}`);
        },
        // Nothing found means nothing to open, and so nothing to ban again.
        open: async () => {
          throw new Error("a pair that was never found was opened");
        },
        place: async () => null,
      },
      shots: new FakeShots(),
      times: TIMES,
      sleep: async () => undefined,
    },
  });
  assert.equal(verdict.status, "fail");
  assert.equal(statusOf(verdict)["sign-in"], "fail");
  assert.equal(statusOf(verdict).buy, "not_run");
  assert.deepEqual(site.calls, []);
  assert.doesNotMatch(JSON.stringify(verdict), /@/);

  const stop = new AbortController();
  stop.abort();
  const { verdict: stopped, clerk } = await walk("deploy", { signal: stop.signal });
  assert.equal(stopped.status, "fail");
  assert.equal(statusOf(stopped)["sign-in"], "fail");
  assert.match(stopped.findings[0].detail, /stopped before it finished/);
  assert.deepEqual(bannedNow(clerk), BOTH);
});

test("the walk refuses off staging before it asks anyone anything", async () => {
  for (const env of [{ APP_ENV: "production" }, { APP_ENV: "development" }, { RAILWAY_ENVIRONMENT_NAME: "production" }]) {
    const asked: string[] = [];
    await assert.rejects(
      W.runQaWalk({
        mode: "deploy",
        deps: {
          env: env as NodeJS.ProcessEnv,
          browser: { open: async () => { asked.push("browser"); throw new Error("opened"); } },
          pair: {
            ensure: async () => { asked.push("ensure"); return PAIR; },
            open: async () => { asked.push("open"); throw new Error("opened"); },
            place: async () => null,
          },
        },
      }),
      /refused on (production|development)/,
    );
    assert.deepEqual(asked, []);
  }
});

test("both accounts are banned again after a walk whose browser never opened, and after an open Clerk refused part way", async () => {
  const crashed: WalkBrowser = {
    open: async () => {
      throw new Error("Chromium crashed as it started");
    },
  };
  const noBrowser = await walk("deploy", { browser: crashed });
  assert.equal(noBrowser.verdict.status, "fail");
  assert.match(noBrowser.verdict.steps.find((step) => step.id === "sign-in")?.reason ?? "", /Chromium crashed/);
  assert.deepEqual(noBrowser.log, ["ensure", "unban mira", "unban idris", "ban mira", "ban idris"]);
  assert.deepEqual(bannedNow(noBrowser.clerk), BOTH);

  // Mira's ban lifted and Idris's didn't: no token is made, the browser never opens, and Mira is banned again.
  const opened: Guard[] = [];
  const site = new FakeSite();
  const halfOpen = await walk("deploy", { site, browser: fakeBrowser(site, opened), refuse: { unban: PAIR.idris.userId } });
  assert.equal(halfOpen.verdict.status, "fail");
  assert.equal(statusOf(halfOpen.verdict)["sign-in"], "fail");
  assert.equal(opened.length, 0);
  assert.deepEqual(halfOpen.log, ["ensure", "unban mira", "unban idris", "ban mira", "ban idris"]);
  assert.deepEqual(bannedNow(halfOpen.clerk), BOTH);
  assert.doesNotMatch(JSON.stringify(halfOpen.verdict), /user_[A-Za-z0-9]{6}/);
});

test("a ban Clerk refuses as the walk ends is a finding that names no account, and the walk's status still stands on its steps", async () => {
  const { verdict, log, clerk } = await walk("deploy", { refuse: { ban: PAIR.mira.userId } });
  assert.equal(verdict.status, "pass");
  assert.deepEqual(verdict.findings.map((finding) => [finding.step, finding.title]), [[null, "Clerk failed 1 of 2 calls"]]);
  assert.doesNotMatch(JSON.stringify(verdict), /user_[A-Za-z0-9]{6}|@/);
  // Idris is banned all the same, and the clock still goes after.
  assert.deepEqual(bannedNow(clerk), [PAIR.idris.userId]);
  assert.ok(log.indexOf("delete clock_test_1") > log.indexOf("ban idris"));
});

test("the browser's sign-in tokens are made for the pair's two addresses alone", async () => {
  const site = new FakeSite();
  const asked: string[] = [];
  const strict: WalkBrowser = {
    async open(guard, tickets) {
      for (const email of ["someone@example.com", PAIR.mira.email.toUpperCase()]) {
        await tickets(email).then(
          () => asked.push(`made for ${email}`),
          (err: Error) => asked.push(err.message),
        );
      }
      return fakeBrowser(site).open(guard, tickets);
    },
  };
  const { verdict, log } = await walk("deploy", { site, browser: strict });
  assert.equal(verdict.status, "pass");
  assert.deepEqual(asked, ["only the QA pair signs in on a walk", "only the QA pair signs in on a walk"]);
  assert.deepEqual(log.filter((line) => line.startsWith("token")), ["token mira", "token idris"]);
});

test("a page signs in with the ticket the walk made for that address, once it stands on the site, and hands Clerk's helper nothing else", async () => {
  const done: string[] = [];
  const stub = {
    async goto(url: string) {
      done.push(`open ${url}`);
      return null;
    },
    async waitForFunction() {
      done.push("wait for the account");
      return null;
    },
  };
  const page = stub as unknown as ConstructorParameters<typeof ChromiumPage>[0];
  const handed: unknown[] = [];
  const signInWith: TicketSignIn = async (opts) => {
    done.push("sign in");
    handed.push(opts);
  };
  const tickets: SignInTickets = async (email) => {
    done.push(`ticket for ${email}`);
    return "ticket-mira-1";
  };
  await new ChromiumPage(page, WEB, signInWith, tickets).signIn(PAIR.mira.email);
  assert.deepEqual(done, [`open ${WEB}/`, `ticket for ${PAIR.mira.email}`, "sign in", "wait for the account"]);
  // The ticket strategy and its ticket, and nothing else.
  assert.deepEqual(handed, [{ page, signInParams: { strategy: "ticket", ticket: "ticket-mira-1" } }]);

  // No ticket, no sign-in: Clerk's helper is never asked.
  const noTicket = new ChromiumPage(page, WEB, signInWith, async () => {
    throw new Error("the walk has let the pair go, so no sign-in token is made");
  });
  await assert.rejects(noTicket.signIn(PAIR.mira.email), /let the pair go/);
  assert.equal(handed.length, 1);

  // A page Clerk never signs in fails its step in plain words.
  const neverIn = { ...stub, waitForFunction: async () => { throw new Error("page.waitForFunction: Timeout 30000ms exceeded."); } };
  const stuck = new ChromiumPage(neverIn as unknown as typeof page, WEB, signInWith, tickets);
  await assert.rejects(stuck.signIn(PAIR.mira.email), /Clerk never signed the page in with the walk's sign-in token/);
});

test("findings are cleaned by the value wherever it sits, never by the key it came under", () => {
  const dirty =
    `${PAIR.mira.email} ${WEB}/claim?token=abc.def user_2mGqYxQaWalkMira01 sess_2mGqYxQaWalk ` +
    "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzIifQ.c2lnbmF0dXJlLXNpZ25hdHVyZQ rk_test_51Nkey whsec_abc123 ticket=xyz " +
    "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d";
  const clean = W.cleanText(dirty);
  for (const leak of [/@/, /https?:/, /user_/, /sess_/, /eyJ/, /rk_test/, /whsec_/, /xyz/, /0a1b2c3d/]) assert.doesNotMatch(clean, leak);
  assert.equal(W.cleanText("Mira's balance after paying: read 20, not 25"), "Mira's balance after paying: read 20, not 25");
  assert.equal(W.cleanText("x".repeat(10) + " y".repeat(400)).length, 300);
});

test("the lockfile adds @clerk/testing 2.2.39, exact, with only dotenv new beneath it, and never @playwright/test for the API", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
  const api = JSON.parse(readFileSync(join(root, "api", "package.json"), "utf8")) as Record<string, Record<string, string> | undefined>;
  assert.equal(api.dependencies?.["@clerk/testing"], "2.2.39");
  assert.equal(api.dependencies?.["@playwright/test"] ?? api.devDependencies?.["@playwright/test"], undefined);

  const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
  const importer = /\n {2}api:\n([\s\S]*?)\n {2}\S/.exec(lock)?.[1] ?? "";
  assert.match(importer, /'@clerk\/testing':\n\s+specifier: 2\.2\.39\n\s+version: 2\.2\.39\(/);
  assert.doesNotMatch(importer, /'@playwright\/test':/);
  assert.match(lock, /\n {2}'@clerk\/testing@2\.2\.39':\n/);
  assert.match(lock, /\n {2}dotenv@17\.2\.2:\n/);
  const snapshot = /\n {2}'@clerk\/testing@2\.2\.39\([^\n]*\)':\n([\s\S]*?)\n\n/.exec(lock)?.[1] ?? "";
  const needs = /dependencies:\n((?: {6}\S[^\n]*\n?)+)/.exec(snapshot)?.[1] ?? "";
  assert.deepEqual(
    needs.trim().split("\n").map((line) => line.trim().split(":")[0].replaceAll("'", "")),
    ["@clerk/backend", "@clerk/shared", "dotenv"],
  );
});

const NO_DB = SCRATCH ? false : "no WALK_DATABASE_URL: the ledger reads and writes its rows on a scratch Postgres";
if (SCRATCH) after(() => pool.end());

test("the ledger counts a purchase's unused credits as a refund does, and moves a customer only for the QA pair", { skip: NO_DB }, async () => {
  const q = (text: string, params: unknown[] = []) => pool.query(text, params);
  const run = randomUUID().slice(0, 8);
  const [buyer, friend, other] = [`user_ledger_${run}`, `user_friend_${run}`, `user_other_${run}`];
  const [purchase, bundle, invite] = [`purchase-${run}`, `bundle-${run}`, `invite-${run}`];
  const credit = (n: number) => `credit-${run}-${n}`;
  const appEnv = process.env.APP_ENV;
  try {
    for (const id of [buyer, friend, other]) await q("insert into users (id, email) values ($1, $2)", [id, `${id}@example.com`]);
    await q(
      `insert into purchases (id, user_id, kind, item, cents, full_cents, tick_hash, ticked_at, return_to, status, is_test, stripe_payment_intent)
       values ($1, $2, 'bundle', 'family', 7200, 7200, $3, now(), '/dashboard?open=credits', 'granted', true, $4)`,
      [purchase, buyer, "a".repeat(64), `pi_ledger_${run}`],
    );
    await q("insert into bundles (id, user_id, bundle_kind, is_test, source, purchase_id) values ($1, $2, 'family', true, 'purchase', $3)", [bundle, buyer, purchase]);
    // Two still to use, one used, one held for a gift no one has claimed, and one a claimed gift made the friend's.
    const rows: Array<[number, string, string]> = [[1, buyer, "available"], [2, buyer, "available"], [3, buyer, "used"], [4, buyer, "held"], [5, friend, "available"]];
    for (const [n, owner, status] of rows) {
      await q("insert into credits (id, user_id, bundle_id, status, is_test) values ($1, $2, $3, $4, true)", [credit(n), owner, bundle, status]);
    }
    await q(
      `insert into invite_tokens (id, token_hash, email, kind, credit_id, created_by_user_id, expires_at)
       values ($1, $2, $3, 'gift', $4, $5, now() + interval '30 days')`,
      [invite, `hash-${run}`, `${friend}@example.com`, credit(4), buyer],
    );

    assert.deepEqual(await W.dbWalkLedger.unusedOf(purchase), { available: 2, held: 1 });
    // The count is the refund's own: a full refund takes back exactly those three, and then none is left.
    const { takeBack } = await import("../credits.js");
    assert.equal(await takeBack(bundle, 5), 3);
    assert.deepEqual(await W.dbWalkLedger.unusedOf(purchase), { available: 0, held: 0 });
    assert.equal(await W.dbWalkLedger.paymentOf(purchase), `pi_ledger_${run}`);
    assert.equal(await W.dbWalkLedger.paymentOf(`missing-${run}`), null);
    assert.equal(await W.dbWalkLedger.receiptOf(purchase), null);
    await q("update purchases set receipt_delivered = true where id = $1", [purchase]);
    assert.equal(await W.dbWalkLedger.receiptOf(purchase), true);

    // An account that isn't one of the QA pair never takes the walk's customer, and no host but staging moves one.
    process.env.APP_ENV = "staging";
    await assert.rejects(W.dbWalkLedger.useCustomer(other, `cus_other_${run}`), /QA pair/);
    process.env.APP_ENV = "production";
    await assert.rejects(W.dbWalkLedger.useCustomer(other, `cus_other_${run}`), /refused on production/);
    process.env.APP_ENV = "staging";
    assert.equal((await q("select stripe_customer_id from users where id = $1", [other])).rows[0].stripe_customer_id, null);

    await q("update users set stripe_customer_id = $2 where id = $1", [buyer, `cus_kept_${run}`]);
    await W.dbWalkLedger.forgetCustomer(buyer, `cus_another_${run}`);
    assert.equal((await q("select stripe_customer_id from users where id = $1", [buyer])).rows[0].stripe_customer_id, `cus_kept_${run}`);
    await W.dbWalkLedger.forgetCustomer(buyer, `cus_kept_${run}`);
    assert.equal((await q("select stripe_customer_id from users where id = $1", [buyer])).rows[0].stripe_customer_id, null);
  } finally {
    if (appEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = appEnv;
    await q("delete from invite_tokens where id = $1", [invite]);
    await q("delete from credits where bundle_id = $1", [bundle]);
    await q("delete from bundles where id = $1", [bundle]);
    await q("delete from purchases where id = $1", [purchase]);
    await q("delete from users where id = any($1)", [[buyer, friend, other]]);
  }
});
