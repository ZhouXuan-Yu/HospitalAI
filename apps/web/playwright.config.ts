import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'chromium-1920', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }
  ]
})
