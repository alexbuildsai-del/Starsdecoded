import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Where focus is on the chart wheel (MB-177, QA-02 #4), at 1440 px as the sweep measured it. On /sample every house and
 * planet of House by House's wheel draws its focus ring in the site's focus colour, and the skip link before the wheel
 * lands after it. Home's wheel did nothing on focus, so it takes no stop at all: Tab goes from before it to after it,
 * and the claim's marks still find their body on it.
 */
const DESKTOP = { width: 1440, height: 900 };

// MB-196 provisional: --indigo-lt, the colour `.sd :focus-visible` draws, never brass.
const FOCUS = [0x9f, 0xa8, 0xda] as const;

/** Audrey Hepburn's chart: twelve houses and thirteen bodies. */
const SAMPLE_STOPS = 25;

/**
 * At this width a planet's ring leaves about a hundred pixels in the focus colour and a house's several hundred; a
 * focused planet's degree chip, the one change `main` already drew, leaves none.
 */
const RING_PIXELS = 40;

test.use({ viewport: DESKTOP });

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "measured at 1440 px, where House by House draws its full wheel");
});

/** House by House's full wheel; the bar's 92 px copy is hidden at this width and from assistive technology. */
async function sampleWheel(page: Page): Promise<Locator> {
  await page.goto("/sample");
  await page.waitForLoadState("networkidle");
  const wheel = page.getByRole("group", { name: "Natal chart wheel" });
  await expect(wheel).toHaveCount(1);
  await wheel.scrollIntoViewIfNeeded();
  return wheel;
}

function focusAgainst(wheel: Locator): Promise<"inside" | "before" | "after" | "none"> {
  return wheel.evaluate((svg) => {
    const active = document.activeElement;
    if (!active || active === document.body) return "none";
    if (svg.contains(active)) return "inside";
    return svg.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING ? "after" : "before";
  });
}

/**
 * Pixels that changed between two shots of the wheel and are the focus colour. Decoded in a blank page, so the site's
 * content security policy never sees the images.
 */
function ringPixels(lab: Page, none: Buffer, focused: Buffer): Promise<number> {
  return lab.evaluate(
    async ({ shots, focus }) => {
      const pixels = async (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("no 2d canvas in the blank page");
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      };
      const [a, b] = await Promise.all(shots.map(pixels));
      if (a.length !== b.length) throw new Error("the two shots of the wheel differ in size");
      let count = 0;
      for (let i = 0; i < b.length; i += 4) {
        const changed = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30;
        // Only a line's core pixels: its edges blend with whatever the wheel draws under them.
        const near = Math.hypot(b[i] - focus[0], b[i + 1] - focus[1], b[i + 2] - focus[2]) < 48;
        if (changed && near) count += 1;
      }
      return count;
    },
    { shots: [none.toString("base64"), focused.toString("base64")], focus: [...FOCUS] },
  );
}

test("/sample: every stop of House by House's wheel shows its focus ring", async ({ page, context }) => {
  const wheel = await sampleWheel(page);
  const stops = wheel.getByRole("button");
  await expect(stops).toHaveCount(SAMPLE_STOPS);
  await page.mouse.move(0, 0);
  const shoot = () => wheel.screenshot({ animations: "disabled", caret: "hide" });
  const none = await shoot();

  // In from the keyboard, as a reader comes: focus a script gives need not match :focus-visible.
  await stops.first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");

  const lab = await context.newPage();
  for (let i = 0; i < SAMPLE_STOPS; i += 1) {
    if (i > 0) await page.keyboard.press("Tab");
    const stop = stops.nth(i);
    await expect(stop).toBeFocused();
    const name = await stop.getAttribute("aria-label");
    expect.soft(await ringPixels(lab, none, await shoot()), `${name} shows its focus ring`).toBeGreaterThanOrEqual(RING_PIXELS);
  }
  await lab.close();
});

test("/sample: the skip link shows on focus, before the wheel, and lands after it", async ({ page }) => {
  const wheel = await sampleWheel(page);
  const skip = page.getByRole("link", { name: "Skip past the chart wheel" });
  await expect(skip).toHaveCount(1);
  expect((await skip.boundingBox())?.width ?? 0, "hidden until it has focus").toBeLessThanOrEqual(1);

  await wheel.getByRole("button").first().focus();
  await page.keyboard.press("Shift+Tab");
  await expect(skip, "the stop before the wheel's first").toBeFocused();
  const [shown, plate] = await Promise.all([skip.boundingBox(), wheel.boundingBox()]);
  expect(shown?.width ?? 0, "shown on focus").toBeGreaterThan(80);
  expect(shown && plate && shown.x >= plate.x && shown.y >= plate.y && shown.x + shown.width <= plate.x + plate.width,
    "over the wheel, so showing it moves nothing").toBe(true);

  await page.keyboard.press("Enter");
  expect(await focusAgainst(wheel), "Enter lands after the wheel").toBe("after");
  await page.keyboard.press("Tab");
  expect(await focusAgainst(wheel), "Tab goes on from there, not back into it").toBe("after");
});

test("home: Tab goes past the wheel, which takes no stop", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // The wheel is drawn on the client; under reduced motion it holds her chart still.
  const wheel = page.locator("svg[data-horizon]");
  await expect(wheel).toHaveCount(1);
  await expect(wheel.locator("[tabindex]"), "no stop in the wheel").toHaveCount(0);
  await expect(page.getByRole("link", { name: "Skip past the chart wheel" }), "nothing to skip").toHaveCount(0);
  // The claim's marks find each body in the drawn wheel; a wheel without stops must still give them one to ring.
  await expect(page.locator("svg[data-marks] [data-target]"), "the claim's ring is on the wheel").toHaveCount(1);

  for (let presses = 0; presses < 300; presses += 1) {
    await page.keyboard.press("Tab");
    const where = await focusAgainst(wheel);
    expect(where, `Tab ${presses + 1} stays out of the wheel`).not.toBe("inside");
    if (where === "after") return;
  }
  throw new Error("300 presses of Tab never got past the wheel");
});
