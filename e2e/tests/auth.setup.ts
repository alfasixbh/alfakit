import { expect, test as setup } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { credentials } from '../fixtures/credentials'

/** Signs in once per renderer and stores the session for the other specs. */
setup('sign in to the panel', async ({ page }, testInfo) => {
  const renderer = testInfo.project.name.replace(/-setup$/, '')

  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(credentials.email)
  await page.getByLabel(/^password/i).fill(credentials.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  await expect(page).toHaveURL(/\/admin(\/)?$/)

  mkdirSync('.auth', { recursive: true })
  await page.context().storageState({ path: `.auth/${renderer}.json` })
})
