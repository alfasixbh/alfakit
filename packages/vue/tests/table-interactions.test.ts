import type { ActionSchema, TableSchema } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { h, nextTick, ref } from 'vue'
import ActionList from '../src/components/actions/ActionList.vue'
import DataTable from '../src/components/table/DataTable.vue'
import TableFilters from '../src/components/table/TableFilters.vue'
import { actions, flush, mountWithAlfakit, setPageProps } from './mocks'

const table: TableSchema = {
  type: 'Table',
  modelLabel: 'post',
  pluralModelLabel: 'posts',
  columns: [{ type: 'TextColumn', name: 'title', label: 'Title', copyable: true }],
  visibleColumns: ['title'],
  filtersLayout: 'above-content',
  recordActionsPosition: 'after-columns',
  searchPlaceholder: 'Search',
  searchDebounce: 500,
  emptyState: { heading: 'No posts', icon: 'inbox' },
  records: [{ key: 1, url: '/posts/1/edit', cells: { title: { state: 'Hello' } } }],
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

    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))

    await wrapper.find('button[aria-label="Copy"]').trigger('click')
    await flush()

    expect(writeText).toHaveBeenCalledWith('Hello')
    expect(visit).not.toHaveBeenCalled()
    expect(wrapper.find('[role="status"]').text()).toBe('Copied')
    wrapper.unmount()
  })

  it('keeps typed filter text across unrelated reloads and drops removed filters', async () => {
    const current = ref<TableSchema>(table)
    const wrapper = mountWithAlfakit(() =>
      h(TableFilters, { table: current.value, component: 'table' }),
    )
    const input = () => wrapper.find('input').element as HTMLInputElement

    await wrapper.find('input').setValue('Hel')
    current.value = { ...table, filterState: {} }
    await nextTick()

    expect(input().value).toBe('Hel')
    wrapper.unmount()

    const active = ref<TableSchema>({ ...table, filterState: { title: { value: 'Hel' } } })
    const second = mountWithAlfakit(() =>
      h(TableFilters, { table: active.value, component: 'table' }),
    )

    expect((second.find('input').element as HTMLInputElement).value).toBe('Hel')
    active.value = { ...active.value, filterState: {} }
    await nextTick()

    expect((second.find('input').element as HTMLInputElement).value).toBe('')
    second.unmount()
  })

  it('collapses above-content filters when collapsible', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(TableFilters, {
        table: { ...table, filtersLayout: 'above-content-collapsible' },
        component: 'table',
      }),
    )

    const toggle = wrapper.find('button[aria-expanded]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('input').exists()).toBe(false)

    await toggle.trigger('click')

    expect(wrapper.find('input').exists()).toBe(true)
    wrapper.unmount()
  })

  it('binds record action shortcuts only outside record rows; disabled links do not navigate', async () => {
    const trigger = vi.spyOn(actions, 'trigger').mockResolvedValue(undefined)
    const action: ActionSchema = {
      type: 'Action',
      name: 'archive',
      label: 'Archive',
      hasAction: true,
      keyBindings: ['shift+a'],
    }

    const rows = mountWithAlfakit(() =>
      h('div', [
        h(ActionList, {
          actions: [action],
          context: { token: 't', component: 'table', record: 1 },
        }),
        h(ActionList, {
          actions: [action],
          context: { token: 't', component: 'table', record: 2 },
        }),
      ]),
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', shiftKey: true }))
    expect(trigger).not.toHaveBeenCalled()
    rows.unmount()

    const header = mountWithAlfakit(() =>
      h(ActionList, {
        actions: [action, { type: 'Action', name: 'go', label: 'Go', url: '/go', disabled: true }],
        context: { token: 't', component: 'page' },
      }),
    )
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', shiftKey: true }))
    expect(trigger).toHaveBeenCalledTimes(1)

    expect(header.findAll('a').some((node) => node.text().includes('Go'))).toBe(false)
    const go = header.findAll('button').find((node) => node.text().includes('Go'))
    expect(go?.attributes('disabled')).toBeDefined()
    header.unmount()
  })

  it('colours toggle columns and sizes icon columns', async () => {
    const wrapper = mountWithAlfakit(() =>
      h(DataTable, {
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
      }),
    )

    const toggle = wrapper.find('[role="switch"]')
    expect(toggle.classes()).toContain('data-[state=checked]:bg-warning')
    expect(toggle.classes()).toContain('data-[state=unchecked]:bg-destructive')
    await vi.waitFor(() => expect(wrapper.find('svg.size-8').exists()).toBe(true))
    wrapper.unmount()
  })
})
