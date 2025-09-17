import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  setupFiles: ['src/tests/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        'next.config.mjs',
        'postcss.config.mjs',
        'tailwind.config.ts',
        'playwright.config.ts',
        'sentry.*.config.ts',
  'vitest.config.ts',
  'eslint.config.mjs',
  'scripts/**',
  'src/types/**',
  'src/lib/cv/types.ts',
  'src/lib/stubs/**', // legacy temporary stubs (should trend toward deletion)
  'src/tests/**', // exclude test files themselves from coverage matrix
  '**/*.d.ts', // ignore declaration files
        '.next/**',
  'coverage/**', // exclude generated coverage artifacts from previous runs
  'verbose/coverage/**', // exclude verbose report helper assets
      ],
      thresholds: {
  // Set meaningful project-wide minimums aligned slightly below current baseline (~95%)
  statements: 90,
  branches: 80,
  functions: 75,
  lines: 90,
      },
    },
    include: [
      'src/tests/unit/**/*.{test,spec}.{ts,tsx}',
  'src/tests/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'src/tests/e2e/**',
      // Exclude deprecated legacy static fallback test (superseded by onboarding empty state F16)
      'src/tests/integration/cv-service-fallback.test.ts'
    ]
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'src/') + '/',
  // Ensure optional 'qrcode' dep is stubbed in tests to avoid module resolution at transform time
  'qrcode': path.resolve(__dirname, 'src/tests/stubs/qrcode.ts'),
    },
  },
})
