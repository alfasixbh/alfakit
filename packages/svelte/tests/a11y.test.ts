import { FormStore, type SchemaComponent, type TableSchema } from '@alfakit/core'
import { CalendarDate } from '@internationalized/date'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import { Calendar } from '../src/components/ui/calendar'
import FormHarness from './FormHarness.svelte'
import { setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { store, ...view }
}

const describedText = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim())

describe('field accessibility', () => {
  it('links hint, helper text and error to the input', async () => {
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

    store.setErrors({ title: ['The title is required.'] })
    await tick()

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(describedText(input)).toEqual([
      'Max 60',
      'Shown in search results',
      'The title is required.',
    ])
  })

  it('reorders tags with Alt + arrow keys and announces the move', async () => {
    const { store, container } = renderForm(
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

    const first = container.querySelector<HTMLElement>('[data-tag]')!
    expect(first).toHaveAttribute('tabindex', '0')

    await fireEvent.keyDown(first, { key: 'ArrowRight', altKey: true })
    await tick()

    expect(store.state.values.tags).toEqual(['b', 'a', 'c'])
    expect(screen.getByText('a moved to position 2 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove a' })).toBeInTheDocument()
  })
})

describe('calendar', () => {
  it('follows the reading direction with the arrow keys in RTL', async () => {
    const { container } = render(Calendar, {
      props: { value: new CalendarDate(2026, 10, 15), dir: 'rtl' },
    })

    const day = container.querySelector<HTMLElement>('[data-bits-day][data-value="2026-10-15"]')!
    day.focus()
    await fireEvent.keyDown(day, { key: 'ArrowLeft' })

    // In a right-to-left grid the next day is to the left.
    expect(document.activeElement).toHaveAttribute('data-value', '2026-10-16')
  })

  it('marks "today" from the field timezone', () => {
    const { container } = render(Calendar, {
      props: { value: new CalendarDate(2026, 10, 15), today: new CalendarDate(2026, 10, 20) },
    })

    expect(container.querySelector('[data-bits-day][data-value="2026-10-20"]')).toHaveClass(
      'bg-accent',
    )
    expect(container.querySelector('[data-bits-day][data-value="2026-10-19"]')).not.toHaveClass(
      'bg-accent',
    )
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
    const { container } = render(Wrapper, { props: { component: DataTable, props: { table } } })
    const headers = [...container.querySelectorAll('th')]

    expect(headers.find((th) => th.textContent?.includes('Title'))).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(headers.find((th) => th.textContent?.includes('Author'))).toHaveAttribute(
      'aria-sort',
      'none',
    )

    const links = [...container.querySelectorAll('tbody a')]
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Hello', 'World'])
    expect(links[0]).toHaveAttribute('href', '/posts/1')
  })

  it('shows an indeterminate "select page" checkbox when some rows are selected', async () => {
    const { container } = render(Wrapper, { props: { component: DataTable, props: { table } } })

    await fireEvent.click(container.querySelector('tbody [role="checkbox"]')!)

    expect(container.querySelector('thead [role="checkbox"]')).toHaveAttribute(
      'aria-checked',
      'mixed',
    )
  })

  it('moves rows with buttons in reorder mode and announces the position', async () => {
    const { container } = render(Wrapper, { props: { component: DataTable, props: { table } } })

    await fireEvent.click(screen.getByRole('button', { name: 'Reorder' }))
    await fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]!)

    const rows = container.querySelectorAll('tbody tr')
    expect(rows[0]).toHaveTextContent('World')
    expect(rows[1]).toHaveTextContent('Hello')
    expect(screen.getByText('Row moved to position 2 of 2')).toBeInTheDocument()
  })
})
