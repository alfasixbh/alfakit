import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, setPageProps } from './mocks'

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
  it('applies after the search pause, and at once on Enter', () => {
    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )
    const input = screen.getByRole('searchbox', { name: 'Search Title' })

    fireEvent.change(input, { target: { value: 'Hel' } })
    expect(router.visit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(router.visit).toHaveBeenCalledTimes(1)
    expect(decodeURIComponent(String(vi.mocked(router.visit).mock.calls[0]![0]))).toContain(
      'columnSearch[title]=Hel',
    )

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(router.visit).toHaveBeenCalledTimes(2)
  })
})
