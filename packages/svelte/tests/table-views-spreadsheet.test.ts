import type { TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { render } from '@testing-library/svelte'
import { tick } from 'svelte'
import DataTable from '../src/components/table/DataTable.svelte'
import Spreadsheet from '../src/components/table/Spreadsheet.svelte'
import { panel, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

let unmount: (() => void) | null = null
const nextTick = tick
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

function mount(component: unknown, props: Record<string, unknown>) {
  const result = render(Wrapper, { props: { component, props } })
  unmount = () => result.unmount()

  return result
}

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [
    { type: 'TextInputColumn', name: 'title', label: 'Title', editable: true, inputType: 'text' },
    {
      type: 'SelectColumn',
      name: 'status',
      label: 'Status',
      editable: true,
      selectablePlaceholder: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
    },
    { type: 'ToggleColumn', name: 'featured', label: 'Featured', editable: true },
  ] as TableSchema['columns'],
  visibleColumns: ['title', 'status', 'featured'],
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    {
      key: 1,
      cells: { title: { state: 'One' }, status: { state: 'draft' }, featured: { state: false } },
    },
    {
      key: 2,
      cells: { title: { state: 'Two' }, status: { state: 'draft' }, featured: { state: true } },
    },
  ],
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
}

const views: TableSchema['views'] = {
  layout: 'tabs',
  queryKey: 'view',
  active: 'overdue',
  modified: true,
  canSave: true,
  items: [
    { key: 'overdue', label: 'Overdue', type: 'preset' },
    { key: 'mine-1', label: 'Mine', type: 'personal', editable: true },
  ],
}

const spreadsheet: TableSchema = {
  ...base,
  spreadsheet: { columns: ['title', 'status', 'featured'], maxChanges: 1000 },
}

const visited = (): string[] => vi.mocked(router.visit).mock.calls.map(([url]) => String(url))

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function cell(row: number, col: number): HTMLElement {
  return document.querySelector(
    `[role="gridcell"][aria-rowindex="${row + 2}"][aria-colindex="${col + 1}"]`,
  ) as HTMLElement
}

function grid(): HTMLElement {
  return document.querySelector('[role="grid"]') as HTMLElement
}

async function key(target: Element, init: KeyboardEventInit) {
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  await nextTick()
}

function clipboardEvent(type: 'copy' | 'paste', data: Record<string, unknown>): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })

  Object.defineProperty(event, 'clipboardData', { value: data })

  return event
}

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  vi.mocked(router.reload).mockClear()
  setPageProps({
    alfakit: { ...panel, endpoints: { ...panel.endpoints, tableViews: '/tv', tableCells: '/tc' } },
  })
  window.history.replaceState(null, '', '/admin/posts?view=overdue&sort=title')
})

afterEach(() => {
  unmount?.()
  unmount = null
  vi.unstubAllGlobals()
  setPageProps({ alfakit: panel })
})

function mountGrid() {
  return mount(Spreadsheet, {
    table: spreadsheet,
    token: 'tok',
    component: 'table',
    onClose: () => {},
  })
}

describe('saved views', () => {
  it('shows the views as tabs and opens one without the state it replaces', async () => {
    mount(DataTable, { table: { ...base, views } })

    const tabs = [...document.querySelectorAll('[role="tablist"] [role="tab"]')] as HTMLElement[]

    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['All', 'Overdue', 'Mine'])
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(document.body.textContent).toContain('Modified')

    tabs[2]?.click()
    tabs[0]?.click()

    expect(visited()).toEqual(['/admin/posts?view=mine-1', '/admin/posts?view='])

    tabs[1]?.focus()
    await key(tabs[1] as HTMLElement, { key: 'ArrowRight' })

    expect(document.activeElement).toBe(tabs[2])
  })

  it('renders a dropdown layout', () => {
    mount(DataTable, { table: { ...base, views: { ...views, layout: 'dropdown' } } })

    expect(document.querySelector('[role="tablist"]')).toBeNull()
    expect(document.querySelector('[data-slot="table-views-trigger"]')?.textContent).toContain(
      'Overdue',
    )
  })
})

describe('spreadsheet mode', () => {
  it('is a grid with positions and a roving focus', () => {
    mountGrid()

    expect(grid().getAttribute('aria-rowcount')).toBe('3')
    expect(grid().getAttribute('aria-colcount')).toBe('3')
    expect(cell(0, 0).getAttribute('tabindex')).toBe('0')
    expect(cell(0, 1).getAttribute('tabindex')).toBe('-1')
  })

  it('moves with the arrow keys and edits with Enter, marking the cell dirty', async () => {
    mountGrid()

    cell(0, 0).focus()
    await key(grid(), { key: 'ArrowDown' })
    await flush()

    expect(cell(1, 0).getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(cell(1, 0))

    await key(grid(), { key: 'Enter' })

    const input = cell(1, 0).querySelector('input') as HTMLInputElement
    input.value = 'Changed'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await key(input, { key: 'Enter' })

    expect(cell(1, 0).textContent).toContain('Changed')
    expect(cell(1, 0).getAttribute('data-dirty')).toBe('true')
    expect(document.body.textContent).toContain('1 unsaved change')
  })

  it('fills down with Ctrl+D and copies the selection as TSV', async () => {
    mountGrid()

    cell(0, 0).focus()
    await key(grid(), { key: 'ArrowDown', shiftKey: true })
    await key(grid(), { key: 'd', ctrlKey: true })

    expect(cell(1, 0).textContent).toContain('One')
    expect(document.body.textContent).toContain('1 cell filled')

    const setData = vi.fn()
    grid().dispatchEvent(clipboardEvent('copy', { setData }))

    expect(setData).toHaveBeenCalledWith('text/plain', 'One\nOne')
  })

  it('previews a TSV paste, validates it on the server and applies it', async () => {
    const fetch = vi.fn(async () =>
      json({ saved: [], errors: [{ record: 2, column: 'title', messages: ['Too long.'] }] }),
    )
    vi.stubGlobal('fetch', fetch)
    mountGrid()

    cell(0, 0).focus()
    grid().dispatchEvent(
      clipboardEvent('paste', { getData: () => '"Quoted\ttitle"\tPublished\nLong\tnope' }),
    )
    await flush()
    await flush()

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement

    expect(dialog.textContent).toContain('3 cells will change')
    expect(dialog.textContent).toContain('"nope" is not an option of Status (row 2)')
    expect(dialog.textContent).toContain('Row 2, Title: Too long.')

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body)

    expect(body.dryRun).toBe(true)
    expect(body.changes[0]).toEqual({ record: 1, column: 'title', state: 'Quoted\ttitle' })

    ;[...dialog.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Apply')
      ?.click()
    await nextTick()

    expect(cell(0, 0).textContent?.trimEnd()).toBe('Quoted\ttitle')
    expect(cell(0, 1).textContent).toContain('Published')
    expect(cell(1, 0).getAttribute('aria-invalid')).toBe('true')
  })

  it('saves the batch in one request and shows the cell errors', async () => {
    const fetch = vi.fn(async () =>
      json({ saved: [], errors: [{ record: 1, column: 'title', messages: ['Required.'] }] }, 422),
    )
    vi.stubGlobal('fetch', fetch)
    mountGrid()

    cell(0, 0).focus()
    await key(grid(), { key: 'Delete' })
    await key(grid(), { key: 'ArrowRight' })
    await key(grid(), { key: 'ArrowRight' })
    await key(grid(), { key: ' ' })
    ;[...document.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Save changes'))
      ?.click()
    await flush()
    await flush()

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body)

    expect(body.changes).toEqual([
      { record: 1, column: 'title', state: null },
      { record: 1, column: 'featured', state: true },
    ])
    expect(cell(0, 0).getAttribute('aria-invalid')).toBe('true')
    expect(cell(0, 0).getAttribute('title')).toBe('Required.')
    expect(router.reload).not.toHaveBeenCalled()
  })

  it('mirrors the arrow keys right to left', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...(panel.localization ?? {}), direction: 'rtl' },
      } as typeof panel,
    })
    mountGrid()

    cell(0, 0).focus()
    await key(grid(), { key: 'ArrowLeft' })

    expect(cell(0, 1).getAttribute('tabindex')).toBe('0')
  })

  it('is offered from the toolbar only for spreadsheet tables', async () => {
    mount(DataTable, { table: spreadsheet })

    const trigger = document.querySelector('[data-slot="spreadsheet-trigger"]') as HTMLButtonElement

    expect(trigger.textContent).toContain('Edit as spreadsheet')

    trigger.click()
    await nextTick()

    expect(trigger.getAttribute('aria-pressed')).toBe('true')

    await vi.waitFor(() => expect(document.querySelector('[role="grid"]')).not.toBeNull())
  })
})
