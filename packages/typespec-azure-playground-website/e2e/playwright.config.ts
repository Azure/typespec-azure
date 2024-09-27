import { type PlaywrightTestConfig } from "@playwright/test";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const config: PlaywrightTestConfig = {
  forbidOnly: !!process.env.CI,
  webServer: {
    command: "npm run watch",
    port: 5174,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: resolve(root, "dist"),
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
  ],
  testMatch: "*.e2e.ts",
};
export default config;
