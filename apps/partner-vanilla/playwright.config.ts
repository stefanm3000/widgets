import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  workers: 1,
  use: {
    baseURL: "http://localhost:5174",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: [
    {
      command:
        "pnpm --filter @pulse/api build && exec node ../api/dist/server.js",
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:4000/health",
    },
    {
      command: "pnpm exec vite --host 127.0.0.1",
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:5174",
    },
    {
      command: "pnpm --dir ../partner-vue exec vite --host 127.0.0.1",
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:5175",
    },
    {
      command: "pnpm --dir ../playground exec vite --host 127.0.0.1",
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:5173",
    },
  ],
});
