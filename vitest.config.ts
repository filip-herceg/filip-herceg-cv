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
  'vitest.config.ts',
  'eslint.config.mjs',
  'src/types/**',
  'src/lib/cv/types.ts',
  'src/tests/**', // exclude test files themselves from coverage matrix
  '**/*.d.ts', // ignore declaration files
        '.next/**',
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
    exclude: ['src/tests/e2e/**']
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'src/') + '/',
    },
  },
})
