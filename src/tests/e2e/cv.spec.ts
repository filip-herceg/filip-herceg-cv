import { test, expect } from '@playwright/test'

test.describe('CV Routes', () => {
  test('full CV page renders', async ({ page }) => {
    await page.goto('/cv')
    await expect(page.getByRole('heading', { level: 1, name: /Jane Developer/i })).toBeVisible()
  })

  test('short mode panel visible', async ({ page }) => {
    await page.goto('/cv?mode=short')
    await expect(page.locator('[data-test="cv-shortener"]')).toBeVisible()
  })

  test('pdf api returns 200 or 501', async ({ request }) => {
    const res = await request.get('/api/cv/pdf?skills=ts&projects=obs-platform')
    expect([200, 501]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.body()
      // PDF magic number %PDF
      expect(body.slice(0, 4).toString()).toBe('%PDF')
    }
  })
})
