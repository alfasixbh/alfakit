import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
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
  it('sends text typed in two columns within one pause together', async () => {
    const two: TableSchema = {
      ...table,
      columns: [
        { type: 'TextColumn', name: 'title', label: 'Title', searchable: true },
        { type: 'TextColumn', name: 'slug', label: 'Slug', searchable: true },
      ],
      visibleColumns: ['title', 'slug'],
    }
    render(Wrapper, { props: { component: DataTable, props: { table: two } } })
    const title = screen.getByRole('searchbox', { name: 'Search Title' }) as HTMLInputElement
    const slug = screen.getByRole('searchbox', { name: 'Search Slug' }) as HTMLInputElement

    title.value = 'Hel'
    await fireEvent.input(title)
    vi.advanceTimersByTime(300)
    slug.value = 'he'
    await fireEvent.input(slug)
    vi.advanceTimersByTime(500)

    const url = decodeURIComponent(String(vi.mocked(router.visit).mock.calls.at(-1)![0]))
    expect(url).toContain('columnSearch[title]=Hel')
    expect(url).toContain('columnSearch[slug]=he')
  })
})

describe('table search', () => {
  it('keeps text typed while the answer to the previous search arrives', async () => {
    const searchable: TableSchema = { ...table, searchable: true, columns: [] }
    const { rerender } = render(Wrapper, {
      props: { component: DataTable, props: { table: searchable } },
    })
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement

    input.value = 'abc'
    await fireEvent.input(input)
    vi.advanceTimersByTime(500)
    input.value = 'abcd'
    await fireEvent.input(input)

    // The server answers the first search while "d" waits to be sent.
    await rerender({
      props: { component: DataTable, props: { table: { ...searchable, search: 'abc' } } },
    })
    await tick()
    expect(input.value).toBe('abcd')

    // Nothing is waiting: a search the server changed is shown.
    vi.advanceTimersByTime(500)
    await rerender({
      props: { component: DataTable, props: { table: { ...searchable, search: 'other' } } },
    })
    await tick()
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

  it('follow a value the server changed (an action, a poll, another user)', async () => {
    const { rerender } = render(Wrapper, {
      props: { component: DataTable, props: { table: toggled(false) } },
    })
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

    await rerender({ props: { component: DataTable, props: { table: toggled(true) } } })
    await tick()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })
})
