import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      exclude: [
        'next.config.mjs',
        'postcss.config.mjs',
        'tailwind.config.ts',
        'playwright.config.ts',
        'sentry.*.config.ts',
        '.next/**',
      ],
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 35,
        lines: 40,
      },
    },
    include: [
      'src/tests/unit/**/*.{test,spec}.{ts,tsx}',
  'src/tests/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['src/tests/e2e/**']
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'src/') + '/',
    },
  },
})
