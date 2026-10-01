import { defineConfig, devices } from "@playwright/test";

// The checks read a deployed build, never a dev server: the public pages are prerendered at build (R-7.6), so only a
// build shows what a visitor and a crawler are sent. site-checks.yml passes each Vercel preview's address.
const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  throw new Error("Set BASE_URL to the site to check, such as a Vercel preview: BASE_URL=https://… pnpm --filter @workspace/e2e test");
}

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  // A preview can drop a request now and then, so one retry; a page that fails twice is failing.
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // Reduced motion is a real state on these pages (§9) and shows each one settled, so contrast is measured on the
    // colours a reader is left with, not on a fade caught halfway.
    reducedMotion: "reduce",
  },
  projects: [
    // Phone first (§9); the desktop navigation and layout differ enough to be read as well.
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
