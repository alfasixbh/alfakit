import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { h, nextTick, shallowRef } from 'vue'
import DataTable from '../src/components/table/DataTable.vue'
import { mountWithAlfakit, setPageProps } from './mocks'

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextColumn', name: 'title', label: 'Title', sortable: true },
    { type: 'TextColumn', name: 'author.name', label: 'Author' },
    { type: 'IconColumn', name: 'is_published', label: 'Published' },
  ],
  visibleColumns: ['title', 'author.name', 'is_published'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      url: '/posts/1/edit',
      cells: {
        title: { state: 'Hello' },
        'author.name': { state: 'Ada' },
        is_published: { state: true, icon: 'circle-check', color: 'success' },
      },
      actions: [{ type: 'Action', name: 'edit', label: 'Edit', url: '/posts/1/edit' }],
    },
    {
      key: 2,
      cells: {
        title: { state: 'World' },
        'author.name': { state: null },
        is_published: { state: false, icon: 'circle-x', color: 'danger' },
      },
    },
  ],
  pagination: {
    currentPage: 1,
    lastPage: 3,
    perPage: 10,
    total: 25,
    from: 1,
    to: 10,
    pageOptions: [10, 25],
  },
  searchable: true,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  selectable: true,
  bulkActions: [{ type: 'BulkAction', name: 'delete', label: 'Delete' }],
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

describe('data table', () => {
  it('renders headers, cells, pagination and selection', () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })

    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))

    expect(wrapper.findAll('th button').some((node) => node.text().includes('Title'))).toBe(true)
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Ada')
    expect(wrapper.findAll('td').filter((node) => node.text() === '—')).toHaveLength(1)
    const edit = wrapper.findAll('a').find((node) => node.text().includes('Edit'))
    expect(edit?.attributes('href')).toBe('/posts/1/edit')
    expect(wrapper.text()).toMatch(/Showing 1–10 of 25/)
    expect(wrapper.findAll('nav button').some((node) => node.text() === '3')).toBe(true)
    expect(wrapper.findAll('[role="checkbox"]')).toHaveLength(3)
    expect(wrapper.find('input[placeholder="Search"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('renders the empty state', () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, { table: { ...table, records: [], pagination: null } }),
    )

    expect(wrapper.text()).toContain('No posts')

    wrapper.unmount()
  })

  it('requests deferred records once on mount', () => {
    const reload = vi.mocked(router.reload)
    reload.mockClear()

    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
        table: { ...table, deferLoading: true, records: undefined, pagination: undefined },
      }),
    )

    expect(wrapper.text()).toContain('Loading…')
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledWith({ only: ['page'] })

    wrapper.unmount()
  })
})

describe('selection scope', () => {
  it('clears the selection when the filters, search or tab change', async () => {
    const current = shallowRef<TableSchema>({ ...table, selectionScope: 'a' })
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: current.value }))
    const rowBox = () => wrapper.findAll('[role="checkbox"]')[1]!

    await rowBox().trigger('click')
    expect(rowBox().attributes('data-state')).toBe('checked')

    current.value = { ...table, selectionScope: 'a', records: [...(table.records ?? [])] }
    await nextTick()
    expect(rowBox().attributes('data-state')).toBe('checked')

    current.value = { ...table, selectionScope: 'b' }
    await nextTick()
    expect(rowBox().attributes('data-state')).toBe('unchecked')

    wrapper.unmount()
  })
})
