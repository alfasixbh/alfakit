import type { TableSchema } from '@alfakit/core'
import { FormStore } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import QueryBuilderRulesField from '../src/components/fields/QueryBuilderRulesField.vue'
import { provideForm } from '../src/components/form/form-context'
import DataTable from '../src/components/table/DataTable.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const base: TableSchema = {
  type: 'Table',
  modelLabel: 'contact',
  pluralModelLabel: 'contacts',
  columns: [
    { type: 'TextColumn', name: 'name', label: 'Name', sortable: true, toggleable: true },
    { type: 'TextColumn', name: 'email', label: 'Email', toggleable: true },
    { type: 'TextColumn', name: 'phone', label: 'Phone', toggleable: true },
  ],
  visibleColumns: ['name', 'email', 'phone'],
  toggleableColumns: true,
  filtersLayout: 'dropdown',
  recordActionsPosition: 'after-columns',
  records: [
    { key: 1, cells: { name: { state: 'Ada' }, email: { state: 'a@x' }, phone: { state: '1' } } },
  ],
  pagination: null,
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No contacts', icon: 'inbox' },
}

const announcement = () =>
  document.querySelector('[data-slot="column-manager-announcement"]')?.textContent?.trim()

beforeEach(() => {
  vi.mocked(router.visit).mockClear()
  setPageProps({ page: { class: 'X', layout: 'app', title: 'Contacts', content: [], token: 't' } })
})

afterEach(() => {
  delete panel.endpoints.tableColumns
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('sort spinner', () => {
  it('shows a spinner on the clicked sort button until the visit finishes', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: base }), {
      attachTo: document.body,
    })
    const button = wrapper.find('th button')

    await button.trigger('click')

    expect(button.find('[data-slot="table-sort-spinner"]').exists()).toBe(true)
    expect(button.attributes('aria-busy')).toBe('true')

    const options = vi.mocked(router.visit).mock.calls[0]![1] as { onFinish?: (v: never) => void }
    options.onFinish?.({} as never)
    await flushPromises()

    expect(button.find('[data-slot="table-sort-spinner"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('column manager modal options', () => {
  it('opens in a slide-over with the trigger heading', async () => {
    const wrapper = mountWithAlfakit(
      () =>
        h(DataTable, {
          table: {
            ...base,
            columnManagerLayout: 'modal',
            triggerActions: { columnManager: { modal: { slideOver: true, heading: 'Pick' } } },
          },
        }),
      { attachTo: document.body },
    )

    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()
    const dialog = document.querySelector('[role="dialog"]')

    expect(dialog?.getAttribute('data-slot')).toBe('column-manager')
    expect(dialog?.hasAttribute('data-slide-over')).toBe(true)
    expect(dialog?.textContent).toContain('Pick')
    wrapper.unmount()
  })

  it('uses the trigger modal width in the dialog', async () => {
    const wrapper = mountWithAlfakit(
      () =>
        h(DataTable, {
          table: {
            ...base,
            columnManagerLayout: 'modal',
            triggerActions: { columnManager: { modal: { width: '4xl' } } },
          },
        }),
      { attachTo: document.body },
    )

    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()
    const dialog = document.querySelector('[role="dialog"]')

    expect(dialog?.classList.contains('sm:max-w-4xl')).toBe(true)
    expect(dialog?.getAttribute('data-slot')).toBe('column-manager')
    expect(dialog?.hasAttribute('data-slide-over')).toBe(false)
    wrapper.unmount()
  })
})

describe('column manager reorder announcements', () => {
  it('announces a deferred move and describes positions', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    const wrapper = mountWithAlfakit(
      () =>
        h(DataTable, { table: { ...base, reorderableColumns: true, deferColumnManager: true } }),
      { attachTo: document.body },
    )
    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()
    const up = document.querySelector<HTMLButtonElement>('button[aria-label="Move Email up"]')!

    expect(document.getElementById(up.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Position 2 of 3.',
    )

    up.click()
    await flushPromises()

    expect(announcement()).toBe(
      'Email moved to position 1 of 3. Apply columns to save your changes.',
    )
    expect(fetch).not.toHaveBeenCalled()
    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Move Email up"]')?.disabled,
    ).toBe(true)
    wrapper.unmount()
  })

  it('moves and announces within a column group', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ columns: ['name', 'phone', 'email'] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetch)
    panel.endpoints.tableColumns = '/columns'

    const wrapper = mountWithAlfakit(
      () =>
        h(DataTable, {
          table: {
            ...base,
            reorderableColumns: true,
            columnGroups: [{ label: 'Contact', columns: ['email', 'phone'] }],
          },
        }),
      { attachTo: document.body },
    )
    await wrapper.find('button[aria-label="Columns"]').trigger('click')
    await flushPromises()

    expect(
      document.querySelector<HTMLButtonElement>('button[aria-label="Move Email up"]')?.disabled,
    ).toBe(true)
    document.querySelector<HTMLButtonElement>('button[aria-label="Move Phone up"]')!.click()
    await flushPromises()

    expect(announcement()).toBe('Phone moved to position 1 of 2 in Contact.')
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ columns: ['name', 'phone', 'email'] })
    wrapper.unmount()
  })
})

describe('grouped query builder constraints', () => {
  it('groups the constraint select of a rule by constraint group', () => {
    const field = {
      type: 'QueryBuilderRules',
      key: 'query',
      name: 'query',
      statePath: 'queryBuilder.query',
      maxDepth: 1,
      constraints: [
        {
          name: 'status',
          label: 'Status',
          type: 'text',
          operators: [{ name: 'is', label: 'is', input: 'text' }],
        },
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          group: 'Content',
          operators: [{ name: 'is', label: 'is', input: 'text' }],
        },
      ],
    }
    const store = new FormStore(
      {
        components: [field as never],
        state: {
          queryBuilder: {
            query: {
              combinator: 'and',
              rules: [{ type: 'constraint', constraint: 'title', operator: 'is' }],
            },
          },
        },
      },
      { token: 't', component: 'table.filters' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(QueryBuilderRulesField, { component: field as never })
      },
    })
    const wrapper = mountWithAlfakit(() => h(Form))
    const group = wrapper.find('select[aria-label="Field"] optgroup')

    expect(group.attributes('label')).toBe('Content')
    expect(group.findAll('option').map((option) => option.text())).toEqual(['Title'])
    wrapper.unmount()
  })
})
