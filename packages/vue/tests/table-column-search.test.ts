import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { h } from 'vue'
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
})
