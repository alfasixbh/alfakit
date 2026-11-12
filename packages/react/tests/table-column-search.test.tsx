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
  it('sends text typed in two columns within one pause together', () => {
    const two: TableSchema = {
      ...table,
      columns: [
        { type: 'TextColumn', name: 'title', label: 'Title', searchable: true },
        { type: 'TextColumn', name: 'slug', label: 'Slug', searchable: true },
      ],
      visibleColumns: ['title', 'slug'],
    }
    render(
      <Wrapper>
        <DataTable table={two} />
      </Wrapper>,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Title' }), {
      target: { value: 'Hel' },
    })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Slug' }), {
      target: { value: 'he' },
    })
    vi.advanceTimersByTime(500)

    const url = decodeURIComponent(String(vi.mocked(router.visit).mock.calls.at(-1)![0]))
    expect(url).toContain('columnSearch[title]=Hel')
    expect(url).toContain('columnSearch[slug]=he')
  })

  it('follows a column search the server changed (a saved view, Back)', () => {
    const { rerender } = render(
      <Wrapper>
        <DataTable table={{ ...table, columnSearches: { title: 'acme' } }} />
      </Wrapper>,
    )
    const input = screen.getByRole<HTMLInputElement>('searchbox', { name: 'Search Title' })
    expect(input.value).toBe('acme')

    rerender(
      <Wrapper>
        <DataTable table={{ ...table, columnSearches: { title: 'globex' } }} />
      </Wrapper>,
    )
    expect(input.value).toBe('globex')
  })
})

describe('table search', () => {
  it('keeps text typed while the answer to the previous search arrives', () => {
    const searchable: TableSchema = { ...table, searchable: true, columns: [] }
    const { rerender } = render(
      <Wrapper>
        <DataTable table={searchable} />
      </Wrapper>,
    )
    const input = screen.getByPlaceholderText<HTMLInputElement>('Search')

    fireEvent.change(input, { target: { value: 'abc' } })
    vi.advanceTimersByTime(500)
    fireEvent.change(input, { target: { value: 'abcd' } })

    // The server answers the first search while "d" waits to be sent.
    rerender(
      <Wrapper>
        <DataTable table={{ ...searchable, search: 'abc' }} />
      </Wrapper>,
    )
    expect(input.value).toBe('abcd')

    // Nothing is waiting: a search the server changed is shown.
    vi.advanceTimersByTime(500)
    rerender(
      <Wrapper>
        <DataTable table={{ ...searchable, search: 'other' }} />
      </Wrapper>,
    )
    expect(input.value).toBe('other')
  })
})

describe('editable cells', () => {
  const toggled = (featured: boolean): TableSchema => ({
    ...table,
    columns: [{ type: 'ToggleColumn', name: 'featured', label: 'Featured', editable: true }],
    visibleColumns: ['featured'],
    records: [{ key: 1, cells: { featured: { state: featured } } }],
  })

  it('follow a value the server changed (an action, a poll, another user)', () => {
    const { rerender } = render(
      <Wrapper>
        <DataTable table={toggled(false)} />
      </Wrapper>,
    )
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    rerender(
      <Wrapper>
        <DataTable table={toggled(true)} />
      </Wrapper>,
    )
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })
})
