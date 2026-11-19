import { test as base, expect } from '@playwright/test'

/**
 * The suite's `test`: Playwright's, with the tooling a local web server adds to pages taken
 * out of the way. Laravel Herd injects an "Edit with Herd" badge (`#herd-ai-host`) into the
 * sites it serves; it sits over the bottom of the page and swallows clicks on what is under it
 * (the user menu, pagination).
 */
export const test = base.extend<{ hideDevOverlays: void }>({
  hideDevOverlays: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const hide = () => {
          const style = document.createElement('style')
          style.textContent =
            '#herd-ai-host { display: none !important; pointer-events: none !important; }'
          document.documentElement.appendChild(style)
        }

        if (document.documentElement) hide()
        else document.addEventListener('DOMContentLoaded', hide)
      })

      await use()
    },
    { auto: true },
  ],
})

export { expect }
