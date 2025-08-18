import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 35,
        lines: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'src/') + '/',
    },
  },
})
