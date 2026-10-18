import { FormStore, type SchemaComponent, type TableSchema } from '@alfakit/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { DataTable } from '../src/components/table/table-block'
import { Wrapper, setPageProps } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })

  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

const describedText = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)

describe('field accessibility', () => {
  it('links hint, helper text and error to the input', () => {
    const { store } = renderForm(
      [
        {
          type: 'TextInput',
          key: 'title',
          name: 'title',
          statePath: 'title',
          label: 'Title',
          inputType: 'text',
          required: true,
          hint: 'Max 60',
          helperText: 'Shown in search results',
        } as SchemaComponent,
      ],
      { title: '' },
    )

    const input = screen.getByLabelText(/Title/)
    expect(describedText(input)).toEqual(['Max 60', 'Shown in search results'])
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).not.toHaveAttribute('aria-invalid')

    act(() => store.setErrors({ title: ['The title is required.'] }))

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(describedText(input)).toEqual([
      'Max 60',
      'Shown in search results',
      'The title is required.',
    ])
  })

  it('names radio groups by their label and marks them invalid', () => {
    const { store } = renderForm(
      [
        {
          type: 'Radio',
          key: 'status',
          name: 'status',
          statePath: 'status',
          label: 'Status',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
          ],
        } as SchemaComponent,
      ],
      { status: null },
    )

    act(() => store.setErrors({ status: ['Pick one.'] }))

    const group = screen.getByRole('radiogroup', { name: 'Status' })
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(describedText(group)).toEqual(['Pick one.'])
  })

  it('reorders tags with Alt + arrow keys and announces the move', () => {
    const { store } = renderForm(
      [
        {
          type: 'TagsInput',
          key: 'tags',
          name: 'tags',
          statePath: 'tags',
          label: 'Tags',
          splitKeys: ['Enter'],
          reorderable: true,
        } as SchemaComponent,
      ],
      { tags: ['a', 'b', 'c'] },
    )

    const first = screen.getByText('a').closest('[data-tag]') as HTMLElement
    expect(first).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(first, { key: 'ArrowRight', altKey: true })

    expect(store.state.values.tags).toEqual(['b', 'a', 'c'])
    expect(screen.getByText('a moved to position 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove a' })).toBeInTheDocument()
  })
})

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextColumn', name: 'title', label: 'Title', sortable: true },
    { type: 'TextColumn', name: 'author', label: 'Author', sortable: true },
  ],
  visibleColumns: ['title', 'author'],
  sort: { column: 'title', direction: 'desc' },
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, url: '/posts/1', cells: { title: { state: 'Hello' }, author: { state: 'Ada' } } },
    { key: 2, url: '/posts/2', cells: { title: { state: 'World' }, author: { state: 'Bob' } } },
  ],
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  selectable: true,
  reorderable: true,
  bulkActions: [{ type: 'BulkAction', name: 'delete', label: 'Delete' }],
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

describe('table accessibility', () => {
  beforeEach(() =>
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } }),
  )

  it('exposes the sort state and a keyboard link for clickable rows', () => {
    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    const headers = screen.getAllByRole('columnheader')
    expect(headers.find((header) => header.textContent?.includes('Title'))).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(headers.find((header) => header.textContent?.includes('Author'))).toHaveAttribute(
      'aria-sort',
      'none',
    )
    expect(screen.getByRole('link', { name: 'Hello' })).toHaveAttribute('href', '/posts/1')
    // Only the primary cell is a link: the row itself is not a tab stop.
    expect(screen.queryByRole('link', { name: 'Ada' })).not.toBeInTheDocument()
  })

  it('shows an indeterminate "select page" checkbox when some rows are selected', () => {
    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    const page = screen.getByRole('checkbox', { name: 'Select page' })
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Select row' })[0]!)

    expect(page).toHaveAttribute('aria-checked', 'mixed')
  })

  it('moves rows with buttons in reorder mode and announces the position', () => {
    render(
      <Wrapper>
        <DataTable table={table} />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]!)

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('World')
    expect(rows[1]).toHaveTextContent('Hello')
    expect(screen.getByText('Row moved to position 2 of 2')).toBeInTheDocument()
  })
})
