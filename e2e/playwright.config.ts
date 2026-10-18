import { defineConfig, devices, type Project } from '@playwright/test'

/**
 * The same specs run against each playground (React, Vue and Svelte) through a project per
 * renderer. Base URLs default to the Herd sites; CI (and `php artisan serve`) override them
 * with E2E_REACT_URL, E2E_VUE_URL and E2E_SVELTE_URL.
 */
export const RENDERERS = ['react', 'vue', 'svelte'] as const
export type Renderer = (typeof RENDERERS)[number]

export const baseUrlFor = (renderer: Renderer): string =>
  process.env[`E2E_${renderer.toUpperCase()}_URL`] ?? `http://alfakit-${renderer}.localhost`

const only = process.env.E2E_RENDERERS?.split(',').map((name) => name.trim()) ?? RENDERERS

const projects: Project[] = []

for (const renderer of RENDERERS) {
  if (!only.includes(renderer)) continue

  const use = {
    ...devices['Desktop Chrome'],
    // The already-installed Google Chrome; `npx playwright install chromium` is only needed
    // on machines without it (see e2e/README.md).
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome',
    baseURL: baseUrlFor(renderer),
  }

  projects.push(
    {
      name: `${renderer}-setup`,
      testMatch: /auth\.setup\.ts/,
      use,
    },
    {
      name: renderer,
      dependencies: [`${renderer}-setup`],
      testIgnore: /auth\.setup\.ts/,
      use: { ...use, storageState: `.auth/${renderer}.json` },
    },
  )
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
  },
  projects,
})
