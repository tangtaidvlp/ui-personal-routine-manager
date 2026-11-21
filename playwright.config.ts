import { defineConfig, devices } from '@playwright/test'

/**
 * Headless browser checks for F006 (specs/F006-user-profile-configuration-store/quickstart.md).
 * Start both servers first:
 *   backend:  cd ../ms-personal-routine-manager && SPRING_PROFILES_ACTIVE=fast ./gradlew bootRun
 *   frontend: pnpm dev
 * Then run `pnpm test:e2e`. The app uses HashRouter, so pages live at `#/today` etc.
 */
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173/',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
