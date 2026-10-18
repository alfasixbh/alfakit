import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form), { attachTo: document.body }) }
}

const field = (type: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ type, key: name, name, statePath: name, label: name, ...extra }) as SchemaComponent

const textInput = (path: string) =>
  ({
    type: 'TextInput',
    key: path,
    name: 'text',
    statePath: path,
    label: 'Text',
    inputType: 'text',
  }) as SchemaComponent

const builder = (extra: Record<string, unknown> = {}) =>
  field('Builder', 'content', {
    label: 'Content',
    items: [],
    blocks: [
      {
        name: 'heading',
        label: 'Heading',
        maxItems: 1,
        schema: [textInput('content.__INDEX__.data.text')],
        state: { type: 'heading', data: { text: null } },
      },
      {
        name: 'paragraph',
        label: 'Paragraph',
        schema: [textInput('content.__INDEX__.data.text')],
        state: { type: 'paragraph', data: { text: '' } },
      },
    ],
    blockNumbers: true,
    blockLabels: true,
    addable: true,
    deletable: true,
    reorderable: true,
    cloneable: true,
    addActionLabel: 'Add to content',
    ...extra,
  })

const button = (label: string) =>
  [...document.querySelectorAll('button')].find(
    (element) => (element.getAttribute('aria-label') ?? element.textContent?.trim()) === label,
  ) as HTMLButtonElement | undefined

describe('Builder', () => {
  it('renders items with the template schema and moves, clones and removes them', async () => {
    const { store } = renderForm([builder()], {
      content: [
        { type: 'paragraph', data: { text: 'a' } },
        { type: 'heading', data: { text: 'b' } },
      ],
    })
    await nextTick()

    expect(document.querySelector('#alfakit-content-1-data-text')).not.toBeNull()

    button('Move down')!.click()
    await nextTick()
    expect((store.getValue('content') as Array<{ type: string }>).map((item) => item.type)).toEqual(
      ['heading', 'paragraph'],
    )

    expect([...document.querySelectorAll('button[aria-label="Clone"]')]).toHaveLength(1)
    button('Clone')!.click()
    await nextTick()
    expect(store.getValue('content')).toHaveLength(3)

    button('Remove')!.click()
    await nextTick()
    expect(store.getValue('content')).toHaveLength(2)
  })

  it('shows the empty state and hides controls when read-only', async () => {
    renderForm([builder({ readOnly: true })], { content: [] })
    await nextTick()

    expect(document.body.textContent).toContain('No blocks yet.')
    expect(button('Add to content')).toBeUndefined()
  })
})

describe('ToggleButtons', () => {
  const options = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published', color: 'success' },
    { value: 'archived', label: 'Archived', disabled: true },
  ]

  it('selects one value, or several when multiple', async () => {
    const single = renderForm([field('ToggleButtons', 'status', { options })], { status: 'draft' })
    await nextTick()

    expect(button('Draft')!.getAttribute('aria-pressed')).toBe('true')
    expect(button('Archived')!.disabled).toBe(true)
    button('Published')!.click()
    expect(single.store.getValue('status')).toBe('published')

    single.wrapper.unmount()
    document.body.innerHTML = ''

    const multiple = renderForm([field('ToggleButtons', 'tags', { options, multiple: true })], {
      tags: ['draft'],
    })
    await nextTick()
    button('Published')!.click()
    await nextTick()
    button('Draft')!.click()

    expect(multiple.store.getValue('tags')).toEqual(['published'])
  })
})

describe('Slider', () => {
  it('renders a thumb per value and steps with the keyboard', async () => {
    const { store } = renderForm(
      [
        field('Slider', 'price', {
          min: 0,
          max: 100,
          step: 5,
          multiple: true,
          tooltips: true,
          pips: true,
        }),
      ],
      { price: [20, 80] },
    )
    await flushPromises()

    const thumbs = [...document.querySelectorAll('[role="slider"]')] as HTMLElement[]

    expect(thumbs).toHaveLength(2)
    expect(thumbs[0]!.getAttribute('aria-label')).toBe('Minimum')
    expect(thumbs[1]!.getAttribute('aria-valuetext')).toBe('80')

    thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()

    expect(store.getValue('price')).toEqual([25, 80])
  })
})

describe('CodeEditor', () => {
  it('highlights code and indents with Tab once loaded', async () => {
    const { store } = renderForm(
      [field('CodeEditor', 'code', { language: 'javascript', lineNumbers: true, tabSize: 2 })],
      { code: 'const a = 1' },
    )

    await vi.waitFor(() => expect(document.querySelector('textarea')).not.toBeNull())
    const textarea = document.querySelector('textarea')!

    expect(document.querySelector('pre span')?.textContent).toBe('const')

    textarea.setSelectionRange(0, 0)
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    )

    expect(store.getValue('code')).toBe('  const a = 1')
  })
})

describe('ModalTableSelect', () => {
  const response = {
    labels: { 1: 'Ada', 2: 'Grace' },
    table: {
      type: 'Table',
      modelLabel: 'user',
      pluralModelLabel: 'users',
      columns: [{ type: 'TextColumn', name: 'name', label: 'Name' }],
      visibleColumns: ['name'],
      filtersLayout: 'dropdown',
      recordActionsPosition: 'after-columns',
      searchPlaceholder: 'Search',
      searchDebounce: 0,
      emptyState: { heading: 'No users' },
      records: [
        { key: 1, selectable: true, cells: { name: { state: 'Ada', disabled: true } } },
        { key: 2, selectable: true, cells: { name: { state: 'Grace', disabled: true } } },
      ],
      pagination: {
        currentPage: 1,
        lastPage: 1,
        perPage: 10,
        total: 2,
        from: 1,
        to: 2,
        pageOptions: [10],
      },
    },
  }

  it('picks records in the modal and stores their keys', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(response)))
    vi.stubGlobal('fetch', fetchMock)

    const { store } = renderForm(
      [
        field('ModalTableSelect', 'users', {
          multiple: true,
          modalHeading: 'Select users',
          selectActionLabel: 'Select',
          tableStateIdentifier: 'table',
        }),
      ],
      { users: [] },
    )
    // The picker's code loads lazily.
    await vi.waitFor(() => expect(button('Select')).toBeDefined())

    button('Select')!.click()
    await flushPromises()
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Select Grace"]')).not.toBeNull(),
    )

    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('table=1')
    ;(document.querySelector('[aria-label="Select Grace"]') as HTMLElement).click()
    await nextTick()

    const confirm = [...document.querySelectorAll('[role="dialog"] button')].find(
      (element) => element.textContent?.trim() === 'Select',
    ) as HTMLButtonElement
    confirm.click()
    await nextTick()

    expect(store.getValue('users')).toEqual(['2'])
    expect(document.body.textContent).toContain('Grace')
  })
})
