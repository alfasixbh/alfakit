import type { ActionSchema, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/svelte'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { tick } from 'svelte'
import ActionList from '../src/components/actions/ActionList.svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import TableFilters from '../src/components/table/TableFilters.svelte'
import { actions, setPageProps } from './mocks'
import { reactiveProps } from './reactive.svelte'
import Wrapper from './Wrapper.svelte'

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [{ type: 'TextColumn', name: 'title', label: 'Title', copyable: true }],
  visibleColumns: ['title'],
  filtersLayout: 'above-content',
  recordActionsPosition: 'after-columns',
  records: [{ key: 1, url: '/posts/1/edit', cells: { title: { state: 'Hello' } } }],
  searchable: true,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
  filters: [
    {
      type: 'Filter',
      name: 'title',
      label: 'Title',
      schema: [
        {
          type: 'TextInput',
          key: 'title.value',
          name: 'value',
          statePath: 'title.value',
          label: 'Title contains',
          inputType: 'text',
        } as never,
      ],
    },
  ],
  filterState: {},
}

describe('table interactions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Posts', content: [], token: 't' } })
  })

  it('copies a cell without opening the row', async () => {
    const visit = vi.mocked(router.visit)
    visit.mockClear()
    const writeText = vi.fn(async () => undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(Wrapper, { props: { component: DataTable, props: { table } } })

    await fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith('Hello')
    expect(visit).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Copied')
  })

  it('keeps the search text across unrelated reloads', async () => {
    const props = reactiveProps({ table })
    render(Wrapper, { props: { component: DataTable, props } })
    const search = screen.getByPlaceholderText('Search') as HTMLInputElement

    await fireEvent.input(search, { target: { value: 'Hel' } })
    props.table = { ...table }
    await tick()

    expect(search.value).toBe('Hel')

    props.table = { ...table, search: 'World' }
    await tick()

    expect(search.value).toBe('World')
  })

  it('keeps typed filter text across unrelated reloads', async () => {
    const props = reactiveProps({ table, component: 'table' })
    render(Wrapper, { props: { component: TableFilters, props } })
    const input = screen.getByLabelText('Title contains') as HTMLInputElement

    await fireEvent.input(input, { target: { value: 'Hel' } })
    props.table = { ...table, filterState: {} }
    await tick()

    expect(input.value).toBe('Hel')
  })

  it('removes a filter the server no longer applies', async () => {
    const active = { ...table, filterState: { title: { value: 'Hel' } } }
    const props = reactiveProps({ table: active, component: 'table' })
    render(Wrapper, { props: { component: TableFilters, props } })

    expect(screen.getByLabelText('Title contains')).toHaveValue('Hel')

    props.table = { ...active, filterState: {} }
    await tick()

    expect(screen.getByLabelText('Title contains')).toHaveValue('')
  })

  it('collapses above-content filters when collapsible', async () => {
    render(Wrapper, {
      props: {
        component: TableFilters,
        props: {
          table: { ...table, filtersLayout: 'above-content-collapsible' },
          component: 'table',
        },
      },
    })

    const toggle = screen.getByRole('button', { name: /Filters/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Title contains')).toBeNull()

    await fireEvent.click(toggle)

    expect(screen.getByLabelText('Title contains')).toBeInTheDocument()
  })

  it('binds record action shortcuts only outside record rows', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const action: ActionSchema = {
      type: 'Action',
      name: 'archive',
      label: 'Archive',
      hasAction: true,
      keyBindings: ['shift+a'],
    }

    const rows = render(Wrapper, {
      props: {
        component: ActionList,
        props: { actions: [action], context: { token: 't', component: 'table', record: 1 } },
      },
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', shiftKey: true }))
    expect(trigger).not.toHaveBeenCalled()
    rows.unmount()

    render(Wrapper, {
      props: {
        component: ActionList,
        props: {
          actions: [
            action,
            { type: 'Action', name: 'go', label: 'Go', url: '/go', disabled: true },
          ],
          context: { token: 't', component: 'page' },
        },
      },
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', shiftKey: true }))
    expect(trigger).toHaveBeenCalledTimes(1)

    expect(screen.queryByRole('link', { name: /Go/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Go/ })).toBeDisabled()
  })

  it('colours toggle columns and sizes icon columns', async () => {
    const { container } = render(Wrapper, {
      props: {
        component: DataTable,
        props: {
          table: {
            ...table,
            columns: [
              {
                type: 'ToggleColumn',
                name: 'active',
                label: 'Active',
                editable: true,
                onColor: 'warning',
                offColor: 'danger',
              },
              { type: 'IconColumn', name: 'icon', label: 'Icon' },
            ],
            visibleColumns: ['active', 'icon'],
            records: [
              { key: 1, cells: { active: { state: true }, icon: { icon: 'check', size: 'xl' } } },
            ],
          },
        },
      },
    })

    expect(screen.getByRole('switch')).toHaveClass('data-[state=checked]:bg-warning')
    expect(screen.getByRole('switch')).toHaveClass('data-[state=unchecked]:bg-destructive')
    await waitFor(() => expect(container.querySelector('svg.size-8')).not.toBeNull())
  })
})
