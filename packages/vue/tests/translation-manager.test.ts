import type { TranslationManagerSchema, TranslationRowSchema } from '@alfakit/core'
import { h } from 'vue'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import { actions, flush, mountWithAlfakit } from './mocks'

const row = (
  id: string,
  ar: string | null,
  extra: Partial<TranslationRowSchema> = {},
): TranslationRowSchema => ({
  id,
  key: `auth.${id}`,
  group: 'auth',
  groupLabel: 'auth',
  cells: {
    en: { value: `Hello ${id}`, editable: true },
    ar: { value: ar, editable: true },
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
  rows: [row('a', 'مرحبا'), row('b', null)],
  total: 2,
  page: 1,
  lastPage: 1,
  ...extra,
})

const cells = () => [...document.querySelectorAll<HTMLElement>('[role="gridcell"]')]

async function mountGrid(component: TranslationManagerSchema = schema()) {
  const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: component as never }))
  await vi.waitFor(() => {
    if (!document.querySelector('[role="grid"]')) throw new Error('Not loaded yet')
  })
  await flush()

  return wrapper
}

describe('translation manager', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders an accessible grid with progress, missing cells and right-to-left text', async () => {
    const wrapper = await mountGrid()

    const grid = document.querySelector('[role="grid"]')!
    expect(document.getElementById(grid.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Translations',
    )
    expect(cells()).toHaveLength(4)
    expect(
      document.querySelectorAll('[role="progressbar"]')[1]?.getAttribute('aria-valuenow'),
    ).toBe('50')
    expect(cells()[3]?.textContent).toContain('Missing')
    expect(cells()[1]?.querySelector('[dir="rtl"]')?.textContent).toBe('مرحبا')
    wrapper.unmount()
  })

  it('edits a cell with the keyboard and saves it through the save action', async () => {
    const saved = row('b', 'جديد', {
      cells: { ...row('b', null).cells, ar: { value: 'جديد', changed: true, editable: true } },
    })
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ row: saved, progress: {} })
    const wrapper = await mountGrid()

    cells()[3]!.focus()
    cells()[3]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flush()

    const editor = document.querySelector<HTMLTextAreaElement>('textarea')!
    expect(editor.getAttribute('dir')).toBe('rtl')
    expect(editor.getAttribute('aria-label')).toBe('Edit auth.b in Arabic')
    editor.value = 'جديد'
    editor.dispatchEvent(new Event('input'))
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await vi.waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
    expect(executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'translationsSave' }),
      expect.objectContaining({
        component: 'translations',
        arguments: { id: 'b', locale: 'ar', value: 'جديد' },
      }),
    )
    await vi.waitFor(() => expect(document.querySelector('textarea')).toBeNull())
    expect(cells()[3]?.textContent).toContain('جديد')
    executeJson.mockRestore()
    wrapper.unmount()
  })

  it('moves between cells with the arrow keys', async () => {
    const wrapper = await mountGrid()

    cells()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flush()
    expect(cells()[1]?.getAttribute('aria-selected')).toBe('true')

    cells()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await flush()
    expect(cells()[3]?.getAttribute('aria-selected')).toBe('true')
    wrapper.unmount()
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
    const wrapper = await mountGrid(schema({ rows: [plural], total: 1 }))

    cells()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flush()

    expect(document.body.textContent).toContain('For 0, 2, 3…')
    const forms = document.querySelectorAll<HTMLTextAreaElement>('textarea')
    forms[1]!.value = ':count ملفات'
    forms[1]!.dispatchEvent(new Event('input'))
    await flush()
    ;[...document.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Save')!
      .click()

    await vi.waitFor(() => expect(executeJson).toHaveBeenCalledTimes(1))
    expect(executeJson.mock.calls[0]?.[1].arguments).toEqual({
      id: 'p',
      locale: 'ar',
      forms: ['', ':count ملفات'],
    })
    executeJson.mockRestore()
    wrapper.unmount()
  })

  it('filters through the rows action and accepts suggestions', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValueOnce({ row: row('s', 'أهلا'), progress: {} })
      .mockResolvedValueOnce({ rows: [], total: 0, page: 1, lastPage: 1 })
    const suggested = row('s', null, {
      cells: {
        en: { value: 'Hi', editable: true },
        ar: { suggestion: { value: 'أهلا' }, editable: true },
      },
    })
    const wrapper = await mountGrid(schema({ rows: [suggested], total: 1 }))

    cells()[1]!.dispatchEvent(new FocusEvent('focus'))
    await flush()
    ;[...document.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Accept')!
      .click()
    await vi.waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'translationsSuggestion' }),
        expect.objectContaining({ arguments: { id: 's', locale: 'ar', decision: 'accept' } }),
      ),
    )

    const select = document.querySelector<HTMLSelectElement>('select')!
    select.value = 'missing'
    select.dispatchEvent(new Event('change'))
    await vi.waitFor(() =>
      expect(executeJson).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'translationsRows' }),
        expect.objectContaining({
          arguments: expect.objectContaining({ filter: 'missing', locales: ['ar'] }),
        }),
      ),
    )
    executeJson.mockRestore()
    wrapper.unmount()
  })
})
