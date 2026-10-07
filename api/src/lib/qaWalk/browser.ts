/**
 * The staging walk's browser (ADR-279, 315): headless Chromium through playwright-core, found as the QA agent finds it,
 * with a context each for Mira and Idris, so each keeps a session of their own. Each signs in with a one-time sign-in
 * token the walk makes for their account, past Clerk's bot check with its Testing Token, calls the live API from their
 * signed-in page through the web's own /api as the app's own calls go, opens a screen and reads it once, and pays on
 * /checkout in Stripe's fields with the test card.
 *
 * A door in each context stops any request to a route that writes a report or a reading unless the walk asked for that
 * one call itself (reading 17), so no page the walk opens can spend on its own.
 *
 * After each step the walk takes one picture of a tab (ADR-360, reading 14): a phone's screen, JPEG at quality 60, with
 * every place to type and every frame masked, so /qa can read a step it can't play.
 */
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser, Frame, Page } from "playwright-core";
import type { CatalogueItemId } from "@workspace/commerce";
import type { QaWalkMode } from "@workspace/db";

export interface ApiAnswer {
  status: number;
  body: unknown;
}

/** What a screen shows once its data is in. */
export type Shown =
  | { heading: string; inDialog?: boolean }
  | { control: string }
  | { title: readonly string[] };

/** The screen a reader buys from, and the link they press there, in its sheet when the screen opens one. */
export interface PayDoor {
  path: string;
  link: string;
  inDialog?: boolean;
}

/** One signed-in reader's tab, as a step uses it. */
export interface WalkPage {
  /**
   * Signs in as the account at this address with a sign-in token, from a public page first, as Clerk's helper needs
   * (Round start 4f).
   */
  signIn(email: string): Promise<void>;
  /** A call to the live API from this page, with the page's own session. */
  api(method: string, path: string, body?: unknown): Promise<ApiAnswer>;
  /** Opens a screen, or reads the one open when the path is null, and waits until it shows what it should. */
  screen(path: string | null, shows: Shown): Promise<void>;
  /** Pays for one item on /checkout with the test card and answers the purchase the page that waits for it names. */
  pay(item: CatalogueItemId, returnTo: string, door?: PayDoor): Promise<string>;
}

export interface WalkSession {
  mira: WalkPage;
  idris: WalkPage;
  /** The walk's own picture of one reader's tab as it stands; a step never takes one. */
  picture(who: "mira" | "idris"): Promise<Buffer>;
  close(): Promise<void>;
}

/** A one-time sign-in token for the account at this address, asked for as that reader signs in. */
export type SignInTickets = (email: string) => Promise<string>;

/** The one way a page signs in: the ticket a sign-in token carries, and no other strategy Clerk's helper knows. */
export type TicketSignIn = (opts: { page: Page; signInParams: { strategy: "ticket"; ticket: string } }) => Promise<void>;

export interface WalkBrowser {
  open(guard: SpendGuard, tickets: SignInTickets): Promise<WalkSession>;
}

export type PaidRoute =
  | "POST /api/reports"
  | "POST /api/compatibility"
  | "POST /api/reports/:id/regenerate"
  | "PATCH /api/profiles/:id/birth-time"
  | "POST /api/ask"
  | "/api/timeline/*";

/** The two writes a walk makes itself: a Personal report and a pair. */
export type WriteRoute = "/api/reports" | "/api/compatibility";

const PAID: ReadonlyArray<{ method: string | null; path: RegExp; route: PaidRoute }> = [
  { method: "POST", path: /^\/api\/reports$/, route: "POST /api/reports" },
  { method: "POST", path: /^\/api\/compatibility$/, route: "POST /api/compatibility" },
  { method: "POST", path: /^\/api\/reports\/[^/]+\/regenerate$/, route: "POST /api/reports/:id/regenerate" },
  { method: "PATCH", path: /^\/api\/profiles\/[^/]+\/birth-time$/, route: "PATCH /api/profiles/:id/birth-time" },
  { method: "POST", path: /^\/api\/ask$/, route: "POST /api/ask" },
  // A Timeline page reads the six months ahead, which queues paid readings, so the walk reads access alone.
  { method: null, path: /^\/api\/timeline\/(?!access$)/, route: "/api/timeline/*" },
];

/** The paid route a request would reach, by the route's name with no id in it, or null for one that spends nothing. */
export function paidRoute(method: string, path: string): PaidRoute | null {
  // Express matches paths without regard to case or a trailing slash, so the door reads them the same way.
  const bare = path.split("?")[0].replace(/\/+$/, "").toLowerCase();
  const verb = method.toUpperCase();
  return PAID.find((row) => (row.method === null || row.method === verb) && row.path.test(bare))?.route ?? null;
}

/**
 * The door in front of every route that writes a report or a reading. A deploy's walk asks to write once, for Idris's
 * 402 at a zero balance, and never again (reading 17); a Release's walk writes each stored step's report for real. A
 * request the walk didn't ask for is stopped and kept, so the step it came in fails.
 */
export class SpendGuard {
  readonly refused: PaidRoute[] = [];
  private armed: PaidRoute | null = null;
  private deployWrites = 0;

  constructor(readonly mode: QaWalkMode) {}

  /** Lets the walk's own next request to this write through, once. */
  arm(path: WriteRoute): void {
    const route = paidRoute("POST", path);
    if (route !== "POST /api/reports" && route !== "POST /api/compatibility") throw new Error(`${path} is not a write the walk makes`);
    if (this.mode === "deploy") {
      if (route !== "POST /api/reports" || this.deployWrites > 0) {
        throw new Error("a deploy's walk asks to write once, for the 402 at a zero balance, and never again");
      }
      this.deployWrites += 1;
    }
    this.armed = route;
  }

  disarm(): void {
    this.armed = null;
  }

  /** Whether a request may go on: anything that spends nothing, or the one write the walk armed. */
  allows(method: string, path: string): boolean {
    const route = paidRoute(method, path);
    if (route === null) return true;
    if (route === this.armed) {
      this.armed = null;
      return true;
    }
    this.refused.push(route);
    return false;
  }
}

const VIEWPORT = { width: 1280, height: 900 };
const NAV_MS = 45_000;
const SHOWN_MS = 30_000;
const FIELDS_MS = 60_000;
const PAID_MS = 90_000;
// The page that waits gives up after a minute (R16-24), so a grant later than that never brings the reader back.
const BACK_MS = 75_000;

/** Reading 14: a phone's screen, small enough to keep one a step in the database and read at a glance. */
const PICTURE = { width: 390, height: 844, quality: 60 };
const PICTURE_MS = 15_000;
// A layout that follows the width redraws on the resize's next frames, so the picture waits that long for it.
const SETTLE_MS = 300;

/**
 * What every picture covers (reading 14): each place a reader types, and every frame. None of our pages draws a frame
 * of its own, so the frames are Stripe's fields and Clerk's checks, and nothing they hold is pictured.
 */
const MASKED = ["input", "textarea", "[contenteditable]", "iframe"] as const;

/** Stripe's test card, always approved (stripe-payments, Testers). A country and a postal code go in only if asked. */
const TEST_CARD = { number: "4242 4242 4242 4242", cvc: "123", country: "PT", postal: "1000-001" };

// The Payment Element's names, the older card field's beside them, and the autofill hints both carry.
const NUMBER = 'input[name="number"], input[name="cardnumber"], input[autocomplete="cc-number"]';
const EXPIRY = 'input[name="expiry"], input[name="exp-date"], input[autocomplete="cc-exp"]';
const CVC = 'input[name="cvc"], input[autocomplete="cc-csc"]';
const COUNTRY = 'select[name="country"], select[autocomplete="billing country"]';
const POSTAL = 'input[name="postalCode"], input[autocomplete="billing postal-code"]';

/** A month three years on, so the test card never reads as expired. */
function expiry(now: Date): string {
  return `12${String((now.getUTCFullYear() + 3) % 100).padStart(2, "0")}`;
}

function describe(shows: Shown): string {
  if ("title" in shows) return `a title with ${shows.title.join(", ")}`;
  if ("heading" in shows) return `the heading "${shows.heading}"${shows.inDialog ? " in its sheet" : ""}`;
  return `"${shows.control}"`;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message.split("\n")[0] : String(err);
}

/** The container's memory in MB from its cgroup (v2, then v1), as a crash leaves it: a page killed for memory says nothing. */
function memoryNote(): string {
  const mb = (...files: string[]): string => {
    for (const file of files) {
      try {
        const raw = readFileSync(`/sys/fs/cgroup/${file}`, "utf8").trim();
        if (raw === "max" || Number(raw) > 2 ** 60) return "no limit";
        return `${Math.round(Number(raw) / 1048576)} MB`;
      } catch {
        // The next layout's file, if any.
      }
    }
    return "unknown";
  };
  const now = mb("memory.current", "memory/memory.usage_in_bytes");
  const peak = mb("memory.peak", "memory/memory.max_usage_in_bytes");
  const limit = mb("memory.max", "memory/memory.limit_in_bytes");
  return `memory ${now}, peak ${peak}, limit ${limit}`;
}

/** Why a page crashed, as far as Chromium's log and the container show (the staging walk, 2026-10-06). */
function crashNote(logFile: string): string {
  let lines: string[] = [];
  try {
    // D-Bus and Google's push service fail on every server start and say nothing about a crash.
    lines = readFileSync(logFile, "utf8")
      .split("\n")
      .filter((line) => /:(ERROR|FATAL):/.test(line) && !/:ERROR:(dbus|google_apis\/gcm)\//.test(line));
  } catch {
    // No log: the note gives the memory alone.
  }
  const telling = lines.filter((line) => /FATAL|signal|crash|memory|oom|check failed/i.test(line));
  const last = (telling.length > 0 ? telling : lines).slice(-2).map((line) => line.replace(/^\[[^\]]*:(ERROR|FATAL):/, "$1 "));
  return `${memoryNote()}; Chromium logged ${last.length > 0 ? last.join(" / ") : "nothing"}`;
}

/** A page whose every call, when the page crashes under it, says so with the note, whichever call it was. */
function noting(page: Page, inner: WalkPage, logFile: string): WalkPage {
  let crashed = false;
  page.on("crash", () => {
    crashed = true;
  });
  const noted = async <T>(during: string, call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (err) {
      // The error can land before the crash event does, so its own words count too.
      if (!crashed && !/crashed/i.test(messageOf(err))) throw err;
      throw new Error(`the page crashed ${during}: ${crashNote(logFile)}`);
    }
  };
  return {
    signIn: (email) => noted("signing in", () => inner.signIn(email)),
    api: (method, path, body) => noted("in a call to the API", () => inner.api(method, path, body)),
    screen: (path, shows) => noted("on a screen", () => inner.screen(path, shows)),
    pay: (item, returnTo, door) => noted("in checkout", () => inner.pay(item, returnTo, door)),
  };
}

/** Exported so a test can sign a stand-in page in without Chromium. */
export class ChromiumPage implements WalkPage {
  constructor(
    private readonly page: Page,
    private readonly origin: string,
    private readonly signInWith: TicketSignIn,
    private readonly tickets: SignInTickets,
  ) {}

  private url(path: string): string {
    return `${this.origin}${path}`;
  }

  private where(): string {
    try {
      return new URL(this.page.url()).pathname;
    } catch {
      return "a blank page";
    }
  }

  private async goto(path: string): Promise<void> {
    await this.page.goto(this.url(path), { waitUntil: "domcontentloaded", timeout: NAV_MS });
  }

  /** A relative fetch needs a page on our site. */
  private async onOurSite(): Promise<void> {
    let here: string | null = null;
    try {
      here = new URL(this.page.url()).origin;
    } catch {
      here = null;
    }
    if (here !== this.origin) await this.goto("/");
  }

  private async alertText(): Promise<string> {
    const lines = await this.page.getByRole("alert").allInnerTexts().catch(() => [] as string[]);
    return lines.join(" ").replace(/\s+/g, " ").trim();
  }

  async signIn(email: string): Promise<void> {
    await this.goto("/");
    // Asked for only now, as the page is ready to use it, so a token's short life is never spent on the steps before.
    const ticket = await this.tickets(email);
    await this.signInWith({ page: this.page, signInParams: { strategy: "ticket", ticket } });
    // Clerk's helper waits for the account only when it makes the token itself, so the walk waits here before any call.
    try {
      await this.page.waitForFunction(() => Boolean((globalThis as { Clerk?: { user?: unknown } }).Clerk?.user), undefined, { timeout: SHOWN_MS });
    } catch {
      throw new Error("Clerk never signed the page in with the walk's sign-in token");
    }
  }

  async api(method: string, path: string, body?: unknown): Promise<ApiAnswer> {
    await this.onOurSite();
    const call = () =>
      this.page.evaluate(
        async (req: { method: string; path: string; body: unknown }) => {
          // Asking Clerk for a token renews the session cookie when it is near its end, as the app's own calls rely on.
          const clerk = (globalThis as { Clerk?: { session?: { getToken(): Promise<string | null> } | null } }).Clerk;
          await clerk?.session?.getToken().catch(() => null);
          const res = await fetch(req.path, {
            method: req.method,
            credentials: "same-origin",
            headers: req.body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
            body: req.body === undefined ? undefined : JSON.stringify(req.body),
          });
          const text = await res.text();
          let parsed: unknown = text || null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch {
            parsed = text;
          }
          return { status: res.status, body: parsed };
        },
        { method, path, body },
      );
    try {
      return await call();
    } catch (err) {
      // A page that moves on mid-call loses the call; a read is asked again, a write never is, as it may have landed.
      if (method.toUpperCase() !== "GET" || !/context was destroyed|navigat/i.test(messageOf(err))) throw err;
      await this.page.waitForLoadState("domcontentloaded").catch(() => undefined);
      return call();
    }
  }

  async screen(path: string | null, shows: Shown): Promise<void> {
    if (path !== null) await this.goto(path);
    try {
      await this.shown(shows);
    } catch {
      throw new Error(`the screen at ${this.where()} didn't show ${describe(shows)}`);
    }
  }

  private async shown(shows: Shown): Promise<void> {
    if ("title" in shows) {
      // The tab's title is set once the page has its data: a report's carries its name only when it is complete.
      const end = Date.now() + SHOWN_MS;
      for (;;) {
        const title = await this.page.title();
        if (shows.title.every((part) => title.includes(part))) return;
        if (Date.now() > end) throw new Error("no such title");
        await this.page.waitForTimeout(250);
      }
    }
    if ("heading" in shows) {
      const scope = shows.inDialog ? this.page.getByRole("dialog") : this.page;
      await scope.getByRole("heading", { name: shows.heading, exact: true }).first().waitFor({ state: "visible", timeout: SHOWN_MS });
      return;
    }
    const button = this.page.getByRole("button", { name: shows.control, exact: true });
    const link = this.page.getByRole("link", { name: shows.control, exact: true });
    await button.or(link).first().waitFor({ state: "visible", timeout: SHOWN_MS });
  }

  /** The frame Stripe drew the card fields in, once the session the tick started exists. */
  private async cardFrame(): Promise<Frame> {
    const end = Date.now() + FIELDS_MS;
    let pickedCard = false;
    for (;;) {
      for (const frame of this.page.frames()) {
        if (frame === this.page.mainFrame()) continue;
        if (await frame.locator(NUMBER).first().isVisible().catch(() => false)) return frame;
      }
      if (!pickedCard && Date.now() > end - FIELDS_MS / 2) {
        // Another way to pay may be open first; the card is one tap away in the same element.
        pickedCard = true;
        for (const frame of this.page.frames()) {
          if (frame === this.page.mainFrame()) continue;
          const card = frame.getByRole("tab", { name: /^card$/i }).or(frame.getByRole("button", { name: /^card$/i }));
          if (await card.first().isVisible().catch(() => false)) await card.first().click().catch(() => undefined);
        }
      }
      if (Date.now() > end) {
        const said = await this.alertText();
        throw new Error(said ? `Stripe's card fields didn't open: ${said}` : "Stripe's card fields didn't open");
      }
      await this.page.waitForTimeout(500);
    }
  }

  private async type(frame: Frame, selector: string, value: string): Promise<void> {
    const field = frame.locator(selector).first();
    await field.click({ timeout: SHOWN_MS });
    // Stripe formats each field as it is typed, so the digits go in one at a time.
    await field.pressSequentially(value, { delay: 25 });
  }

  async pay(item: CatalogueItemId, returnTo: string, door?: PayDoor): Promise<string> {
    if (door) {
      await this.goto(door.path);
      const scope = door.inDialog ? this.page.getByRole("dialog") : this.page;
      await scope.getByRole("link", { name: door.link, exact: true }).first().click({ timeout: SHOWN_MS });
      await this.page.waitForURL((url) => url.pathname === "/checkout", { timeout: NAV_MS });
      const asked = new URL(this.page.url()).searchParams;
      if (asked.get("item") !== item || asked.get("returnTo") !== returnTo) {
        throw new Error("the link opened checkout for another item or another step to come back to");
      }
    } else {
      await this.goto(`/checkout?${new URLSearchParams({ item, returnTo }).toString()}`);
    }
    // The box first: POST /checkout refuses without it, and Stripe's fields need the session it makes (ADR-274).
    try {
      await this.page.getByRole("checkbox").first().check({ timeout: SHOWN_MS });
    } catch {
      const said = (await this.page.getByRole("status").allInnerTexts().catch(() => [] as string[])).join(" ").trim() || (await this.alertText());
      throw new Error(said ? `checkout wouldn't take the tick: ${said}` : "checkout wouldn't take the tick");
    }
    const frame = await this.cardFrame();
    await this.type(frame, NUMBER, TEST_CARD.number);
    await this.type(frame, EXPIRY, expiry(new Date()));
    await this.type(frame, CVC, TEST_CARD.cvc);
    // The fields of a euro session aren't written down: a country and a postal code go in only where the frame asks
    // for them (Round start 4c).
    const country = frame.locator(COUNTRY).first();
    if (await country.isVisible().catch(() => false)) await country.selectOption(TEST_CARD.country).catch(() => undefined);
    if (await frame.locator(POSTAL).first().isVisible().catch(() => false)) await this.type(frame, POSTAL, TEST_CARD.postal);

    await this.page.getByRole("button", { name: /^Pay\b/ }).click({ timeout: FIELDS_MS });
    try {
      await this.page.waitForURL((url) => url.pathname === "/checkout/done", { timeout: PAID_MS });
    } catch {
      const said = await this.alertText();
      throw new Error(said ? `the payment didn't go through: ${said}` : "Pay never reached the page that waits for the credit");
    }
    const purchase = new URL(this.page.url()).searchParams.get("purchase");
    if (!purchase) throw new Error("the page that waits for the credit names no purchase");
    // Only the webhook grants, and the page goes back to the step that asked once it has (reading 2).
    const back = new URL(returnTo, this.origin).pathname;
    try {
      await this.page.waitForURL((url) => url.pathname === back, { timeout: BACK_MS });
    } catch {
      throw new Error("the payment wasn't confirmed in time, so the page never went back to the step that asked");
    }
    return purchase;
  }

  /**
   * This tab as a phone shows it, masked (reading 14). The tab goes back to its own size after, whatever happened, so
   * the steps that follow read the layout they were written for.
   */
  async picture(): Promise<Buffer> {
    const own = this.page.viewportSize() ?? VIEWPORT;
    await this.page.setViewportSize({ width: PICTURE.width, height: PICTURE.height });
    try {
      await this.page.waitForTimeout(SETTLE_MS);
      return await this.page.screenshot({
        type: "jpeg",
        quality: PICTURE.quality,
        mask: MASKED.map((selector) => this.page.locator(selector)),
        timeout: PICTURE_MS,
      });
    } finally {
      await this.page.setViewportSize(own).catch(() => undefined);
    }
  }
}

export interface ChromiumWalkOptions {
  executablePath: string;
  webOrigin: string;
  clerk: { publishableKey: string; secretKey: string };
}

/** clerkSetup leaves its testing token in the process, where it is wanted only while the walk's browser is open. */
function forgetTestingToken(): void {
  delete process.env.CLERK_TESTING_TOKEN;
  delete process.env.CLERK_FAPI;
}

/** The live browser: Chromium on the Railway image, each page signed in with the walk's sign-in tokens. */
export function chromiumWalkBrowser(options: ChromiumWalkOptions): WalkBrowser {
  const origin = new URL(options.webOrigin).origin;
  return {
    async open(guard, tickets) {
      const [{ chromium }, testing] = await Promise.all([import("playwright-core"), import("@clerk/testing/playwright")]);
      const signInWith: TicketSignIn = (opts) => testing.clerk.signIn(opts);
      // clerkSetup asks Clerk for a testing token only when none is set, so one kept from an earlier walk could have
      // lapsed; .env files are never read on Railway, where the keys live.
      forgetTestingToken();
      let browser: Browser | null = null;
      // Chromium and its pages write here, read only for the reason a crashed page gives.
      const logFile = join(tmpdir(), `qa-walk-chromium-${process.pid}-${Date.now()}.log`);
      try {
        await testing.clerkSetup({ publishableKey: options.clerk.publishableKey, secretKey: options.clerk.secretKey, dotenv: false });
        const opened = await chromium.launch({
          executablePath: options.executablePath,
          headless: true,
          // The Railway container has about 1 GB, and a page with Stripe's frames, each in a process of its own, ran it
          // out (peak 954 of 954 MB, 2026-10-06): the frames share their page's process, and nothing runs in the back.
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-site-isolation-trials",
            "--disable-features=site-per-process,IsolateOrigins",
            "--disable-background-networking",
            "--enable-logging",
            `--log-file=${logFile}`,
            "--log-level=2",
          ],
        });
        browser = opened;
        const tabFor = async (): Promise<{ tab: ChromiumPage; page: WalkPage }> => {
          const context = await opened.newContext({ viewport: VIEWPORT, locale: "en-GB", timezoneId: "Europe/Brussels" });
          await context.route(
            (url) => url.origin === origin && url.pathname.startsWith("/api/"),
            (route) => {
              const request = route.request();
              const path = new URL(request.url()).pathname;
              return guard.allows(request.method(), path) ? route.continue() : route.abort("blockedbyclient");
            },
          );
          const page = await context.newPage();
          page.setDefaultTimeout(SHOWN_MS);
          const tab = new ChromiumPage(page, origin, signInWith, tickets);
          return { tab, page: noting(page, tab, logFile) };
        };
        const mira = await tabFor();
        const idris = await tabFor();
        const close = async () => {
          try {
            await opened.close();
          } finally {
            forgetTestingToken();
            rmSync(logFile, { force: true });
          }
        };
        return { mira: mira.page, idris: idris.page, picture: (who) => (who === "mira" ? mira : idris).tab.picture(), close };
      } catch (err) {
        await browser?.close().catch(() => undefined);
        forgetTestingToken();
        rmSync(logFile, { force: true });
        throw err;
      }
    },
  };
}
