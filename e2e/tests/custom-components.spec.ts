import { expect, test } from '@playwright/test'

test.describe('auto-registered custom components', () => {
  test('renders and binds the SwatchPicker field from resources/js/alfakit/fields', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || /hydrat|mismatch/i.test(message.text())) {
        errors.push(message.text())
      }
    })

    await page.goto('/admin/showcase/fields')

    // No `createAlfakit({ components })` entry: the field type resolves from the file path.
    const swatches = page.getByRole('radiogroup', { name: 'Accent colour', exact: true })
    await expect(swatches).toBeVisible()
    await expect(swatches.getByRole('radio')).toHaveCount(4)
    await expect(swatches.getByRole('radio', { name: 'Blue', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await swatches.getByRole('radio', { name: 'Green', exact: true }).click()

    await expect(swatches.getByRole('radio', { name: 'Green', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(swatches.getByRole('radio', { name: 'Blue', exact: true })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(errors.filter((text) => /SwatchPicker|not registered|hydrat/i.test(text))).toEqual([])
  })
})
