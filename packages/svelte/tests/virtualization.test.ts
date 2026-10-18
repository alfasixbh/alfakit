import {
  FormStore,
  fieldMemory,
  type SchemaComponent,
  type TableSchema,
  type UploadedFile,
} from '@alfakit/core'
import { fireEvent, render } from '@testing-library/svelte'
import { tick } from 'svelte'
import { describe, expect, it, vi } from 'vitest'
import { largeRepeater, largeRepeaterState, largeTable } from '../../core/tests/fixtures/large-form'
import DataTable from '../src/components/table/DataTable.svelte'
import FormHarness from './FormHarness.svelte'
import { setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

function renderRepeater(count: number, virtualize = true) {
  const repeater = largeRepeater(count, virtualize)
  const store = new FormStore(
    { components: [repeater], state: largeRepeaterState(count) },
    { token: 't', component: 'form' },
  )
  const result = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { ...result, store }
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
    const { container } = render(Wrapper, { props: { component: FormHarness, props: { store } } })
    const list = container.querySelector('ul[id="alfakit-items"]')!

    // Before measuring, the first window as a one-lane list (same markup as the server).
    expect(list.querySelectorAll(':scope > li').length).toBeLessThan(40)
    expect(list.querySelector('li[data-index="0"]')).toHaveAttribute('aria-setsize', '200')

    await nextFrame()
    await tick()

    // Attached: the window covers whole rows of three, still a fraction of the list.
    const rendered = list.querySelectorAll(':scope > li')
    expect(rendered.length % 3).toBe(0)
    expect(rendered.length).toBeLessThan(200)

    computed.mockRestore()
  })
})

describe('virtualised content layout', () => {
  it('renders a window of records with their list positions and reserves the rest', async () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Rows', content: [], token: 't' } })
    const { container } = render(Wrapper, {
      props: { component: DataTable, props: { table: contentLayoutTable(300) } },
    })
    const list = container.querySelector('[data-slot="table-content"]')!
    const records = list.querySelectorAll('[data-slot="table-record"]')

    expect(records.length).toBeGreaterThan(3)
    expect(records.length).toBeLessThan(60)
    expect(list).toHaveAttribute('role', 'list')
    expect(records[0]).toHaveAttribute('role', 'listitem')
    expect(records[0]).toHaveAttribute('aria-setsize', '300')
    expect(records[0]).toHaveAttribute('aria-posinset', '1')
    expect(records[0]).toHaveAttribute('data-index', '0')
    expect((list as HTMLElement).style.paddingBottom).not.toBe('')

    await nextFrame()
    await tick()

    expect(list.querySelectorAll('[data-slot="table-record"]').length).toBeLessThan(60)
  })

  it('renders every record below the threshold without list semantics', () => {
    const { container } = render(Wrapper, {
      props: { component: DataTable, props: { table: contentLayoutTable(20) } },
    })
    const list = container.querySelector('[data-slot="table-content"]')!

    expect(list.querySelectorAll('[data-slot="table-record"]')).toHaveLength(20)
    expect(list).not.toHaveAttribute('role')
    expect(list.querySelector('[data-slot="table-record"]')).not.toHaveAttribute('aria-setsize')
  })
})

describe('virtualised repeater', () => {
  it('renders only a window of a long list, with the real positions for assistive tech', async () => {
    const { container } = renderRepeater(200)
    const list = container.querySelector('ul[id="alfakit-items"]')!
    const initial = list.querySelectorAll(':scope > li')

    expect(initial.length).toBeGreaterThan(5)
    expect(initial.length).toBeLessThan(40)
    expect(initial[0]).toHaveAttribute('data-index', '0')
    expect(initial[0]).toHaveAttribute('aria-setsize', '200')
    expect(initial[0]).toHaveAttribute('aria-posinset', '1')
    expect((list as HTMLElement).style.paddingBottom).not.toBe('')

    await nextFrame()
    await tick()

    expect(list.querySelectorAll(':scope > li').length).toBeLessThan(40)
    expect(container.querySelectorAll('input[type="text"]').length).toBeLessThan(40)
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
      const short = renderRepeater(50)
      const items = short.container.querySelectorAll('ul[id="alfakit-items"] > li')
      expect(items).toHaveLength(50)
      expect(items[0]).not.toHaveAttribute('aria-setsize')
      short.unmount()

      const off = renderRepeater(60, false)
      expect(off.container.querySelectorAll('ul[id="alfakit-items"] > li')).toHaveLength(60)
    },
  )

  it('keeps collapse state and move/remove working on windowed items', async () => {
    const { container, store } = renderRepeater(200)

    expect(container.querySelector('li[data-index="0"] input[type="text"]')).toHaveValue('Item 1')

    // The Svelte collapsible keeps its content in the DOM and hides it.
    const hidden = (index: number) =>
      container
        .querySelector(`li[data-index="${index}"] input[type="text"]`)!
        .closest('[hidden]') !== null

    await fireEvent.click(
      container.querySelector('li[data-index="0"] button[aria-label="Collapse"]')!,
    )
    await tick()
    expect(hidden(0)).toBe(true)
    expect(hidden(1)).toBe(false)

    await fireEvent.click(
      container.querySelector('li[data-index="1"] button[aria-label="Move up"]')!,
    )
    await tick()
    const items = store.getValue<{ name: string }[]>('items')
    expect(items[0]!.name).toBe('Item 2')
    expect(items[1]!.name).toBe('Item 1')
    // The collapsed flag travelled with its item.
    expect(hidden(1)).toBe(true)
    expect(hidden(0)).toBe(false)

    await fireEvent.click(
      container.querySelector('li[data-index="0"] button[aria-label="Remove"]')!,
    )
    expect(store.getValue<unknown[]>('items')).toHaveLength(199)
  })

  it('scrolls the first errored item into view when errors arrive', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { container, store } = renderRepeater(200)

    expect(container.querySelector('li[data-index="150"]')).toBeNull()

    store.setErrors({ 'items.150.name': ['Required'], 'items.170.name': ['Required'] })
    await tick()
    await tick()

    const target = container.querySelector('li[data-index="150"]')
    expect(target).not.toBeNull()
    expect(target!.querySelector('[role="alert"]')).toHaveTextContent('Required')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })

  it('keeps focus-adjacent items rendered so Tab reaches the next one', async () => {
    const { container } = renderRepeater(200)
    await nextFrame()
    await tick()
    const list = container.querySelector('ul[id="alfakit-items"]')!
    const rendered = list.querySelectorAll(':scope > li')
    const last = rendered[rendered.length - 1]!
    const lastIndex = Number(last.getAttribute('data-index'))

    expect(list.querySelector(`li[data-index="${lastIndex + 1}"]`)).toBeNull()

    last.querySelector<HTMLInputElement>('input[type="text"]')!.focus()
    await tick()

    expect(list.querySelector(`li[data-index="${lastIndex + 1}"]`)).not.toBeNull()
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

    const first = render(Wrapper, { props: { component: FormHarness, props: { store } } })
    expect(first.container.textContent).toContain('photo.png')
    expect(first.container.querySelector('img')).toHaveAttribute('src', 'blob:preview')
    first.unmount()

    const second = render(Wrapper, { props: { component: FormHarness, props: { store } } })
    expect(second.container.textContent).toContain('photo.png')
    expect(second.container.querySelector('img')).toHaveAttribute('src', 'blob:preview')
  })
})

describe('virtualised table', () => {
  it('renders a window of rows with spacer rows and row indexes', async () => {
    setPageProps({ page: { class: 'X', layout: 'app', title: 'Rows', content: [], token: 't' } })
    const { container } = render(Wrapper, {
      props: { component: DataTable, props: { table: largeTable(300, 12) } },
    })
    await nextFrame()
    await tick()

    const table = container.querySelector('table')!
    expect(table).toHaveAttribute('aria-rowcount', '301')

    const rows = table.querySelectorAll('tbody tr[data-index]')
    expect(rows.length).toBeGreaterThan(5)
    expect(rows.length).toBeLessThan(60)
    expect(rows[0]).toHaveAttribute('aria-rowindex', '2')
    expect(table.querySelector('tbody tr[data-slot="virtual-spacer"]')).not.toBeNull()
    expect(table.querySelectorAll('thead th')).toHaveLength(12)
  })

  it('renders every row below the threshold', () => {
    const { container } = render(Wrapper, {
      props: { component: DataTable, props: { table: largeTable(40, 3) } },
    })

    expect(container.querySelectorAll('tbody tr')).toHaveLength(40)
    expect(container.querySelector('table')).not.toHaveAttribute('aria-rowcount')
  })
})
