import { FormStore, type SchemaComponent, type TableSchema } from '@alfakit/core'
import { CalendarDate } from '@internationalized/date'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import ShortcutKeys from '../src/components/panel/ShortcutKeys.vue'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import DataTable from '../src/components/table/DataTable.vue'
import Calendar from '../src/components/ui/Calendar.vue'
import { mountWithAlfakit, setPageProps } from './mocks'

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore({ components, state }, { token: 't', component: 'form' })
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form)) }
}

const describedText = (element: Element) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent?.trim())

describe('field accessibility', () => {
  it('links hint, helper text and error to the input', async () => {
    const { store, wrapper } = renderForm(
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

    const input = wrapper.find('input#alfakit-title').element
    expect(describedText(input)).toEqual(['Max 60', 'Shown in search results'])
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(input.hasAttribute('aria-invalid')).toBe(false)

    store.setErrors({ title: ['The title is required.'] })
    await nextTick()

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(describedText(input)).toEqual([
      'Max 60',
      'Shown in search results',
      'The title is required.',
    ])

    wrapper.unmount()
  })

  it('reorders tags with Alt + arrow keys and announces the move', async () => {
    const { store, wrapper } = renderForm(
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

    const first = wrapper.findAll('[data-tag]')[0]!
    expect(first.attributes('tabindex')).toBe('0')

    await first.trigger('keydown', { key: 'ArrowRight', altKey: true })
    await flushPromises()

    expect(store.state.values.tags).toEqual(['b', 'a', 'c'])
    expect(wrapper.text()).toContain('a moved to position 2 of 3')
    expect(wrapper.find('button[aria-label="Remove a"]').exists()).toBe(true)

    wrapper.unmount()
  })
})

describe('calendar', () => {
  it('marks "today" from the field timezone', () => {
    const wrapper = mountWithAlfakit(() =>
      h(Calendar, {
        modelValue: new CalendarDate(2026, 10, 15),
        today: new CalendarDate(2026, 10, 20),
      }),
    )

    const day = (value: string) =>
      wrapper.findAll('[data-reka-calendar-cell-trigger]').find((node) => {
        return node.attributes('data-value') === value
      })

    expect(day('2026-10-20')?.classes()).toContain('bg-accent')
    expect(day('2026-10-19')?.classes()).not.toContain('bg-accent')

    wrapper.unmount()
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
    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))
    const headers = wrapper.findAll('th')

    expect(headers.find((th) => th.text().includes('Title'))?.attributes('aria-sort')).toBe(
      'descending',
    )
    expect(headers.find((th) => th.text().includes('Author'))?.attributes('aria-sort')).toBe('none')

    const links = wrapper.findAll('tbody a')
    expect(links.map((link) => link.text())).toEqual(['Hello', 'World'])
    expect(links[0]!.attributes('href')).toBe('/posts/1')

    wrapper.unmount()
  })

  it('shows an indeterminate "select page" checkbox when some rows are selected', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))

    await wrapper.find('tbody [role="checkbox"]').trigger('click')

    expect(wrapper.find('thead [role="checkbox"]').attributes('aria-checked')).toBe('mixed')

    wrapper.unmount()
  })

  it('moves rows with buttons in reorder mode and announces the position', async () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table }))

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Reorder')!
      .trigger('click')
    await wrapper.findAll('button[aria-label="Move down"]')[0]!.trigger('click')

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0]!.text()).toContain('World')
    expect(rows[1]!.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Row moved to position 2 of 2')

    wrapper.unmount()
  })
})

describe('key bindings', () => {
  it('keeps the keys of a binding in left-to-right order in right-to-left pages', async () => {
    const wrapper = mountWithAlfakit(() => h(ShortcutKeys, { binding: 'mod+k' }))
    await flushPromises()

    const keys = wrapper.findAll('kbd')
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.every((key) => key.attributes('dir') === 'ltr')).toBe(true)
  })
})
