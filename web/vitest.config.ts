import { defineConfig } from "vitest/config";
import path from "path";

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
    include: ["src/**/*.test.ts"],
  },
});
