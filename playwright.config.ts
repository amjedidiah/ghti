import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the local stack: `bun run dev` (reused if already
// running) and `supabase start`. Specs are *.e2e.ts so Bun's unit-test runner
// never picks them up. `bun run test:e2e:fresh` resets the database to the
// seed first, which the specs rely on.

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The dev server compiles pages on first use; give assertions time.
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    // Fail a stuck click or page load with its own error, not a test timeout.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: "**/auth.setup.ts" },
    {
      name: "phone",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
