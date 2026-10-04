import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { DEFAULT_TITLE, SITE_NAME, reportFileTitle } from "./page-title";

const THIS_MODULE = fileURLToPath(new URL("./page-title.ts", import.meta.url));
const PAGES = fileURLToPath(new URL("../pages", import.meta.url));

const page = (file: string) => readFileSync(join(PAGES, file), "utf8");

describe("reportFileTitle", () => {
  it("builds a Personal report's filename from one name", () => {
    expect(reportFileTitle("Personal Report", "Alex Smith")).toBe(
      "Alex Smith - Personal Report - Stars Decoded",
    );
  });

  it("joins two names for a Compatibility report's filename", () => {
    expect(reportFileTitle("Compatibility Report", "Alex", "Sam")).toBe(
      "Alex & Sam - Compatibility Report - Stars Decoded",
    );
  });

  it("replaces the characters browsers strip from filenames", () => {
    expect(reportFileTitle("Personal Report", 'A/B\\C:D*E?F"G<H>I|J')).toBe(
      "A B C D E F G H I J - Personal Report - Stars Decoded",
    );
  });

  it("collapses whitespace and trims", () => {
    expect(reportFileTitle("Personal Report", "  Ada   Lovelace \n")).toBe(
      "Ada Lovelace - Personal Report - Stars Decoded",
    );
  });
});

describe("the tab and the saved PDF use the product's names (reading 13, MB-138)", () => {
  it("leaves Natal and Synastry out of page-title.ts, the fallback title included", () => {
    expect(DEFAULT_TITLE).toBe(SITE_NAME);
    expect(readFileSync(THIS_MODULE, "utf8")).not.toMatch(/Natal|Synastry/);
  });

  it("titles the Personal report's page Personal Report, its file name included", () => {
    expect(page("ReportPage.tsx")).toMatch(/reportFileTitle\(\s*"Personal Report",/);
  });

  it("titles no page a Natal Report or a Synastry Report", () => {
    for (const file of readdirSync(PAGES).filter((name) => name.endsWith(".tsx"))) {
      expect(page(file), file).not.toMatch(/\b(?:Natal|Synastry) Report\b/);
    }
  });
});
