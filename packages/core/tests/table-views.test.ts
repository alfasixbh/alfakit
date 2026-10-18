import type { TableViewsSchema } from '../src/schema/table'
import {
  activeTableView,
  groupTableViews,
  requestTableView,
  tableViewFollowUp,
  tableViewUrl,
} from '../src/table-views'

const views: TableViewsSchema = {
  layout: 'tabs',
  queryKey: 'view',
  active: 'mine-abc123',
  items: [
    { key: 'overdue', label: 'Overdue', type: 'preset', default: true },
    { key: 'team-x1', label: 'Team', type: 'shared' },
    { key: 'mine-abc123', label: 'Mine', type: 'personal', editable: true },
  ],
}

describe('table views', () => {
  it('opens a view without the table state the view replaces', () => {
    expect(
      tableViewUrl(
        'http://localhost/admin/posts?sort=title&filters[status][value]=x&page=3&activeTab=all',
        undefined,
        'view',
        'overdue',
      ),
    ).toBe('/admin/posts?activeTab=all&view=overdue')

    // Prefixed tables only lose their own keys; `null` is "no view".
    expect(
      tableViewUrl(
        '/admin?orders_sort=id&sort=title&orders_view=old',
        'orders',
        'orders_view',
        null,
      ),
    ).toBe('/admin?sort=title&orders_view=')
  })

  it('groups and finds views', () => {
    const groups = groupTableViews(views.items)

    expect(groups.preset.map((item) => item.key)).toEqual(['overdue'])
    expect(groups.shared.map((item) => item.key)).toEqual(['team-x1'])
    expect(groups.personal.map((item) => item.key)).toEqual(['mine-abc123'])
    expect(activeTableView(views)?.label).toBe('Mine')
    expect(activeTableView({ ...views, active: undefined })).toBeUndefined()
  })

  it('decides what follows an operation', () => {
    expect(
      tableViewFollowUp({ views }, { operation: 'create', name: 'x' }, { view: 'x-1' }),
    ).toEqual({ open: 'x-1' })
    expect(tableViewFollowUp({ views }, { operation: 'delete', view: 'mine-abc123' }, {})).toEqual({
      open: null,
    })
    expect(tableViewFollowUp({ views }, { operation: 'delete', view: 'team-x1' }, {})).toEqual({
      reload: true,
    })
    expect(tableViewFollowUp({ views }, { operation: 'default', view: null }, {})).toEqual({
      reload: true,
    })
  })

  it('sends the target view apart from the page query key', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetch)

    await requestTableView('/views', 'tok', 'table', {
      operation: 'rename',
      view: 'mine',
      name: 'New',
    })

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body)

    expect(body).toMatchObject({
      token: 'tok',
      component: 'table',
      operation: 'rename',
      target: 'mine',
      name: 'New',
    })
    expect(body).not.toHaveProperty('view')

    // "No view" as the default travels as `none` (an empty string would arrive as null).
    await requestTableView('/views', 'tok', 'table', { operation: 'default', view: '' })

    expect(
      JSON.parse((fetch.mock.calls[1] as unknown as [string, { body: string }])[1].body),
    ).toMatchObject({
      operation: 'default',
      target: null,
      none: true,
    })

    vi.unstubAllGlobals()
  })
})
