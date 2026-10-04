// Test end-to-end: girano sul sito servito in locale con il backend finto (?fake=1), mai su Supabase reale.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8766',
    locale: 'it-IT',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } } }],
  webServer: {
    command: 'node scripts/serve.mjs 8766',
    url: 'http://127.0.0.1:8766/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
