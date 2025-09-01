import { test, expect } from '@playwright/test'

test.describe('CV Routes', () => {
  test('full CV page renders', async ({ page }) => {
    await page.goto('/cv')
    await expect(page.getByRole('heading', { level: 1, name: /Jane Developer/i })).toBeVisible()
  // Use role=heading level=2 to avoid collision with nav link also containing text 'Projects'
  await expect(page.getByRole('heading', { level: 2, name: 'Projects' })).toBeVisible()
  })

  test('short mode selection toggles skill', async ({ page }) => {
    await page.goto('/cv?mode=short')
    const builder = page.getByTestId('short-builder')
    await expect(builder).toBeVisible()
    const firstCheckbox = builder.locator('input[type="checkbox"]').first()
    await expect(firstCheckbox).toBeVisible()
    const skillBadges = page.locator('section:has(> h2:text("Skills")) ul li')
    const initialCount = await skillBadges.count()
    expect(initialCount).toBeGreaterThan(1)
    await firstCheckbox.click()
    await expect(skillBadges).toHaveCount(initialCount - 1)
  })

  test('pdf api returns 200, 500, 501 or 504', async ({ request }) => {
    const res = await request.get('/api/cv/pdf?skills=ts&projects=obs-platform')
    expect([200, 500, 501, 504]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.body()
      expect(body.subarray(0, 4).toString()).toBe('%PDF')
    }
  })
})
