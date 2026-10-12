import js from '@eslint/js';
import globals from 'globals';

// Extension sources run as browser/service-worker modules or classic content
// scripts; tests, scripts and config run in Node.
export default [
  { ignores: ['node_modules/**', 'dist/**', 'legacy-extension-source/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.serviceworker, chrome: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: ['content.js', 'page-tracker.js', 'intervention-overlay.js'],
    languageOptions: { sourceType: 'script' },
  },
  {
    files: ['tests/**/*.mjs', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
];
