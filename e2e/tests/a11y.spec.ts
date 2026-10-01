import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

type Violation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

/** WCAG 2.2 at AA is every level A and AA rule since 2.0; axe tags each rule with the version that added it. */
const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** What fails the check (ADR-192). Moderate and minor findings still reach the artifact. */
const BLOCKING = new Set(["serious", "critical"]);

/**
 * Read whether or not the sitemap names them: the legal pages, which no change to the sitemap may drop from the
 * check, and the waitlist, prerendered like the rest but kept out of the sitemap because it lasts only until launch.
 */
const ALWAYS_READ = ["/privacy", "/terms", "/refunds", "/company", "/waitlist"];

/** The sweep is one test per viewport, so its time grows with the number of pages. */
const SWEEP_MS = 60_000;
const PAGE_MS = 20_000;
const SETTLE_MS = 10_000;

const record = (violation: Violation) => ({
  rule: violation.id,
  impact: violation.impact ?? null,
  help: violation.help,
  helpUrl: violation.helpUrl,
  elements: violation.nodes.map((node) => ({ target: node.target, html: node.html, failure: node.failureSummary ?? "" })),
});

const line = (violation: Violation) => {
  const where = violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(", ");
  const more = violation.nodes.length > 3 ? ` and ${violation.nodes.length - 3} more` : "";
  return `${violation.impact} ${violation.id}: ${violation.help}, at ${where}${more}`;
};

test("every public page is free of serious and critical WCAG 2.2 AA violations", async ({ page, request }, testInfo) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status(), "/sitemap.xml answers").toBe(200);
  // Every host's sitemap names production's addresses (ADR-115), so only each path is taken, and read on BASE_URL.
  const listed = [...(await sitemap.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
  expect(listed.length, "the sitemap lists pages").toBeGreaterThan(0);
  const paths = [...new Set([...listed, ...ALWAYS_READ])];
  test.setTimeout(SWEEP_MS + paths.length * PAGE_MS);

  const pages: Array<{ path: string; status: number | null; violations: ReturnType<typeof record>[] }> = [];
  try {
    for (const path of paths) {
      await test.step(path, async () => {
        const response = await page.goto(path);
        // Lazy chunks and the first effects land once the network goes quiet; a page that never does is read as it is.
        await page.waitForLoadState("networkidle", { timeout: SETTLE_MS }).catch(() => undefined);
        const status = response?.status() ?? null;
        expect.soft(status, `${path} answers`).toBe(200);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
        pages.push({ path, status, violations: violations.map(record) });
        const blocking = violations.filter((violation) => BLOCKING.has(violation.impact ?? "")).map(line);
        expect.soft(blocking, `${path} has serious or critical WCAG 2.2 AA violations`).toEqual([]);
      });
    }
  } finally {
    const report = { site: testInfo.project.use.baseURL, viewport: testInfo.project.name, tags: WCAG_22_AA, pages };
    await writeFile(testInfo.outputPath(`axe-${testInfo.project.name}.json`), `${JSON.stringify(report, null, 2)}\n`);
  }
});
