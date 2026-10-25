import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ViewEntryComponent from '../src/components/entries/ViewEntryComponent.vue'
import DataTable from '../src/components/table/DataTable.vue'
import TablePagination from '../src/components/table/TablePagination.vue'
import { mountWithAlfakit, panel, registry, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'user',
  pluralModelLabel: 'users',
  columns: [
    { type: 'TextColumn', name: 'name', label: 'Name', sortable: true },
    { type: 'TextColumn', name: 'email', label: 'Email' },
    { type: 'TextColumn', name: 'phone', label: 'Phone' },
  ],
  visibleColumns: ['name', 'email', 'phone'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/users/1',
      cells: {
        name: { state: 'Ada' },
        email: { state: 'ada@example.com' },
        phone: { state: '123' },
      },
      actions: [{ type: 'Action', name: 'edit', label: 'Edit', url: '/users/1/edit' }],
    },
  ],
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No users', icon: 'inbox' },
}

const layout: TableSchema = {
  ...base,
  contentLayout: [
    {
      type: 'Split',
      from: 'md',
      schema: [
        { type: 'Column', name: 'name' },
        { type: 'Stack', space: 2, schema: [{ type: 'Column', name: 'email' }] },
      ],
    },
    {
      type: 'Panel',
      collapsible: true,
      collapsed: true,
      schema: [{ type: 'Column', name: 'phone' }],
    },
  ],
}

beforeEach(() => {
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Users', content: [], token: 't' } })
  vi.mocked(router.visit).mockClear()
})

describe('content layouts', () => {
  it('renders records as layout blocks with collapsible panels', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: layout }))

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('[data-layout="split"]').classes()).toContain('md:flex-row')
    expect(wrapper.find('[data-layout="stack"]').classes()).toContain('gap-2')
    expect(wrapper.find('a[href="/users/1"]').text()).toContain('Ada')
    expect(wrapper.text()).not.toContain('123')

    const toggle = wrapper.find('button[aria-label="Show details"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')

    expect(wrapper.text()).toContain('123')
    expect(wrapper.find('button[aria-label="Hide details"]').attributes('aria-expanded')).toBe(
      'true',
    )
  })

  it('lays cards out in a content grid', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...layout, contentGrid: { md: 2, xl: 3 } } }),
    )

    expect(wrapper.find('[data-slot="table-content"]').classes()).toEqual(
      expect.arrayContaining(['grid', 'md:grid-cols-2', 'xl:grid-cols-3']),
    )
  })
})

describe('column groups and record actions', () => {
  it('renders a group header spanning its columns', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: { ...base, columnGroups: [{ label: 'Contact', columns: ['email', 'phone'] }] },
      }),
    )

    const rows = wrapper.findAll('thead tr')
    const group = rows[0]!.findAll('th').find((cell) => cell.text() === 'Contact')

    expect(group?.attributes('colspan')).toBe('2')
    expect(rows[0]!.findAll('th')[0]!.attributes('rowspan')).toBe('2')
    expect(rows[1]!.findAll('th').map((cell) => cell.text())).toEqual(['Email', 'Phone'])
  })

  it('puts actions before the selection checkbox for before-cells', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          recordActionsPosition: 'before-cells',
          selectable: true,
          bulkActions: [{ type: 'BulkAction', name: 'delete', label: 'Delete' }],
        },
      }),
    )

    const cells = wrapper.findAll('tbody tr')[0]!.findAll('td')

    expect(cells[0]!.find('a[href="/users/1/edit"]').exists()).toBe(true)
    expect(cells[1]!.find('[role="checkbox"]').exists()).toBe(true)
  })
})

describe('view columns and entries', () => {
  it('renders the registered component with the cell state and props', () => {
    registry.register(
      'StatusBadge',
      defineComponent({
        props: { state: { type: String, default: '' }, tone: { type: String, default: '' } },
        setup: (props) => () => h('mark', { 'data-tone': props.tone }, props.state),
      }),
    )

    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          columns: [
            { type: 'ViewColumn', name: 'status', label: 'Status', component: 'StatusBadge' },
          ],
          visibleColumns: ['status'],
          records: [{ key: 1, cells: { status: { state: 'draft', props: { tone: 'muted' } } } }],
        },
      }),
    )

    expect(wrapper.find('mark').text()).toBe('draft')
    expect(wrapper.find('mark').attributes('data-tone')).toBe('muted')
  })

  it('says when a view entry component is missing', () => {
    const wrapper = mountWithAlfakit(() =>
      h(ViewEntryComponent, {
        component: { type: 'ViewEntry', key: 'e', name: 'e', component: 'Nope' },
      }),
    )

    expect(wrapper.text()).toContain('Component Nope is not registered.')
  })
})

describe('column breakpoints', () => {
  it('hides a column header and its cells outside its breakpoints', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          columns: [
            base.columns[0]!,
            { ...base.columns[1]!, visibleFrom: 'md' },
            { ...base.columns[2]!, hiddenFrom: 'lg' },
          ],
        },
      }),
    )

    const headers = wrapper.findAll('thead th')
    expect(headers[1]!.classes()).toEqual(expect.arrayContaining(['hidden', 'md:table-cell']))
    expect(headers[2]!.classes()).toContain('lg:hidden')
    expect(headers[0]!.classes()).not.toContain('hidden')

    const cells = wrapper.findAll('tbody tr')[0]!.findAll('td')
    expect(cells[1]!.classes()).toEqual(expect.arrayContaining(['hidden', 'md:table-cell']))
    expect(cells[2]!.classes()).toContain('lg:hidden')
    wrapper.unmount()
  })

  it('hides a layout block outside the column breakpoints', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          columns: [base.columns[0]!, { ...base.columns[1]!, visibleFrom: 'sm' }, base.columns[2]!],
          contentLayout: [
            {
              type: 'Stack',
              schema: [
                { type: 'Column', name: 'name' },
                { type: 'Column', name: 'email' },
              ],
            },
          ],
        },
      }),
    )

    expect(wrapper.find('[data-column="email"]').classes()).toEqual(
      expect.arrayContaining(['hidden', 'sm:block']),
    )
    expect(wrapper.find('[data-column="name"]').classes()).not.toContain('hidden')
    wrapper.unmount()
  })
})

describe('column manager', () => {
  it('reorders columns by drag and drop', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ columns: ['phone', 'name', 'email'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    const wrapper = mountWithAlfakit(
      () => h(DataTable, { table: { ...base, reorderableColumns: true } }),
      { attachTo: document.body },
    )

    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()
    await flushPromises()
    const items = document.querySelectorAll<HTMLLIElement>('ul[aria-label="Columns"] > li')
    expect(items).toHaveLength(3)
    expect(items[0]!.getAttribute('draggable')).toBe('true')

    // Drop "Phone" onto "Name": it takes the first position.
    items[2]!.dispatchEvent(new Event('dragstart', { bubbles: true }))
    items[0]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(items[0]!.classList.contains('bg-muted')).toBe(true)
    items[0]!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    await flushPromises()

    expect(fetch).toHaveBeenCalled()
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ columns: ['phone', 'name', 'email'] })
    // The keyboard path stays available.
    expect(document.querySelector('button[aria-label="Move Phone up"]')).not.toBeNull()

    wrapper.unmount()
    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })

  it('moves a column and stores the order on the server', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ columns: ['email', 'name', 'phone'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    const wrapper = mountWithAlfakit(
      () => h(DataTable, { table: { ...base, reorderableColumns: true } }),
      { attachTo: document.body },
    )

    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()
    const move = document.querySelector<HTMLButtonElement>('button[aria-label="Move Email up"]')
    move?.click()
    await flushPromises()

    expect(fetch).toHaveBeenCalled()
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/columns')
    expect(JSON.parse(String(init.body))).toMatchObject({
      token: 't',
      component: 'table',
      columns: ['email', 'name', 'phone'],
    })

    wrapper.unmount()
    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })
})

describe('column manager reset', () => {
  it('resets the order before it restores the default visibility', async () => {
    let respond: (value: Response) => void = () => {}
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (respond = resolve)))
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'
    vi.mocked(router.visit).mockClear()
    vi.mocked(router.reload).mockClear()

    const wrapper = mountWithAlfakit(
      () => h(DataTable, { table: { ...base, reorderableColumns: true, toggleableColumns: true } }),
      { attachTo: document.body },
    )

    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()
    ;[...document.querySelectorAll<HTMLButtonElement>('[data-slot="column-manager-reset"]')]
      .at(-1)
      ?.click()
    await flushPromises()

    // The visibility visit waits for the order reset: running alongside it, its session
    // write would bring the old order back.
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(
      JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)),
    ).toMatchObject({ columns: [] })
    expect(router.visit).not.toHaveBeenCalled()

    respond(new Response(JSON.stringify({ columns: [] }), { status: 200 }))
    await flushPromises()
    expect(router.visit).toHaveBeenCalled()
    expect(decodeURIComponent(String(vi.mocked(router.visit).mock.calls.at(-1)![0]))).toContain(
      'columns[0]=name',
    )
    // Only the visit with the default columns: a reload of the old URL alongside it could
    // finish last and bring the toggled columns back (W-V2-10).
    expect(router.reload).not.toHaveBeenCalled()

    wrapper.unmount()
    delete panel.endpoints.tableColumns
    vi.unstubAllGlobals()
  })
})

describe('pagination modes', () => {
  it('shows previous / next without a total for cursor pagination', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(TablePagination, {
        table: {
          ...base,
          pagination: {
            mode: 'cursor',
            perPage: 10,
            from: 1,
            to: 10,
            pageOptions: [10],
            hasMorePages: true,
            nextCursor: 'abc',
            previousCursor: null,
          },
        },
      }),
    )

    expect(wrapper.text()).toContain('Showing 1–10')
    expect(wrapper.find('button[aria-label="Previous"]').attributes('disabled')).toBeDefined()
    await wrapper.find('button[aria-label="Next"]').trigger('click')
    expect(router.visit).toHaveBeenCalledWith(
      expect.stringContaining('cursor=abc'),
      expect.anything(),
    )
  })

  it('loads the next page with a load more button', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(TablePagination, {
        table: {
          ...base,
          pagination: {
            mode: 'load-more',
            currentPage: 2,
            perPage: 10,
            from: 1,
            to: 20,
            pageOptions: [10],
            hasMorePages: true,
          },
        },
      }),
    )

    await wrapper.find('button').trigger('click')
    expect(router.visit).toHaveBeenCalledWith(expect.stringContaining('page=3'), expect.anything())
    expect(wrapper.find('button').text()).toBe('Loading more…')
  })

  it('offers a retry when loading more fails instead of staying on "Loading more…"', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(TablePagination, {
        table: {
          ...base,
          pagination: {
            mode: 'load-more',
            currentPage: 1,
            perPage: 10,
            from: 1,
            to: 10,
            pageOptions: [10],
            hasMorePages: true,
          },
        },
      }),
    )

    await wrapper.find('button').trigger('click')
    const options = vi.mocked(router.visit).mock.calls.at(-1)![1] as {
      onFinish?: () => void
      onSuccess?: () => void
    }
    expect(options.onFinish).toBeTypeOf('function')

    // The visit ends without a success: no "Loading more…", a message and a retry button.
    options.onFinish!()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').text()).toContain("Couldn't load more records.")
    expect(wrapper.find('button').text()).toBe('Retry')

    vi.mocked(router.visit).mockClear()
    await wrapper.find('button').trigger('click')
    expect(router.visit).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything())
    expect(wrapper.find('button').text()).toBe('Loading more…')

    const retried = vi.mocked(router.visit).mock.calls.at(-1)![1] as typeof options
    retried.onSuccess!()
    retried.onFinish!()
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('loads the next page when the infinite scroll sentinel is seen', async () => {
    let callback: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb
        }
        observe() {}
        disconnect() {}
      },
    )

    mountWithAlfakit(() =>
      h(TablePagination, {
        table: {
          ...base,
          pagination: {
            mode: 'infinite',
            currentPage: 1,
            perPage: 10,
            from: 1,
            to: 10,
            pageOptions: [10],
            hasMorePages: true,
          },
        },
      }),
    )
    await flushPromises()

    callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(router.visit).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything())
    vi.unstubAllGlobals()
  })
})

describe('content layout sort select', () => {
  it('shows the placeholder while the table is sorted by a column it does not list', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: {
          ...base,
          contentLayout: [{ type: 'Column', name: 'name' }],
          sort: { column: 'created_at', direction: 'desc' },
        },
      }),
    )
    await flushPromises()

    const select = wrapper.find('select').element as HTMLSelectElement

    expect(select.value).toBe('')
    expect(select.selectedIndex).toBe(0)
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe('Sort by')
    wrapper.unmount()
  })
})
