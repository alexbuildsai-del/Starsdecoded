import { expect, test, type Page } from "@playwright/test";

/**
 * MB-30 (QA-02 #3, ADR-246) at 390 px: the place field asks our server, never Nominatim or timeapi.io from the browser,
 * and the place it takes carries its zone, so Audrey Hepburn's birth (Ixelles, 4 May 1929, 03:00) reads Aquarius rising
 * on /sky. The card prints no offset until the date is typed, then that date's, UTC+1, not the UTC+2 Brussels keeps
 * today (MB-179, reading 2). /api/geocode is stubbed, since a preview's API is staging's (Found 3), and the two outside
 * hosts are stopped, so a call to either is counted rather than sent.
 */
const PHONE = { width: 390, height: 844 };

const OUTSIDE = /^https:\/\/(?:nominatim\.openstreetmap\.org|timeapi\.io)\//;

// Our server's answer as the contract shapes it (R15-02): Ixelles at the coordinates of Audrey Hepburn's record
// (fixtures/charts/audrey-hepburn.json), with the zone the server's table gives them and the zone's offset today.
const IXELLES = {
  name: "Ixelles, Brussels-Capital, Belgium",
  city: "Ixelles",
  region: "Brussels-Capital",
  country: "Belgium",
  latitude: 50.8333,
  longitude: 4.3667,
  timezoneOffset: 2,
  timezone: "Europe/Brussels",
  placeType: "municipality",
};

test.use({ viewport: PHONE, locale: "en-GB", timezoneId: "Europe/London" });

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the flow is read at 390 px; the desktop project draws the same form wider");
});

/** Answers /api/geocode with `reply` and stops the outside hosts; what it returns lists the searches and the outside calls. */
async function stubSearch(page: Page, reply: { status: number; json: unknown }) {
  const searches: string[] = [];
  const outside: string[] = [];
  await page.route(OUTSIDE, (route) => {
    outside.push(route.request().url());
    return route.abort("blockedbyclient");
  });
  await page.route(
    (url) => url.pathname === "/api/geocode",
    (route) => {
      searches.push(new URL(route.request().url()).searchParams.get("q") ?? "");
      return route.fulfill(reply);
    },
  );
  return { searches, outside };
}

const placeField = (page: Page) => page.getByRole("textbox", { name: "Birth place" });
const card = (page: Page) => page.getByTestId("chosen-place");

test("/sky: Ixelles comes from our server with its zone, its card waits for the date, and the chart reads Aquarius rising", async ({ page }) => {
  const { searches, outside } = await stubSearch(page, { status: 200, json: { results: [IXELLES] } });
  await page.goto("/sky");
  await page.waitForLoadState("networkidle");

  await placeField(page).fill("Ixelles");
  const list = page.getByTestId("city-dropdown");
  await expect(list.or(page.getByRole("alert"))).toBeVisible();
  expect(outside, "the browser asks neither Nominatim nor timeapi.io (ADR-246)").toEqual([]);
  expect(searches, "the search goes to our server, once").toEqual(["Ixelles"]);

  await list.getByRole("button", { name: /Ixelles/ }).click();
  await expect(card(page)).toContainText("Ixelles");
  await expect(card(page)).toContainText("50.83°, 4.37°");
  await expect(card(page), "no offset until a birth date is typed").not.toContainText("UTC");

  await page.getByRole("textbox", { name: "Birth date" }).click();
  await page.keyboard.type("04051929");
  await expect(page.getByText("4 May 1929", { exact: true })).toBeVisible();
  await page.keyboard.type("0300");
  await expect(page.getByRole("textbox", { name: "Birth time" })).toHaveValue("03 : 00");
  await expect(card(page), "the zone's offset on 4 May 1929, not today's UTC+2 (MB-179)").toContainText("50.83°, 4.37° · UTC+1");

  await page.getByRole("button", { name: "Show my chart" }).click();
  const result = page.locator("section").filter({ has: page.getByText("4 May 1929 · 03:00 · Ixelles", { exact: true }) });
  await expect(result.getByRole("heading", { level: 2 })).toHaveText("Sun in Taurus, Moon in Pisces, Aquarius rising.", { timeout: 20_000 });
  await expect(result.getByRole("row").filter({ hasText: "Rising" })).toContainText("28.62° Aquarius");
  expect(outside, "nothing reached either host on the way").toEqual([]);
});

test("/sky: a search whose places have no zone says to pick a nearby town, and nothing is chosen", async ({ page }) => {
  const { searches, outside } = await stubSearch(page, {
    status: 422,
    json: { error: "no_zone", message: "Pick a nearby town." },
  });
  await page.goto("/sky");
  await page.waitForLoadState("networkidle");

  await placeField(page).fill("Point Nemo");
  await expect(page.getByRole("alert").filter({ hasText: "Pick a nearby town." })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByTestId("city-dropdown")).toHaveCount(0);
  expect(searches).toEqual(["Point Nemo"]);
  expect(outside).toEqual([]);
});
