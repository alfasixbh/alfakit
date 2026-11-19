import { type Page } from '@playwright/test'
import { expectToast, rowWith, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven flows of the plugins (docs/content/plugins), on the pages the playground
 * registers for them. Each test follows the main flow its docs page describes, creates what
 * it needs under a unique name and removes or restores what it changed.
 */

/** Opens a panel page and waits for its deferred parts. */
async function open(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await expect(page.locator('[data-slot="content"]').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
}

/** The open modal. */
const dialog = (page: Page) => page.getByRole('dialog').last()

/** Confirms the open confirmation modal with its primary button. */
async function confirm(page: Page, name: string | RegExp): Promise<void> {
  await dialog(page).getByRole('button', { name }).last().click()
}

/** Confirms the modal an action may ask with (some run at once), with its last button. */
async function confirmIfAsked(page: Page): Promise<void> {
  const modal = page.getByRole('dialog').or(page.getByRole('alertdialog')).last()

  try {
    await modal.waitFor({ state: 'visible', timeout: 2500 })
  } catch {
    return
  }

  await modal
    .getByRole('button')
    .filter({ hasNotText: /^\s*(Cancel|Close)\s*$/ })
    .last()
    .click()
  await modal.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined)
}

/** Deletes the table row with `text` (its own Delete button, or the one in "Actions"). */
async function deleteRow(page: Page, text: string, expectedLeft = 0): Promise<void> {
  const before = await rowWith(page, text).count()
  const row = rowWith(page, text).first()
  const direct = row.getByRole('button', { name: 'Delete', exact: true })

  if (await direct.count()) {
    await direct.click()
  } else {
    await row.getByRole('button', { name: /^(Actions|More actions)$/ }).click()
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
  }

  await confirmIfAsked(page)
  await expect(rowWith(page, text)).toHaveCount(expectedLeft === 0 ? 0 : before - 1)
}

/** Removes what an interrupted earlier run left in a list. */
async function removeLeftovers(page: Page, list: string, text: string): Promise<void> {
  await open(page, list)

  for (let left = await rowWith(page, text).count(); left > 0; left--) {
    await deleteRow(page, text, left - 1)
  }
}

test.describe('plugins (docs)', () => {
  test.describe.configure({ timeout: 90_000 })

  // ---------------------------------------------------------------- file-manager.md

  test('file manager: creates, renames and deletes a folder', async ({ page }) => {
    const name = `e2e-${Date.now().toString(36)}`

    await open(page, '/admin/files')
    await page.getByRole('button', { name: 'New folder', exact: true }).click()
    await dialog(page).getByRole('textbox', { name: 'Folder name' }).fill(name)
    await dialog(page).getByRole('button', { name: 'Create', exact: true }).click()

    const list = page.getByRole('listbox', { name: 'File manager' })
    const folder = list.getByRole('option', { name: new RegExp(`^${name}`) })
    await expect(folder).toBeVisible()

    // F2 renames the selected item (the keyboard help on the page says so).
    await folder.click()
    await page.keyboard.press('F2')
    const input = dialog(page).getByRole('textbox').first()
    await expect(input).toBeVisible()
    await input.fill(`${name}-renamed`)
    await input.press('Enter')

    const renamed = list.getByRole('option', { name: new RegExp(`^${name}-renamed`) })
    await expect(renamed).toBeVisible()

    await renamed.click()
    await page.keyboard.press('Delete')
    await dialog(page)
      .getByRole('button', { name: /delete|trash|move/i })
      .last()
      .click()
    await expect(renamed).toHaveCount(0)
  })

  // ---------------------------------------------------------------- kanban.md

  test('kanban: moves a card to another column with the keyboard and keeps it there', async ({
    page,
  }) => {
    await open(page, '/admin/posts/board')

    const draft = page.getByRole('list', { name: 'Draft', exact: true })
    const review = page.getByRole('list', { name: 'In review', exact: true })
    const card = draft.getByRole('listitem').first().getByRole('button').first()
    const title = ((await card.innerText()).split('\n')[0] ?? '').trim()

    expect(title).not.toBe('')

    // "Press Space to pick up a card … arrow keys to move it, Space to drop it."
    await card.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')

    await expect(review.getByRole('button', { name: title }).first()).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    const moved = page
      .getByRole('list', { name: 'In review', exact: true })
      .getByRole('button', { name: title })
      .first()
    await expect(moved).toBeVisible()

    // Back where it was.
    await moved.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Space')
    await expect(
      page
        .getByRole('list', { name: 'Draft', exact: true })
        .getByRole('button', { name: title })
        .first(),
    ).toBeVisible()
  })

  // ---------------------------------------------------------------- tree.md

  test('tree: moves a node among its siblings, saves the order and puts it back', async ({
    page,
  }) => {
    const button = (direction: 'up' | 'down') =>
      page
        .getByRole('tree', { name: 'Tree' })
        .getByRole('button', { name: `Move Backend ${direction}`, exact: true })
    const save = page.getByRole('button', { name: 'Save order', exact: true })

    await open(page, '/admin/categories/tree')
    await expect(button('up')).toBeVisible()

    // Backend is the first or the last of two siblings: move it the way that is open.
    const first: 'up' | 'down' = (await button('down').isEnabled()) ? 'down' : 'up'
    const back: 'up' | 'down' = first === 'down' ? 'up' : 'down'

    // "Users rearrange the tree in the browser, then click Save order."
    await button(first).click()
    await expect(button(first)).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Discard changes', exact: true })).toBeVisible()
    await save.click()
    await expectToast(page, 'Order saved')

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(button(first)).toBeDisabled()
    await expect(button(back)).toBeEnabled()

    await button(back).click()
    await expect(button(back)).toBeDisabled()
    await save.click()
    await expectToast(page, 'Order saved')
  })

  // ---------------------------------------------------------------- calendar.md

  test('calendar: creates an event, shows it in the month and deletes it', async ({ page }) => {
    const title = uniqueTitle('E2E event')

    await open(page, '/admin/calendar')
    await expect(page.getByRole('grid')).toBeVisible()

    await page.getByRole('button', { name: 'New calendar event', exact: true }).click()
    await dialog(page).getByRole('textbox', { name: 'Title' }).fill(title)

    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    await dialog(page).getByRole('textbox', { name: 'Starts at' }).fill(`${day}T10:00`)
    await dialog(page).getByRole('textbox', { name: 'Ends at' }).fill(`${day}T11:00`)
    await dialog(page).getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    const event = page.getByRole('region', { name: 'Events and publications' }).getByText(title)
    await expect(event.first()).toBeVisible()

    // Clicking an event opens it; it can be deleted from there.
    await event.first().click()
    await expect(dialog(page)).toBeVisible()
    await dialog(page)
      .getByRole('button', { name: /delete/i })
      .first()
      .click()
    await confirm(page, /delete|confirm/i)
    await expect(
      page.getByRole('region', { name: 'Events and publications' }).getByText(title),
    ).toHaveCount(0)
  })

  // ---------------------------------------------------------------- feature-flags.md

  test('feature flags: turns a flag off for everyone, on again and back to its definition', async ({
    page,
  }) => {
    await open(page, '/admin/feature-flags')
    await rowWith(page, 'new-post-editor').getByRole('link', { name: 'Manage' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'new-post-editor' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    const status = page.getByRole('group', { name: 'Status' })

    await page.getByRole('button', { name: 'Deactivate for everyone', exact: true }).click()
    await confirmIfAsked(page)
    await expect(status).toContainText('Off for everyone')

    await page.getByRole('button', { name: 'Activate for everyone', exact: true }).click()
    await confirmIfAsked(page)
    await expect(status).toContainText('On for everyone')

    // Back to what the feature class decides (the seeded state).
    await page.getByRole('button', { name: 'More actions', exact: true }).first().click()
    await page.getByRole('menuitem', { name: 'Back to the definition', exact: true }).click()
    await confirmIfAsked(page)
    await expect(status).toContainText('Definition')
  })

  // ---------------------------------------------------------------- translation-manager.md

  test('translation manager: edits a text in the grid and restores it', async ({ page }) => {
    const cell = () => page.getByLabel('Edit models.tag.singular in French', { exact: true })
    const find = async () => {
      await page.getByRole('searchbox', { name: 'Search translations' }).fill('models.tag.singular')
      await expect(cell()).toBeVisible()
    }
    const write = async (text: string) => {
      // A click opens the cell's editor (as Enter does from the keyboard); Enter saves.
      await cell().click()
      await expect(page.locator('textarea:focus')).toBeVisible()
      await page.keyboard.press('ControlOrMeta+a')
      await page.keyboard.type(text)
      await page.keyboard.press('Enter')
    }

    await open(page, '/admin/translations')
    await find()

    const original = (await cell().innerText()).trim()
    const changed = `${original} e2e`

    expect(original).not.toBe('')

    await write(changed)
    await expect(cell()).toContainText(changed)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await find()
    await expect(cell()).toContainText(changed)

    await write(original)
    await expect(cell()).not.toContainText('e2e')
  })

  // ---------------------------------------------------------------- shield.md

  test('shield: creates a role with permissions, edits and deletes it', async ({ page }) => {
    const name = `e2e_${Date.now().toString(36)}`

    await open(page, '/admin/shield/roles/create')
    await page.getByRole('textbox', { name: 'Name' }).fill(name)
    await page.getByRole('checkbox', { name: 'View Any', exact: true }).first().check()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await open(page, '/admin/shield/roles')
    await page.getByRole('searchbox', { name: 'Search' }).fill(name)
    const row = rowWith(page, name)
    await expect(row).toBeVisible()
    await expect(row).toContainText('1')

    await row.getByRole('link', { name: 'Edit' }).click()
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('checkbox', { name: 'View Any', exact: true }).first(),
    ).toBeChecked()
    await page.getByRole('checkbox', { name: 'View', exact: true }).first().check()
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, /saved/i)

    await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
    await confirm(page, /delete|confirm/i)
    await expect(page).toHaveURL(/\/admin\/shield\/roles$/)
    await page.getByRole('searchbox', { name: 'Search' }).fill(name)
    await expect(rowWith(page, name)).toHaveCount(0)
  })

  // ---------------------------------------------------------------- settings.md + activity-log.md

  test('settings: saves a value; the activity log records the change', async ({ page }) => {
    await open(page, '/admin/general-settings')

    const tagline = page.getByRole('textbox', { name: 'Tagline' })
    const original = await tagline.inputValue()
    const changed = `${original} ${Date.now().toString(36)}`

    await tagline.fill(changed)
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, /saved/i)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('textbox', { name: 'Tagline' })).toHaveValue(changed)

    await page.getByRole('textbox', { name: 'Tagline' }).fill(original)
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, /saved/i)

    // The activity log page lists what happened, newest first.
    await open(page, '/admin/activity-log')
    await expect(page.getByRole('table').getByRole('row').nth(1)).toBeVisible()
  })

  // ---------------------------------------------------------------- mail-templates.md

  test('mail templates: customises an email and removes the customisation', async ({ page }) => {
    const email = 'Sign-in code'
    const subject = uniqueTitle('E2E subject')

    // One customisation per email and language: start without one.
    await open(page, '/admin/mail-templates')
    while ((await rowWith(page, email).count()) > 0) await deleteRow(page, email, 1)

    await open(page, '/admin/mail-templates/create')
    await page.getByRole('combobox', { name: 'Email', exact: true }).click()
    await page
      .getByRole('listbox')
      .getByRole('option', { name: `Authentication · ${email}`, exact: true })
      .click()
    await page.getByRole('textbox', { name: 'Subject' }).fill(subject)
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await open(page, '/admin/mail-templates')
    await expect(rowWith(page, email)).toHaveCount(1)

    // The saved subject is on its edit page.
    await rowWith(page, email).getByRole('link').first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('textbox', { name: 'Subject' })).toHaveValue(subject)

    await open(page, '/admin/mail-templates')
    await deleteRow(page, email)
  })

  // ---------------------------------------------------------------- api.md

  test('api: creates a token, shows it once and revokes it', async ({ page }) => {
    const name = uniqueTitle('E2E token')

    await open(page, '/admin/api-tokens')
    await page.getByRole('button', { name: 'Create token', exact: true }).click()
    await dialog(page).getByRole('textbox', { name: 'Name' }).fill(name)
    await dialog(page).getByRole('checkbox', { name: 'Read', exact: true }).check()
    await dialog(page).getByRole('button', { name: 'Create token', exact: true }).click()

    // The plain-text token is shown once, right after it is created.
    await expect(page.getByText(/\d+\|[A-Za-z0-9]{20,}/).first()).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    const row = rowWith(page, name)
    await expect(row).toBeVisible()
    await expect(row).toContainText('posts:read')

    await row.getByRole('button', { name: 'Revoke', exact: true }).click()
    await confirm(page, /revoke|confirm/i)
    await expect(rowWith(page, name)).toHaveCount(0)
  })

  // ---------------------------------------------------------------- webhooks.md

  test('webhooks: creates an endpoint for one event and deletes it', async ({ page }) => {
    const url = `https://example.com/hooks/${Date.now().toString(36)}`

    await removeLeftovers(page, '/admin/webhooks', 'example.com/hooks/')

    await open(page, '/admin/webhooks/create')
    await page.getByRole('textbox', { name: 'URL', exact: true }).fill(url)
    await page.getByRole('textbox', { name: 'Description' }).fill('Created by the e2e suite')
    await page.getByRole('checkbox', { name: 'Post published', exact: true }).check()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await open(page, '/admin/webhooks')
    await expect(rowWith(page, url)).toContainText('1 event')

    await deleteRow(page, url)
  })

  // ---------------------------------------------------------------- workflows.md

  test('workflows: a transition that needs approval, and the approvals inbox', async ({ page }) => {
    const title = uniqueTitle('E2E expense')

    await open(page, '/admin/expenses/create')
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('textbox', { name: 'Amount' }).fill('42')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await open(page, '/admin/expenses')
    await page.getByRole('link', { name: title }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('group', { name: 'State' })).toContainText('Draft')

    // The transition asks for approval with an optional comment. In the playground the
    // signed-in admin is the only approver and nobody approves their own request, so the
    // documented `no_approvers` refusal is what comes back, and the record stays a draft.
    await page.getByRole('button', { name: 'Submit for approval', exact: true }).click()
    await expect(dialog(page)).toContainText('This needs approval (Manager approval)')
    await dialog(page).getByRole('textbox', { name: 'Comment' }).fill('From the e2e suite')
    await dialog(page).getByRole('button', { name: 'Send for approval', exact: true }).click()
    await expectToast(page, 'Nobody can approve the step')
    await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('group', { name: 'State' })).toContainText('Draft')

    // The inbox lists the requests waiting for this user, each with its three decisions.
    await open(page, '/admin/approvals')
    const pending = rowWith(page, 'Train to the client workshop')
    await expect(pending).toContainText('Manager approval')
    await expect(pending.getByRole('button', { name: 'Reject', exact: true })).toBeVisible()
    await expect(pending.getByRole('button', { name: 'Delegate', exact: true })).toBeVisible()

    // Approving asks first; cancelling leaves the request pending.
    await pending.getByRole('button', { name: 'Approve', exact: true }).click()
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(rowWith(page, 'Train to the client workshop')).toBeVisible()
  })

  // ---------------------------------------------------------------- helpdesk.md

  test('helpdesk: opens a ticket for a requester, replies and solves it', async ({ page }) => {
    const subject = uniqueTitle('E2E ticket')

    await open(page, '/admin/helpdesk/tickets/create')
    await page.getByRole('textbox', { name: 'Subject' }).fill(subject)
    await page.locator('[contenteditable="true"]').first().click()
    await page.keyboard.type('The printer is on fire.')
    await page.getByRole('textbox', { name: 'Email address' }).fill('requester-e2e@example.com')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Requester E2E')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await open(page, '/admin/helpdesk/tickets')
    await rowWith(page, subject).getByRole('link', { name: 'View' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(subject)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('The printer is on fire.').first()).toBeVisible()

    await page.getByRole('button', { name: 'Reply', exact: true }).click()
    await dialog(page).locator('[contenteditable="true"]').first().click()
    await page.keyboard.type('Please stand back, help is coming.')
    await dialog(page).getByRole('button', { name: 'Send', exact: true }).click()
    await expect(page.getByText('Please stand back, help is coming.').first()).toBeVisible()

    await page.getByRole('button', { name: 'Solve', exact: true }).click()
    await confirmIfAsked(page)
    await expect(page.getByRole('button', { name: 'Solve', exact: true })).toHaveCount(0)

    // The inbox finds it under "Solved".
    await open(page, '/admin/helpdesk/inbox')
    await page
      .getByRole('navigation', { name: 'Views' })
      .getByRole('button', { name: /^Solved/ })
      .click()
    await expect(
      page.getByRole('region', { name: 'Tickets' }).getByText(subject).first(),
    ).toBeVisible()
  })

  // ---------------------------------------------------------------- analytics.md

  test('analytics: shows the dashboard and switches the chart and the period', async ({ page }) => {
    await open(page, '/admin/analytics')

    await expect(page.getByRole('img', { name: 'Visitors over time' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Chart filter' }).selectOption('Page views')
    // The chart's data table (its accessible alternative) follows the choice.
    await expect(page.getByRole('table', { name: 'Page views' })).toBeAttached()

    await page.getByRole('button', { name: 'Last 30 days', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Last 7 days', exact: true }).click()
    await expect(page).toHaveURL(/period=7d/)
    await expect(page.getByRole('button', { name: 'Last 7 days', exact: true })).toBeVisible()
  })

  // ---------------------------------------------------------------- invoices.md

  test('invoices: a line keeps its price when the invoice is edited', async ({ page }) => {
    const customer = uniqueTitle('E2E customer')

    await open(page, '/admin/invoices/create')
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(customer)
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('billing-e2e@example.com')
    await page.getByRole('textbox', { name: 'Description' }).fill('Consulting')
    await page.getByRole('spinbutton', { name: 'Quantity' }).fill('2')
    await page.getByRole('textbox', { name: 'Unit price' }).fill('50.00')
    await page.getByRole('textbox', { name: 'Unit price' }).blur()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    // 2 × 50.00 plus the default VAT of 10%.
    await open(page, '/admin/invoices')
    await page.getByRole('searchbox', { name: 'Search' }).fill(customer)
    const row = rowWith(page, customer)
    await expect(row).toContainText('$110.00')

    // Edit something else: the line is shown in major units and saved as it was.
    await row.getByRole('link', { name: 'Edit' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('textbox', { name: 'Unit price' })).toHaveValue('50.00')
    await page.getByRole('textbox', { name: 'Notes' }).fill('Edited by the e2e suite')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, /saved/i)

    await open(page, '/admin/invoices')
    await page.getByRole('searchbox', { name: 'Search' }).fill(customer)
    await expect(rowWith(page, customer)).toContainText('$110.00')

    // Sending gives the draft its number and the status "Sent".
    await rowWith(page, customer).getByRole('link', { name: 'View' }).click()
    await page.waitForLoadState('networkidle')
    await page
      .getByRole('button', { name: /^(Mark as sent|Send)/ })
      .first()
      .click()
    await confirmIfAsked(page)
    await expect(page.locator('[data-slot="content"]').first()).toContainText('Sent')
  })

  // ---------------------------------------------------------------- forms.md

  test('forms: builds a form with two questions and submits it on its public page', async ({
    page,
  }) => {
    const title = uniqueTitle('E2E form')

    await removeLeftovers(page, '/admin/forms', 'E2E form')

    await open(page, '/admin/forms/create')
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('button', { name: 'Short text', exact: true }).click()
    await page.getByRole('textbox', { name: 'Question' }).first().fill('Your name')
    await page.getByRole('button', { name: 'Add a block', exact: true }).click()
    await page.getByRole('button', { name: 'Email', exact: true }).last().click()
    await page.getByRole('textbox', { name: 'Question' }).last().fill('Your email')
    // A form takes answers once it is published (Settings tab).
    await page.getByRole('tab', { name: 'Settings', exact: true }).click()
    await page.getByRole('switch', { name: 'Published', exact: true }).check()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await open(page, '/admin/forms')
    await page.getByRole('searchbox', { name: 'Search' }).fill(title)
    const row = rowWith(page, title)
    await expect(row).toBeVisible()

    // The row links to the public page of an open form.
    const href = await row.getByRole('link', { name: /^Open/ }).getAttribute('href')

    expect(href, 'an open form has a public link').toBeTruthy()
    await page.goto(href as string)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('textbox', { name: 'Your name' }).fill('Ada')
    await page.getByRole('textbox', { name: 'Your email' }).fill('ada-e2e@example.com')
    // The time check: a form sent less than two seconds after it was shown counts as spam.
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: /submit|send/i }).click()
    await expect(page.getByText(/thank/i).first()).toBeVisible()

    await open(page, '/admin/forms')
    await page.getByRole('searchbox', { name: 'Search' }).fill(title)
    await expect(rowWith(page, title)).toContainText('100%')

    await deleteRow(page, title)
  })

  // ---------------------------------------------------------------- cms.md

  test('cms: creates a page with a text block, publishes it and opens it on the site', async ({
    page,
  }) => {
    const title = uniqueTitle('E2E page')
    const slug = `e2e-${Date.now().toString(36)}`

    await removeLeftovers(page, '/admin/cms/pages', 'E2E page')

    await open(page, '/admin/cms/pages/create')
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('textbox', { name: 'Web address' }).fill(slug)
    await page.getByRole('button', { name: /^Rich text/ }).click()
    await page.getByRole('textbox', { name: 'Content' }).click()
    await page.keyboard.type('Hello from the e2e suite.')
    await page.getByRole('combobox', { name: 'Status', exact: true }).click()
    await page.getByRole('option', { name: 'Published' }).first().click()
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, /created/i)

    await page.goto(`/site/${slug}`)
    await expect(page.getByText('Hello from the e2e suite.')).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(title))

    // Tidy up.
    await open(page, '/admin/cms/pages')
    await page.getByRole('searchbox', { name: 'Search' }).fill(title)
    await expect(rowWith(page, title)).toBeVisible()
    await deleteRow(page, title)
  })

  // ---------------------------------------------------------------- ops, health, backup, ai, mail preview, site design

  for (const [path, text] of [
    ['/admin/ops', /queue|jobs|failed/i],
    // A freshly seeded database has no results yet, and the page says so.
    ['/admin/health', /database|cache|queue|ok|healthy|not run yet/i],
    ['/admin/backups', /backup/i],
    ['/admin/ai-usage', /tokens|requests|cost|usage/i],
    ['/admin/mail-preview', /mail|email/i],
    ['/admin/site-design', /colour|color|font|logo/i],
  ] as const) {
    test(`monitoring and design pages: ${path} shows its content`, async ({ page }) => {
      await open(page, path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('[data-slot="content"]').first()).toContainText(text)
    })
  }
})
