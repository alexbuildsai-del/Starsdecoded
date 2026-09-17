import { defineConfig } from "vitest/config";
import path from "path";

// MB-41 provisional: the pure geometry module only. No jsdom, no
// testing-library, no snapshots, and no component rendering in this round.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/components/chart/*.test.ts"],
  },
});
