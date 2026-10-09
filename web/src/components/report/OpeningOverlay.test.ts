import { describe, expect, it } from "vitest";
import * as overlay from "./OpeningOverlay";
import type { Progress } from "@/lib/progress";

// The Personal report's loading screen (R19-46, ADR-393, 394): one bar, moved only by real work, and no report opens by
// itself, so a finished story points at its button.
const progress = (over: Partial<Progress>): Progress => ({
  real: 50, shown: 50, label: "Writing your report", next: 60, door: false, complete: false, failed: false, ...over,
});

describe("the loading bar", () => {
  it("shows the whole-number percentage and what is being written, in lower case", () => {
    expect(overlay.barOf(progress({ shown: 58.7 }))).toEqual({ pct: 58, line: "58% · writing your report" });
    expect(overlay.barOf(progress({ shown: 12, label: "Working out your chart" }))).toEqual({ pct: 12, line: "12% · working out your chart" });
  });

  it("shows 100 only for a finished report, never for a creep that reached the top", () => {
    expect(overlay.barOf(progress({ shown: 100, real: 96 })).pct).toBe(99);
    expect(overlay.barOf(progress({ shown: 99.9 })).pct).toBe(99);
    expect(overlay.barOf(progress({ shown: 100, real: 100, complete: true, door: true, label: "Ready" }))).toEqual({ pct: 100, line: "100% · your report is ready" });
  });
});

describe("the finished story", () => {
  it("tells the reader to tap Start reading, never that it is opening", () => {
    const done = overlay.plainSlots(progress({ complete: true, door: true, real: 100, shown: 100 }));
    expect(done).toMatchObject({ title: "Your report is ready", subtitle: "Tap Start reading to open it." });
    expect(JSON.stringify(done)).not.toMatch(/opening it now/i);
    expect(overlay.plainSlots(progress({ door: true })).subtitle).toBe("The first chapters are in.");
  });

  it("holds no timer that opens the page: the old 1.2 s self-open is gone", () => {
    expect("SELF_OPEN_HOLD_MS" in overlay).toBe(false);
  });
});
