const { defineConfig } = require("@playwright/test");

const port = Number(process.env.CHIPMUNK_TEST_PORT || 3217);
const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;

module.exports = defineConfig({
  testDir: "./tests/integration",
  testMatch: "browser.test.cjs",
  timeout: 15000,
  expect: { timeout: 5000 },
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: ".artifacts/browser-results.json" }],
  ],
  use: {
    baseURL: `http://localhost:${port}`,
    ...(wsEndpoint
      ? { connectOptions: { wsEndpoint, exposeNetwork: "<loopback>" } }
      : {}),
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/integration/server.cjs",
    url: `http://localhost:${port}/health`,
    reuseExistingServer: false,
    timeout: 10000,
  },
  projects: ["chromium", "firefox", "webkit"].map((browserName) => ({
    name: browserName,
    use: { browserName },
  })),
});
