import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against the isolated local PP1 stack started by scripts/pp1-local/start-pp1-local.ps1:
 * web :5174 -> auth :5100 + learner-profile :5101 -> local Docker MongoDB (127.0.0.1:27018, mathquest_pp1_demo).
 * Never the normal :5173 stack or Atlas.
 */
export default defineConfig({
  testDir: './specs',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  outputDir: './reports/artifacts',
  reporter: [['list'], ['html', { outputFolder: './reports/html', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 1366, height: 900 },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
});
