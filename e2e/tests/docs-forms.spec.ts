import { type Locator, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { expectToast, pickOption, toasts, uniqueTitle } from '../fixtures/panel'
import { expect, test } from '../fixtures/test'

/**
 * Docs-driven checks of the forms documentation (docs/content/forms) against the playground
 * pages that show each feature: the fields and editors showcases, the post and category
 * resources and the standalone contact form. The same assertions run on every renderer.
 */

const cover = fileURLToPath(new URL('../fixtures/cover.png', import.meta.url))

const FIELDS = '/admin/showcase/fields'
const EDITORS = '/admin/showcase/editors'

async function openFields(page: Page): Promise<void> {
  await page.goto(FIELDS)
  await expect(page.getByRole('heading', { level: 1, name: 'Fields' })).toBeVisible()
  // The code editor and the pickers are loaded lazily.
  await page.waitForLoadState('networkidle')
}

/** The field wrapper (`data-slot="field"`) that holds the control with this label. */
const fieldOf = (page: Page, label: string): Locator =>
  page
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) })
    .first()

const repeaterRows = (page: Page): Locator =>
  page.getByRole('table', { name: 'Lines' }).locator('tbody tr')

const builderItems = (page: Page): Locator =>
  page.getByRole('list', { name: 'Content', exact: true }).locator('> li')

test.describe('forms docs: choice and input fields', () => {
  test('toggle buttons, sliders and the code editor bind their values', async ({ page }) => {
    await openFields(page)

    // ToggleButtons: single choice (`aria-pressed` moves) and `multiple()` (each toggles).
    const status = page.getByRole('group', { name: 'Status', exact: true })
    await expect(status.getByRole('button', { name: 'Draft', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await status.getByRole('button', { name: 'Published', exact: true }).click()
    await expect(status.getByRole('button', { name: 'Published', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(status.getByRole('button', { name: 'Draft', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    const channels = page.getByRole('group', { name: 'Channels', exact: true })
    await channels.getByRole('button', { name: 'Email', exact: true }).click()
    await expect(channels.getByRole('button', { name: 'Web', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(channels.getByRole('button', { name: 'Email', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await channels.getByRole('button', { name: 'Web', exact: true }).click()
    await expect(channels.getByRole('button', { name: 'Web', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    // Slider: `step(5)` from the keyboard, inside `range(0, 100)`.
    const volume = page.getByRole('slider', { name: 'Volume', exact: true })
    await expect(volume).toHaveAttribute('aria-valuenow', '40')
    await volume.focus()
    await page.keyboard.press('ArrowRight')
    await expect(volume).toHaveAttribute('aria-valuenow', '45')
    await page.keyboard.press('Home')
    await expect(volume).toHaveAttribute('aria-valuenow', '0')
    await page.keyboard.press('End')
    await expect(volume).toHaveAttribute('aria-valuenow', '100')

    // A range slider keeps `minDifference(50)` between its two handles.
    const minimum = page.getByRole('slider', { name: 'Minimum', exact: true })
    const maximum = page.getByRole('slider', { name: 'Maximum', exact: true })
    await expect(minimum).toHaveAttribute('aria-valuenow', '200')
    await expect(maximum).toHaveAttribute('aria-valuenow', '800')
    await minimum.focus()
    await page.keyboard.press('ArrowRight')
    await expect(minimum).toHaveAttribute('aria-valuenow', '210')
    // Pushing the upper handle to the bottom stops at least 50 above the lower one.
    await maximum.focus()
    await page.keyboard.press('Home')
    await expect
      .poll(
        async () =>
          Number(await maximum.getAttribute('aria-valuenow')) -
          Number(await minimum.getAttribute('aria-valuenow')),
      )
      .toBeGreaterThanOrEqual(50)

    // CodeEditor: a labelled textbox holding the state.
    const snippet = page.getByRole('textbox', { name: 'Snippet', exact: true })
    await expect(snippet).toHaveValue(/'debug' => true/)
    await snippet.fill("<?php\n\nreturn ['debug' => false];\n")
    await expect(snippet).toHaveValue(/'debug' => false/)

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expectToast(page, 'Validated')
    await expectToast(page, '2 line(s), 2 block(s).')
  })

  test('field actions run on the server and change the field', async ({ page }) => {
    await openFields(page)

    const title = page.getByRole('textbox', { name: 'Title', exact: true })
    const slug = page.getByRole('textbox', { name: 'Slug', exact: true })

    // The slug has a prefix (`/blog/`) and affix actions.
    await expect(fieldOf(page, 'Slug')).toContainText('/blog/')

    await title.fill('Field Actions In Docs')
    await title.blur()
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await expect(slug).toHaveValue('field-actions-in-docs')

    await page.getByRole('button', { name: 'Clear', exact: true }).click()
    await expect(slug).toHaveValue('')
    // The rest of the form keeps what was typed.
    await expect(title).toHaveValue('Field Actions In Docs')

    // A failing action is reported, never swallowed.
    await page.getByRole('button', { name: 'Fail', exact: true }).click()
    await expect(toasts(page).first()).toBeVisible()
    await expect(title).toHaveValue('Field Actions In Docs')
  })

  test('picks a record in a modal table and creates a select option in a modal', async ({
    page,
  }) => {
    await openFields(page)

    // ModalTableSelect: a button opens the resource table in a dialog.
    const category = page.getByRole('group', { name: 'Category', exact: true })
    await expect(category).toContainText('Nothing selected')
    await category.getByRole('button', { name: 'Select', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const firstRow = dialog.locator('tbody tr').first()
    await expect(firstRow).toBeVisible()
    const picked = (await firstRow.locator('td').nth(1).innerText()).trim().split('\n')[0] ?? ''
    await firstRow.getByRole('radio').or(firstRow.getByRole('checkbox')).first().click()
    await dialog
      .getByRole('button', { name: /^(Select|Confirm|Apply|Choose)$/ })
      .last()
      .click()
    await expect(dialog).toBeHidden()
    await expect(category).not.toContainText('Nothing selected')
    await expect(category).toContainText(picked)

    // Select with `createOptionForm()`: the new option is created and selected.
    const tag = uniqueTitle('e2e-tag')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    const create = page.getByRole('dialog')
    await expect(create).toBeVisible()
    // Required: an empty name is refused.
    await create.getByRole('button', { name: /^(Create|Submit|Save)$/ }).click()
    await expect(create.getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await create.getByRole('textbox', { name: 'Name' }).fill(tag)
    await create.getByRole('button', { name: /^(Create|Submit|Save)$/ }).click()
    await expect(create).toBeHidden()
    await expect(page.getByRole('combobox', { name: 'Tag', exact: true })).toContainText(tag)

    // Clean up the tag the option form created.
    await page.goto(`/admin/tags?search=${encodeURIComponent(tag)}`)
    const row = page.getByRole('row').filter({ hasText: tag })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Delete', exact: true }).click()
    await page
      .getByRole('alertdialog')
      .or(page.getByRole('dialog'))
      .getByRole('button', { name: /^(Delete|Confirm)$/ })
      .click()
    await expect(page.getByRole('row').filter({ hasText: tag })).toHaveCount(0)
  })
})

test.describe('forms docs: repeater and builder', () => {
  test('a table repeater shows its values and adds, clones, moves and removes rows', async ({
    page,
  }) => {
    await openFields(page)

    const rows = repeaterRows(page)
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0).getByRole('textbox', { name: 'Name' })).toHaveValue('Widget')
    // A numeric field inside an item shows the number it was filled with.
    await expect(rows.nth(0).getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('2')
    await expect(rows.nth(1).getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('5')
    await expect(rows.nth(0).getByRole('combobox', { name: 'Unit' })).toContainText('Pieces')

    // Move: the first and last rows can't move past the ends.
    await expect(rows.nth(0).getByRole('button', { name: 'Move up' })).toBeDisabled()
    await expect(rows.nth(1).getByRole('button', { name: 'Move down' })).toBeDisabled()
    await rows.nth(0).getByRole('button', { name: 'Move down' }).click()
    await expect(rows.nth(0).getByRole('textbox', { name: 'Name' })).toHaveValue('Gadget')
    await expect(rows.nth(1).getByRole('textbox', { name: 'Name' })).toHaveValue('Widget')

    // Clone copies the row's values.
    await rows.nth(0).getByRole('button', { name: 'Clone' }).click()
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(1).getByRole('textbox', { name: 'Name' })).toHaveValue('Gadget')
    await expect(rows.nth(1).getByRole('spinbutton', { name: 'Quantity' })).toHaveValue('5')

    // Add: a new, empty row whose required fields are validated on save.
    await page.getByRole('button', { name: 'Add to lines', exact: true }).click()
    await expect(rows).toHaveCount(4)
    await expect(rows.nth(3).getByRole('textbox', { name: 'Name' })).toHaveValue('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(rows.nth(3).getByRole('textbox', { name: 'Name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await rows.nth(3).getByRole('textbox', { name: 'Name' }).fill('Sprocket')
    await rows.nth(3).getByRole('spinbutton', { name: 'Quantity' }).fill('7')

    // Remove.
    await rows.nth(1).getByRole('button', { name: 'Remove' }).click()
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(2).getByRole('textbox', { name: 'Name' })).toHaveValue('Sprocket')

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expectToast(page, '3 line(s), 2 block(s).')
  })

  test('a builder adds blocks from the picker and collapses, clones, moves and removes them', async ({
    page,
  }) => {
    await openFields(page)

    const items = builderItems(page)
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('Heading')
    await expect(items.nth(0).getByRole('textbox', { name: 'Content' })).toHaveValue('Welcome')
    await expect(items.nth(1)).toContainText('Paragraph')

    // Each block has its own schema: only the heading has a level.
    await expect(items.nth(0).getByRole('combobox', { name: 'Level' })).toBeVisible()
    await expect(items.nth(1).getByRole('combobox', { name: 'Level' })).toHaveCount(0)

    // `collapsible()`: one item, then all of them.
    await items.nth(0).getByRole('button', { name: 'Collapse', exact: true }).click()
    await expect(items.nth(0).getByRole('textbox', { name: 'Content' })).toBeHidden()
    await page.getByRole('button', { name: 'Expand all', exact: true }).click()
    await expect(items.nth(0).getByRole('textbox', { name: 'Content' })).toBeVisible()

    // Move and clone.
    await items.nth(0).getByRole('button', { name: 'Move down' }).click()
    await expect(items.nth(0)).toContainText('Paragraph')
    await expect(items.nth(1).getByRole('textbox', { name: 'Content' })).toHaveValue('Welcome')
    await items.nth(1).getByRole('button', { name: 'Clone' }).click()
    await expect(items).toHaveCount(3)
    await expect(items.nth(2).getByRole('textbox', { name: 'Content' })).toHaveValue('Welcome')

    // Add a block from the picker.
    await page.getByRole('button', { name: 'Add to content', exact: true }).click()
    await page
      .getByRole('menuitem', { name: 'Heading' })
      .or(page.getByRole('button', { name: 'Heading', exact: true }))
      .or(page.getByRole('option', { name: 'Heading' }))
      .first()
      .click()
    await expect(items).toHaveCount(4)
    await expect(items.nth(3)).toContainText('Heading')
    // The block's `default()` applies to the new item.
    await expect(items.nth(3).getByRole('combobox', { name: 'Level' })).toContainText('H2')

    // Required block fields are validated.
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(items.nth(3).getByRole('textbox', { name: 'Content' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await items.nth(3).getByRole('button', { name: 'Remove' }).click()
    await expect(items).toHaveCount(3)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expectToast(page, '2 line(s), 3 block(s).')
  })
})

test.describe('forms docs: editors and uploads', () => {
  test('the rich editor formats text and renders it; the markdown editor and uploads bind', async ({
    page,
  }) => {
    await page.goto(EDITORS)
    await expect(page.getByRole('heading', { level: 1, name: 'Editors' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    const rich = page.locator('[data-slot="content"] [contenteditable="true"]').first()
    await expect(rich).toBeVisible()

    const marker = uniqueTitle('docs-rich')
    await rich.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('Enter')
    await page.keyboard.press('ControlOrMeta+b')
    await page.keyboard.type(marker)
    await page.keyboard.press('ControlOrMeta+b')
    await expect(rich.locator('strong', { hasText: marker })).toBeVisible()

    // The toolbar reflects the mark under the caret.
    await page.keyboard.press('ArrowLeft')
    await expect(
      page
        .getByRole('toolbar', { name: 'Formatting' })
        .first()
        .getByRole('button', { name: 'Bold', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')

    // `RichContentRenderer` (the Preview action) renders rich content as HTML in a modal.
    await page.getByRole('button', { name: 'Preview rich content', exact: true }).click()
    const preview = page.getByRole('dialog')
    await expect(preview.getByRole('heading', { name: 'Rendered content' })).toBeVisible()
    await expect(preview.locator('.alfakit-prose').last()).toContainText('Welcome to AlfaKit')
    await page.keyboard.press('Escape')
    await expect(preview).toBeHidden()
    // Closing the modal leaves what was typed in the editor.
    await expect(rich.locator('strong', { hasText: marker })).toBeVisible()

    // MarkdownEditor: typed text is kept as Markdown.
    const markdown = page.locator('[data-slot="content"] [contenteditable="true"]').nth(1)
    await markdown.click()
    await page.keyboard.press('ControlOrMeta+End')
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Markdown ${marker}`)
    await expect(markdown).toContainText(`Markdown ${marker}`)

    // FileUpload: pick an image for the banner; it is listed with its name.
    const banner = page
      .locator('[data-slot="field"]')
      .filter({ hasText: 'Banner (crop may extend past the image)' })
      .first()
    await banner.locator('input[type="file"]').setInputFiles(cover)
    // `imageEditor()` opens the editor before the upload: accept the crop as it is.
    const editor = page.getByRole('dialog')
    await expect(editor).toBeVisible()
    await editor
      .getByRole('button', { name: /^(Save|Apply|Done|Crop|Upload)$/ })
      .last()
      .click()
    await expect(editor).toBeHidden()
    await expect(banner.getByText(/cover.*\.(png|jpg|jpeg|webp)/i).first()).toBeVisible()

    // The two sample images the page is seeded with are removed first: the page fills them
    // as plain paths, which the server refuses on save ("This upload is no longer available").
    await page.getByRole('button', { name: 'Remove sample-cover.png', exact: true }).click()
    // The avatar's buttons sit over the round preview: use the keyboard, as a keyboard user would.
    await page.getByRole('button', { name: 'Remove sample-avatar.png', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /^Remove sample-/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expectToast(page, 'Validated')
    await expectToast(page, /Images: 1,/)
  })
})

test.describe('forms docs: a resource form saves what was typed', () => {
  test('key-value, toggle, selects, text and numbers survive a reload', async ({ page }) => {
    const title = uniqueTitle('Docs form')

    await page.goto('/admin/posts/create')
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('textbox', { name: 'Title' }).blur()
    await expect(page.getByRole('textbox', { name: 'Slug' })).not.toHaveValue('')
    await page.getByRole('textbox', { name: 'Excerpt' }).fill('Typed in the docs-driven test.')
    await pickOption(page, 'Status', 'Draft')
    await pickOption(page, 'Author', /Alfa Admin/)

    // Toggle.
    const featured = page.getByRole('switch', { name: 'Featured' })
    await featured.click()
    await expect(featured).toBeChecked()

    // A collapsed section opens; KeyValue rows are added and typed.
    await page.getByRole('button', { name: 'Toggle section' }).click()
    const meta = page.locator('[data-slot="field"]').filter({ hasText: 'Meta' }).first()
    await meta.getByRole('button', { name: /^Add/ }).click()
    await meta.getByRole('textbox').nth(0).fill('og:title')
    await meta.getByRole('textbox').nth(1).fill('From the docs test')

    // Numeric with `minValue(0)->maxValue(5)`: out of range is refused on the server.
    const rating = page.getByRole('spinbutton', { name: 'Rating' })
    await rating.fill('9')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(rating).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/admin\/posts\/create$/)
    // What was typed is still there after the failed submit.
    await expect(page.getByRole('textbox', { name: 'Excerpt' })).toHaveValue(
      'Typed in the docs-driven test.',
    )
    await expect(featured).toBeChecked()

    await rating.fill('4.5')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expectToast(page, 'Created')
    await expect(page).toHaveURL(/\/admin\/posts\/\d+$/)

    const id = page.url().split('/').pop()
    await page.goto(`/admin/posts/${id}/edit`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(title)
    await expect(page.getByRole('textbox', { name: 'Excerpt' })).toHaveValue(
      'Typed in the docs-driven test.',
    )
    await expect(page.getByRole('switch', { name: 'Featured' })).toBeChecked()
    await expect(page.getByRole('spinbutton', { name: 'Rating' })).toHaveValue('4.5')
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toContainText('Draft')
    await expect(page.getByRole('combobox', { name: 'Author', exact: true })).toContainText(
      'Alfa Admin',
    )

    await page.getByRole('button', { name: 'Toggle section' }).click()
    const savedMeta = page.locator('[data-slot="field"]').filter({ hasText: 'Meta' }).first()
    await expect(savedMeta.getByRole('textbox').nth(0)).toHaveValue('og:title')
    await expect(savedMeta.getByRole('textbox').nth(1)).toHaveValue('From the docs test')

    // Edit: change a field, save, reload.
    await page.getByRole('textbox', { name: 'Excerpt' }).fill('Edited in the docs-driven test.')
    await page.getByRole('button', { name: /^Save/ }).first().click()
    await expectToast(page, 'Saved')
    await page.reload()
    await expect(page.getByRole('textbox', { name: 'Excerpt' })).toHaveValue(
      'Edited in the docs-driven test.',
    )
    // An edit leaves the slug alone (`afterStateUpdated` only fills it on create).
    await expect(page.getByRole('textbox', { name: 'Slug' })).toHaveValue(/^docs-form-/)
  })

  test('a colour field refuses a value that is not a colour', async ({ page }) => {
    await page.goto('/admin/categories/create')
    await expect(page.getByRole('heading', { level: 1, name: 'Create category' })).toBeVisible()
    // The form must be interactive before it is submitted.
    await page.waitForLoadState('networkidle')

    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(uniqueTitle('Docs colour'))
    await page
      .getByRole('textbox', { name: 'Slug', exact: true })
      .fill(uniqueTitle('docs-colour').replace(/\s+/g, '-'))
    const colour = page.getByRole('textbox', { name: 'Color', exact: true })
    await colour.fill('not-a-colour')
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    await expect(colour).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/admin\/categories\/create$/)
  })
})

test.describe('forms docs: validation and reactivity outside the panel', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('errors show per field and clear when the field is fixed; visible() follows $get', async ({
    page,
  }) => {
    await page.goto('/contact')
    await expect(page.getByRole('heading', { name: 'Contact us' })).toBeVisible()

    const name = page.getByRole('textbox', { name: 'Name' })
    const email = page.getByRole('textbox', { name: 'Email' })
    const message = page.getByRole('textbox', { name: 'Message' })

    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    for (const field of [name, email, message]) {
      await expect(field).toHaveAttribute('aria-invalid', 'true')
    }
    // Required fields are marked for assistive technology.
    await expect(name).toHaveAttribute('aria-required', 'true')

    // `email()` and `minLength(10)`.
    await name.fill('Docs Tester')
    await email.fill('not-an-email')
    await message.fill('short')
    await pickOption(page, 'Topic', 'Sales')
    // `visible(fn (Get $get) => ...)`: only "Support" shows the order number.
    await expect(page.getByRole('textbox', { name: 'Order number' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(message).toHaveAttribute('aria-invalid', 'true')
    await expect(name).not.toHaveAttribute('aria-invalid', 'true')
    // The values survive the failed submit.
    await expect(name).toHaveValue('Docs Tester')

    await pickOption(page, 'Topic', 'Support')
    const order = page.getByRole('textbox', { name: 'Order number' })
    await expect(order).toBeVisible()
    await pickOption(page, 'Topic', 'Something else')
    await expect(order).toHaveCount(0)

    await email.fill('docs@example.com')
    await message.fill('A message that is long enough.')
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expectToast(page, 'Thanks Docs Tester!')
  })
})
