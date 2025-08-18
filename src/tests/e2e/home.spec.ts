import { test, expect } from '@playwright/test'

// Basic smoke test; requires `npm run build && npm start` or a dev server.
// In CI, we can launch a server via Playwright config or a script.

test('home page renders and has hero copy', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await expect(page.getByRole('heading', { name: /Hi, I'm Filip Herceg/i })).toBeVisible()
})

test('legacy /site redirect works', async ({ page }) => {
  await page.goto('http://localhost:3000/site')
  await expect(page).toHaveURL('http://localhost:3000/')
})
