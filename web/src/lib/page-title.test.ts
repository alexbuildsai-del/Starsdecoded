import { describe, it, expect } from "vitest";
import { reportFileTitle } from "./page-title";

describe("reportFileTitle", () => {
  it("builds a natal filename from one name", () => {
    expect(reportFileTitle("Natal Report", "Alex Smith")).toBe(
      "Alex Smith - Natal Report - Stars Decoded",
    );
  });

  it("joins two names for a synastry filename", () => {
    expect(reportFileTitle("Synastry Report", "Alex", "Sam")).toBe(
      "Alex & Sam - Synastry Report - Stars Decoded",
    );
  });

  it("replaces the characters browsers strip from filenames", () => {
    expect(reportFileTitle("Natal Report", 'A/B\\C:D*E?F"G<H>I|J')).toBe(
      "A B C D E F G H I J - Natal Report - Stars Decoded",
    );
  });

  it("collapses whitespace and trims", () => {
    expect(reportFileTitle("Natal Report", "  Ada   Lovelace \n")).toBe(
      "Ada Lovelace - Natal Report - Stars Decoded",
    );
  });
});
