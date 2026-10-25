import { defineConfig } from "playwright/test";
import { DEFAULT_PORT } from "./scripts/preview.mjs";

const port = Number(process.env.PREVIEW_PORT ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PREVIEW_PORT 必須介於 1 與 65535。");

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true } },
    { name: "mobile-narrow", use: { viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `node scripts/preview.mjs --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
