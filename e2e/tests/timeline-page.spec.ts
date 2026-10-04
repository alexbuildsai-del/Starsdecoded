import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * /timeline (timeline-page §3, acceptance 4 and 8; ADR-251; reading 21) at 390, 768 and 1440 px. The finder opens on
 * Mira's birth date as an example, already worked out in the HTML; a full typed date redraws the finder alone, with
 * nothing pressed, and the engine's module for it is fetched only then; an impossible or future date gets the field's
 * own line with focus kept on the field; nothing sideways scrolls and no request reaches /api. Then the hero's Play:
 * still until it is pressed, a day at a time (a week under reduced motion) to six months on, where it stops.
 */
const WIDTHS = [
  { width: 390, height: 844, project: "phone" },
  { width: 768, height: 1024, project: "desktop" },
  { width: 1440, height: 900, project: "desktop" },
] as const;

// The cycle cards sit four across from here (timeline-page §1, phone first).
const ACROSS_FROM = 880;

// Six months of days from Mira's Monday, as Timeline counts them (reading 4): frames 0 to 181.
const LAST_DAY = 181;

// The field's own order is the language's (ADR-222), so one language keeps the typed digits and the shown date fixed.
test.use({ locale: "en-GB", timezoneId: "Europe/London" });

const HYDRATION = /hydrat|React error #4(18|19|22|23|25)|did not match/i;

/** Every request to /api, and every fetch of the finder's own module, from the moment the page is opened. */
function watch(page: Page) {
  const api: string[] = [];
  const finderModule: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (pathname === "/api" || pathname.startsWith("/api/")) api.push(`${request.method()} ${pathname}`);
    if (/\/assets\/finder-[^/]*\.js$/.test(pathname)) finderModule.push(pathname);
  });
  return { api, finderModule };
}

function hydrationWarnings(page: Page): string[] {
  const raised: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()) && HYDRATION.test(message.text())) raised.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (HYDRATION.test(error.message)) raised.push(error.message);
  });
  return raised;
}

/**
 * No sideways scroll, and nothing in the finder past the screen's right edge: the site clips what overflows rather
 * than scrolling it, so the page's width alone would never show a card cut off.
 */
async function fits(page: Page, finder: Locator, when: string) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    `no sideways scroll ${when}`,
  ).toBe(true);
  const past = await finder.evaluate((section) => {
    const edge = document.documentElement.clientWidth + 0.5;
    return Array.from(section.querySelectorAll("*"))
      .filter((el) => el.getBoundingClientRect().right > edge)
      .map((el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : ""}`);
  });
  expect(past, `nothing in the finder past the right edge ${when}`).toEqual([]);
}

/** Four across from 880 px; stacked one under the other below it. */
async function cardRows(cards: Locator, across: boolean) {
  const boxes = await Promise.all([0, 1, 2, 3].map((i) => cards.nth(i).boundingBox()));
  for (const box of boxes) expect(box, "every cycle card is drawn").not.toBeNull();
  const tops = boxes.map((box) => box!.y);
  if (across) {
    for (const top of tops) expect(Math.abs(top - tops[0]), "the four cards share one row").toBeLessThan(1);
  } else {
    for (let i = 1; i < 4; i++) expect(tops[i], `card ${i + 1} sits under card ${i}`).toBeGreaterThanOrEqual(boxes[i - 1]!.y + boxes[i - 1]!.height - 1);
  }
}

/** Clears the field the way a reader would and types the digits in, the field laying them out in its order. */
async function retype(field: Locator, digits: string) {
  await field.click();
  await field.press("ControlOrMeta+A");
  await field.press("Backspace");
  await expect(field).toHaveValue("");
  await field.pressSequentially(digits);
}

test("the prerendered page holds the finder on Mira's date, worked out at build, and never asks for its module", async ({ request }) => {
  const html = await (await request.get("/timeline")).text();
  expect(html).toContain('id="finder"');
  expect(html, "Mira's birth date (fixtures/sample-people/mira.json) in the field").toContain('value="14 / 03 / 1991"');
  expect(html).toMatch(/Mira(?:'|&#x27;|&#39;)s, as an example/);
  for (const name of ["Saturn return", "Jupiter return", "Nodal return", "Uranus opposition"]) expect(html, name).toContain(name);
  expect(html, "no preload of the module that works a date out").not.toMatch(/\/assets\/finder-/);
});

for (const { width, height, project } of WIDTHS) {
  test.describe(`${width} px`, () => {
    test.use({ viewport: { width, height } });

    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== project, `${width} px is read in the ${project} project`);
    });

    test("the finder opens on Mira's date, a typed date redraws it in the browser, a wrong one errors, nothing reaches /api", async ({ page }) => {
      const seen = watch(page);
      const raised = hydrationWarnings(page);
      await page.goto("/timeline");
      await page.waitForLoadState("networkidle");

      const finder = page.locator("#finder");
      await expect(finder).toHaveCount(1);
      const field = finder.getByRole("textbox", { name: /^Birth date/ });
      const example = finder.getByText("Mira's, as an example");
      const ring = finder.getByRole("img", { name: /^Age \d+, / });
      const cards = finder.locator("article");

      await expect(field).toHaveValue("14 / 03 / 1991");
      expect(await field.evaluate((el) => el.scrollWidth <= el.clientWidth), "the field shows its whole date").toBe(true);
      await expect(example).toBeVisible();
      await expect(ring).toHaveCount(1);
      await expect(cards).toHaveCount(4);
      const opened = (await ring.getAttribute("aria-label")) ?? "";
      const openedCards = await cards.allInnerTexts();
      expect(seen.finderModule, "nothing is worked out before a date is typed").toEqual([]);
      await fits(page, finder, "as it opens");
      await cardRows(cards, width >= ACROSS_FROM);

      // Audrey Hepburn's birth date (fixtures/charts/audrey-hepburn.json), typed whole, with nothing pressed.
      await retype(field, "04051929");
      await expect(field).toHaveValue("04 / 05 / 1929");
      await expect(ring, "the ring redraws for the typed date").not.toHaveAttribute("aria-label", opened);
      await expect(example, "the date is the reader's now, not Mira's").toHaveCount(0);
      await expect.poll(() => cards.allInnerTexts(), { message: "the cards redraw" }).not.toEqual(openedCards);
      expect(seen.finderModule.length, "the module came with the first full date").toBeGreaterThan(0);
      await expect(field, "focus stays in the field").toBeFocused();
      expect(new URL(page.url()).pathname, "the finder redraws alone, the page stays").toBe("/timeline");
      await fits(page, finder, "with a typed date's answer");
      const answer = (await ring.getAttribute("aria-label")) ?? "";

      await retype(field, "31021991");
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(finder.getByText("There's no 31 February. Check the day.")).toBeVisible();
      await expect(field, "an impossible date keeps focus on the field").toBeFocused();
      await expect(ring, "and leaves the last answer as it was").toHaveAttribute("aria-label", answer);

      await retype(field, `0101${new Date().getFullYear() + 1}`);
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(finder.getByText("Enter a birth date from 1900 to today.")).toBeVisible();
      await expect(field, "a date to come keeps focus on the field").toBeFocused();
      await expect(ring).toHaveAttribute("aria-label", answer);
      await finder.getByRole("button", { name: "Show my dates" }).click();
      await expect(field, "Show my dates takes focus back to the field").toBeFocused();

      await retype(field, "");
      await finder.getByRole("button", { name: "Show my dates" }).click();
      await expect(finder.getByRole("alert")).toHaveText("Enter a birth date from 1900 to today.");
      await expect(field, "an empty field takes focus").toBeFocused();
      await expect(ring).toHaveAttribute("aria-label", answer);

      expect(seen.api, "nothing reaches /api").toEqual([]);
      expect(raised, "no hydration warning").toEqual([]);
    });
  });
}

/** Every day the dial shows from Play on, as the slider reports it. */
async function recordDays(dial: Locator): Promise<() => Promise<number[]>> {
  await dial.evaluate((el) => {
    const days: number[] = [];
    (window as unknown as { dialDays: number[] }).dialDays = days;
    new MutationObserver(() => days.push(Number(el.getAttribute("aria-valuenow")))).observe(el, {
      attributes: true,
      attributeFilter: ["aria-valuenow"],
    });
  });
  return () => dial.page().evaluate(() => (window as unknown as { dialDays: number[] }).dialDays);
}

const PLAYS = [
  { project: "phone", width: 390, height: 844, reduced: true },
  { project: "desktop", width: 1440, height: 900, reduced: false },
] as const;

for (const { project, width, height, reduced } of PLAYS) {
  test.describe(`the hero's Play at ${width} px${reduced ? ", reduced motion" : ""}`, () => {
    test.use({ viewport: { width, height }, reducedMotion: reduced ? "reduce" : "no-preference" });

    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== project, `read in the ${project} project`);
    });

    test("stays on Mira's Monday until pressed, then plays to six months on and stops there", async ({ page }) => {
      // Six months at a day a beat takes about eleven seconds; a week a beat about as long.
      test.setTimeout(60_000);
      const seen = watch(page);
      await page.goto("/timeline");
      await page.waitForLoadState("networkidle");

      const dial = page.getByRole("slider", { name: "Mira's chart" });
      await expect(dial).toHaveAttribute("aria-valuenow", "0");
      await expect(dial).toHaveAttribute("aria-valuemax", String(LAST_DAY));
      const days = await recordDays(dial);
      // Longer than three of its slowest beats.
      await page.waitForTimeout(1_500);
      await expect(dial, "nothing moves until Play is pressed").toHaveAttribute("aria-valuenow", "0");
      expect(await days(), "not one day passed").toEqual([]);

      await page.getByRole("button", { name: "Play", exact: true }).click();
      await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
      await expect(dial, "it reaches six months on").toHaveAttribute("aria-valuenow", String(LAST_DAY), { timeout: 40_000 });
      await expect(page.getByRole("button", { name: "Play again", exact: true })).toBeVisible();
      await page.waitForTimeout(1_500);
      await expect(dial, "and stops there").toHaveAttribute("aria-valuenow", String(LAST_DAY));

      // A busy runner can paint two beats as one, so a step is read as whole weeks or as under a week, never exactly.
      const steps = await days();
      expect(steps[steps.length - 1]).toBe(LAST_DAY);
      const gaps = [steps[0], ...steps.slice(1).map((day, i) => day - steps[i])];
      if (reduced) {
        expect(gaps.slice(0, -1).every((gap) => gap > 0 && gap % 7 === 0), `a week at a time under reduced motion: ${gaps}`).toBe(true);
      } else {
        expect(gaps.every((gap) => gap > 0 && gap < 7), `a day at a time: ${gaps}`).toBe(true);
        expect(gaps.filter((gap) => gap === 1).length, "most steps a single day").toBeGreaterThan(gaps.length / 2);
      }
      expect(seen.api, "nothing reaches /api").toEqual([]);
    });
  });
}
