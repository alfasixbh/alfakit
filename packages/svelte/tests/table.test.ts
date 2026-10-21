import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen } from '@testing-library/svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

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
  it('formats pagination numbers in the panel language (Persian digits)', () => {
    setPageProps({
      alfakit: { ...panel, localization: { code: 'fa', tag: 'fa', direction: 'rtl', locales: [] } },
      page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' },
    } as unknown as Parameters<typeof setPageProps>[0])

    render(Wrapper, { props: { component: DataTable, props: { table } } })

    expect(screen.getByText(/۱–۱۰ of ۲۵/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '۳' })).toBeInTheDocument()
    setPageProps({ alfakit: panel })
  })

  it('renders headers, cells, pagination and selection', () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })

    render(Wrapper, { props: { component: DataTable, props: { table } } })

    expect(screen.getByRole('button', { name: /Title/ })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/posts/1/edit')
    expect(screen.getByText(/Showing 1–10 of 25/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(Wrapper, {
      props: {
        component: DataTable,
        props: { table: { ...table, records: [], pagination: null } },
      },
    })

    expect(screen.getByText('No posts')).toBeInTheDocument()
  })

  it('requests deferred records once on mount', () => {
    const reload = vi.mocked(router.reload)
    reload.mockClear()

    render(Wrapper, {
      props: {
        component: DataTable,
        props: {
          table: { ...table, deferLoading: true, records: undefined, pagination: undefined },
        },
      },
    })

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledWith({ only: ['page'] })
  })
})

describe('selection scope', () => {
  it('clears the selection when the filters, search or tab change', async () => {
    const { rerender } = render(Wrapper, {
      props: { component: DataTable, props: { table: { ...table, selectionScope: 'a' } } },
    })
    const rowBox = () => screen.getAllByRole('checkbox')[1]!

    await fireEvent.click(rowBox())
    expect(rowBox()).toHaveAttribute('data-state', 'checked')

    // Wrapped in `props`: the Wrapper's own `props` key would read as the legacy form.
    await rerender({
      props: {
        component: DataTable,
        props: { table: { ...table, selectionScope: 'a', records: [...(table.records ?? [])] } },
      },
    })
    expect(rowBox()).toHaveAttribute('data-state', 'checked')

    await rerender({
      props: { component: DataTable, props: { table: { ...table, selectionScope: 'b' } } },
    })
    await vi.waitFor(() => expect(rowBox()).toHaveAttribute('data-state', 'unchecked'))
  })
})
