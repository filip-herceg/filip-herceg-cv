import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'src/tests/e2e',
  webServer: {
    // For output: 'standalone', use the server.js entry instead of `next start`.
    command: 'node .next/standalone/server.js',
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: true,
    env: { PORT: '3000', HOSTNAME: '127.0.0.1' },
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
})
