import { defineConfig } from "vitest/config";
import { existsSync, readFileSync } from "fs";
import path from "path";

// TEST_TIER=critical runs only test.critical (docs/annex/test-archive.md). A missing or empty list, or a listed file
// that is gone, throws, so the critical tier can never widen to every test without anyone seeing it.
function criticalFiles(): string[] {
  const list = path.resolve(import.meta.dirname, "test.critical");
  if (!existsSync(list)) throw new Error("test.critical is missing");
  const files = readFileSync(list, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (files.length === 0) throw new Error("test.critical lists no file");
  const missing = files.filter((file) => !existsSync(path.resolve(import.meta.dirname, file)));
  if (missing.length > 0) throw new Error(`test.critical lists files that do not exist: ${missing.join(", ")}`);
  return files;
}

// MB-47 provisional: every pure module under src, geometry and beyond. Still no
// jsdom, no testing-library, no snapshots and no component rendering.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: process.env.TEST_TIER === "critical" ? criticalFiles() : ["src/**/*.test.ts", "src/lib/*.test.ts"],
  },
});
