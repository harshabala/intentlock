import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/screenshots',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  outputDir: 'test-results/screenshots',
});
