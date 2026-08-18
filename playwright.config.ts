import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180000,        // 3 min per test — signup flow alone takes ~70s
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'https://scoutme-mu.vercel.app',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    launchOptions: {
      args: [
        '--disable-smooth-scrolling',
        '--disable-gpu',
        '--no-sandbox',
      ],
    },
  },
  projects: [
    {
      name: 'Mobile Chrome (Pixel 7)',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
