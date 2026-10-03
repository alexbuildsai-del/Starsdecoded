import { expect, test } from "@playwright/test";

/**
 * QA-02 #11 and MB-184 on /waitlist: an empty or malformed address puts focus on the field, marked invalid, and the field
 * shows the site's focus ring, where a border colour alone had been its only cue. The form's own check answers both, so
 * nothing is sent.
 */

// The site's ring (`.sd :focus-visible`), in --indigo-lt (§9).
const SITE_RING = { outlineStyle: "solid", outlineWidth: "2px", outlineColor: "rgb(159, 168, 218)" };

for (const typed of ["", "not-an-email"]) {
  test(`/waitlist: ${typed ? `"${typed}"` : "an empty field"} takes focus to the field, which shows the site's ring`, async ({ page }) => {
    await page.goto("/waitlist");
    // Before hydration the button would send the prerendered form itself and reload the page.
    await page.waitForLoadState("networkidle");
    const form = page.locator("form.wl-form");
    const field = form.getByRole("textbox", { name: "Email" });

    await field.fill(typed);
    await form.getByRole("button", { name: "Join the waitlist" }).click();

    await expect(form.getByRole("alert")).toHaveText("Enter an email address, like name@example.com.");
    await expect(field, "focus leaves the button for the field").toBeFocused();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const ring = await field.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor };
    });
    expect(ring, "a 2 px outline, not only a border colour").toEqual(SITE_RING);
  });
}
