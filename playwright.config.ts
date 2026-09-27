import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { browserName: "chromium", headless: true, trace: "retain-on-failure" },
  webServer: process.env.PW_START_SERVERS ? [
    { command: "./node_modules/.bin/next start --port 3000", cwd: "apps/command", url: "http://127.0.0.1:3000/login", timeout: 120_000, reuseExistingServer: !process.env.CI },
    { command: "./node_modules/.bin/next start --port 3001", cwd: "apps/margin", url: "http://127.0.0.1:3001/login", timeout: 120_000, reuseExistingServer: !process.env.CI },
  ] : undefined,
});
