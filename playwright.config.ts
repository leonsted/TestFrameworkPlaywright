import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { loadEnvironment } from './src/config/load-env';

const env = loadEnvironment();

const testDir = defineBddConfig({
  language: 'ru',
  features: ['features/web/**/*.feature', 'features/mobile-web/**/*.feature'],
  steps: ['src/fixtures/bdd.ts', 'src/steps/ui/**/*.ts'],
  outputDir: '.features-gen',
  missingSteps: 'fail-on-gen',
});

const desktop = {
  ...devices['Desktop Chrome'],
  locale: 'ru-RU',
  timezoneId: 'Europe/Moscow',
};

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'reports/junit-web.xml' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-test',
    actionTimeout: 10_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      grep: /@web/,
      grepInvert: /@onec|@wip/,
      use: { ...desktop, baseURL: env.web.baseUrl },
    },
    {
      name: 'firefox',
      grep: /@web/,
      grepInvert: /@onec|@wip/,
      use: { ...devices['Desktop Firefox'], locale: 'ru-RU', timezoneId: 'Europe/Moscow', baseURL: env.web.baseUrl },
    },
    {
      name: 'webkit',
      grep: /@web/,
      grepInvert: /@onec|@wip/,
      use: { ...devices['Desktop Safari'], locale: 'ru-RU', timezoneId: 'Europe/Moscow', baseURL: env.web.baseUrl },
    },
    {
      name: 'mobile-chrome',
      grep: /@mobile-web/,
      grepInvert: /@wip/,
      use: { ...devices['Pixel 7'], locale: 'ru-RU', timezoneId: 'Europe/Moscow', baseURL: env.mobileWeb.baseUrl },
    },
    {
      name: 'mobile-safari',
      grep: /@mobile-web/,
      grepInvert: /@wip/,
      use: { ...devices['iPhone 14'], locale: 'ru-RU', timezoneId: 'Europe/Moscow', baseURL: env.mobileWeb.baseUrl },
    },
    {
      name: 'onec',
      grep: /@onec/,
      use: { ...desktop, baseURL: env.web.baseUrl },
    },
  ],
});
