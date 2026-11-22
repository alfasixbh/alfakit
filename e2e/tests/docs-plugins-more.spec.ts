import { type Page } from '@playwright/test'
import { createPost, expectToast, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven flows of the plugins that live inside other pages rather than on a page of
 * their own: comments, tags and the media library on a post, teams on the team panel,
 * billing plans, and the AI copilot and writing assistant with the plugin's sample answers
 * (`demoResponses()`, no provider key). Each test makes what it needs and removes it.
 */

const dialog = (page: Page, name?: string | RegExp) =>
  name ? page.getByRole('dialog', { name }) : page.getByRole('dialog').last()

/** The form field (label, control, messages) whose label is `label`. */
const field = (page: Page, label: string) =>
  page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) })
    .first()

/** Creates a post and answers its edit and view paths. */
async function newPost(
  page: Page,
  prefix: string,
): Promise<{ title: string; view: string; edit: string }> {
  const title = uniqueTitle(prefix)

  await createPost(page, title)
  await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)

  const view = new URL(page.url()).pathname

  return { title, view, edit: `${view}/edit` }
}

async function deletePost(page: Page, edit: string): Promise<void> {
  await page.goto(edit)
  await page
    .locator('[data-slot="page-header"]')
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/posts(\?.*)?$/)
}

test.describe('comments (docs: plugins/comments)', () => {
  test('a comment is added, reacted to, edited and deleted on a record', async ({ page }) => {
    const post = await newPost(page, 'Commented')
    const thread = page.locator('[data-slot="content"]')

    await expect(thread.getByText('No comments yet.')).toBeVisible()

    // Add.
    await thread.getByRole('button', { name: 'Add comment', exact: true }).first().click()
    await dialog(page, 'Add comment').getByRole('textbox').click()
    await page.keyboard.type('Looks good to me')
    await dialog(page, 'Add comment').getByRole('button', { name: 'Comment', exact: true }).click()
    await expect(thread.getByText('Looks good to me')).toBeVisible()
    await expect(thread.getByText('No comments yet.')).toHaveCount(0)

    // React: the reaction shows with its count, and survives a reload.
    await thread.getByRole('button', { name: 'Add reaction', exact: true }).first().click()

    await page.getByRole('menuitem', { name: '👍', exact: true }).click()
    await expect(thread.getByRole('button', { name: /1/ }).first()).toBeVisible()
    await page.reload()
    await expect(thread.getByText('Looks good to me')).toBeVisible()
    await expect(thread.getByRole('button', { name: /1/ }).first()).toBeVisible()

    // Edit: the new text replaces the old one and is marked as edited. A comment only counts
    // as edited when it changes more than a second after it was posted.
    await page.waitForTimeout(2200)
    await thread.getByRole('button', { name: 'Comment actions', exact: true }).first().click()
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()

    const editor = dialog(page, 'Edit comment').getByRole('textbox')

    await editor.click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('Looks good after the fix')
    await dialog(page, 'Edit comment').getByRole('button', { name: 'Save', exact: true }).click()
    await expect(thread.getByText('Looks good after the fix')).toBeVisible()
    await expect(thread.getByText(/edited/i).first()).toBeVisible()

    // Delete.
    await thread.getByRole('button', { name: 'Comment actions', exact: true }).first().click()
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click()
    await dialog(page, 'Delete comment')
      .getByRole('button', { name: 'Confirm', exact: true })
      .click()
    await expect(thread.getByText('Looks good after the fix')).toHaveCount(0)
    await expect(thread.getByText('No comments yet.')).toBeVisible()

    await deletePost(page, post.edit)
  })

  test('the Comments action of the edit page opens the same thread in a slide-over', async ({
    page,
  }) => {
    const post = await newPost(page, 'Thread')

    await page.goto(post.edit)
    await page
      .locator('[data-slot="page-header"]')
      .getByRole('button', { name: 'Comments', exact: true })
      .click()

    const panel = dialog(page, 'Comments')

    await expect(panel.getByText('No comments yet.')).toBeVisible()
    await panel.getByRole('button', { name: 'Add comment', exact: true }).click()
    await dialog(page, 'Add comment').getByRole('textbox').click()
    await page.keyboard.type('From the slide-over')
    await dialog(page, 'Add comment').getByRole('button', { name: 'Comment', exact: true }).click()
    // Updates in place: still on the edit page, with the thread open.
    await expect(dialog(page, 'Comments').getByText('From the slide-over')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${post.edit}$`))
    await page.keyboard.press('Escape')

    await deletePost(page, post.edit)
  })
})

test.describe('tags (docs: plugins/tags)', () => {
  test('tags are added to a record, shown on it, and removed', async ({ page }) => {
    const post = await newPost(page, 'Tagged')
    const first = `e2e-${Date.now().toString(36)}`
    const second = `${first}-two`

    await page.goto(post.edit)

    const tags = page.getByRole('combobox', { name: 'Tags', exact: true })

    for (const tag of [first, second]) {
      await tags.click()
      await page.keyboard.type(tag)
      await page.keyboard.press('Enter')
      await expect(page.getByRole('button', { name: `Remove ${tag}`, exact: true })).toBeVisible()
    }

    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')

    // The infolist entry and the table column show both.
    await page.goto(post.view)
    await expect(page.getByRole('group', { name: 'Tags' })).toContainText(first)
    await expect(page.getByRole('group', { name: 'Tags' })).toContainText(second)

    // Remove one: only the other is left after saving.
    await page.goto(post.edit)
    await page.getByRole('button', { name: `Remove ${second}`, exact: true }).click()
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')
    await page.goto(post.view)
    await expect(page.getByRole('group', { name: 'Tags' })).toContainText(first)
    await expect(page.getByRole('group', { name: 'Tags' })).not.toContainText(second)

    await deletePost(page, post.edit)
  })
})

test.describe('media library (docs: plugins/media-library)', () => {
  test('an image is uploaded to a collection, shown on the record, and removed', async ({
    page,
  }) => {
    const post = await newPost(page, 'With media')

    await page.goto(post.edit)

    const gallery = field(page, 'Gallery')

    await gallery.locator('input[type="file"]').setInputFiles('fixtures/cover.png')
    await expect(gallery.getByText('cover.png')).toBeVisible()
    await expect(gallery.getByRole('progressbar')).toHaveCount(0)
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')

    // The view page shows the stored image, and it loads.
    await page.goto(post.view)

    const image = page.getByRole('group', { name: 'Gallery' }).locator('img').first()

    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0)

    // The edit form lists it again; removing it and saving clears the collection.
    await page.goto(post.edit)
    await expect(field(page, 'Gallery').getByRole('button', { name: /^Remove / })).toHaveCount(1)
    await field(page, 'Gallery')
      .getByRole('button', { name: /^Remove / })
      .click()
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expectToast(page, 'Saved')
    await page.goto(post.view)
    await expect(page.getByRole('group', { name: 'Gallery' }).locator('img')).toHaveCount(0)

    await deletePost(page, post.edit)
  })
})

test.describe('teams (docs: plugins/teams)', () => {
  test('a team is created, a member invited, the team switched and deleted', async ({ page }) => {
    const token = Date.now().toString(36)
    const name = `E2E Team ${token}`

    // Create: the creator lands in the new team as its owner.
    await page.goto('/team/new')
    await page.getByRole('textbox', { name: 'Team name', exact: true }).fill(name)
    await page.getByRole('textbox', { name: 'Team name', exact: true }).blur()
    await expect(page.getByRole('textbox', { name: 'URL', exact: true })).not.toHaveValue('')
    await page.getByRole('button', { name: 'Create team', exact: true }).click()
    await expect(page).toHaveURL(/\/team\/e2e-team-[a-z0-9-]+/)

    const base = new URL(page.url()).pathname.split('/').slice(0, 3).join('/')

    await page.goto(`${base}/team/members`)
    await expect(page.getByRole('row').filter({ hasText: 'admin@example.com' })).toContainText(
      'Owner',
    )

    // Invite: the invitation is listed as pending.
    const email = `invitee-${token}@example.com`

    await page.getByRole('button', { name: 'Invite member', exact: true }).first().click()
    await dialog(page, 'Invite a member')
      .getByRole('textbox', { name: 'E-mail address' })
      .fill(email)
    await dialog(page, 'Invite a member')
      .getByRole('radio', { name: 'Viewer', exact: true })
      .check()
    await dialog(page, 'Invite a member')
      .getByRole('button', { name: 'Send invitation', exact: true })
      .click()
    await expect(dialog(page, 'Invite a member')).toBeHidden()
    await page.goto(`${base}/team/invitations`)
    await expect(page.getByRole('row').filter({ hasText: email })).toContainText('Viewer')

    // Switch to another team and back through the tenant menu.
    const switcher = page
      .locator('[data-sidebar="header"], [data-slot="sidebar-header"]')
      .getByRole('button')
      .first()

    await switcher.click()
    await page.getByRole('menuitem', { name: /Playground HQ/ }).click()
    await expect(page).toHaveURL(/\/team\/playground-hq/)
    await page
      .locator('[data-sidebar="header"], [data-slot="sidebar-header"]')
      .getByRole('button')
      .first()
      .click()
    await page.getByRole('menuitem', { name: new RegExp(name) }).click()
    await expect(page).toHaveURL(new RegExp(`${base}(/|$)`))

    // Delete the team (typed confirmation); the user is sent to a team they still have.
    await page.goto(`${base}/profile`)
    await page.getByRole('button', { name: 'Delete team', exact: true }).click()

    const confirm = dialog(page, new RegExp(`Delete ${name}`))

    // Typed confirmation: the team's name.
    await confirm.getByRole('textbox').fill(name)

    await confirm
      .getByRole('button', { name: /^Delete/ })
      .last()
      .click()
    await expect(page).not.toHaveURL(new RegExp(`${base}(/|$)`))
    await page.goto('/team')
    await page
      .locator('[data-sidebar="header"], [data-slot="sidebar-header"]')
      .getByRole('button')
      .first()
      .click()
    await expect(page.getByRole('menuitem', { name: new RegExp(name) })).toHaveCount(0)
  })
})

test.describe('billing (docs: plugins/billing)', () => {
  test('the plans page lists each plan with its price, features and a checkout link', async ({
    page,
  }) => {
    await page.goto('/admin/billing/plans')
    await expect(page.getByRole('heading', { level: 1, name: 'Choose a plan' })).toBeVisible()

    for (const [plan, price] of [
      ['Starter', '$9.00'],
      ['Pro', '$29.00'],
    ] as const) {
      await expect(page.getByRole('heading', { level: 2, name: plan, exact: true })).toBeVisible()
      await expect(page.locator('[data-slot="content"]')).toContainText(`${price} per month`)
    }

    await expect(
      page.getByRole('heading', { level: 2, name: 'Enterprise', exact: true }),
    ).toBeVisible()
    await expect(page.locator('[data-slot="content"]')).toContainText('Most popular')
    await expect(page.locator('[data-slot="content"]')).toContainText('14-day free trial')

    const links = page.getByRole('link', { name: 'Start free trial', exact: true })

    await expect(links).toHaveCount(3)
    await expect(links.nth(1)).toHaveAttribute('href', /\/admin\/billing\?plan=pro$/)
  })
})

test.describe('AI with sample answers (docs: plugins/ai)', () => {
  test('the copilot opens from the top bar and answers a search with real records', async ({
    page,
  }) => {
    const post = await newPost(page, 'Copilot target')

    await page.goto('/admin')
    await page.getByRole('button', { name: 'Open AI copilot', exact: true }).click()

    const copilot = page.getByRole('dialog')

    await expect(copilot.getByText("Sample answer — AI isn't configured").first()).toBeVisible()
    await copilot
      .getByRole('textbox', { name: /Ask about your data/ })
      .fill('search Copilot target')
    await copilot.getByRole('button', { name: 'Send', exact: true }).click()

    const messages = copilot.getByRole('log', { name: 'Messages' })

    // (Svelte writes "You:" without the space the other two put after it.)
    await expect(messages).toContainText(/You:\s*search Copilot target/)
    await expect(messages).toContainText(post.title, { timeout: 20_000 })
    await page.keyboard.press('Escape')

    // Every call is logged, with the provider "demo".
    await page.goto('/admin/ai-usage')
    await expect(page.getByRole('row').filter({ hasText: /demo/i }).first()).toBeVisible()

    await deletePost(page, post.edit)
  })

  test('the writing assistant suggests a shorter text and fills the field only on "Use suggestion"', async ({
    page,
  }) => {
    const post = await newPost(page, 'Assisted')
    const text = 'This is the first sentence about the post. This is a second sentence that can go.'

    await page.goto(post.edit)

    // By name: while the modal is open the page behind it is hidden from the accessibility tree.
    const excerpt = page.locator('textarea[name="excerpt"]')

    await excerpt.fill(text)
    await page.getByRole('button', { name: 'Write with AI', exact: true }).click()

    const assistant = dialog(page, 'Writing assistant')

    await expect(assistant.getByText("Sample answer — AI isn't configured")).toBeVisible()
    await assistant.getByRole('button', { name: 'Shorter', exact: true }).click()

    const suggestion = assistant.getByRole('textbox', { name: /^Suggestion/ })

    await expect(suggestion).toHaveValue('This is the first sentence about the post.', {
      timeout: 20_000,
    })
    // Nothing changed yet.
    await expect(excerpt).toHaveValue(text)
    await assistant.getByRole('button', { name: 'Use suggestion', exact: true }).click()
    await expect(assistant).toBeHidden()
    await expect(excerpt).toHaveValue('This is the first sentence about the post.')

    await deletePost(page, post.edit)
  })
})
