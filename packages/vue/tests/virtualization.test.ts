import {
  FormStore,
  fieldMemory,
  type SchemaComponent,
  type TableSchema,
  type UploadedFile,
} from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { largeRepeater, largeRepeaterState, largeTable } from '../../core/tests/fixtures/large-form'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import DataTable from '../src/components/table/DataTable.vue'
import { mountWithAlfakit, setPageProps } from './mocks'

// jsdom has no matchMedia (the table's mobile preset reads it).
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** A form around `components`, bound to `store`. */
const Form = defineComponent({
  props: {
    store: { type: FormStore, required: true },
    components: { type: Array, required: true },
  },
  setup(props) {
    provideForm(props.store)

    return () => h(SchemaRenderer, { components: props.components as SchemaComponent[] })
  },
})

function mountRepeater(count: number, virtualize = true) {
  const repeater = largeRepeater(count, virtualize)
  const store = new FormStore(
    { components: [repeater], state: largeRepeaterState(count) },
    { token: 't', component: 'form' },
  )
  const wrapper = mountWithAlfakit(() => h(Form, { store, components: [repeater] }))

  return { wrapper, store }
}

function contentLayoutTable(rows: number): TableSchema {
  const table = largeTable(rows, 3)

  return {
    ...table,
    contentGrid: { default: 1, md: 3 },
    contentLayout: [
      {
        type: 'Stack',
        schema: table.columns.map((column) => ({ type: 'Column', name: column.name })),
      },
    ],
  }
}

describe('virtualised grid repeater', () => {
  it('windows a multi-column grid by rows, counting the lanes of the rendered grid', async () => {
    const computed = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element: Element) =>
        ({
          gridTemplateColumns: element.tagName === 'UL' ? '200px 200px 200px' : 'none',
        }) as CSSStyleDeclaration,
    )
    const repeater = { ...largeRepeater(200), grid: { default: 1, lg: 3 } }
    const store = new FormStore(
      { components: [repeater], state: largeRepeaterState(200) },
      { token: 't', component: 'form' },
    )
    const wrapper = mountWithAlfakit(() => h(Form, { store, components: [repeater] }))
    const list = wrapper.find('ul[id="alfakit-items"]')

    // Before measuring, the first window as a one-lane list (same markup as the server).
    expect(list.findAll(':scope > li').length).toBeLessThan(40)
    expect(list.find('li[data-index="0"]').attributes('aria-setsize')).toBe('200')

    await nextFrame()
    await nextTick()

    // Attached: the window covers whole rows of three, still a fraction of the list.
    const rendered = list.findAll(':scope > li')
    expect(rendered.length % 3).toBe(0)
    expect(rendered.length).toBeLessThan(200)

    wrapper.unmount()
    computed.mockRestore()
  })
})

describe('virtualised content layout', () => {
  it('renders a window of records with their list positions and reserves the rest', async () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Rows', content: [], token: 't' } })
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: contentLayoutTable(300) }))
    const list = wrapper.find('[data-slot="table-content"]')
    const records = list.findAll('[data-slot="table-record"]')

    expect(records.length).toBeGreaterThan(3)
    expect(records.length).toBeLessThan(60)
    expect(list.attributes('role')).toBe('list')
    expect(records[0]!.attributes('role')).toBe('listitem')
    expect(records[0]!.attributes('aria-setsize')).toBe('300')
    expect(records[0]!.attributes('aria-posinset')).toBe('1')
    expect(records[0]!.attributes('data-index')).toBe('0')
    expect((list.element as HTMLElement).style.paddingBottom).not.toBe('')

    await nextFrame()
    await nextTick()

    expect(list.findAll('[data-slot="table-record"]').length).toBeLessThan(60)
    wrapper.unmount()
  })

  it('renders every record below the threshold without list semantics', () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: contentLayoutTable(20) }))
    const list = wrapper.find('[data-slot="table-content"]')

    expect(list.findAll('[data-slot="table-record"]')).toHaveLength(20)
    expect(list.attributes('role')).toBeUndefined()
    expect(list.find('[data-slot="table-record"]').attributes('aria-setsize')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('virtualised repeater', () => {
  it('renders only a window of a long list, with the real positions for assistive tech', async () => {
    const { wrapper } = mountRepeater(200)
    const list = wrapper.find('ul[id="alfakit-items"]')
    const initial = list.findAll(':scope > li')

    expect(initial.length).toBeGreaterThan(5)
    expect(initial.length).toBeLessThan(40)
    expect(initial[0]!.attributes('data-index')).toBe('0')
    expect(initial[0]!.attributes('aria-setsize')).toBe('200')
    expect(initial[0]!.attributes('aria-posinset')).toBe('1')
    expect((list.element as HTMLElement).style.paddingBottom).not.toBe('')

    await nextFrame()
    await nextTick()

    expect(list.findAll(':scope > li').length).toBeLessThan(40)
    expect(wrapper.findAll('input[type="text"]').length).toBeLessThan(40)
    wrapper.unmount()
  })

  // Renders ~110 repeater items (each a TextInput, a Select and a FileUpload) without
  // windowing on purpose: well under a second locally, but several seconds on a contended CI
  // runner, so this test gets more than the default 5 s.
  it(
    'renders every item at or below the threshold and when the server turned it off',
    {
      timeout: 20_000,
    },
    () => {
      const short = mountRepeater(50)
      const items = short.wrapper.findAll('ul[id="alfakit-items"] > li')
      expect(items).toHaveLength(50)
      expect(items[0]!.attributes('aria-setsize')).toBeUndefined()
      short.wrapper.unmount()

      const off = mountRepeater(60, false)
      expect(off.wrapper.findAll('ul[id="alfakit-items"] > li')).toHaveLength(60)
      off.wrapper.unmount()
    },
  )

  it('keeps collapse state and move/remove working on windowed items', async () => {
    const { wrapper, store } = mountRepeater(200)

    expect(
      (wrapper.find('li[data-index="0"] input[type="text"]').element as HTMLInputElement).value,
    ).toBe('Item 1')

    await wrapper.find('li[data-index="0"] button[aria-label="Collapse"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('li[data-index="0"] input[type="text"]').exists()).toBe(false)
    expect(wrapper.find('li[data-index="1"] input[type="text"]').exists()).toBe(true)

    await wrapper.find('li[data-index="1"] button[aria-label="Move up"]').trigger('click')
    await flushPromises()
    const items = store.getValue<{ name: string }[]>('items')
    expect(items[0]!.name).toBe('Item 2')
    expect(items[1]!.name).toBe('Item 1')
    expect(wrapper.find('li[data-index="1"] input[type="text"]').exists()).toBe(false)

    await wrapper.find('li[data-index="0"] button[aria-label="Remove"]').trigger('click')
    expect(store.getValue<unknown[]>('items')).toHaveLength(199)
    wrapper.unmount()
  })

  it('scrolls the first errored item into view when errors arrive', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { wrapper, store } = mountRepeater(200)

    expect(wrapper.find('li[data-index="150"]').exists()).toBe(false)

    store.setErrors({ 'items.150.name': ['Required'], 'items.170.name': ['Required'] })
    await flushPromises()

    const target = wrapper.find('li[data-index="150"]')
    expect(target.exists()).toBe(true)
    expect(target.find('[role="alert"]').text()).toBe('Required')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    wrapper.unmount()
  })

  it('keeps focus-adjacent items rendered so Tab reaches the next one', async () => {
    const { wrapper } = mountRepeater(200)
    await nextFrame()
    await nextTick()
    const list = wrapper.find('ul[id="alfakit-items"]')
    const rendered = list.findAll(':scope > li')
    const last = rendered[rendered.length - 1]!
    const lastIndex = Number(last.attributes('data-index'))

    expect(list.find(`li[data-index="${lastIndex + 1}"]`).exists()).toBe(false)

    ;(last.find('input[type="text"]').element as HTMLInputElement).focus()
    await flushPromises()

    expect(list.find(`li[data-index="${lastIndex + 1}"]`).exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('field memory', () => {
  it('keeps a FileUpload’s session files and previews across unmount and remount', () => {
    const upload = {
      type: 'FileUpload',
      key: 'items.0.attachment',
      name: 'attachment',
      statePath: 'items.0.attachment',
      label: 'Attachment',
      image: true,
      previewable: true,
      deletable: true,
      panelLayout: 'compact',
      files: [],
    } as SchemaComponent
    const store = new FormStore(
      { components: [upload], state: { items: [{ attachment: 'tmp:abc' }] } },
      { token: 't', component: 'form' },
    )
    fieldMemory<UploadedFile[]>(store, 'items.0.attachment:uploaded', () => []).set([
      { path: 'tmp:abc', name: 'photo.png', size: 2048, temporary: true, url: 'blob:preview' },
    ])
    const first = mountWithAlfakit(() => h(Form, { store, components: [upload] }))
    expect(first.text()).toContain('photo.png')
    expect(first.find('img').attributes('src')).toBe('blob:preview')
    first.unmount()

    const second = mountWithAlfakit(() => h(Form, { store, components: [upload] }))
    expect(second.text()).toContain('photo.png')
    expect(second.find('img').attributes('src')).toBe('blob:preview')
    second.unmount()
  })
})

describe('virtualised table', () => {
  it('renders a window of rows with spacer rows and row indexes', async () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Rows', content: [], token: 't' } })
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: largeTable(300, 12) }))
    await nextFrame()
    await nextTick()

    const table = wrapper.find('table')
    expect(table.attributes('aria-rowcount')).toBe('301')

    const rows = table.findAll('tbody tr[data-index]')
    expect(rows.length).toBeGreaterThan(5)
    expect(rows.length).toBeLessThan(60)
    expect(rows[0]!.attributes('aria-rowindex')).toBe('2')
    expect(table.find('tbody tr[data-slot="virtual-spacer"]').exists()).toBe(true)
    expect(table.findAll('thead th')).toHaveLength(12)
    wrapper.unmount()
  })

  it('renders every row below the threshold', () => {
    const wrapper = mountWithAlfakit(() => h(DataTable, { table: largeTable(40, 3) }))

    expect(wrapper.findAll('tbody tr')).toHaveLength(40)
    expect(wrapper.find('table').attributes('aria-rowcount')).toBeUndefined()
    wrapper.unmount()
  })
})
