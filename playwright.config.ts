import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const localChromium = '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:4173/PixelMaker/',
    launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
  },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/PixelMaker/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
