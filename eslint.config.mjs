import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import quality from './eslint-rules/index.cjs'

const productionSourceFiles = [
  'apps/*/src/**/*.{ts,tsx}',
  'packages/*/src/**/*.ts',
]

const testFiles = [
  '**/*{.,-}{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}',
  '**/testes/**/*.{ts,tsx}',
]

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite()],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['apps/web/vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/collector/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'IfStatement[alternate]',
          message:
            'STYLE-009: use guard clause em vez de else / else if (docs/padroes/code-style-e-nomenclatura.md).',
        },
      ],
    },
  },
  {
    files: productionSourceFiles,
    plugins: { quality },
    rules: {
      'quality/max-lines': ['error', { max: 350 }],
      'quality/no-direct-console': [
        'error',
        {
          logger:
            'as funções print/printError injetadas em apps/collector/src/cli.ts',
        },
      ],
    },
  },
  {
    files: ['apps/collector/src/cli.ts'],
    rules: {
      'quality/no-direct-console': 'off',
    },
  },
  {
    files: testFiles,
    plugins: { quality },
    rules: {
      'quality/max-lines': ['warn', { max: 350, includeTests: true }],
    },
  },
  {
    files: ['eslint-rules/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
)
