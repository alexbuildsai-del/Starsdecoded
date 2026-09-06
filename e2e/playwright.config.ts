import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const API_PORT = process.env.API_PORT ?? "8080";
const FRONTEND_PORT = process.env.FRONTEND_PORT ?? "5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: [
      `PORT=${API_PORT}`,
      "pnpm --filter @workspace/api-server run dev",
      "&",
      `PORT=${FRONTEND_PORT}`,
      "pnpm --filter @workspace/astra run dev",
    ].join(" "),
    url: `${BASE_URL}/api/healthz`,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
