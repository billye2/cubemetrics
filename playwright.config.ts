import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { loadEnv, ROOT } from "./e2e/env";

const { baseURL } = loadEnv();

// E2E against the LIVE site by default (https://cubemetrics.com). Override with
// E2E_BASE_URL to point at a preview deploy or local dev server.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      // Phone-first app — run in a phone viewport.
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: resolve(ROOT, "e2e/.auth/state.json"),
      },
      dependencies: ["setup"],
    },
  ],
});
