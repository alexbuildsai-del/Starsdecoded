import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The typed date and time on the two public forms (ADR-222, review-02-10 §5, acceptance 1 to 4), at 390 px: each
 * language's order and clock, focus carried from the date to the time to the place, the value that leaves the form,
 * and a hydration that raises nothing. The birth form and the birth-time dialog sit behind sign-in, so a preview
 * cannot reach them; they are looked at on the dev server.
 */
const PHONE = { width: 390, height: 844 };

// The visitor's zone gives the form a place at once, so the form can be sent without a search.
const ZONE = "Europe/London";

const LANGUAGES = [
  { locale: "en-US", datePlaceholder: "MM / DD / YYYY", date: "05041929", twelveHour: true },
  { locale: "en-GB", datePlaceholder: "DD / MM / YYYY", date: "04051929", twelveHour: false },
  { locale: "ja-JP", datePlaceholder: "YYYY / MM / DD", date: "19290504", twelveHour: false },
] as const;

const PAGES = ["/", "/sky"] as const;

const HYDRATION = /hydrat|React error #4(18|19|22|23|25)|did not match/i;

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the card is measured at 390 px, which the desktop project does not draw");
});

const dateField = (page: Page) => page.getByRole("textbox", { name: "Birth date" });
const timeField = (page: Page) => page.getByRole("textbox", { name: "Birth time" });

async function within(inner: Locator, outer: Locator, what: string) {
  const [a, b] = await Promise.all([inner.boundingBox(), outer.boundingBox()]);
  expect(a, `${what} is drawn`).not.toBeNull();
  expect(b, `the card around ${what} is drawn`).not.toBeNull();
  expect(a!.x, `${what} starts inside its card`).toBeGreaterThanOrEqual(b!.x - 0.5);
  expect(a!.x + a!.width, `${what} ends inside its card`).toBeLessThanOrEqual(b!.x + b!.width + 0.5);
}

test("the prerendered pages draw DD / MM / YYYY and the 24-hour clock whatever the language", async ({ request }) => {
  for (const path of PAGES) {
    const html = await (await request.get(path)).text();
    expect(html, `${path} places the order`).toContain('placeholder="DD / MM / YYYY"');
    expect(html, `${path} places the time`).toContain('placeholder="HH : MM"');
    expect(html, `${path} has no AM or PM switch`).not.toContain("AM or PM");
  }
});

for (const { locale, datePlaceholder, date, twelveHour } of LANGUAGES) {
  test.describe(locale, () => {
    test.use({ locale, timezoneId: ZONE, viewport: PHONE });

    for (const path of PAGES) {
      test(`${path}: the order, the clock, focus on to the place, and the value sent`, async ({ page }) => {
        const raised: string[] = [];
        page.on("console", (message) => {
          if (["error", "warning"].includes(message.type()) && HYDRATION.test(message.text())) raised.push(message.text());
        });
        page.on("pageerror", (error) => {
          if (HYDRATION.test(error.message)) raised.push(error.message);
        });

        await page.goto(path);
        await page.waitForLoadState("networkidle");

        const dateInput = dateField(page);
        const timeInput = timeField(page);
        const halves = page.getByRole("radiogroup", { name: "AM or PM" });

        await expect(dateInput).toHaveAttribute("placeholder", datePlaceholder);
        await expect(timeInput).toHaveAttribute("placeholder", "HH : MM");
        await expect(halves).toHaveCount(twelveHour ? 1 : 0);
        for (const input of [dateInput, timeInput]) {
          await expect(input).toHaveAttribute("inputmode", "numeric");
          expect(await input.evaluate((el) => getComputedStyle(el).fontSize), "16 px, so a phone does not zoom in").toBe("16px");
        }

        const card = dateInput.locator("xpath=ancestor::*[contains(@class,'sd-panel')][1]");
        await within(dateInput, card, "the date field");
        await within(timeInput, card, "the time field");
        if (twelveHour) await within(halves, card, "the AM and PM switch");

        await dateInput.click();
        await page.keyboard.type(date);
        await expect(page.getByText("4 May 1929", { exact: true })).toBeVisible();
        await expect(timeInput, "a whole date moves focus to the time").toBeFocused();
        await page.keyboard.type("0300");
        await expect(timeInput).toHaveValue("03 : 00");
        await expect(page.getByRole("textbox", { name: "Birth place" }), "a whole time moves focus to the place").toBeFocused();
        if (twelveHour) {
          await expect(halves.getByRole("radio", { name: "AM" })).toBeChecked();
          await halves.getByText("PM", { exact: true }).click();
        }

        await within(dateInput, card, "the typed date");
        await within(timeInput, card, "the typed time");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "no sideways scroll").toBe(true);

        await page.getByRole("button", { name: "Show my chart" }).click();
        // The summary line is the form's own value read back: "YYYY-MM-DD" and "HH:MM" went in, whatever the reader saw.
        const sent = twelveHour ? "4 May 1929 · 15:00 · London" : "4 May 1929 · 03:00 · London";
        await expect(page.getByText(sent, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
        expect(raised, "no hydration warning").toEqual([]);
      });
    }
  });
}
