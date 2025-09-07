import { test, expect } from '@playwright/test'

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

    await expect(page).toHaveScreenshot('cv-print-a4.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02, // 2% pixel diff threshold
      animations: 'disabled',
    })
  })
})
