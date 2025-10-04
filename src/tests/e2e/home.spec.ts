import { test, expect } from '@playwright/test'

// Basic smoke test; requires `npm run build && npm start` or a dev server.
// In CI, we can launch a server via Playwright config or a script.

test('home page renders and has hero copy', async ({ page }) => {
  await page.goto('/')
  const heroHeading = page.getByRole('heading', { level: 1 }).filter({ hasText: /Filip Herceg/i })
  await expect(heroHeading).toBeVisible()
})

