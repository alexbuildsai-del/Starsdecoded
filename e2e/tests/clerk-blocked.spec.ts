import { expect, test, type Page } from "@playwright/test";

/**
 * MB-183 (QA-02 #10): with Clerk's script stopped, as a content blocker or a strict network stops it, no page waits for
 * ever. /claim shows an invite's preview, or its 404, from the public GET at once, and after 8 s each page that needs
 * Clerk says sign-in couldn't load, with Try again (reading 12). /api is stubbed, since a preview's is staging's.
 */
const PHONE = { width: 390, height: 844 };

const CLERK = /^https:\/\/[^/]+\.clerk\.accounts\.dev\//;
const LINE = "Sign-in couldn't load. A content blocker may be stopping it.";

// Reading 12's 8 s, counted from the app's boot, with room for a slow runner.
const STALL_MS = 15_000;
// Well inside the 8 s, so a page that waited out Clerk before showing anything fails.
const AT_ONCE_MS = 5_000;

const INVITE = {
  email: "reader@example.com",
  inviterName: "Mira",
  relationshipId: null,
  relationshipReportId: null,
  expiresAt: "2031-01-01T00:00:00.000Z",
  alreadyClaimed: false,
};
const SEND = { ...INVITE, token: "e2e-send", kind: "send", profileName: "Sam", recipientName: null, note: null };
const GIFT = { ...INVITE, token: "e2e-gift", kind: "gift", profileName: null, recipientName: "Sam", note: null };
// The page is public, so a share's preview carries its sharer's first name alone, as both names, or no name at all
// when neither their account nor their chart gives one (R15-19).
const SHARE = { ...INVITE, token: "e2e-share", kind: "share", profileName: INVITE.inviterName, recipientName: null, note: null };
const NAMELESS_SHARE = { ...SHARE, token: "e2e-share-nameless", inviterName: null, profileName: null };

const PAGES = ["/chart", "/sign-in", "/sign-up", "/admin/prompts", "/admin/report-lab", "/admin/waitlist"];

// A test waits out the 8 s once at most, and the 404's waits for a second load as well.
test.describe.configure({ mode: "parallel", timeout: 45_000 });
test.use({ viewport: PHONE });

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the line is read at 390 px; the desktop project draws the same page wider");
});

/** Stops Clerk and answers /api; what it returns counts the Clerk requests stopped, so no step passes with Clerk let through. */
async function blockClerk(page: Page): Promise<() => number> {
  let stopped = 0;
  await page.route(CLERK, (route) => {
    stopped += 1;
    return route.abort("blockedbyclient");
  });
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    (route) => {
      const path = new URL(route.request().url()).pathname;
      const invite = [SEND, GIFT, SHARE, NAMELESS_SHARE].find(({ token }) => path === `/api/invites/${token}`);
      return invite ? route.fulfill({ json: invite }) : route.fulfill({ status: 404, json: { error: "not_found" } });
    },
  );
  return () => stopped;
}

const line = (page: Page) => page.getByRole("alert").filter({ hasText: LINE });

async function lineFitsThePhone(page: Page) {
  const box = await line(page).boundingBox();
  expect(box, "the line is drawn").not.toBeNull();
  expect(box!.x, "the line starts on screen").toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, "the line ends on screen").toBeLessThanOrEqual(PHONE.width);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(sideways, "no sideways scroll").toBe(false);
}

test("/claim with a token that isn't there shows its 404 at once, then the line, and Try again loads it again", async ({ page }) => {
  const stopped = await blockClerk(page);
  await page.goto("/claim?token=bogus");
  await expect(page.getByRole("heading", { name: "Invite unavailable" })).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(line(page), "not before the wait runs out").toBeHidden();
  await expect(line(page)).toBeVisible({ timeout: STALL_MS });
  await lineFitsThePhone(page);
  expect(stopped(), "Clerk's script was asked for and stopped").toBeGreaterThan(0);

  await Promise.all([page.waitForEvent("load"), line(page).getByRole("button", { name: "Try again" }).click()]);
  await expect(page.getByRole("heading", { name: "Invite unavailable" })).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(line(page), "the page loaded again waits again").toBeHidden();
});

test("/claim shows a sent report's preview at once, its button waiting for sign-in", async ({ page }) => {
  const stopped = await blockClerk(page);
  await page.goto(`/claim?token=${SEND.token}`);
  await expect(page.getByRole("heading", { name: /Personal report/ })).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(page.getByText(SEND.email)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to open it" })).toBeDisabled();
  await expect(line(page)).toBeVisible({ timeout: STALL_MS });
  await lineFitsThePhone(page);
  expect(stopped(), "Clerk's script was asked for and stopped").toBeGreaterThan(0);
});

test("/claim shows a gift's cover at once, its button waiting for sign-in", async ({ page }) => {
  const stopped = await blockClerk(page);
  await page.goto(`/claim?token=${GIFT.token}`);
  await expect(page.getByRole("heading", { name: /gave you a Personal report/ })).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(page.getByText(GIFT.email)).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim my report" })).toBeDisabled();
  await expect(line(page)).toBeVisible({ timeout: STALL_MS });
  await lineFitsThePhone(page);
  expect(stopped(), "Clerk's script was asked for and stopped").toBeGreaterThan(0);
});

// A share once fell through to a sent report's preview, which tells the reader the sharer had a report written for them.
test("/claim shows a share's preview at once, naming its sharer, its button waiting for sign-in", async ({ page }) => {
  const stopped = await blockClerk(page);
  await page.goto(`/claim?token=${SHARE.token}`);
  const heading = page.getByRole("heading", { name: "Mira shared their Personal report with you", exact: true });
  await expect(heading).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(page.getByText("Mira joins your circle, and you can read the whole report.", { exact: true })).toBeVisible();
  await expect(page.getByText(`Sign in with ${SHARE.email} to read it.`, { exact: true })).toBeVisible();
  const signIn = page.getByRole("button", { name: "Sign in to open it" });
  await expect(signIn).toBeDisabled();
  await expect(line(page)).toBeVisible({ timeout: STALL_MS });
  await expect(line(page).getByRole("button", { name: "Try again" })).toBeEnabled();
  await expect(signIn, "Clerk never loaded, so the button still waits").toBeDisabled();
  await lineFitsThePhone(page);
  expect(stopped(), "Clerk's script was asked for and stopped").toBeGreaterThan(0);
});

test("/claim calls a share's sharer Someone when the preview has no name for them", async ({ page }) => {
  const stopped = await blockClerk(page);
  await page.goto(`/claim?token=${NAMELESS_SHARE.token}`);
  const heading = page.getByRole("heading", { name: "Someone shared their Personal report with you", exact: true });
  await expect(heading).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(page.getByText("They join your circle, and you can read the whole report.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to open it" })).toBeDisabled();
  await expect.poll(stopped, { message: "Clerk's script was asked for and stopped" }).toBeGreaterThan(0);
});

for (const path of PAGES) {
  test(`${path} says sign-in couldn't load once the wait runs out`, async ({ page }) => {
    const stopped = await blockClerk(page);
    await page.goto(path);
    await expect(line(page)).toBeVisible({ timeout: STALL_MS });
    await expect(line(page).getByRole("button", { name: "Try again" })).toBeEnabled();
    await lineFitsThePhone(page);
    expect(stopped(), "Clerk's script was asked for and stopped").toBeGreaterThan(0);
  });
}
