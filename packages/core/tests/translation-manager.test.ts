import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/http'
import type {
  TranslationManagerSchema,
  TranslationRowSchema,
} from '../src/schema/translation-manager'
import { TranslationManagerController } from '../src/translation-manager'

const row = (
  id: string,
  de?: string,
  extra: Partial<TranslationRowSchema> = {},
): TranslationRowSchema => ({
  id,
  key: `auth.${id}`,
  group: 'auth',
  groupLabel: 'auth',
  cells: {
    en: { value: `English ${id}`, editable: true },
    de: { value: de ?? null, editable: true },
    ar: { value: null },
  },
  ...extra,
})

const schema = (extra: Partial<TranslationManagerSchema> = {}): TranslationManagerSchema => ({
  type: 'translation-manager',
  key: 'translations',
  actionComponent: 'translations',
  actions: { rows: 'rows', save: 'save', history: 'history', suggestion: 'suggestion' },
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
      code: 'de',
      label: 'German',
      direction: 'ltr',
      editable: true,
      pluralForms: 2,
      progress: { translated: 1, total: 2, percent: 0.5 },
    },
    { code: 'ar', label: 'Arabic', direction: 'rtl', editable: false, pluralForms: 6 },
  ],
  groups: [{ value: 'auth', label: 'auth' }],
  filters: ['all', 'missing'],
  perPage: 50,
  rows: [row('a', 'Deutsch a'), row('b')],
  total: 2,
  page: 1,
  lastPage: 1,
  ...extra,
})

function controller(executeJson = vi.fn(), extra: Partial<TranslationManagerSchema> = {}) {
  const env = {
    runner: { executeJson },
    token: 'tok',
    t: (_key: string, replacements: Record<string, string | number> = {}, fallback = '') =>
      Object.entries(replacements).reduce(
        (text, [name, value]) => text.replace(`:${name}`, String(value)),
        fallback,
      ),
    notify: vi.fn(),
    error: vi.fn(),
  }

  return { controller: new TranslationManagerController(schema(extra), env), env, executeJson }
}

describe('translation manager controller', () => {
  it('starts with the schema rows, progress and every locale visible', () => {
    const { controller: c } = controller()

    expect(c.state.rows).toHaveLength(2)
    expect(c.state.progress.de).toEqual({ translated: 1, total: 2, percent: 0.5 })
    expect(c.visibleLocales().map((locale) => locale.code)).toEqual(['en', 'de', 'ar'])
    expect(c.range()).toEqual({ from: 1, to: 2 })
  })

  it('fetches rows with the filters and the visible locales', async () => {
    const executeJson = vi
      .fn()
      .mockResolvedValue({ rows: [row('b')], total: 1, page: 1, lastPage: 1 })
    const { controller: c } = controller(executeJson)

    c.toggleLocale('ar', false)
    c.setGroup('auth')
    await Promise.resolve()
    c.setFilter('missing')
    await vi.waitFor(() => expect(c.state.loading).toBe(false))

    expect(executeJson).toHaveBeenLastCalledWith(
      { type: 'Action', name: 'rows', hasAction: true },
      {
        token: 'tok',
        component: 'translations',
        arguments: { search: '', filter: 'missing', group: 'auth', page: 1, locales: ['de'] },
      },
    )
    expect(c.state.rows.map((item) => item.id)).toEqual(['b'])
    expect(c.state.announcement).toBe('1–1 of 1')
  })

  it('debounces the search and ignores stale responses', async () => {
    vi.useFakeTimers()
    let resolveFirst: (value: unknown) => void = () => {}
    const executeJson = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ rows: [row('b')], total: 1, page: 1, lastPage: 1 })
    const { controller: c } = controller(executeJson)

    c.setSearch('w')
    c.setSearch('we')
    vi.advanceTimersByTime(300)
    expect(executeJson).toHaveBeenCalledTimes(1)

    c.setSearch('wel')
    vi.advanceTimersByTime(300)
    vi.useRealTimers()
    await vi.waitFor(() => expect(c.state.rows.map((item) => item.id)).toEqual(['b']))

    resolveFirst({ rows: [], total: 0, page: 1, lastPage: 1 })
    await Promise.resolve()
    expect(c.state.rows.map((item) => item.id)).toEqual(['b'])
  })

  it('edits and saves a cell, replacing the row with the server one', async () => {
    const saved = row('b', 'Neu', {
      cells: { ...row('b').cells, de: { value: 'Neu', changed: true, editable: true } },
    })
    const executeJson = vi
      .fn()
      .mockResolvedValue({ row: saved, progress: { de: { translated: 2, total: 2, percent: 1 } } })
    const { controller: c } = controller(executeJson)

    expect(c.startEdit({ row: 'b', locale: 'ar' })).toBe(false)
    expect(c.startEdit({ row: 'b', locale: 'de' })).toBe(true)
    c.setDraft('Neu')
    expect(await c.save()).toBe(true)

    expect(executeJson).toHaveBeenCalledWith(expect.objectContaining({ name: 'save' }), {
      token: 'tok',
      component: 'translations',
      arguments: { id: 'b', locale: 'de', value: 'Neu' },
    })
    expect(c.state.editing).toBeNull()
    expect(c.row('b')?.cells.de?.changed).toBe(true)
    expect(c.state.progress.de?.percent).toBe(1)
  })

  it('closes unchanged editors without a request and posts plural forms', async () => {
    const executeJson = vi.fn().mockResolvedValue({ row: row('p'), progress: {} })
    const plural = row('p', ':count Datei|:count Dateien', {
      plural: true,
      cells: {
        en: {
          value: ':count file|:count files',
          forms: [':count file', ':count files'],
          editable: true,
        },
        de: {
          value: ':count Datei|:count Dateien',
          forms: [':count Datei', ':count Dateien'],
          editable: true,
        },
      },
    })
    const { controller: c } = controller(executeJson, { rows: [plural] })

    c.startEdit({ row: 'p', locale: 'de' })
    expect(await c.save()).toBe(true)
    expect(executeJson).not.toHaveBeenCalled()

    c.startEdit({ row: 'p', locale: 'de' })
    c.setDraftForm(1, ':count Akten')
    await c.save()

    expect(executeJson.mock.calls[0]?.[1].arguments).toEqual({
      id: 'p',
      locale: 'de',
      forms: [':count Datei', ':count Akten'],
    })
  })

  it('keeps the editor open with the validation message when saving fails', async () => {
    const executeJson = vi
      .fn()
      .mockRejectedValue(
        new HttpError(422, { errors: { locale: ['You may not edit this language.'] } }),
      )
    const { controller: c, env } = controller(executeJson)

    c.startEdit({ row: 'a', locale: 'de' })
    c.setDraft('x')

    expect(await c.save()).toBe(false)
    expect(c.state.editing).toEqual({ row: 'a', locale: 'de' })
    expect(c.state.error).toBe('You may not edit this language.')
    expect(env.error).toHaveBeenCalledWith('You may not edit this language.')
  })

  it('moves with the arrow keys (mirrored right to left) and edits with Enter', async () => {
    const executeJson = vi.fn().mockResolvedValue({ row: row('a', 'neu'), progress: {} })
    const { controller: c } = controller(executeJson)
    const a = { row: 'a', locale: 'en' }

    expect(c.handleCellKey(a, { key: 'ArrowRight' }).focus).toEqual({ row: 'a', locale: 'de' })
    expect(c.handleCellKey(a, { key: 'ArrowLeft' }, 'rtl').focus).toEqual({
      row: 'a',
      locale: 'de',
    })
    expect(c.handleCellKey(a, { key: 'ArrowDown' }).focus).toEqual({ row: 'b', locale: 'en' })
    expect(c.handleCellKey(a, { key: 'End' }).focus).toEqual({ row: 'a', locale: 'ar' })
    expect(c.handleCellKey(a, { key: 'End', ctrlKey: true }).focus).toEqual({
      row: 'b',
      locale: 'ar',
    })
    expect(c.handleCellKey(a, { key: 'x' }).handled).toBe(false)

    c.handleCellKey({ row: 'a', locale: 'de' }, { key: 'Enter' })
    expect(c.state.editing).toEqual({ row: 'a', locale: 'de' })
    expect(c.state.draft).toBe('Deutsch a')

    expect((await c.handleEditorKey({ key: 'Enter', shiftKey: true })).handled).toBe(false)
    expect((await c.handleEditorKey({ key: 'Escape' })).focus).toEqual({ row: 'a', locale: 'de' })
    expect(c.state.editing).toBeNull()

    c.startEdit({ row: 'a', locale: 'de' })
    c.setDraft('neu')
    expect((await c.handleEditorKey({ key: 'Enter' })).focus).toEqual({ row: 'b', locale: 'de' })
  })

  it('reviews suggestions and loads the history', async () => {
    const executeJson = vi
      .fn()
      .mockResolvedValueOnce({ row: row('b', 'KI'), progress: {} })
      .mockResolvedValueOnce({
        entries: [{ id: 1, old: null, new: 'KI', source: 'ai', user: 'Ada', at: null }],
      })
      .mockResolvedValueOnce({ count: 2, notifications: [{ title: '2 accepted' }] })
      .mockResolvedValueOnce({ rows: [], total: 0, page: 1, lastPage: 1 })
    const { controller: c, env } = controller(executeJson, {
      rows: [
        row('b', undefined, { cells: { de: { suggestion: { value: 'KI' }, editable: true } } }),
      ],
    })

    expect(c.suggestionLocales()).toEqual(['de'])
    await c.decide({ row: 'b', locale: 'de' }, 'accept')
    expect(executeJson.mock.calls[0]?.[1].arguments).toEqual({
      id: 'b',
      locale: 'de',
      decision: 'accept',
    })
    expect(c.row('b')?.cells.de?.value).toBe('KI')

    await c.loadHistory({ row: 'b', locale: 'de' })
    expect(c.state.history?.entries?.[0]?.source).toBe('ai')

    await c.decideAll('de', 'accept')
    expect(executeJson.mock.calls[2]?.[1].arguments).toEqual({
      locale: 'de',
      decision: 'accept',
      all: true,
    })
    expect(env.notify).toHaveBeenCalledWith([{ title: '2 accepted' }])
  })

  it('keeps the view when the server sends a new schema', async () => {
    const executeJson = vi.fn().mockResolvedValue({ rows: [], total: 0, page: 1, lastPage: 1 })
    const { controller: c } = controller(executeJson)

    c.toggleLocale('ar', false)
    c.setSchema(schema({ rows: [row('z')], total: 1 }))
    expect(c.state.rows.map((item) => item.id)).toEqual(['z'])
    expect(c.state.visibleLocales).toEqual(['en', 'de'])
    expect(executeJson).not.toHaveBeenCalled()

    c.setFilter('missing')
    c.setSchema(schema())
    await vi.waitFor(() => expect(executeJson).toHaveBeenCalledTimes(2))
  })
})
