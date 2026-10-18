import type { TableSchema } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import FormHarness from './FormHarness.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No contacts', icon: 'inbox' },
}

const mount = (table: TableSchema) =>
  render(Wrapper, { props: { component: DataTable, props: { table } } })

const announcement = () =>
  document.querySelector('[data-slot="column-manager-announcement"]')?.textContent?.trim()

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Contacts', content: [], token: 't' } })
})

afterEach(() => {
  delete panel.endpoints.tableColumns
  vi.unstubAllGlobals()
})

describe('sort spinner', () => {
  it('shows a spinner on the clicked sort button until the visit finishes', async () => {
    mount(base)
    const button = screen.getByRole('button', { name: /Name/ })

    await fireEvent.click(button)

    expect(button.querySelector('[data-slot="table-sort-spinner"]')).not.toBeNull()
    expect(button).toHaveAttribute('aria-busy', 'true')

    const options = vi.mocked(router.visit).mock.calls[0]![1] as { onFinish?: (v: never) => void }
    options.onFinish?.({} as never)

    await waitFor(() => expect(button.querySelector('[data-slot="table-sort-spinner"]')).toBeNull())
  })
})

describe('column manager modal options', () => {
  it('opens in a slide-over with the trigger heading', async () => {
    mount({
      ...base,
      columnManagerLayout: 'modal',
      triggerActions: { columnManager: { modal: { slideOver: true, heading: 'Pick' } } },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveAttribute('data-slide-over')
    expect(dialog).toHaveTextContent('Pick')
  })

  it('uses the trigger modal width in the dialog', async () => {
    mount({
      ...base,
      columnManagerLayout: 'modal',
      triggerActions: { columnManager: { modal: { width: '4xl' } } },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const dialog = await screen.findByRole('dialog')

    expect(dialog).toHaveClass('sm:max-w-4xl')
    expect(dialog).not.toHaveAttribute('data-slide-over')
  })
})

describe('column manager reorder announcements', () => {
  it('announces a deferred move and describes positions', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    mount({ ...base, reorderableColumns: true, deferColumnManager: true })
    await fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const up = await screen.findByRole('button', { name: 'Move Email up' })

    expect(document.getElementById(up.getAttribute('aria-describedby')!)).toHaveTextContent(
      'Position 2 of 3.',
    )

    await fireEvent.click(up)

    expect(announcement()).toBe(
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

    mount({
      ...base,
      reorderableColumns: true,
      columnGroups: [{ label: 'Contact', columns: ['email', 'phone'] }],
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Columns' }))

    expect(await screen.findByRole('button', { name: 'Move Email up' })).toBeDisabled()
    await fireEvent.click(screen.getByRole('button', { name: 'Move Phone up' }))

    await waitFor(() => expect(announcement()).toBe('Phone moved to position 1 of 2 in Contact.'))
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ columns: ['name', 'phone', 'email'] })
  })
})

describe('grouped query builder constraints', () => {
  it('groups the constraint select of a rule by constraint group', async () => {
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
      {
        components: [field as never],
        state: {
          queryBuilder: {
            query: {
              combinator: 'and',
              rules: [{ type: 'constraint', constraint: 'title', operator: 'is' }],
            },
          },
        },
      },
      { token: 't', component: 'table.filters' },
    )

    const { container } = render(Wrapper, {
      props: { component: FormHarness, props: { store } },
    })
    // The rule editor's code loads lazily.
    await waitFor(() =>
      expect(container.querySelector('select[aria-label="Field"] optgroup')).not.toBeNull(),
    )
    const group = container.querySelector('select[aria-label="Field"] optgroup')

    expect(group).toHaveAttribute('label', 'Content')
    expect(Array.from(group!.querySelectorAll('option')).map((o) => o.textContent)).toEqual([
      'Title',
    ])
  })
})
