import type { TableSchema, TextEntrySchema } from '@alfakit/core'
import { beginTableLoading, endTableLoading, tableLoadingStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { router as vueRouter } from '@inertiajs/vue3'
import { flushPromises } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import ImageEntryComponent from '../src/components/entries/ImageEntryComponent.vue'
import TextEntryComponent from '../src/components/entries/TextEntryComponent.vue'
import DataTable from '../src/components/table/DataTable.vue'
import TableCellContent from '../src/components/table/TableCellContent.vue'
import { mountWithAlfakit, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextColumn', name: 'title', label: 'Title', headerTooltip: 'The post title' },
    { type: 'TextColumn', name: 'status', label: 'Status', toggleable: true },
  ],
  visibleColumns: ['title', 'status'],
  toggleableColumns: true,
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/posts/1',
      cells: { title: { state: 'One', disabledClick: true }, status: { state: 'draft' } },
    },
  ],
  pagination: {
    currentPage: 2,
    lastPage: 5,
    perPage: 1,
    total: 5,
    from: 2,
    to: 2,
    pageOptions: [1],
  },
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const visitedUrl = (): string => String(vi.mocked(router.visit).mock.calls.at(-1)?.[0] ?? '')

/** A button by its accessible name (aria-label or text), anywhere in the document. */
const button = (name: string | RegExp): HTMLButtonElement | undefined =>
  [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
    const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''

    return typeof name === 'string' ? label === name : name.test(label)
  })

const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy()
  ;(element as HTMLElement).click()
  await flushPromises()
}

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(vueRouter.visit).mockClear()
  tableLoadingStore.set({})
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
})

afterEach(() => {
  document.body.innerHTML = ''
})

const mountTable = (table: Partial<TableSchema> = {}) =>
  mountWithAlfakit(() => h(DataTable, { table: { ...base, ...table } }))

describe('pagination and layout', () => {
  it('renders first and last page links with extremePaginationLinks()', async () => {
    const wrapper = mountTable({ extremePaginationLinks: true })

    expect(wrapper.find('[data-slot="pagination-first"]').exists()).toBe(true)
    await click(button('Last page'))
    expect(visitedUrl()).toContain('page=5')

    await click(button('First page'))
    expect(visitedUrl()).not.toContain('page=')

    wrapper.unmount()
  })

  it('has no extreme links by default', () => {
    const wrapper = mountTable()

    expect(button('First page')).toBeUndefined()

    wrapper.unmount()
  })

  it('shows a loading skeleton while the table reloads', async () => {
    const wrapper = mountTable({ loadingSkeleton: true })

    expect(wrapper.find('[data-slot="table-loading-skeleton"]').exists()).toBe(false)

    beginTableLoading(undefined)
    await nextTick()
    expect(wrapper.find('[data-slot="table-loading-skeleton"]').exists()).toBe(true)
    expect(wrapper.find('[data-surface="table"]').attributes('aria-busy')).toBe('true')

    endTableLoading(undefined)
    await nextTick()
    expect(wrapper.find('[data-slot="table-loading-skeleton"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('uses the reorder trigger action for each state', async () => {
    const wrapper = mountTable({
      reorderable: true,
      triggerActions: {
        reorderRecords: { label: 'Sort rows', variant: 'button' },
        reorderRecordsActive: { label: 'Stop sorting' },
      },
    })

    await click(button('Sort rows'))
    expect(button('Stop sorting')).toBeTruthy()

    wrapper.unmount()
  })

  it('shows grouping settings inline on desktop unless kept in the dropdown', async () => {
    const groups = { groups: [{ id: 'status', label: 'Status' }] }
    const wrapper = mountTable(groups)

    const inline = wrapper.find('[data-slot="table-grouping-inline"]')
    expect(inline.exists()).toBe(true)
    await inline.find('select').setValue('status')
    expect(visitedUrl()).toContain('group=status')
    wrapper.unmount()

    const dropdownOnly = mountTable({
      ...groups,
      groupingSettingsInDropdownOnDesktop: true,
      triggerActions: { groupRecords: { label: 'Group records', variant: 'button' } },
    })
    expect(dropdownOnly.find('[data-slot="table-grouping-inline"]').exists()).toBe(false)
    expect(button('Group records')).toBeTruthy()
    dropdownOnly.unmount()
  })

  it('labels the default sort option of content layouts', () => {
    const wrapper = mountTable({
      columns: [{ type: 'TextColumn', name: 'title', label: 'Title', sortable: true }],
      visibleColumns: ['title'],
      contentLayout: [{ type: 'Column', name: 'title' }],
      defaultSortOptionLabel: 'Newest',
    })

    expect(wrapper.findAll('option').map((option) => option.text())).toContain('Newest')

    wrapper.unmount()
  })
})

describe('columns', () => {
  it('renders header tooltips and swallows clicks on disabled cells', async () => {
    const wrapper = mountTable()

    const tooltip = wrapper.find('[data-slot="header-tooltip"]')
    expect(tooltip.attributes('title')).toBe('The post title')
    expect(tooltip.find('.sr-only').text()).toContain('The post title')

    const cells = wrapper.findAll('tbody td')
    expect(cells[0]!.attributes('data-click-disabled')).toBe('true')
    await cells[0]!.find('span').trigger('click')
    expect(vueRouter.visit).not.toHaveBeenCalled()

    await cells[1]!.trigger('click')
    expect(vi.mocked(vueRouter.visit).mock.calls[0]?.[0]).toBe('/posts/1')

    wrapper.unmount()
  })

  it('aligns cells vertically', () => {
    const wrapper = mountTable({
      columns: [{ type: 'TextColumn', name: 'title', label: 'Title', verticalAlignment: 'start' }],
      visibleColumns: ['title'],
    })

    expect(wrapper.find('tbody td').classes()).toContain('align-top')

    wrapper.unmount()
  })

  it('defers column toggles until Apply and lays the manager out in a dialog', async () => {
    const wrapper = mountTable({
      deferColumnManager: true,
      columnManagerLayout: 'modal',
      columnManagerColumns: { default: 2 },
      triggerActions: { columnManager: { label: 'Pick columns', variant: 'button' } },
    })

    await click(button('Pick columns'))
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()

    await click(dialog!.querySelector('[role="checkbox"]'))
    expect(router.visit).not.toHaveBeenCalled()
    expect(dialog!.querySelector('ul')!.classList.contains('grid')).toBe(true)

    await click(dialog!.querySelector('[data-slot="column-manager-apply"]'))
    expect(visitedUrl()).toContain('columns%5B0%5D=title')
    expect(visitedUrl()).not.toContain('status')

    wrapper.unmount()
  })

  it('applies toggles at once and resets to the default columns', async () => {
    const wrapper = mountTable({
      visibleColumns: ['title'],
      columnManagerResetActionPosition: 'header',
    })

    await click(button('Columns'))
    await click(button('Reset'))
    expect(visitedUrl()).toContain('columns%5B1%5D=status')

    wrapper.unmount()
  })
})

describe('filters', () => {
  const filtered: Partial<TableSchema> = {
    filters: [{ type: 'Filter', name: 'created', label: 'Created', schema: [] }],
    filterState: { created: { from: '2026-01-01', until: '2026-02-01' }, locked: { value: 1 } },
    filterIndicators: [
      { filter: 'created', label: 'From Jan', removeField: 'from' },
      { filter: 'locked', label: 'Locked', removable: false },
    ],
  }

  it('removes only the indicator field and keeps unremovable indicators', async () => {
    const wrapper = mountTable(filtered)

    expect(button('Remove filter: Locked')).toBeUndefined()

    await click(button('Remove filter: From Jan'))
    expect(decodeURIComponent(visitedUrl())).toContain('filters[created][until]=2026-02-01')
    expect(decodeURIComponent(visitedUrl())).not.toContain('filters[created][from]=2026')

    await click(button('Remove all filters'))
    expect(decodeURIComponent(visitedUrl())).toContain('filters[locked][value]=1')
    expect(decodeURIComponent(visitedUrl())).not.toContain('created')

    wrapper.unmount()
  })

  it('customises the filters trigger, reset position and remove-all action', async () => {
    const wrapper = mountTable({
      ...filtered,
      filtersResetActionPosition: 'header',
      triggerActions: {
        filters: { label: 'Filter', variant: 'button', badge: 'x' },
        filtersRemoveAll: { hidden: true },
        filtersReset: { label: 'Clear' },
      },
    })

    expect(button('Remove all filters')).toBeUndefined()
    await click(button(/^Filter/))
    expect(button('Clear')).toBeTruthy()

    wrapper.unmount()
  })
})

describe('cells and entries', () => {
  it('renders image ring, overlap and extra img attributes', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: {
          type: 'ImageColumn',
          name: 'a',
          label: 'A',
          stacked: true,
          ring: 4,
          overlap: 3,
        } as TableSchema['columns'][number],
        cell: {
          state: ['/1.png', '/2.png'],
          extraImgAttributes: { loading: 'lazy', class: 'x' },
        },
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )
    const images = wrapper.findAll('img')

    expect(images[0]!.attributes('loading')).toBe('lazy')
    expect(images[0]!.classes()).toEqual(expect.arrayContaining(['x', 'object-cover']))
    expect(images[0]!.classes()).not.toContain('ring-2')
    expect(images[1]!.element.style.marginInlineStart).toBe('-0.75rem')
    expect(images[0]!.element.style.boxShadow).toContain('4px')
    wrapper.unmount()

    const entry = mountWithAlfakit(() =>
      h(ImageEntryComponent, {
        component: {
          type: 'ImageEntry',
          key: 'img',
          name: 'img',
          state: ['/1.png'],
          extraImgAttributes: { 'data-test': 'img' },
        },
      }),
    )
    expect(entry.find('img').attributes('data-test')).toBe('img')
    entry.unmount()
  })

  it('renders text input affix icons', () => {
    const wrapper = mountWithAlfakit(() =>
      h(TableCellContent, {
        column: {
          type: 'TextInputColumn',
          name: 'slug',
          label: 'Slug',
          editable: true,
          inputType: 'text',
          prefixIcon: 'link',
          suffixIcon: 'check',
          suffixIconColor: 'success',
        } as TableSchema['columns'][number],
        cell: { state: 'a' },
        recordKey: 1,
        token: 't',
        component: 'table',
      }),
    )

    expect(wrapper.find('[data-slot="input-prefix-icon"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="input-suffix-icon"]').exists()).toBe(true)
    expect(wrapper.find('input').classes()).toEqual(expect.arrayContaining(['ps-8', 'pe-8']))

    wrapper.unmount()
  })

  it('expands limited lists', async () => {
    const component: TextEntrySchema = {
      type: 'TextEntry',
      key: 'tags',
      name: 'tags',
      state: ['a', 'b', 'c', 'd'],
      expandableLimitedList: true,
      listLimit: 2,
    }
    const wrapper = mountWithAlfakit(() => h(TextEntryComponent, { component }))
    const texts = () => wrapper.findAll('bdi').map((item) => item.text())

    expect(texts()).not.toContain('c')
    await click(button('+2 more'))
    expect(texts()).toContain('d')
    await click(button('Show less'))
    expect(texts()).not.toContain('d')

    wrapper.unmount()
  })

  it('lays out Arabic-locale money as written, Arabic text in its own direction', () => {
    // "‏0.00 US$" starts with a right-to-left mark: `dir="auto"` showed it as "$US 0.00".
    const usd = '‏0.00 US$'
    const component: TextEntrySchema = {
      type: 'TextEntry',
      key: 'totals',
      name: 'totals',
      state: [usd, 'مرحبا'],
    }
    const wrapper = mountWithAlfakit(() => h(TextEntryComponent, { component }))
    const values = wrapper.findAll('bdi')

    expect(values[0]!.attributes('dir')).toBe('ltr')
    expect(values[0]!.text()).toBe(usd.trim())
    expect(values[1]!.attributes('dir')).toBe('auto')

    wrapper.unmount()
  })
})
