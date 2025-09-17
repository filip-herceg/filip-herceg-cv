import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Visual diff harness for print fidelity.
// Emulates print media and reduced motion, waits for fonts/images, then asserts
// the page screenshot matches the stored baseline within a small diff threshold.

test.describe('Print fidelity', () => {
  // Enable with EXPORT_PRINT_DIFF=1 to generate/update baseline snapshots locally.
  test.skip(!process.env.EXPORT_PRINT_DIFF, 'Set EXPORT_PRINT_DIFF=1 to enable visual diff harness')

  test('cv/print matches baseline (<2% diff)', async ({ page }) => {
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce', colorScheme: 'light' })
    // A modest, consistent viewport; capture fullPage to avoid pagination variance
    await page.setViewportSize({ width: 1200, height: 1600 })

    await page.goto('/cv/print')
    await page.waitForLoadState('networkidle')

    // Ensure fonts are fully ready before snapshot (avoid layout shifts)
    await page.evaluate(async () => {
      type MaybeDocumentFonts = Document & { fonts?: { ready?: Promise<void> } }
      const d = document as MaybeDocumentFonts
      if (d.fonts && 'ready' in d.fonts) {
        try { await d.fonts.ready } catch {}
      }
    })

  const overridesPath = path.resolve(__dirname, 'visual-thresholds.json')
  const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {}
  const baseOpts = { fullPage: true, maxDiffPixelRatio: 0.02, animations: 'disabled' }
  const name = 'cv-print-a4.png'
  const merged = { ...baseOpts, ...(overrides[name] || {}) }
  await expect(page).toHaveScreenshot(name, merged)
  })

  test('cv/print letter+compact matches baseline', async ({ page }) => {
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce', colorScheme: 'light' })
    await page.setViewportSize({ width: 1200, height: 1600 })

    await page.goto('/cv/print?paper=letter&density=compact')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.print-page')).toHaveAttribute('data-paper', 'letter')
    await expect(page.locator('.print-page')).toHaveAttribute('data-density', 'compact')

  const overridesPath = path.resolve(__dirname, 'visual-thresholds.json')
  const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, 'utf8')) : {}
  const baseOpts = { fullPage: true, maxDiffPixelRatio: 0.02, animations: 'disabled' }
  const name = 'cv-print-letter-compact.png'
  const merged = { ...baseOpts, ...(overrides[name] || {}) }
  await expect(page).toHaveScreenshot(name, merged)
  })
})
