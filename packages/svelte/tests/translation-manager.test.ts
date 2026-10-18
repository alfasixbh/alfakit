import type { TranslationManagerSchema, TranslationRowSchema } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import { actions, registry, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const row = (
  id: string,
  de: string | null,
  extra: Partial<TranslationRowSchema> = {},
): TranslationRowSchema => ({
  id,
  key: `auth.${id}`,
  group: 'auth',
  groupLabel: 'auth',
  placeholders: [':name'],
  cells: {
    en: { value: `Hello :name ${id}`, editable: true },
    ar: { value: de === null ? null : `مرحبا ${id}`, editable: true },
  },
  ...extra,
})

const schema = (extra: Partial<TranslationManagerSchema> = {}): TranslationManagerSchema => ({
  type: 'translation-manager',
  key: 'translations',
  actionComponent: 'translations',
  actions: {
    rows: 'translationsRows',
    save: 'translationsSave',
    history: 'translationsHistory',
    suggestion: 'translationsSuggestion',
  },
  mode: 'database',
  baseLocale: 'en',
  locales: [
    {
      code: 'en',
      label: 'English',
      direction: 'ltr',
      base: true,
      editable: true,
      pluralForms: 2,
      progress: { translated: 2, total: 2, percent: 1 },
    },
    {
      code: 'ar',
      label: 'Arabic',
      direction: 'rtl',
      editable: true,
      pluralForms: 6,
      progress: { translated: 1, total: 2, percent: 0.5 },
    },
  ],
  groups: [{ value: 'auth', label: 'auth' }],
  filters: ['all', 'missing'],
  perPage: 50,
  rows: [row('a', 'x'), row('b', null)],
  total: 2,
  page: 1,
  lastPage: 1,
  ...extra,
})

const renderGrid = (component: TranslationManagerSchema = schema()) =>
  render(Wrapper, { props: { component: RenderComponent, props: { component } } })

beforeEach(() => {
  setPageProps({ page: { token: 'tok' } as never })
})

describe('translation manager', () => {
  it('is registered as translation-manager', () => {
    expect(registry.has('translation-manager')).toBe(true)
  })

  it('renders an accessible grid with progress, missing cells and right-to-left text', async () => {
    renderGrid()

    const grid = await screen.findByRole('grid', { name: 'Translations' })
    const cells = within(grid).getAllByRole('gridcell')

    expect(cells).toHaveLength(4)
    expect(screen.getAllByRole('progressbar')[1]).toHaveAttribute('aria-valuenow', '50')
    expect(within(cells[3]!).getByText('Missing')).toBeInTheDocument()
    expect(within(cells[1]!).getByText('مرحبا a')).toHaveAttribute('dir', 'rtl')
    expect(document.querySelector('[data-slot="translation-manager"]')).not.toBeNull()
  })

  it('edits a cell with the keyboard and saves it through the save action', async () => {
    const saved = row('b', null, {
      cells: { ...row('b', null).cells, ar: { value: 'جديد', changed: true, editable: true } },
    })
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ row: saved, progress: {} })
    renderGrid()

    const cell = (await screen.findAllByRole('gridcell'))[3]!
    cell.focus()
    await fireEvent.keyDown(cell, { key: 'Enter' })

    const editor = await screen.findByRole('textbox', { name: 'Edit auth.b in Arabic' })
    expect(editor).toHaveAttribute('dir', 'rtl')
    await fireEvent.input(editor, { target: { value: 'جديد' } })
    await fireEvent.keyDown(editor, { key: 'Enter' })

    await waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'translationsSave' }),
      {
        token: 'tok',
        component: 'translations',
        arguments: { id: 'b', locale: 'ar', value: 'جديد' },
      },
    )
    expect(await screen.findByText('جديد')).toBeInTheDocument()
    executeJson.mockRestore()
  })

  it('moves between cells with the arrow keys', async () => {
    renderGrid()

    const cells = await screen.findAllByRole('gridcell')
    cells[0]!.focus()
    await fireEvent.keyDown(cells[0]!, { key: 'ArrowRight' })

    await waitFor(() => expect(cells[1]).toHaveAttribute('aria-selected', 'true'))
    await fireEvent.keyDown(cells[1]!, { key: 'ArrowDown' })
    await waitFor(() => expect(cells[3]).toHaveAttribute('aria-selected', 'true'))
  })

  it('shows plural forms as separate inputs and posts them', async () => {
    const plural = row('p', null, {
      plural: true,
      cells: {
        en: {
          value: ':count file|:count files',
          forms: [':count file', ':count files'],
          formLabels: ['1', '0, 2, 3…'],
          editable: true,
        },
        ar: { value: null, forms: ['', ''], formLabels: ['1', '0, 2, 3…'], editable: true },
      },
    })
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ row: plural, progress: {} })
    renderGrid(schema({ rows: [plural], total: 1 }))

    const cell = (await screen.findAllByRole('gridcell'))[1]!
    cell.focus()
    await fireEvent.keyDown(cell, { key: 'Enter' })

    expect(await screen.findByText('For 0, 2, 3…')).toBeInTheDocument()
    const forms = screen.getAllByRole('textbox')
    await fireEvent.input(forms[1]!, { target: { value: ':count ملفات' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
    expect(executeJson.mock.calls[0]?.[1].arguments).toEqual({
      id: 'p',
      locale: 'ar',
      forms: ['', ':count ملفات'],
    })
    executeJson.mockRestore()
  })

  it('filters through the rows action and reviews AI suggestions', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValueOnce({ rows: [row('b', null)], total: 1, page: 1, lastPage: 1 })
      .mockResolvedValueOnce({ row: row('s', 'x'), progress: {} })
    const suggested = row('s', null, {
      cells: {
        en: { value: 'Hi', editable: true },
        ar: { suggestion: { value: 'أهلا' }, editable: true },
      },
    })
    renderGrid(schema({ rows: [suggested], total: 1 }))

    await fireEvent.change(await screen.findByRole('combobox', { name: 'Show' }), {
      target: { value: 'missing' },
    })
    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'translationsRows' }),
        expect.objectContaining({
          arguments: expect.objectContaining({ filter: 'missing', locales: ['ar'] }),
        }),
      ),
    )
    executeJson.mockRestore()
  })

  it('shows suggestions with accept and reject buttons for the active cell', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ row: row('s', 'x'), progress: {} })
    const suggested = row('s', null, {
      cells: {
        en: { value: 'Hi', editable: true },
        ar: { suggestion: { value: 'أهلا' }, editable: true },
      },
    })
    renderGrid(schema({ rows: [suggested], total: 1 }))

    const cell = (await screen.findAllByRole('gridcell'))[1]!
    await fireEvent.focus(cell)

    await fireEvent.click(await screen.findByRole('button', { name: 'Accept' }))
    await waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'translationsSuggestion' }),
        expect.objectContaining({ arguments: { id: 's', locale: 'ar', decision: 'accept' } }),
      ),
    )
    executeJson.mockRestore()
  })
})
