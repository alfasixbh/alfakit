import type { TableSchema } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryBuilderRulesField } from '../src/components/fields/query-builder-rules'
import { FormProvider } from '../src/components/form/form-context'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'contact',
  pluralModelLabel: 'contacts',
  columns: [
    { type: 'TextColumn', name: 'name', label: 'Name', sortable: true, toggleable: true },
    { type: 'TextColumn', name: 'email', label: 'Email', toggleable: true },
    { type: 'TextColumn', name: 'phone', label: 'Phone', toggleable: true },
  ],
  visibleColumns: ['name', 'email', 'phone'],
  toggleableColumns: true,
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, cells: { name: { state: 'Ada' }, email: { state: 'a@x' }, phone: { state: '1' } } },
  ],
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No contacts', icon: 'inbox' },
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Contacts', content: [], token: 't' } })
})

const openManager = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Columns' }))

  return screen.findByRole('list', { name: 'Columns' })
}

describe('sort spinner', () => {
  it('shows a spinner on the clicked sort button until the visit finishes', () => {
    render(
      <Wrapper>
        <DataTable table={base} />
      </Wrapper>,
    )
    const button = screen.getByRole('button', { name: /Name/ })

    fireEvent.click(button)

    expect(button.querySelector('[data-slot="table-sort-spinner"]')).not.toBeNull()
    expect(button).toHaveAttribute('aria-busy', 'true')

    const options = vi.mocked(router.visit).mock.calls[0]![1] as { onFinish?: (v: never) => void }
    options.onFinish?.({} as never)

    return waitFor(() =>
      expect(button.querySelector('[data-slot="table-sort-spinner"]')).toBeNull(),
    )
  })
})

describe('column manager modal options', () => {
  it('opens in a slide-over with the trigger heading', async () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            columnManagerLayout: 'modal',
            triggerActions: { columnManager: { modal: { slideOver: true, heading: 'Pick' } } },
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveAttribute('data-slide-over')
    expect(within(dialog).getByText('Pick')).toBeInTheDocument()
  })

  it('uses the trigger modal width in the dialog', async () => {
    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            columnManagerLayout: 'modal',
            triggerActions: { columnManager: { modal: { width: '4xl' } } },
          }}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveClass('sm:max-w-4xl')
    expect(dialog).not.toHaveAttribute('data-slide-over')
  })
})

describe('column manager reorder announcements', () => {
  afterEach(() => {
    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })

  it('announces a deferred move and describes positions', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    render(
      <Wrapper>
        <DataTable table={{ ...base, reorderableColumns: true, deferColumnManager: true }} />
      </Wrapper>,
    )
    await openManager()
    const up = screen.getByRole('button', { name: 'Move Email up' })

    expect(document.getElementById(up.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Position 2 of 3.',
    )

    fireEvent.click(up)

    expect(document.querySelector('[data-slot="column-manager-announcement"]')).toHaveTextContent(
      'Email moved to position 1 of 3. Apply columns to save your changes.',
    )
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Move Email up' })).toBeDisabled()
  })

  it('moves and announces within a column group', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ columns: ['name', 'phone', 'email'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    render(
      <Wrapper>
        <DataTable
          table={{
            ...base,
            reorderableColumns: true,
            columnGroups: [{ label: 'Contact', columns: ['email', 'phone'] }],
          }}
        />
      </Wrapper>,
    )
    await openManager()

    // First inside its group, so it can't move up.
    expect(screen.getByRole('button', { name: 'Move Email up' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Move Phone up' }))

    await waitFor(() =>
      expect(document.querySelector('[data-slot="column-manager-announcement"]')).toHaveTextContent(
        'Phone moved to position 1 of 2 in Contact.',
      ),
    )
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ columns: ['name', 'phone', 'email'] })
  })
})

describe('grouped query builder constraints', () => {
  it('shows a labelled section per constraint group', async () => {
    const field = {
      type: 'QueryBuilderRules',
      key: 'query',
      name: 'query',
      statePath: 'queryBuilder.query',
      maxDepth: 1,
      constraints: [
        {
          name: 'status',
          label: 'Status',
          type: 'text',
          operators: [{ name: 'is', label: 'is', input: 'text' }],
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          group: 'Content',
          operators: [{ name: 'is', label: 'is', input: 'text' }],
        },
      ],
    }
    const store = new FormStore(
      { components: [field as never], state: {}, columns: { default: 1 } },
      { token: 't', component: 'table.filters' },
    )

    render(
      <Wrapper>
        <FormProvider store={store}>
          <QueryBuilderRulesField component={field as never} />
        </FormProvider>
      </Wrapper>,
    )

    fireEvent.pointerDown(screen.getByRole('button', { name: /Add rule/ }), {
      button: 0,
      ctrlKey: false,
    })
    const group = await screen.findByRole('group', { name: 'Content' })

    expect(within(group).getByRole('menuitem', { name: 'Title' })).toBeInTheDocument()
    expect(within(group).queryByRole('menuitem', { name: 'Status' })).toBeNull()
  })
})
