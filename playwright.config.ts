import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT || 3000)
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}`

const webServer = process.env.SKIP_WEB_SERVER
  ? undefined
  : {
  // Run a production server to match real behavior and avoid dev-only warnings
  command: 'npm run build && npm run serve',
    url: BASE,
  timeout: 180_000,
  reuseExistingServer: true,
    env: { PORT: String(PORT), HOSTNAME: '127.0.0.1' },
  }

export default defineConfig({
  testDir: 'src/tests/e2e',
  webServer,
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Two projects allow easily running different envs if needed later (e.g., compact-specific toggles)
  projects: [
    {
      name: 'default',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'compact-baseline',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
