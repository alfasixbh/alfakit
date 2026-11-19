import { type Locator, type Page } from '@playwright/test'
import { credentials } from '../fixtures/credentials'
import { createPost, expectToast, rowWith, toasts, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven checks of what the playgrounds show of docs/content/{actions, notifications,
 * widgets, pages, panels, resources}. The same tests run on React, Vue and Svelte.
 */

/** The palette's search input: a combobox in React and Svelte, a plain textbox in Vue. */
const paletteInput = (palette: Locator): Locator =>
  palette.getByRole('combobox').or(palette.getByRole('textbox')).first()

const dialogNamed = (page: Page, name: string | RegExp): Locator =>
  page.getByRole('dialog', { name })

/** Confirms the confirmation modal of an action when one opens (some actions run at once). */
async function confirmIfAsked(page: Page, button: RegExp): Promise<void> {
  const dialog = page.getByRole('dialog')

  try {
    await dialog.first().waitFor({ state: 'visible', timeout: 2500 })
  } catch {
    return
  }

  await dialog.getByRole('button', { name: button }).last().click()
}

/** The posts list filtered to the row of `title` (the search box is debounced). */
async function findPost(page: Page, title: string): Promise<Locator> {
  await page.goto('/admin/posts')
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(title)

  const row = rowWith(page, title)

  await expect(row).toHaveCount(1)
  // Let the search reload settle first: an action confirmed while the table is still
  // reloading can lose its result (the modal stays open or the notification is dropped).
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  return row
}

/** Deletes the post `title` through the UI when it is still listed. */
async function removePost(page: Page, title: string): Promise<void> {
  await page.goto('/admin/posts')
  await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(title)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const row = rowWith(page, title)

  if ((await row.count()) === 0) return

  await row.first().getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(rowWith(page, title)).toHaveCount(0)
}

test.describe('docs: actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/showcase/actions')
    await expect(page.getByRole('heading', { level: 1, name: 'Actions' })).toBeVisible()
  })

  test('a wizard action validates each step and runs on the last one', async ({ page }) => {
    await page.getByRole('button', { name: 'Wizard', exact: true }).click()

    const dialog = dialogNamed(page, 'Wizard')

    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Profile/ })).toBeDisabled()

    // The step's own rules run before the wizard moves on.
    await dialog.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(dialog.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await dialog.getByRole('textbox', { name: 'Email' }).fill('wizard@example.com')
    await dialog.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(dialog.getByRole('textbox', { name: 'Bio' })).toBeVisible()

    // Back keeps what was typed.
    await dialog.getByRole('button', { name: 'Back', exact: true }).click()
    await expect(dialog.getByRole('textbox', { name: 'Email' })).toHaveValue('wizard@example.com')
    await dialog.getByRole('button', { name: 'Next', exact: true }).click()
    await dialog.getByRole('textbox', { name: 'Bio' }).fill('Written by a test.')
    await dialog.getByRole('button', { name: 'Next', exact: true }).click()

    await dialog.getByRole('switch', { name: 'I agree' }).click()
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()

    await expectToast(page, 'Wizard finished')
    await expect(toasts(page).filter({ hasText: 'wizard@example.com' }).first()).toBeVisible()
    await expect(dialog).toBeHidden()
  })

  test('nested footer actions open over their parent and can cancel it', async ({ page }) => {
    await page.getByRole('button', { name: 'Nested actions', exact: true }).click()

    const parent = dialogNamed(page, 'Nested actions')

    await expect(parent).toBeVisible()
    await parent.getByRole('textbox', { name: 'Note' }).fill('Keep me')

    // A nested action with its own form.
    await parent.getByRole('button', { name: 'Preview', exact: true }).click()

    const preview = dialogNamed(page, 'Preview')

    await expect(preview).toBeVisible()
    await preview.getByRole('textbox', { name: 'Email' }).fill('preview@example.com')
    await preview.getByRole('button', { name: 'Submit', exact: true }).click()
    await expectToast(page, 'Preview sent')

    // The parent is still there with what was typed.
    await expect(preview).toBeHidden()
    await expect(parent.getByRole('textbox', { name: 'Note' })).toHaveValue('Keep me')

    // `cancelParentActions()`: confirming closes the parent too.
    await parent.getByRole('button', { name: 'Publish', exact: true }).click()

    const confirm = dialogNamed(page, 'Publish')

    await expect(confirm).toBeVisible()
    await confirm
      .getByRole('button', { name: /Confirm|Publish/ })
      .last()
      .click()
    await expectToast(page, 'Published')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a modal action with a required field submits its data', async ({ page }) => {
    await page.getByRole('button', { name: 'Nested actions', exact: true }).click()

    const dialog = dialogNamed(page, 'Nested actions')

    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(dialog.getByRole('textbox', { name: 'Note' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await dialog.getByRole('textbox', { name: 'Note' }).fill('Looks good')
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()

    await expectToast(page, 'Review saved')
    await expect(toasts(page).filter({ hasText: 'Looks good' }).first()).toBeVisible()
    await expect(dialog).toBeHidden()
  })

  test('a failing action shows an error notification and keeps its modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Server error', exact: true }).click()

    const dialog = dialogNamed(page, 'Server error')

    await expect(dialog.getByRole('textbox', { name: 'Reason' })).toHaveValue('Just testing')
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()

    // Never a silent failure. With `app.debug` on (the playgrounds) Inertia's error modal
    // shows the exception; with it off the panel shows an error notification instead.
    await expect(
      toasts(page).or(page.locator('dialog iframe, [role="dialog"] iframe')).first(),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-slot="content"]')).toBeVisible()
  })

  test('password confirmation refuses a wrong password and accepts the right one', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Password confirmation', exact: true }).click()

    const dialog = dialogNamed(page, 'Password confirmation')
    const password = dialog.getByRole('textbox', { name: 'Current password' })

    await password.fill('not-the-password')
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    await expect(toasts(page).filter({ hasText: 'key rotated' })).toHaveCount(0)

    await password.fill(credentials.password)
    await dialog.getByRole('button', { name: 'Submit', exact: true }).click()
    await expectToast(page, 'Password confirmed, key rotated')
  })
})

test.describe('docs: record actions', () => {
  test('an undoable delete can be undone from its notification', async ({ page }) => {
    const title = uniqueTitle('Undo me')

    await createPost(page, title)

    const row = await findPost(page, title)

    await row.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(rowWith(page, title)).toHaveCount(0)

    const toast = toasts(page).filter({ hasText: 'Deleted' }).first()

    await expect(toast).toBeVisible()
    await toast.getByRole('button', { name: /Undo/ }).click()

    await expect(rowWith(page, title)).toHaveCount(1)

    await removePost(page, title)
  })

  test('a soft-deleted record is listed under its filter, restored and force-deleted', async ({
    page,
  }) => {
    const title = uniqueTitle('Trash me')

    await createPost(page, title)
    await removePost(page, title)

    // Deleted records: only trashed.
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('combobox', { name: 'Deleted records', exact: true }).click()
    await page.getByRole('option', { name: /Only deleted/ }).click()
    // Close the filters popover with its own button (Escape only closes the select).
    await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(page.getByRole('combobox', { name: 'Deleted records', exact: true })).toBeHidden()

    const trashed = rowWith(page, title)

    await expect(trashed).toHaveCount(1)
    await expect(trashed.getByRole('button', { name: 'Restore', exact: true })).toBeVisible()
    await expect(trashed.getByRole('button', { name: 'Force delete', exact: true })).toBeVisible()

    await trashed.getByRole('button', { name: 'Restore', exact: true }).click()

    await confirmIfAsked(page, /Restore/)
    await expectToast(page, 'Restored')
    // Restored: no longer among the trashed ones.
    await expect(rowWith(page, title)).toHaveCount(0)

    // Delete it again, then for good.
    await page.goto('/admin/posts')
    await removePost(page, title)
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page.getByRole('combobox', { name: 'Deleted records', exact: true }).click()
    await page.getByRole('option', { name: /Only deleted/ }).click()
    // Close the filters popover with its own button (Escape only closes the select).
    await page.getByRole('button', { name: /^Filters/ }).click()
    await expect(page.getByRole('combobox', { name: 'Deleted records', exact: true })).toBeHidden()

    const again = rowWith(page, title)

    await expect(again).toHaveCount(1)
    await again.getByRole('button', { name: 'Force delete', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Force delete|Delete/ })
      .last()
      .click()
    await expect(rowWith(page, title)).toHaveCount(0)
  })
})

test.describe('docs: resources', () => {
  test('list tabs filter the records and are kept in the URL', async ({ page }) => {
    await page.goto('/admin/posts')

    const tabs = page.getByRole('tablist', { name: 'posts' })

    await expect(tabs.getByRole('tab', { name: 'All', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await tabs.getByRole('tab', { name: /^Published/ }).click()
    await expect(page).toHaveURL(/[tT]ab=published/)
    await expect(tabs.getByRole('tab', { name: /^Published/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    const statuses = await page
      .locator('table tbody tr')
      .evaluateAll((rows) => rows.map((row) => row.textContent ?? ''))

    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses.every((text) => text.includes('Published') && !text.includes('Draft'))).toBe(
      true,
    )

    await tabs.getByRole('tab', { name: 'Drafts', exact: true }).click()
    await expect(page).toHaveURL(/[tT]ab=draft/)
    await expect(page.locator('table tbody tr').first()).toContainText('Draft')

    // A reload keeps the tab.
    await page.reload()
    await expect(tabs.getByRole('tab', { name: 'Drafts', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  test('view and edit pages link to each other through the record sub-navigation and breadcrumbs', async ({
    page,
  }) => {
    const title = uniqueTitle('Sub nav')

    await createPost(page, title)
    await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()

    const subNav = page.getByRole('navigation', { name: 'Page navigation', exact: true })

    await expect(subNav.getByRole('link', { name: 'View', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await subNav.getByRole('link', { name: 'Edit', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+\/edit$/)
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(title)
    await expect(
      page
        .getByRole('navigation', { name: 'Page navigation', exact: true })
        .getByRole('link', { name: 'Edit', exact: true }),
    ).toHaveAttribute('aria-current', 'page')

    // Breadcrumbs lead back to the list.
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })

    await breadcrumb.getByRole('link', { name: 'Posts', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/posts$/)

    await removePost(page, title)
  })

  test('relation managers and the nested resource create, list and delete related records', async ({
    page,
  }) => {
    const title = uniqueTitle('With comments')
    const author = uniqueTitle('Commenter')

    await createPost(page, title)

    const postUrl = page.url()

    // Two relation managers as tabs on the view page.
    await expect(page.getByRole('tab', { name: 'Comments', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.getByRole('tab', { name: 'Activity', exact: true }).click()
    await expect(page.getByRole('tab', { name: 'Activity', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await page.getByRole('tab', { name: 'Comments', exact: true }).click()

    // The manager's create link goes to the nested resource (`posts/{post}/comments/create`).
    await page
      .getByRole('tabpanel', { name: 'Comments' })
      .getByRole('link', { name: 'New comment', exact: true })
      .click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+\/comments\/create$/)

    const textboxes = page.locator('[data-slot="content"]').getByRole('textbox')

    await textboxes.first().fill(author)

    if ((await textboxes.count()) > 1)
      await textboxes.nth(1).fill('A comment written by the docs test.')

    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, 'Created')

    // Listed under the parent, in the nested list and in the relation manager.
    await page.goto(`${postUrl}/comments`)
    await expect(page.getByRole('heading', { level: 1, name: 'Comments' })).toBeVisible()
    await expect(rowWith(page, author)).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Breadcrumb', exact: true })).toContainText(
      title,
    )

    await page.goto(postUrl)
    await expect(
      page.getByRole('tabpanel', { name: 'Comments' }).getByRole('row').filter({ hasText: author }),
    ).toHaveCount(1)

    // Another post does not list it.
    await page.goto('/admin/posts/1/comments')
    await expect(rowWith(page, author)).toHaveCount(0)

    // Delete it from the nested list.
    await page.goto(`${postUrl}/comments`)
    await rowWith(page, author).getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(rowWith(page, author)).toHaveCount(0)

    await removePost(page, title)
  })

  test('a cluster groups its pages under one sub-navigation', async ({ page }) => {
    await page.goto('/admin/showcase/actions')

    const subNav = page.getByRole('navigation', { name: 'Page navigation', exact: true })

    await expect(subNav.getByRole('link', { name: 'Actions', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await subNav.getByRole('link', { name: 'Fields', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/showcase\/fields$/)
    await expect(
      page
        .getByRole('navigation', { name: 'Page navigation', exact: true })
        .getByRole('link', { name: 'Fields', exact: true }),
    ).toHaveAttribute('aria-current', 'page')

    // The cluster's own navigation item stays the active one in the sidebar.
    await expect(
      page
        .getByRole('navigation', { name: 'Sidebar', exact: true })
        .getByRole('link', { name: 'Showcase', exact: true }),
    ).toHaveAttribute('data-active', 'true')
  })
})

test.describe('docs: panels', () => {
  test('sidebar groups collapse, the current page is marked and deferred badges arrive', async ({
    page,
  }) => {
    await page.goto('/admin/posts')

    const nav = page.getByRole('navigation', { name: 'Sidebar', exact: true })
    const group = nav.getByRole('button', { name: 'Blog', exact: true })

    await expect(nav.getByRole('link', { name: 'Posts', exact: true })).toHaveAttribute(
      'data-active',
      'true',
    )
    await expect(nav.getByRole('link', { name: 'Categories', exact: true })).not.toHaveAttribute(
      'data-active',
      'true',
    )

    await expect(group).toHaveAttribute('aria-expanded', 'true')
    await group.click()
    await expect(group).toHaveAttribute('aria-expanded', 'false')
    await expect(nav.getByRole('link', { name: 'Categories', exact: true })).toBeHidden()
    await group.click()
    await expect(group).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link', { name: 'Categories', exact: true })).toBeVisible()

    // `deferNavigationBadges()`: the count shows up after the page.
    await expect(nav.getByRole('link', { name: /Activity log/ })).toContainText(/\d/)

    // The sidebar itself collapses and comes back.
    const html = page.locator('[data-slot="sidebar"]').first()

    await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).first().click()
    await expect(html).toHaveAttribute('data-state', 'collapsed')
    await page.getByRole('button', { name: 'Toggle sidebar', exact: true }).first().click()
    await expect(html).toHaveAttribute('data-state', 'expanded')
  })

  test('the top navigation layout lists groups as menus', async ({ page }) => {
    await page.goto('/admin/showcase/cards')
    await expect(page.locator('html')).toHaveAttribute('data-layout', 'topbar')

    const nav = page.getByRole('navigation', { name: 'Navigation', exact: true })

    await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible()
    await nav.getByRole('button', { name: 'Blog', exact: true }).click()

    const posts = page.getByRole('menu').getByRole('menuitem', { name: 'Posts', exact: true })

    await expect(posts).toBeVisible()
    await posts.click()
    await expect(page).toHaveURL(/\/admin\/posts$/)
    // That page uses the sidebar layout again.
    await expect(page.locator('html')).toHaveAttribute('data-layout', 'sidebar')
  })

  test('the command palette finds records, pages and commands', async ({ page }) => {
    const title = uniqueTitle('Findable')

    await createPost(page, title)
    await page.goto('/admin')

    await page
      .getByRole('button', { name: /Search/ })
      .first()
      .click()

    const palette = dialogNamed(page, 'Command palette')

    await expect(palette).toBeVisible()

    // A command registered with `->commands([...])`.
    await paletteInput(palette).fill('Write a post')
    await expect(palette.getByRole('option', { name: /Write a post/ })).toBeVisible()

    // Global search over the resource's searchable attributes.
    await paletteInput(palette).fill(title)

    const result = palette.getByRole('option', { name: new RegExp(title) }).first()

    await expect(result).toBeVisible()
    await result.click()
    await expect(page).toHaveURL(/\/admin\/posts\/\d+/)
    await expect(page.locator('[data-slot="content"]')).toContainText(title)

    // The keyboard shortcut opens it too, and Escape closes it.
    await page.goto('/admin')
    await page.locator('body').press('ControlOrMeta+k')
    await expect(dialogNamed(page, 'Command palette')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialogNamed(page, 'Command palette')).toBeHidden()

    await removePost(page, title)
  })

  test('the user menu leads to the profile page', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: /Alfa Admin/ }).click()

    const menu = page.getByRole('menu')

    await expect(menu.getByRole('menuitem', { name: 'Sign out', exact: true })).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Profile', exact: true }).click()

    await expect(page).toHaveURL(/\/admin\/profile$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Alfa Admin')
  })

  test('database notifications open from the bell with their actions', async ({ page }) => {
    await page.goto('/admin')

    const bell = page.getByRole('button', { name: 'Notifications', exact: true })

    // The unread count.
    await expect(bell).toContainText(/\d/)
    await bell.click()

    // The panel: a dialog in React and Vue, a popover without a role in Svelte.
    const panel = page
      .locator('[data-slot="popover-content"], [role="dialog"]')
      .filter({ has: page.getByRole('button', { name: 'Mark all as read' }) })
      .first()

    await expect(panel).toBeVisible()
    await expect(
      panel.getByRole('button', { name: 'Clear notifications', exact: true }),
    ).toBeVisible()
    await expect(panel.getByRole('listitem').first()).toBeVisible()
    // Unread ones can be marked read one by one; notification actions are buttons.
    await expect(
      panel.getByRole('button', { name: 'Mark as read', exact: true }).first(),
    ).toBeVisible()
    await expect(
      panel
        .getByRole('listitem')
        .filter({ hasText: 'needs your approval' })
        .first()
        .getByRole('button', { name: 'Open', exact: true }),
    ).toBeVisible()

    // Nothing is clicked: the seeded notifications are shared by every test run.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  })

  test('impersonating a user shows a banner, limits what they see and can be left', async ({
    page,
  }) => {
    // Impersonating and leaving starts new sessions: the test signs in for itself, so the
    // session the other specs share stays as it is.
    await page.context().clearCookies()
    await page.goto('/admin/login')
    await page.getByLabel(/email/i).fill(credentials.email)
    await page.getByLabel(/^password/i).fill(credentials.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/admin(\/)?$/)

    await page.goto('/admin/showcase/users')

    // Any user who can be impersonated: seeded names differ per playground.
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: 'Impersonate', exact: true }) })
      .first()

    await expect(row).toBeVisible()

    const name = (await row.getByRole('cell').first().innerText()).trim().split('\n')[0] ?? ''

    // The admin cannot impersonate themselves.
    await expect(
      rowWith(page, 'admin@example.com').getByRole('button', { name: 'Impersonate' }),
    ).toHaveCount(0)

    await row.getByRole('button', { name: 'Impersonate', exact: true }).click()

    await page
      .getByRole('dialog')
      .filter({ hasText: /Sign in as/ })
      .getByRole('button', { name: 'Impersonate', exact: true })
      .click()

    const leave = page.getByRole('button', { name: /Leave|Stop impersonat/i }).first()

    try {
      await expect(leave).toBeVisible()
      if (name !== '') await expect(page.locator('body')).toContainText(name)

      // Pages behind `authorize(super_admin)` are gone from that user's navigation.
      const nav = page.getByRole('navigation', { name: 'Sidebar', exact: true })

      await expect(nav.getByRole('link', { name: 'Operations', exact: true })).toHaveCount(0)
      await expect(nav.getByRole('link', { name: 'Webhooks', exact: true })).toHaveCount(0)
    } finally {
      await leave.click()
      await expect(page.getByRole('button', { name: /Alfa Admin/ })).toBeVisible()
    }
  })
})

test.describe('docs: tenancy', () => {
  test('the panel root opens a tenant, the tenant menu switches and scopes the pages', async ({
    page,
  }) => {
    await page.goto('/team')
    await expect(page).toHaveURL(/\/team\/[a-z0-9-]+$/)

    const start = new URL(page.url()).pathname

    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()

    const switcher = page
      .locator('[data-sidebar="header"], [data-slot="sidebar-header"]')
      .getByRole('button')
      .first()

    await switcher.click()

    const menu = page.getByRole('menu')

    await expect(menu.getByRole('menuitem', { name: /Playground HQ/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Alfa's Team/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Create team', exact: true })).toBeVisible()

    const other = start.includes('playground-hq') ? /Alfa's Team/ : /Playground HQ/

    await menu.getByRole('menuitem', { name: other }).click()
    await expect(page).not.toHaveURL(new RegExp(`${start}$`))
    await expect(page).toHaveURL(/\/team\/[a-z0-9-]+/)

    // The tenant's own pages from the menu.
    await page
      .locator('[data-sidebar="header"], [data-slot="sidebar-header"]')
      .getByRole('button')
      .first()
      .click()
    await page.getByRole('menu').getByRole('menuitem', { name: 'Members', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/[a-z0-9-]+\/team\/members$/)
    await expect(page.locator('[data-slot="content"]')).toContainText('Alfa Admin')

    // Back to where the test started.
    await page.goto(start)
    await expect(page).toHaveURL(new RegExp(`${start}$`))

    // A tenant the user does not belong to is not found.
    const missing = await page.goto('/team/no-such-team-here')

    expect(missing?.status()).toBe(404)
  })
})

test.describe('docs: widgets', () => {
  test('the dashboard shows stats, a chart and a table widget, and can be customised', async ({
    page,
  }) => {
    await page.goto('/admin')

    const content = page.locator('[data-slot="content"]')

    // Stats overview with descriptions.
    await expect(content.getByText('Revenue', { exact: true })).toBeVisible()
    await expect(content.getByText('$48,210')).toBeVisible()
    await expect(content.getByText('+12% this month')).toBeVisible()

    // A stat that is a link (the health plugin's widget).
    await expect(content.getByRole('link', { name: /Application health/ })).toHaveAttribute(
      'href',
      /\/admin\/health$/,
    )

    // A chart with its accessible table.
    await expect(content.locator('canvas[aria-label="Receivables aging"]')).toBeVisible()
    await expect(content.getByRole('columnheader', { name: 'Not yet due' })).toBeAttached()

    // `customizableDashboards()`: edit mode lists every widget, Cancel leaves it as it was.
    await content.getByRole('button', { name: 'Edit dashboard', exact: true }).click()
    await expect(content.getByRole('group', { name: 'Blog Stats', exact: true })).toBeVisible()
    await expect(
      content.getByRole('combobox', { name: 'Size of Blog Stats', exact: true }),
    ).toBeVisible()
    await expect(
      content.getByRole('button', { name: 'Hide Blog Stats', exact: true }),
    ).toBeVisible()

    await content.getByRole('button', { name: 'Hide Blog Stats', exact: true }).click()
    await expect(content.getByRole('region', { name: 'Widget library' })).toContainText(
      'Blog Stats',
    )

    await content.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(content.getByRole('button', { name: 'Edit dashboard', exact: true })).toBeVisible()
    await expect(content.getByText('$48,210')).toBeVisible()
  })
})

test.describe('docs: portal panel', () => {
  test('guests of another panel are sent to its own sign-in page', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    })
    const page = await context.newPage()

    await page.goto('/portal/orders')
    await expect(page).toHaveURL(/\/portal\/login$/)
    await expect(page.getByRole('textbox', { name: /Email/ })).toBeVisible()
    await context.close()
  })
})
