import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RichEditorSchema, SchemaComponent, TextInputSchema } from '../src'
import {
  actionFormParams,
  fileUploadEntries,
  fileUploadPaths,
  FormStore,
  pickerFilterFormOptions,
  translatableLocaleField,
  wizardStepFieldPaths,
} from '../src'

/*
 * Open items after the feature build: single-file uploads, live bulk-action forms, picker
 * filter options, per-step wizard validation and translatable Markdown.
 */

const text = (name: string, extra: Partial<TextInputSchema> = {}): TextInputSchema => ({
  type: 'TextInput',
  key: name,
  name,
  statePath: name,
  inputType: 'text',
  ...extra,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fileUploadPaths', () => {
  it('reads lists and single paths alike, dropping empty entries', () => {
    expect(fileUploadPaths(['tmp:a', '', 'files/b.png'])).toEqual(['tmp:a', 'files/b.png'])
    expect(fileUploadPaths('tmp:a')).toEqual(['tmp:a'])
    expect(fileUploadPaths('')).toEqual([])
    expect(fileUploadPaths(null)).toEqual([])
    expect(fileUploadPaths(undefined)).toEqual([])
    expect(fileUploadPaths(42)).toEqual([])
  })
})

describe('fileUploadEntries', () => {
  it("prefers this session's entry for a temporary upload the server sends back without a url", () => {
    const uploaded = [{ path: 'tmp:a', name: 'a.png', url: 'blob:a', temporary: true }]

    expect(
      fileUploadEntries(
        ['tmp:a', 'files/b.png', 'tmp:c'],
        [
          { path: 'tmp:a', name: 'a.png', size: 3 },
          { path: 'files/b.png', name: 'b.png', url: '/storage/b.png' },
        ],
        uploaded,
      ),
    ).toEqual([
      { path: 'tmp:a', name: 'a.png', size: 3, url: 'blob:a', temporary: true },
      { path: 'files/b.png', name: 'b.png', url: '/storage/b.png' },
      { path: 'tmp:c', name: 'c' },
    ])
  })

  it('keeps the server entry when it has a url', () => {
    expect(
      fileUploadEntries(
        ['tmp:a'],
        [{ path: 'tmp:a', name: 'a', url: '/u' }],
        [{ path: 'tmp:a', name: 'a', url: 'blob:a' }],
      ),
    ).toEqual([{ path: 'tmp:a', name: 'a', url: '/u' }])
  })
})

describe('actionFormParams', () => {
  it('sends the selection of a bulk action with its form requests', () => {
    const params = actionFormParams({ component: 'table', records: [1, 2], allRecords: false })

    expect(params?.()).toMatchObject({ bulk: 1, records: [1, 2], allRecords: undefined })
  })

  it('marks "all records" selections', () => {
    expect(
      actionFormParams({ component: 'table', records: [], allRecords: true })?.(),
    ).toMatchObject({
      bulk: 1,
      allRecords: 1,
    })
  })

  it('sends nothing for record and page actions', () => {
    expect(actionFormParams({ component: 'table' })).toBeUndefined()
    expect(actionFormParams({ component: 'page' })).toBeUndefined()
  })

  it('still sends the owning form state of field actions', () => {
    const owner = new FormStore(
      { components: [text('title')], state: { title: 'Hi' } },
      { token: 't', component: 'form' },
    )

    expect(actionFormParams({ component: 'field:form::title', form: owner })?.()).toEqual({
      ownerState: { title: 'Hi' },
    })
  })
})

describe('pickerFilterFormOptions', () => {
  it('routes the picker filters through the owning form with the picker path', () => {
    const owner = new FormStore(
      { components: [text('author_id')], state: { author_id: null } },
      {
        token: 'tok',
        component: 'action:table.edit',
        record: 7,
        optionsUrl: '/options',
        params: () => ({ bulk: 1, records: [7] }),
      },
    )

    const options = pickerFilterFormOptions(owner, 'author_id')

    expect(options).toMatchObject({
      token: 'tok',
      component: 'action:table.edit',
      record: 7,
      optionsUrl: '/options',
    })
    expect(options.params?.()).toEqual({
      token: 'tok',
      component: 'action:table.edit',
      record: 7,
      bulk: 1,
      records: [7],
      pickerFilters: 'author_id',
      ownerState: { author_id: null },
    })
  })

  it('lets the filters form search options with the owner context', async () => {
    const owner = new FormStore(
      { components: [text('post_ids')], state: { post_ids: [] } },
      { token: 'tok', component: 'form', optionsUrl: 'https://app.test/options' },
    )
    const filters = new FormStore(
      { components: [text('author.value')], state: { author: { value: null } } },
      pickerFilterFormOptions(owner, 'post_ids'),
    )
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ options: [{ value: '1', label: 'Ann' }] })),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(filters.searchOptions('author.value', 'an')).resolves.toEqual([
      { value: '1', label: 'Ann' },
    ])

    const url = new URL(fetchMock.mock.calls[0]![0] as string)

    expect(url.searchParams.get('pickerFilters')).toBe('post_ids')
    expect(url.searchParams.get('component')).toBe('form')
    expect(url.searchParams.get('path')).toBe('author.value')
    expect(url.searchParams.get('search')).toBe('an')
  })
})

describe('wizard step validation', () => {
  const steps: SchemaComponent[] = [
    {
      type: 'Group',
      key: 'account',
      schema: [
        text('name'),
        { type: 'Section', key: 's', schema: [text('email')] } as SchemaComponent,
      ],
    } as SchemaComponent,
    { type: 'Group', key: 'profile', schema: [text('bio')] } as SchemaComponent,
  ]

  it('collects the state paths of a step, nested layouts included', () => {
    expect(wizardStepFieldPaths(steps[0]!)).toEqual(['name', 'email'])
  })

  it('passes without a validation endpoint', async () => {
    const store = new FormStore({ components: steps, state: {} }, { token: 't', component: 'form' })

    await expect(store.validateStep('account', ['name', 'email'])).resolves.toBe(true)
  })

  it("posts the step and replaces only that step's errors", async () => {
    const store = new FormStore(
      { components: steps, state: { name: '', email: 'x', bio: '' } },
      {
        token: 't',
        component: 'action:onboard',
        validateUrl: 'https://app.test/validate',
        params: () => ({ bulk: 1 }),
      },
    )
    store.setErrors({ bio: ['Required'], name: ['Stale'] })

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Invalid', errors: { email: ['Not an email'] } }), {
          status: 422,
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(store.validateStep('account', ['name', 'email'])).resolves.toBe(false)

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)

    expect(body).toMatchObject({
      token: 't',
      component: 'action:onboard',
      step: 'account',
      bulk: 1,
      state: { name: '', email: 'x', bio: '' },
    })
    // The other step's error is kept; the step's stale error is gone.
    expect(store.state.errors).toEqual({ bio: ['Required'], email: ['Not an email'] })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    )

    await expect(store.validateStep('account', ['name', 'email'])).resolves.toBe(true)
    expect(store.state.errors).toEqual({ bio: ['Required'] })
  })

  it('reports other failures and stays on the step', async () => {
    const onError = vi.fn()
    const store = new FormStore(
      { components: steps, state: {} },
      { token: 't', component: 'form', validateUrl: 'https://app.test/validate', onError },
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )

    await expect(store.validateStep('account', ['name'])).resolves.toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})

describe('translatable MarkdownEditor', () => {
  it('picks the HTML of the selected language', () => {
    const editor = {
      type: 'MarkdownEditor',
      key: 'content',
      name: 'content',
      statePath: 'content',
      toolbarButtons: [],
      fileAttachments: { disk: 'public', directory: null },
      html: { en: '<h1>Hello</h1>', ar: null },
      translatable: {
        defaultLocale: 'ar',
        locales: [
          { code: 'en', tag: 'en', label: 'English', direction: 'ltr' },
          { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl' },
        ],
      },
    } as RichEditorSchema

    expect(translatableLocaleField(editor, editor.translatable!.locales[0]!).html).toBe(
      '<h1>Hello</h1>',
    )
    expect(translatableLocaleField(editor, editor.translatable!.locales[1]!).html).toBeNull()
    // Non-translatable editors keep their string.
    expect(
      translatableLocaleField({ ...editor, html: '<p>x</p>' }, editor.translatable!.locales[1]!)
        .html,
    ).toBe('<p>x</p>')
  })
})

describe('onRefreshed', () => {
  it('fires after a live refresh is merged', async () => {
    const onRefreshed = vi.fn()
    const store = new FormStore(
      { components: [text('status')], state: { status: null } },
      { token: 't', component: 'form', refreshUrl: 'https://app.test/refresh', onRefreshed },
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ components: [text('status')], state: { status: 'published' } }),
          ),
      ),
    )

    await store.refresh('status')

    expect(onRefreshed).toHaveBeenCalledWith('status')
    expect(store.state.values.status).toBe('published')
  })
})
