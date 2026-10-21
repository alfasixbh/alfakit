import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll } from 'vitest'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

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
        icon: 'heading',
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
  it('adds blocks from the picker, honouring block limits', async () => {
    const { store } = renderForm([builder()], { content: [] })

    // No blocks yet: the picker is shown inline.
    expect(screen.getByText('Add your first block')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Heading/ }))

    expect(store.getValue('content')).toEqual([{ type: 'heading', data: { text: null } }])
    expect(screen.getByLabelText('Text')).toHaveAttribute('id', 'alfakit-content-0-data-text')

    fireEvent.click(screen.getByRole('button', { name: 'Add to content' }))
    const picker = await screen.findByRole('dialog', { name: 'Choose a block' })
    expect(within(picker).getByRole('button', { name: /Heading/ })).toBeDisabled()
  })

  it('moves, clones and removes items', () => {
    const { store } = renderForm([builder()], {
      content: [
        { type: 'paragraph', data: { text: 'a' } },
        { type: 'heading', data: { text: 'b' } },
      ],
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]!)
    expect((store.getValue('content') as Array<{ type: string }>).map((item) => item.type)).toEqual(
      ['heading', 'paragraph'],
    )

    // Headings are limited to one: only the paragraph can be cloned.
    expect(screen.getAllByRole('button', { name: 'Clone' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Clone' }))
    expect(store.getValue('content')).toHaveLength(3)

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!)
    expect((store.getValue('content') as Array<{ type: string }>).map((item) => item.type)).toEqual(
      ['paragraph', 'paragraph'],
    )
  })

  it('puts the item actions in a menu and shows the item summary', async () => {
    const { store } = renderForm(
      [
        builder({
          blockActionsMenu: true,
          items: [
            { key: '0', type: 'paragraph', label: 'Paragraph', summary: 'Hello there', schema: [] },
          ],
        }),
      ],
      {
        content: [
          { type: 'paragraph', data: { text: 'a' } },
          { type: 'paragraph', data: { text: 'b' } },
        ],
      },
    )

    expect(screen.getByText('Hello there')).toHaveAttribute('data-slot', 'builder-item-summary')
    expect(screen.queryByRole('button', { name: 'Clone' })).toBeNull()

    const menu = screen.getAllByRole('button', { name: 'Actions for Paragraph' })[0]!
    fireEvent.pointerDown(menu, { button: 0, ctrlKey: false, pointerType: 'mouse' })
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Move up' })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))

    expect(store.getValue('content')).toHaveLength(3)
  })

  it('refreshes the server-made summary when an item of a block with a summary collapses', () => {
    const base = builder({ collapsible: true })
    const blocks = (base as unknown as { blocks: Array<Record<string, unknown>> }).blocks
    const { store } = renderForm(
      [{ ...base, blocks: [blocks[0]!, { ...blocks[1]!, summary: true }] } as SchemaComponent],
      {
        content: [
          { type: 'heading', data: { text: 'a' } },
          { type: 'paragraph', data: { text: 'b' } },
        ],
      },
    )
    const refresh = vi.spyOn(store, 'refresh').mockResolvedValue(undefined as never)

    // The heading block has no summary: nothing to refresh.
    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse' })[0]!)
    expect(refresh).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse' })[0]!)
    expect(refresh).toHaveBeenCalledWith('content')

    // Expanding does not.
    refresh.mockClear()
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0]!)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('moves through the picker with the keyboard and adds the first search match', () => {
    const { store } = renderForm([builder({ blockSearch: true })], { content: [] })
    const search = screen.getByRole('textbox', { name: 'Search blocks…' })

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(document.activeElement).toHaveAttribute('data-block', 'heading')

    fireEvent.change(search, { target: { value: 'para' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(store.getValue('content')).toEqual([{ type: 'paragraph', data: { text: '' } }])
  })

  it('hides editing controls when read-only', () => {
    renderForm([builder({ readOnly: true })], { content: [{ type: 'paragraph', data: {} }] })

    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add to content' })).toBeNull()
  })
})

describe('ToggleButtons', () => {
  const options = [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'published', label: 'Published', icon: 'check' },
    { value: 'archived', label: 'Archived', disabled: true },
  ]

  it('acts as a radio group with aria-pressed buttons', () => {
    const { store } = renderForm(
      [field('ToggleButtons', 'status', { options, grouped: true, inline: true })],
      {
        status: 'draft',
      },
    )

    expect(screen.getByRole('button', { name: 'Draft' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Archived' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Published' }))
    expect(store.getValue('status')).toBe('published')
    expect(screen.getByRole('group')).toHaveAttribute('data-slot', 'toggle-buttons')
  })

  it('toggles several values when multiple', () => {
    const { store } = renderForm([field('ToggleButtons', 'tags', { options, multiple: true })], {
      tags: ['draft'],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Published' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }))

    expect(store.getValue('tags')).toEqual(['published'])
  })
})

describe('Slider', () => {
  it('renders one thumb per value with locale-formatted text and keyboard steps', () => {
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

    fireEvent.keyDown(thumbs[0]!, { key: 'ArrowRight' })
    expect(store.getValue('price')).toEqual([25, 80])
  })

  it('clamps a single value into range', () => {
    renderForm([field('Slider', 'volume', { min: 0, max: 10, step: 1 })], { volume: 50 })

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '10')
  })
})

describe('CodeEditor', () => {
  it('server-renders the code without the editor', () => {
    const store = new FormStore(
      { components: [], state: { code: '<?php echo 1;' } },
      { token: 't', component: 'form' },
    )
    const html = renderToString(
      <Wrapper>
        <FormProvider store={store}>
          <SchemaRenderer
            components={[
              field('CodeEditor', 'code', { language: 'php', lineNumbers: true, tabSize: 4 }),
            ]}
          />
        </FormProvider>
      </Wrapper>,
    )

    expect(html).toContain('&lt;?php echo 1;')
    expect(html).not.toContain('<textarea')
  })

  it('highlights code and indents with Tab', async () => {
    const { store, container } = renderForm(
      [field('CodeEditor', 'code', { language: 'javascript', lineNumbers: true, tabSize: 2 })],
      { code: 'const a = 1' },
    )

    const textarea = (await screen.findByLabelText('code')) as HTMLTextAreaElement

    expect(container.querySelector('pre span')?.textContent).toBe('const')
    expect(textarea).toHaveAttribute('spellcheck', 'false')

    textarea.setSelectionRange(0, 0)
    fireEvent.keyDown(textarea, { key: 'Tab' })
    expect(store.getValue('code')).toBe('  const a = 1')

    fireEvent.keyDown(textarea, { key: 'Escape' })
    fireEvent.keyDown(textarea, { key: 'Tab' })
    expect(store.getValue('code')).toBe('  const a = 1')
  })
})

describe('ModalTableSelect', () => {
  afterEach(() => vi.unstubAllGlobals())

  const response = (page: number) => ({
    labels: page === 1 ? { 1: 'Ada', 2: 'Grace' } : { 3: 'Linus' },
    table: {
      type: 'Table',
      modelLabel: 'user',
      pluralModelLabel: 'users',
      columns: [{ type: 'TextColumn', name: 'name', label: 'Name', sortable: true }],
      visibleColumns: ['name'],
      filtersLayout: 'dropdown',
      recordActionsPosition: 'after-columns',
      searchable: true,
      searchPlaceholder: 'Search',
      searchDebounce: 0,
      emptyState: { heading: 'No users' },
      records:
        page === 1
          ? [
              { key: 1, selectable: true, cells: { name: { state: 'Ada', disabled: true } } },
              { key: 2, selectable: true, cells: { name: { state: 'Grace', disabled: true } } },
            ]
          : [{ key: 3, selectable: true, cells: { name: { state: 'Linus', disabled: true } } }],
      pagination: {
        currentPage: page,
        lastPage: 2,
        perPage: 2,
        total: 3,
        from: 1,
        to: 2,
        pageOptions: [2],
      },
    },
  })

  function stubFetch() {
    const fetchMock = vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(response(url.includes('table_page=2') ? 2 : 1))),
    )
    vi.stubGlobal('fetch', fetchMock)

    return fetchMock
  }

  const picker = (extra: Record<string, unknown> = {}) =>
    field('ModalTableSelect', 'users', {
      label: 'Users',
      modalHeading: 'Select users',
      selectActionLabel: 'Select',
      tableStateIdentifier: 'table',
      ...extra,
    })

  it('selects several records across pages and stores their keys', async () => {
    const fetchMock = stubFetch()
    const { store } = renderForm([picker({ multiple: true, maxItems: 2 })], { users: [] })

    // The picker's code loads lazily.
    expect(await screen.findByText('Nothing selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: 'Select Ada' }))

    fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }))
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: 'Select Linus' }))

    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('table_page=2')
    expect(within(dialog).getByText('You can select up to 2 records.')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Select' }))

    expect(store.getValue('users')).toEqual(['1', '3'])
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Linus')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Ada' }))
    expect(store.getValue('users')).toEqual(['3'])
  })

  it('selects a single record and sends the search to the server', async () => {
    const fetchMock = stubFetch()
    const { store } = renderForm([picker({ selectedLabels: { 2: 'Grace' } })], { users: 2 })

    expect(await screen.findByText('Grace')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'ad' },
    })

    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('table_search=ad'),
    )

    fireEvent.click(await within(dialog).findByRole('radio', { name: 'Select Ada' }))
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Select' }))
    })

    expect(store.getValue('users')).toBe('1')
  })

  it('hides the picker button when disabled', () => {
    renderForm([picker({ disabled: true })], { users: null })

    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull()
  })
})
