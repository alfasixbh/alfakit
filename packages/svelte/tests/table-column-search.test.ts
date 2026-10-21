import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import { setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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
    render(Wrapper, { props: { component: DataTable, props: { table } } })
    const input = screen.getByRole('searchbox', { name: 'Search Title' }) as HTMLInputElement

    input.value = 'Hel'
    await fireEvent.input(input)
    expect(router.visit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(router.visit).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(String(vi.mocked(router.visit).mock.calls[0]![0]))).toContain(
      'columnSearch[title]=Hel',
    )

    input.value = ''
    await fireEvent.input(input)
    await fireEvent.keyDown(input, { key: 'Enter' })
    expect(router.visit).toHaveBeenCalledTimes(2)
  })
})
