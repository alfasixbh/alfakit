import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

const response = {
  labels: { 1: 'Ada' },
  table: {
    type: 'Table',
    modelLabel: 'user',
    pluralModelLabel: 'users',
    columns: [{ type: 'TextColumn', name: 'name', label: 'Name' }],
    visibleColumns: ['name'],
    filtersLayout: 'dropdown',
    recordActionsPosition: 'after-columns',
    searchPlaceholder: 'Search',
    searchDebounce: 0,
    emptyState: { heading: 'No users' },
    records: [{ key: 1, selectable: true, cells: { name: { state: 'Ada', disabled: true } } }],
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 1,
      from: 1,
      to: 1,
      pageOptions: [10],
    },
  },
}

const picker = {
  type: 'ModalTableSelect',
  key: 'user',
  name: 'user',
  statePath: 'user',
  label: 'User',
  modalHeading: 'Search users',
  modalDescription: 'Only &lt;active&gt; users',
  modalSubmitActionLabel: 'Use user',
  modalWidth: '5xl',
  selectActionLabel: 'Pick a user',
  selectActionIcon: 'search',
  tableStateIdentifier: 'table',
} as unknown as SchemaComponent

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('ModalTableSelect selectAction()', () => {
  it('uses the customised button, heading, description, width and confirm label', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(response))),
    )
    const store = new FormStore(
      { components: [picker], state: { user: null } },
      { token: 't', component: 'form', optionsUrl: '/o' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(SchemaRenderer, { components: store.state.components })
      },
    })
    mountWithAlfakit(() => h(Form), { attachTo: document.body })
    await nextTick()

    const find = () =>
      [...document.querySelectorAll('button')].find(
        (element) => element.textContent?.trim() === 'Pick a user',
      )
    // The picker's code loads lazily.
    await vi.waitFor(() => expect(find()).toBeDefined())
    const button = find()!

    button.click()
    await flushPromises()
    await vi.waitFor(() =>
      expect(document.querySelector('[aria-label="Select Ada"]')).not.toBeNull(),
    )

    const dialog = document.querySelector('[role="dialog"]')!

    expect(dialog.textContent).toContain('Search users')
    expect(dialog.textContent).toContain('Only <active> users')
    expect(dialog.className).toContain('sm:max-w-5xl')
    ;(document.querySelector('[aria-label="Select Ada"]') as HTMLElement).click()
    await nextTick()

    const confirm = [...dialog.querySelectorAll('button')].find(
      (element) => element.textContent?.trim() === 'Use user',
    ) as HTMLButtonElement
    confirm.click()
    await nextTick()

    expect(store.getValue('user')).toBe('1')
  })
})
