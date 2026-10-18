import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { tick } from 'svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => vi.unstubAllGlobals())

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(Wrapper, {
    props: { component: FormHarness, props: { store } },
  })

  return { store, ...view }
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

describe('Builder', () => {
  it('renders block templates and moves, clones and removes items', async () => {
    const { store, container } = renderForm([builder()], {
      content: [
        { type: 'paragraph', data: { text: 'a' } },
        { type: 'heading', data: { text: 'b' } },
      ],
    })

    expect(container.querySelector('#alfakit-content-1-data-text')).not.toBeNull()

    await fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]!)
    expect((store.getValue('content') as Array<{ type: string }>).map((item) => item.type)).toEqual(
      ['heading', 'paragraph'],
    )

    expect(screen.getAllByRole('button', { name: 'Clone' })).toHaveLength(1)
    await fireEvent.click(screen.getByRole('button', { name: 'Clone' }))
    expect(store.getValue('content')).toHaveLength(3)

    await fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!)
    expect(store.getValue('content')).toHaveLength(2)
  })

  it('shows the empty state and hides controls when read-only', () => {
    renderForm([builder({ readOnly: true })], { content: [] })

    expect(screen.getByText('No blocks yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to content' })).toBeNull()
  })
})

describe('ToggleButtons', () => {
  const options = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published', color: 'success' },
    { value: 'archived', label: 'Archived', disabled: true },
  ]

  it('selects one value', async () => {
    const { store } = renderForm([field('ToggleButtons', 'status', { options })], {
      status: 'draft',
    })

    expect(screen.getByRole('button', { name: 'Draft' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Archived' })).toBeDisabled()

    await fireEvent.click(screen.getByRole('button', { name: 'Published' }))
    expect(store.getValue('status')).toBe('published')
  })

  it('toggles several values when multiple', async () => {
    const { store } = renderForm([field('ToggleButtons', 'tags', { options, multiple: true })], {
      tags: ['draft'],
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Published' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Draft' }))

    expect(store.getValue('tags')).toEqual(['published'])
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

    const thumbs = screen.getAllByRole('slider')

    expect(thumbs).toHaveLength(2)
    expect(thumbs[0]).toHaveAttribute('aria-label', 'Minimum')
    expect(thumbs[1]).toHaveAttribute('aria-valuetext', '80')

    await fireEvent.keyDown(thumbs[0]!, { key: 'ArrowRight' })
    await tick()

    expect(store.getValue('price')).toEqual([25, 80])
  })
})

describe('CodeEditor', () => {
  it('highlights code and indents with Tab once loaded', async () => {
    const { store, container } = renderForm(
      [field('CodeEditor', 'code', { language: 'javascript', lineNumbers: true, tabSize: 2 })],
      { code: 'const a = 1' },
    )

    const textarea = (await screen.findByLabelText('code')) as HTMLTextAreaElement

    expect(container.querySelector('pre span')?.textContent).toBe('const')

    textarea.setSelectionRange(0, 0)
    await fireEvent.keyDown(textarea, { key: 'Tab' })

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
      searchable: true,
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

  it('picks a record in the modal and stores its key', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(response)))
    vi.stubGlobal('fetch', fetchMock)

    const { store } = renderForm(
      [
        field('ModalTableSelect', 'user', {
          modalHeading: 'Select a user',
          selectActionLabel: 'Select',
          tableStateIdentifier: 'table',
        }),
      ],
      { user: null },
    )

    // The picker's code loads lazily.
    await fireEvent.click(await screen.findByRole('button', { name: 'Select' }))

    const dialog = await screen.findByRole('dialog')
    const radio = await within(dialog).findByRole('radio', { name: 'Select Grace' })

    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toContain('table=1')

    await fireEvent.click(radio)
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Select' }))

    expect(store.getValue('user')).toBe('2')
    await waitFor(() => expect(screen.getByText('Grace')).toBeInTheDocument())
  })
})
