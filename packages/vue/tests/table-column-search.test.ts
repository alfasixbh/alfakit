import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { h, nextTick, ref } from 'vue'
import DataTable from '../src/components/table/DataTable.vue'
import { mountWithAlfakit, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [{ type: 'TextColumn', name: 'title', label: 'Title', searchable: true }],
  visibleColumns: ['title'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [{ key: 1, cells: { title: { state: 'Hello' } } }],
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
  vi.useFakeTimers()
})

afterEach(() => vi.useRealTimers())

describe('column search', () => {
  it('applies after the search pause, and at once on Enter', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))
    const input = wrapper.find('input[aria-label="Search Title"]')

    await input.setValue('Hel')
    expect(router.visit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(router.visit).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(String(vi.mocked(router.visit).mock.calls[0]![0]))).toContain(
      'columnSearch[title]=Hel',
    )

    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })
    expect(router.visit).toHaveBeenCalledTimes(2)
  })
  it('sends text typed in two columns within one pause together', async () => {
    const two: TableSchema = {
      ...table,
      columns: [
        { type: 'TextColumn', name: 'title', label: 'Title', searchable: true },
        { type: 'TextColumn', name: 'slug', label: 'Slug', searchable: true },
      ],
      visibleColumns: ['title', 'slug'],
    }
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: two }))

    await wrapper.find('input[aria-label="Search Title"]').setValue('Hel')
    vi.advanceTimersByTime(300)
    await wrapper.find('input[aria-label="Search Slug"]').setValue('he')
    vi.advanceTimersByTime(500)

    const url = decodeURIComponent(String(vi.mocked(router.visit).mock.calls.at(-1)![0]))
    expect(url).toContain('columnSearch[title]=Hel')
    expect(url).toContain('columnSearch[slug]=he')
    wrapper.unmount()
  })
})

describe('table search', () => {
  it('keeps text typed while the answer to the previous search arrives', async () => {
    const searchable: TableSchema = { ...table, searchable: true, columns: [] }
    const current = ref<TableSchema>(searchable)
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: current.value }))
    const input = wrapper.find<HTMLInputElement>('input[placeholder="Search"]')

    await input.setValue('abc')
    vi.advanceTimersByTime(500)
    await input.setValue('abcd')

    // The server answers the first search while "d" waits to be sent.
    current.value = { ...searchable, search: 'abc' }
    await nextTick()
    expect(input.element.value).toBe('abcd')

    // Nothing is waiting: a search the server changed is shown.
    vi.advanceTimersByTime(500)
    current.value = { ...searchable, search: 'other' }
    await nextTick()
    expect(input.element.value).toBe('other')
  })
})

describe('editable cells', () => {
  const toggled = (featured: boolean): TableSchema => ({
    ...table,
    columns: [{ type: 'ToggleColumn', name: 'featured', label: 'Featured', editable: true }],
    visibleColumns: ['featured'],
    records: [{ key: 1, cells: { featured: { state: featured } } }],
  })

  it('follow a value the server changed (an action, a poll, another user)', async () => {
    const current = ref<TableSchema>(toggled(false))
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: current.value }))
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('false')

    current.value = toggled(true)
    await nextTick()
    await nextTick()
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true')
  })
})
