import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: [
      '.next/**', // root build output
      '**/.next/**', // nested (safety for execution from subdir)
      'coverage/**',
      'dist/**'
  ,'scripts/**'
    ],
  },
  {
    files: ['scripts/*.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['scripts/check-budgets.mjs', 'scripts/seed-cv.mjs'],
    rules: { 'no-console': 'off' },
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'react/jsx-key': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  // Enforce no unused vars except leading underscore
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
	'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'src/tests/**/*.ts', 'src/tests/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off', // CLI / utility scripts may log freely
    },
  },
]

export default eslintConfig
