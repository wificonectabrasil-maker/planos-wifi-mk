import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "3107";
Object.assign(process.env, {
  PLAYWRIGHT_DIST_DIR: ".cache-tests/next",
  TURSO_DATABASE_URL: "file:.cache-tests/e2e.db",
  TURSO_AUTH_TOKEN: "",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "isolated-e2e-password",
  ADMIN_SESSION_SECRET: "isolated-e2e-session-secret-32chars",
  ADMIN_DISABLE_AUTH: "0",
  SITE_URL: `http://localhost:${port}`,
  WIFICONECTA_WHATSAPP: "5511000000000", // Isolated fixture; external navigation is intercepted in tests.
  GEMINI_API_KEY: "",
  GOOGLE_CSE_API_KEY: "",
  GOOGLE_API_KEY: "",
  WP_FAKE_USER: "",
  WP_FAKE_PASSWORD: "",
});
export default defineConfig({
  testDir: "tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: `http://localhost:${port}`,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node --import tsx tests/start-server.ts ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 120000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
  },
});
