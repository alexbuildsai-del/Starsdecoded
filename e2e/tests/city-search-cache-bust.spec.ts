import { test, expect } from "@playwright/test";

/**
 * Regression test for the geocode cache-bust fix (task #88).
 *
 * Before the fix, browsers cached the /api/geocode response and returned a
 * stale empty result on the second search for the same city, showing
 * "No matching places found". The fix appends `_t=Date.now()` to every
 * request so each search hits the network fresh.
 *
 * This test:
 *  1. Types "London" in the Birth Place input and asserts results appear.
 *  2. Clears the field and types "London" again.
 *  3. Asserts results appear a second time (no stale-cache error).
 *  4. Asserts the two geocode requests carried distinct `_t` timestamps.
 */
test("searching the same city twice always returns results (cache-bust)", async ({
  page,
}) => {
  const geocodeRequests: string[] = [];

  page.on("request", (req) => {
    if (req.url().includes("/api/geocode")) {
      geocodeRequests.push(req.url());
    }
  });

  await page.goto("/chart");

  const birthPlaceInput = page.locator("#birthPlace");
  await expect(birthPlaceInput).toBeVisible();

  await birthPlaceInput.fill("London");

  const dropdown = page.getByTestId("city-dropdown");
  await expect(dropdown).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("No matching places found")).not.toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(birthPlaceInput).toHaveValue("");

  await birthPlaceInput.fill("London");

  await expect(dropdown).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("No matching places found")).not.toBeVisible();

  expect(geocodeRequests.length).toBeGreaterThanOrEqual(2);

  const extractT = (url: string) => {
    const match = url.match(/_t=(\d+)/);
    return match ? Number(match[1]) : null;
  };

  const geocodeTs = geocodeRequests
    .map(extractT)
    .filter((t): t is number => t !== null);

  expect(geocodeTs.length).toBeGreaterThanOrEqual(2);
  expect(geocodeTs[0]).not.toEqual(geocodeTs[geocodeTs.length - 1]);
});
