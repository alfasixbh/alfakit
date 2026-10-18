import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { h, nextTick } from 'vue'
import DataTable from '../src/components/table/DataTable.vue'
import TableCellContent from '../src/components/table/TableCellContent.vue'
import { flush, mountWithAlfakit } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const table: TableSchema = {
  type: 'Table',
  identifier: 'posts',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [{ type: 'TextColumn', name: 'title', label: 'Title' }],
  visibleColumns: ['title'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, cells: { title: { state: 'One' } } },
    { key: 2, cells: { title: { state: 'Two' } } },
  ],
  pagination: {
    currentPage: 2,
    lastPage: 3,
    perPage: 2,
    total: 6,
    from: 3,
    to: 4,
    pageOptions: [2],
  },
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  reorderable: true,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const visitedUrls = (): string[] => vi.mocked(router.visit).mock.calls.map(([url]) => String(url))

const button = (name: RegExp): HTMLButtonElement | undefined =>
  [...document.body.querySelectorAll('button')].find((item) => name.test(item.textContent ?? ''))

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(router.reload).mockClear()
  window.history.replaceState(null, '', '/admin/posts?posts_page=2')
})

describe('reorder mode', () => {
  it('reloads the table without pages when reordering starts', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))

    button(/Reorder/)!.click()
    await nextTick()

    expect(visitedUrls()).toEqual(['/admin/posts?posts_reordering=1'])
    expect(button(/Done/)?.getAttribute('aria-pressed')).toBe('true')
    wrapper.unmount()
  })

  it('keeps the pages with paginatedWhileReordering()', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...table, paginatedWhileReordering: true } }),
    )

    button(/Reorder/)!.click()
    await nextTick()

    expect(router.visit).not.toHaveBeenCalled()
    expect(button(/Done/)).toBeDefined()
    wrapper.unmount()
  })

  it('starts in reorder mode on a reordering reload and leaves it with the pages back', async () => {
    window.history.replaceState(null, '', '/admin/posts?posts_reordering=1')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    )

    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...table, pagination: undefined, reordering: true } }),
    )

    const rows = wrapper.findAll('tr[draggable="true"]')
    expect(rows).toHaveLength(2)

    await rows[1]!.trigger('dragstart')
    await rows[0]!.trigger('drop')
    button(/Done/)!.click()
    await flush()
    await flush()

    expect(visitedUrls()).toEqual(['/admin/posts'])
    expect(router.reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    wrapper.unmount()
  })
})

describe('select column messages', () => {
  const column = {
    type: 'SelectColumn',
    name: 'status',
    label: 'Status',
    editable: true,
    native: false,
    searchableOptions: true,
    selectablePlaceholder: false,
    options: [{ value: 'draft', label: 'Draft' }],
    searchPrompt: 'Find a status',
    noSearchResultsMessage: 'No status matches',
    noOptionsMessage: 'No statuses yet',
  } as const

  const mountCell = (extra: Record<string, unknown> = {}) =>
    mountWithAlfakit(() =>
      h(TableCellContent, {
        column: { ...column, ...extra } as never,
        cell: { state: null },
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )

  it('shows the search prompt and the no-results message', async () => {
    const wrapper = mountCell()

    await wrapper.find('[role="combobox"][aria-label="Status"]').trigger('click')
    await nextTick()

    const input = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="Find a status"]',
    )!
    input.value = 'zzz'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    await nextTick()

    expect(document.body.querySelector('[data-slot="select-column-message"]')?.textContent).toBe(
      'No status matches',
    )
    wrapper.unmount()
  })

  it('shows the no-options message for an empty list', async () => {
    const wrapper = mountCell({ options: [] })

    await wrapper.find('[role="combobox"][aria-label="Status"]').trigger('click')
    await nextTick()

    expect(document.body.querySelector('[data-slot="select-column-message"]')?.textContent).toBe(
      'No statuses yet',
    )
    wrapper.unmount()
  })
})
