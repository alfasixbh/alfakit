import {
  appendRepeaterItem,
  cloneIndexedState,
  cloneRepeaterItem,
  collectFields,
  componentHasErrors,
  findFieldByPath,
  formIdentity,
  FormStore,
  isLeavingVisit,
  moveIndexedState,
  moveRepeaterItem,
  removeIndexedState,
  removeRepeaterItem,
  tabFromQuery,
  tabQueryValue,
  tabToReveal,
  wizardStepToReveal,
} from '../src/form'
import type { SchemaComponent } from '../src/schema/components'

const components: SchemaComponent[] = [
  {
    type: 'Section',
    key: 'section',
    schema: [
      {
        type: 'TextInput',
        key: 'title',
        name: 'title',
        statePath: 'title',
        inputType: 'text',
        live: { onBlur: false, debounce: 10 },
      },
      { type: 'TextInput', key: 'slug', name: 'slug', statePath: 'slug', inputType: 'text' },
      {
        type: 'TextInput',
        key: 'email',
        name: 'email',
        statePath: 'email',
        inputType: 'email',
        live: { onBlur: true, debounce: null },
      },
    ],
  } as SchemaComponent,
  {
    type: 'Repeater',
    key: 'items',
    name: 'items',
    statePath: 'items',
    items: [
      {
        key: '0',
        schema: [
          {
            type: 'TextInput',
            key: 'items.0.sku',
            name: 'sku',
            statePath: 'items.0.sku',
            inputType: 'text',
          },
        ],
      },
    ],
    template: [],
    templateState: { sku: null },
    addable: true,
    deletable: true,
    reorderable: true,
    addActionLabel: 'Add',
  } as SchemaComponent,
]

describe('FormStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('collects fields recursively including repeater items', () => {
    expect(collectFields(components).map((field) => field.statePath)).toEqual([
      'title',
      'slug',
      'email',
      'items',
      'items.0.sku',
    ])
  })

  it('tracks values, dirtiness and errors', () => {
    const form = new FormStore(
      { components, state: { title: 'A', slug: null, items: [{ sku: 'X' }] } },
      { token: 't', component: 'form' },
    )

    expect(form.getValue('items.0.sku')).toBe('X')

    form.setValue('slug', 'a', { silent: true })
    expect(form.isDirty).toBe(true)
    expect(form.state.dirty.has('slug')).toBe(true)

    form.setErrors({ slug: 'Taken', title: ['Required'] })
    expect(form.getError('slug')).toBe('Taken')

    form.setValue('slug', 'b', { silent: true })
    expect(form.getError('slug')).toBeUndefined()
    expect(form.getError('title')).toBe('Required')
  })

  it('refreshes live fields through the endpoint and keeps in-flight edits', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        state: Record<string, unknown>
        path: string
      }

      return new Response(
        JSON.stringify({
          components,
          state: { ...body.state, slug: String(body.state.title).toLowerCase() },
        }),
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const form = new FormStore(
      { components, state: { title: '', slug: null } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    form.setValue('title', 'Hello')
    form.setValue('email', 'x@y.z') // onBlur field: no automatic refresh

    await vi.advanceTimersByTimeAsync(20)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(form.getValue('slug')).toBe('hello')
    expect(form.getValue('email')).toBe('x@y.z')

    form.blur('email')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('debounces live fields by 150 ms without a server debounce and coalesces rapid typing', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { state: Record<string, unknown> }

      return new Response(JSON.stringify({ components: liveComponents, state: body.state }), {
        status: 200,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const liveComponents: SchemaComponent[] = [
      {
        type: 'TextInput',
        key: 'name',
        name: 'name',
        statePath: 'name',
        inputType: 'text',
        live: { onBlur: false, debounce: null },
      } as SchemaComponent,
      {
        type: 'Select',
        key: 'status',
        name: 'status',
        statePath: 'status',
        live: { onBlur: false, debounce: 0 },
      } as SchemaComponent,
    ]
    const form = new FormStore(
      { components: liveComponents, state: { name: '', status: null } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    // Ten keystrokes 50 ms apart: one request, 150 ms after the last one.
    for (const value of [
      'a',
      'ab',
      'abc',
      'abcd',
      'abcde',
      'abcdef',
      'abcdefg',
      'abcdefgh',
      'abcdefghi',
      'abcdefghij',
    ]) {
      form.setValue('name', value)
      await vi.advanceTimersByTimeAsync(50)
    }

    expect(fetchMock).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).state.name).toBe('abcdefghij')

    // A choice (`debounce: 0` from the server) refreshes on the next tick.
    form.setValue('status', 'active')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('takes server $set values for paths edited before the refresh, keeps in-flight edits', async () => {
    let release: (() => void) | undefined

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { state: Record<string, unknown> }
      await new Promise<void>((resolve) => {
        release = resolve
      })

      return new Response(
        JSON.stringify({
          components,
          // The server overwrites `slug` (edited earlier, so dirty) and echoes `title`.
          state: { ...body.state, slug: 'from-server', email: 'server@x.y' },
        }),
        { status: 200 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const form = new FormStore(
      { components, state: { title: '', slug: null, email: null } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    form.setValue('slug', 'mine', { silent: true })
    form.setValue('title', 'Hello', { silent: true })

    const pending = form.refresh('title')
    await vi.waitFor(() => expect(release).toBeDefined())

    expect(form.state.refreshing).toBe(true)
    // Typing while the request is in flight.
    form.setValue('email', 'typed@x.y', { silent: true })

    release?.()
    await pending

    expect(form.getValue('slug')).toBe('from-server')
    expect(form.getValue('email')).toBe('typed@x.y')
    expect(form.getValue('title')).toBe('Hello')
    expect(form.state.refreshing).toBe(false)
  })

  it('sends the value the server last saw as `old` with a refresh', async () => {
    const bodies: Array<{ path?: string; old?: unknown }> = []
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { state: Record<string, unknown> }
      bodies.push(body)

      return new Response(JSON.stringify({ components, state: body.state }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const form = new FormStore(
      { components, state: { title: 'First', slug: null, email: null } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    form.setValue('title', 'Second', { silent: true })
    await form.refresh('title')
    form.setValue('title', 'Third', { silent: true })
    await form.refresh('title')

    expect(bodies.map((body) => body.old)).toEqual(['First', 'Second'])
  })

  it('refreshes live fields of repeater items the browser added before the server saw them', async () => {
    vi.useFakeTimers()

    const picker = (statePath: string) =>
      ({
        type: 'ModalTableSelect',
        key: statePath,
        name: 'product_id',
        statePath,
        live: { onBlur: false, debounce: 10 },
      }) as SchemaComponent
    const lines: SchemaComponent[] = [
      {
        type: 'Repeater',
        key: 'items',
        name: 'items',
        statePath: 'items',
        items: [{ key: '0', schema: [picker('items.0.product_id')] }],
        template: [picker('items.__INDEX__.product_id')],
        templateState: { product_id: null },
        addable: true,
        deletable: true,
        reorderable: false,
        addActionLabel: 'Add',
      } as SchemaComponent,
    ]
    const paths: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          state: Record<string, unknown>
          path: string
        }
        paths.push(body.path)

        return new Response(JSON.stringify({ components: lines, state: body.state }), {
          status: 200,
        })
      }),
    )

    const form = new FormStore(
      { components: lines, state: { items: [{ product_id: null }] } },
      { token: 't', component: 'form', refreshUrl: '/refresh' },
    )

    form.setValue(
      'items',
      appendRepeaterItem(form.getValue<unknown[]>('items'), { product_id: null }),
    )
    form.setValue('items.1.product_id', '7')
    await vi.advanceTimersByTimeAsync(20)

    expect(paths).toEqual(['items.1.product_id'])

    vi.useRealTimers()
  })

  it('finds fields of fresh items in nested repeater templates and builder blocks', () => {
    const text = (statePath: string, live = false) =>
      ({
        type: 'TextInput',
        key: statePath,
        name: statePath.split('.').pop(),
        statePath,
        inputType: 'text',
        ...(live ? { live: { onBlur: true, debounce: null } } : {}),
      }) as SchemaComponent
    const nested: SchemaComponent[] = [
      {
        type: 'Repeater',
        key: 'items',
        name: 'items',
        statePath: 'items',
        items: [],
        template: [
          {
            type: 'Repeater',
            key: 'items.__INDEX__.lines',
            name: 'lines',
            statePath: 'items.__INDEX__.lines',
            items: [],
            template: [text('items.__INDEX__.lines.__INDEX__.qty', true)],
            templateState: {},
          } as unknown as SchemaComponent,
        ],
        templateState: {},
      } as unknown as SchemaComponent,
      {
        type: 'Builder',
        key: 'content',
        name: 'content',
        statePath: 'content',
        items: [],
        blocks: [
          { name: 'quote', schema: [text('content.__INDEX__.data.body')] },
          { name: 'paragraph', schema: [text('content.__INDEX__.data.body', true)] },
        ],
      } as unknown as SchemaComponent,
    ]
    const values = { content: [{ type: 'quote' }, { type: 'paragraph' }] }

    expect(findFieldByPath(nested, 'items.3.lines.12.qty')?.live).toEqual({
      onBlur: true,
      debounce: null,
    })
    expect(findFieldByPath(nested, 'items.3.lines.x.qty')).toBeUndefined()
    expect(findFieldByPath(nested, 'content.1.data.body', values)?.live).toBeDefined()
    expect(findFieldByPath(nested, 'content.0.data.body', values)?.live).toBeUndefined()
    expect(findFieldByPath(nested, 'items')?.type).toBe('Repeater')
  })

  it('manipulates repeater items', () => {
    const items = [{ sku: 'a' }, { sku: 'b' }]

    expect(appendRepeaterItem(items, { sku: null })).toEqual([
      { sku: 'a' },
      { sku: 'b' },
      { sku: null },
    ])
    expect(removeRepeaterItem(items, 0)).toEqual([{ sku: 'b' }])
    expect(moveRepeaterItem(items, 0, 1)).toEqual([{ sku: 'b' }, { sku: 'a' }])
    expect(cloneRepeaterItem(items, 0)).toEqual([{ sku: 'a' }, { sku: 'a' }, { sku: 'b' }])
  })

  it('adds and clones items whose state is a reactive proxy (Svelte $state, Vue reactive)', () => {
    const template = new Proxy({ product_id: null, quantity: 1 }, {})
    const items = [new Proxy({ product_id: '4', quantity: 2 }, {})]

    const added = appendRepeaterItem(items, template)
    expect(added[1]).toEqual({ product_id: null, quantity: 1 })
    expect(added[1]).not.toBe(template)
    expect(cloneRepeaterItem(items, 0)[1]).toEqual({ product_id: '4', quantity: 2 })
  })
})

describe('form identity and the unsaved-changes guard', () => {
  it('keys a form by page class, record and form, never by the token', () => {
    const block = { key: 'form', component: 'form', operation: 'edit' }

    expect(formIdentity({ class: 'EditPost', record: 1 }, block)).toBe(
      formIdentity({ class: 'EditPost', record: 1 }, { ...block }),
    )
    expect(formIdentity({ class: 'EditPost', record: 1 }, block)).not.toBe(
      formIdentity({ class: 'EditPost', record: 2 }, block),
    )
    expect(formIdentity({ class: 'EditPost', record: 1 }, block)).not.toBe(
      formIdentity({ class: 'CreatePost' }, block),
    )
  })

  it('only treats visits that leave the page as leaving', () => {
    const here = 'https://app.test/admin/posts/1/edit'

    expect(isLeavingVisit({ method: 'get', url: 'https://app.test/admin/posts' }, here)).toBe(true)
    expect(isLeavingVisit({ method: 'post', url: 'https://app.test/_alfakit/action' }, here)).toBe(
      false,
    )
    expect(isLeavingVisit({ method: 'get', url: here, only: ['page'] }, here)).toBe(false)
    expect(
      isLeavingVisit({ method: 'get', url: `${here}?comments_page=2`, preserveState: true }, here),
    ).toBe(false)
    expect(isLeavingVisit({ method: 'get', url: here, preserveState: false }, here)).toBe(true)
  })

  it('swaps the token without resetting state', () => {
    const store = new FormStore(
      { components: [], state: { title: 'x' } },
      { token: 'a', component: 'form' },
    )
    store.setValue('title', 'y')
    store.setToken('b')

    expect(store.state.values).toEqual({ title: 'y' })
    expect(store.isDirty).toBe(true)
  })
})

describe('repeater item UI state', () => {
  it('follows its item when items move, are removed or cloned', () => {
    const collapsed = { 0: true, 2: false }

    expect(moveIndexedState(collapsed, 0, 2)).toEqual({ 1: false, 2: true })
    expect(moveIndexedState(collapsed, 2, 0)).toEqual({ 0: false, 1: true })
    expect(removeIndexedState(collapsed, 0)).toEqual({ 1: false })
    expect(removeIndexedState(collapsed, 1)).toEqual({ 0: true, 1: false })
    expect(cloneIndexedState(collapsed, 0)).toEqual({ 0: true, 1: true, 3: false })
  })
})

describe('wizard error navigation', () => {
  const steps: SchemaComponent[] = [
    {
      type: 'Step',
      key: 'one',
      schema: [{ type: 'TextInput', key: 'a', name: 'a', statePath: 'a' } as SchemaComponent],
    },
    {
      type: 'Step',
      key: 'two',
      schema: [{ type: 'TextInput', key: 'b', name: 'b', statePath: 'b' } as SchemaComponent],
    },
  ]

  it('reveals the first errored step only when new errors arrive', () => {
    expect(wizardStepToReveal(steps, {}, { b: ['Required'] })).toBe(1)
    expect(wizardStepToReveal(steps, {}, { a: ['x'], b: ['y'] })).toBe(0)
    // An error was cleared by editing: stay where the user is.
    expect(wizardStepToReveal(steps, { a: ['x'], b: ['y'] }, { b: ['y'] })).toBeNull()
    expect(wizardStepToReveal(steps, { b: ['y'] }, { b: ['y'] })).toBeNull()
    expect(wizardStepToReveal(steps, {}, { other: ['y'] })).toBeNull()
  })
})

describe('tab error navigation', () => {
  const tabs: SchemaComponent[] = [
    {
      type: 'Tab',
      key: 'inputs',
      schema: [
        { type: 'TextInput', key: 'email', name: 'email', statePath: 'email' } as SchemaComponent,
      ],
    },
    {
      type: 'Tab',
      key: 'items',
      schema: [
        {
          type: 'Repeater',
          key: 'lines',
          name: 'lines',
          statePath: 'lines',
          items: [],
        } as unknown as SchemaComponent,
      ],
    },
    { type: 'Tab', key: 'later', deferred: true, deferredPaths: ['notes'] },
  ]

  it('tells which tabs hold a field with an error', () => {
    expect(componentHasErrors(tabs[0]!, { email: ['Invalid'] })).toBe(true)
    expect(componentHasErrors(tabs[0]!, { emails: ['Invalid'] })).toBe(false)
    // An item field of a repeater in the tab.
    expect(componentHasErrors(tabs[1]!, { 'lines.0.sku': ['Required'] })).toBe(true)
    // A deferred tab answers from its field paths.
    expect(componentHasErrors(tabs[2]!, { notes: ['Required'] })).toBe(true)
    expect(componentHasErrors(tabs[0]!, {})).toBe(false)
  })

  it('reads and writes readable tab values in the query string, accepting old keys', () => {
    const list = [
      { key: 'tabs-0.tab-0', queryValue: 'billing-address' },
      { key: 'tabs-0.tab-1', queryValue: 'shipping' },
      { key: 'tabs-0.tab-2' },
    ]

    expect(tabFromQuery(list, 'shipping')).toBe('tabs-0.tab-1')
    // Links written before tabs had readable values.
    expect(tabFromQuery(list, 'tabs-0.tab-0')).toBe('tabs-0.tab-0')
    expect(tabFromQuery(list, 'gone')).toBeNull()
    expect(tabFromQuery(list, null)).toBeNull()
    expect(tabQueryValue(list[0]!)).toBe('billing-address')
    expect(tabQueryValue(list[2]!)).toBe('tabs-0.tab-2')
  })

  it('reveals the first tab with an error unless the active one has one', () => {
    expect(tabToReveal(tabs, 'items', {}, { email: ['x'] })).toBe('inputs')
    expect(tabToReveal(tabs, 'items', {}, { email: ['x'], 'lines.1.qty': ['y'] })).toBeNull()
    // Errors only went away: stay where the user is.
    expect(tabToReveal(tabs, 'items', { email: ['x'] }, { email: ['x'] })).toBeNull()
    expect(tabToReveal(tabs, 'inputs', {}, { other: ['x'] })).toBeNull()
  })
})
