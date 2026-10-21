import type { RichEditorSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import type { Editor } from '@tiptap/vue-3'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import RichEditorField from '../src/components/fields/RichEditorField.vue'
import { provideForm } from '../src/components/form/form-context'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { mountWithAlfakit } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(SchemaRenderer, { components: store.state.components })
    },
  })

  return { store, wrapper: mountWithAlfakit(() => h(Form), { attachTo: document.body }) }
}

const field = (type: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ type, key: name, name, statePath: name, label: name, ...extra }) as SchemaComponent

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)
const $$ = <T extends Element = HTMLElement>(selector: string) =>
  Array.from(document.querySelectorAll<T>(selector))
const buttonNamed = (name: string) =>
  $$<HTMLButtonElement>('button').find(
    (button) => button.getAttribute('aria-label') === name || button.textContent?.trim() === name,
  )

async function setInput(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
}

describe('TextInput autocapitalize', () => {
  it('applies the autocapitalize hint to the input', async () => {
    renderForm([field('TextInput', 'name', { inputType: 'text', autocapitalize: 'words' })], {})
    await flushPromises()

    expect($('input#name, input[name="name"]')!.getAttribute('autocapitalize')).toBe('words')
  })
})

describe('FileUpload uploadingMessage', () => {
  it('shows the custom message while a file uploads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    renderForm(
      [
        field('FileUpload', 'files', {
          multiple: true,
          previewable: true,
          deletable: true,
          panelLayout: 'compact',
          files: [],
          uploadingMessage: 'Sending the attachment…',
        }),
      ],
      { files: [] },
    )
    await flushPromises()

    const input = $<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['x'], 'a.pdf', { type: 'application/pdf' })],
    })
    input.dispatchEvent(new Event('change'))

    await vi.waitFor(() => expect(document.body.textContent).toContain('Sending the attachment…'))
  })
})

describe('Select reorderable()', () => {
  const select = (extra: Record<string, unknown> = {}) =>
    field('Select', 'tags', {
      multiple: true,
      reorderable: true,
      selectablePlaceholder: true,
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ],
      ...extra,
    })
  const chips = () => $$('[data-select-chip]').map((chip) => chip.textContent?.trim())

  it('lists the chosen options and moves them with Alt + arrow keys', async () => {
    const { store } = renderForm([select()], { tags: ['a', 'b', 'c'] })
    await flushPromises()

    expect(chips()).toEqual(['Alpha', 'Beta', 'Gamma'])

    $$('[data-select-chip]')[0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }),
    )
    await nextTick()

    expect(store.getValue('tags')).toEqual(['b', 'a', 'c'])
    expect(document.body.textContent).toContain('Alpha moved to position 2 of 3')

    buttonNamed('Remove Gamma')!.click()
    expect(store.getValue('tags')).toEqual(['b', 'a'])
  })

  it('reorders by drag and drop', async () => {
    const { store } = renderForm([select()], { tags: ['a', 'b', 'c'] })
    await flushPromises()
    const items = $$('[data-select-chip]')

    items[2]!.dispatchEvent(new Event('dragstart', { bubbles: true }))
    items[0]!.dispatchEvent(new Event('drop', { bubbles: true }))

    expect(store.getValue('tags')).toEqual(['c', 'a', 'b'])
  })

  it('keeps chips in the trigger without reorderable()', async () => {
    renderForm([select({ reorderable: undefined })], { tags: ['a'] })
    await flushPromises()

    expect($('[data-slot="select-reorder-list"]')).toBeNull()
  })
})

describe('CheckboxList search options', () => {
  const list = (extra: Record<string, unknown> = {}) =>
    field('CheckboxList', 'topics', {
      searchable: true,
      options: [
        { value: 'a', label: 'Apples' },
        { value: 'b', label: 'Bananas' },
      ],
      searchPrompt: 'Find a topic',
      noSearchResultsMessage: 'Nothing matches',
      ...extra,
    })

  it('uses the search prompt and the no results message', async () => {
    renderForm([list()], { topics: [] })
    await flushPromises()

    await setInput($<HTMLInputElement>('input[placeholder="Find a topic"]')!, 'zzz')

    expect($('[data-slot="checkbox-list-empty"]')!.textContent?.trim()).toBe('Nothing matches')
    expect(document.body.textContent).not.toContain('Apples')
  })

  it('filters after searchDebounce()', async () => {
    vi.useFakeTimers()
    renderForm([list({ searchDebounce: 300 })], { topics: [] })
    await nextTick()

    await setInput($<HTMLInputElement>('input[placeholder="Find a topic"]')!, 'ban')
    expect(document.body.textContent).toContain('Apples')

    vi.advanceTimersByTime(300)
    await nextTick()
    expect(document.body.textContent).not.toContain('Apples')
    expect(document.body.textContent).toContain('Bananas')
  })
})

describe('DatePicker locale() and datalist()', () => {
  it('offers datalist values on the native input with the field language', async () => {
    renderForm(
      [
        field('DatePicker', 'starts_on', {
          format: 'Y-m-d',
          hasDate: true,
          hasTime: false,
          native: true,
          timezone: 'UTC',
          firstDayOfWeek: 1,
          closeOnDateSelection: true,
          locale: 'fr',
          datalist: ['2026-01-01', '2026-02-01'],
        }),
      ],
      {},
    )
    await flushPromises()
    const input = $<HTMLInputElement>('input[type="date"]')!
    const list = document.getElementById(input.getAttribute('list')!)!

    expect(input.getAttribute('lang')).toBe('fr')
    expect(
      Array.from(list.querySelectorAll('option')).map((option) => option.getAttribute('value')),
    ).toEqual(['2026-01-01', '2026-02-01'])
  })
})

describe('ToggleButtons tooltips(), size() and fullWidth()', () => {
  it('sizes and stretches the buttons and shows tooltips', async () => {
    renderForm(
      [
        field('ToggleButtons', 'status', {
          inline: true,
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
          ],
          tooltips: { draft: 'Set as a draft first' },
          size: 'lg',
          fullWidth: true,
        }),
      ],
      {},
    )
    await flushPromises()
    const draft = buttonNamed('Draft')!

    expect($('[data-slot="toggle-buttons"]')!.className).toContain('w-full')
    expect(draft.className).toContain('h-10')
    expect(draft.className).toContain('flex-1')

    draft.dispatchEvent(new FocusEvent('focus'))
    await vi.waitFor(() =>
      expect($('[role="tooltip"]')?.textContent).toContain('Set as a draft first'),
    )
  })

  it('adds a custom size string as a class', async () => {
    renderForm(
      [field('ToggleButtons', 'status', { options: [{ value: 'a', label: 'A' }], size: 'my-btn' })],
      {},
    )
    await flushPromises()

    expect(buttonNamed('A')!.className).toContain('my-btn')
  })
})

describe('Slider per-handle tooltips and fill sections', () => {
  it('shows only the chosen tooltips and fills the chosen sections', async () => {
    renderForm(
      [
        field('Slider', 'range', {
          min: 0,
          max: 100,
          step: 1,
          multiple: true,
          tooltips: [true, false],
          fillTrack: [false, true, false],
          vertical: true,
          topToBottom: true,
        }),
      ],
      { range: [20, 80] },
    )
    await flushPromises()
    const thumbs = $$('[role="slider"]')
    const fills = $$('[data-slot="slider-fill"]')

    expect(thumbs[0]!.textContent?.trim()).toBe('20')
    expect(thumbs[1]!.textContent?.trim()).toBe('')
    expect(fills).toHaveLength(1)
    expect(fills[0]!.style.top).toBe('20%')
    expect(fills[0]!.style.height).toBe('60%')
  })
})

describe('ColorPicker rgba()', () => {
  it('sets the alpha channel with the opacity control', async () => {
    const { store } = renderForm([field('ColorPicker', 'tint', { format: 'rgba' })], {
      tint: 'rgba(10, 20, 30, 1)',
    })
    await flushPromises()

    await setInput($<HTMLInputElement>('input[type="range"][aria-label="Opacity"]')!, '40')

    expect(store.getValue('tint')).toBe('rgba(10, 20, 30, 0.4)')
  })

  it('has no opacity control for other formats', async () => {
    renderForm([field('ColorPicker', 'tint', { format: 'hex' })], {})
    await flushPromises()

    expect($('input[type="range"]')).toBeNull()
  })
})

describe('Repeater compact()', () => {
  it('marks a compact table and tightens its cells', async () => {
    const input = (path: string) =>
      ({
        type: 'TextInput',
        key: path,
        name: 'qty',
        statePath: path,
        label: 'qty',
        inputType: 'text',
      }) as SchemaComponent
    renderForm(
      [
        field('Repeater', 'lines', {
          items: [{ key: '0', schema: [input('lines.0.qty')] }],
          template: [input('lines.__INDEX__.qty')],
          templateState: { qty: null },
          addable: true,
          deletable: true,
          reorderable: false,
          addActionLabel: 'Add',
          table: [{ label: 'Quantity', name: 'qty' }],
          compact: true,
        }),
      ],
      { lines: [{ qty: '1' }] },
    )
    await flushPromises()

    expect($('[data-slot="repeater-table"]')!.getAttribute('data-compact')).toBe('true')
    expect($('tbody td')!.className).toContain('py-1')
  })
})

describe('Builder block search', () => {
  it('filters the block picker by label', async () => {
    const { wrapper } = renderForm(
      [
        field('Builder', 'content', {
          items: [],
          blocks: [
            { name: 'heading', label: 'Heading', schema: [], state: { type: 'heading', data: {} } },
            { name: 'image', label: 'Image', schema: [], state: { type: 'image', data: {} } },
          ],
          blockNumbers: true,
          blockLabels: true,
          addable: true,
          deletable: true,
          reorderable: true,
          addActionLabel: 'Add block',
          blockSearch: true,
        }),
      ],
      { content: [] },
    )
    await flushPromises()

    // Empty: the picker is shown inline.
    const menu = wrapper.find('[data-slot="builder-picker"]').element
    const items = () =>
      Array.from(menu.querySelectorAll('[data-slot="builder-block-option"]')).map((item) =>
        item.textContent?.trim(),
      )

    await setInput(
      menu.querySelector<HTMLInputElement>('input[aria-label="Search blocks…"]')!,
      'ima',
    )
    expect(items()).toEqual(['Image'])

    await setInput(
      menu.querySelector<HTMLInputElement>('input[aria-label="Search blocks…"]')!,
      'zzz',
    )
    expect(menu.textContent).toContain('No results.')
  })
})

describe('Builder block actions menu', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('refreshes the server-made summary when an item of a block with a summary collapses', async () => {
    const { store } = renderForm(
      [
        field('Builder', 'content', {
          items: [],
          blocks: [
            { name: 'note', label: 'Note', schema: [], state: { type: 'note', data: {} } },
            {
              name: 'quote',
              label: 'Quote',
              schema: [],
              state: { type: 'quote', data: {} },
              summary: true,
            },
          ],
          blockLabels: true,
          collapsible: true,
          addable: true,
          deletable: true,
          reorderable: true,
        }),
      ],
      {
        content: [
          { type: 'note', data: {} },
          { type: 'quote', data: {} },
        ],
      },
    )
    await flushPromises()
    const refresh = vi.spyOn(store, 'refresh').mockResolvedValue(undefined as never)
    const collapse = () =>
      $$<HTMLButtonElement>('button').filter(
        (button) => button.getAttribute('aria-label') === 'Collapse',
      )

    collapse()[0]!.click()
    await flushPromises()
    expect(refresh).not.toHaveBeenCalled()

    collapse()[0]!.click()
    await flushPromises()
    expect(refresh).toHaveBeenCalledWith('content')
  })

  it('puts the item actions in a menu, shows the summary and adds the first search match', async () => {
    const { store, wrapper } = renderForm(
      [
        field('Builder', 'content', {
          items: [{ key: '0', type: 'note', label: 'Note', summary: 'Hello there', schema: [] }],
          blocks: [
            { name: 'note', label: 'Note', schema: [], state: { type: 'note', data: {} } },
            { name: 'image', label: 'Image', schema: [], state: { type: 'image', data: {} } },
          ],
          blockNumbers: false,
          blockLabels: true,
          blockActionsMenu: true,
          addable: true,
          deletable: true,
          reorderable: true,
          cloneable: true,
          addActionLabel: 'Add block',
          blockSearch: true,
        }),
      ],
      { content: [{ type: 'note', data: {} }] },
    )
    await flushPromises()

    await wrapper.find('[data-slot="builder-add"]').trigger('click')
    await flushPromises()
    const search = $<HTMLInputElement>('input[aria-label="Search blocks…"]')!
    await setInput(search, 'ima')
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect((store.getValue('content') as { type: string }[]).map((item) => item.type)).toEqual([
      'note',
      'image',
    ])

    expect($('[data-slot="builder-item-summary"]')?.textContent).toBe('Hello there')
    expect(buttonNamed('Clone')).toBeUndefined()

    await wrapper.find('[data-slot="builder-item-menu"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const duplicate = $$('[role="menuitem"]').find(
      (item) => item.textContent?.trim() === 'Duplicate',
    )
    duplicate!.click()
    await flushPromises()
    expect(store.getValue('content')).toHaveLength(3)
  })
})

describe('RichEditor grid, lead and small', () => {
  const editorSchema = {
    type: 'RichEditor',
    key: 'content',
    name: 'content',
    statePath: 'content',
    label: 'Content',
    toolbarButtons: ['lead', 'small', 'grid', 'gridDelete'],
    fileAttachments: { disk: 'public', directory: null },
  } as RichEditorSchema

  function renderEditor(value: string) {
    const store = new FormStore(
      { components: [editorSchema as SchemaComponent], state: { content: value } },
      { token: 't', component: 'form', optionsUrl: '/o' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(RichEditorField, { component: editorSchema })
      },
    })
    mountWithAlfakit(() => h(Form), { attachTo: document.body })
    const editor = () =>
      (document.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)?.editor

    return { store, editor }
  }

  it('toggles lead paragraphs and small text', async () => {
    const { store, editor } = renderEditor('<p>Intro</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    buttonNamed('Lead paragraph')!.click()
    await nextTick()
    expect(store.getValue('content')).toBe('<p class="alfakit-lead">Intro</p>')

    editor()!.commands.selectAll()
    buttonNamed('Small text')!.click()
    await nextTick()
    expect(store.getValue('content')).toBe('<p class="alfakit-lead"><small>Intro</small></p>')
  })

  it('inserts and deletes column layouts', async () => {
    vi.stubGlobal(
      'prompt',
      vi.fn(() => '3'),
    )
    const { store, editor } = renderEditor('<p>Intro</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    buttonNamed('Insert columns')!.click()
    await nextTick()
    const html = () => String(store.getValue('content'))

    expect(html()).toContain('<div data-type="grid" class="alfakit-grid alfakit-grid-cols-3">')
    expect(html().match(/data-type="gridColumn"/g)).toHaveLength(3)

    // Inside the first column: doc > grid > gridColumn > paragraph.
    editor()!.commands.setTextSelection(3)
    buttonNamed('Delete columns')!.click()
    await nextTick()
    expect(html()).not.toContain('data-type="grid"')
  })
})

describe('Repeater and Builder deferLoading()', () => {
  it('shows a skeleton while the field is a deferred placeholder', async () => {
    renderForm(
      [
        field('Repeater', 'lines', {
          deferred: true,
          deferredPaths: ['lines'],
          items: [],
          template: [],
          templateState: {},
          addable: true,
          deletable: true,
          reorderable: true,
          addActionLabel: 'Add line',
        }),
        field('Builder', 'content', {
          deferred: true,
          items: [],
          blocks: [],
          blockNumbers: true,
          blockLabels: true,
          addable: true,
          deletable: true,
          reorderable: true,
          addActionLabel: 'Add block',
        }),
      ],
      { lines: [{ name: 'A' }], content: [] },
    )
    await flushPromises()

    expect($$('[data-slot="deferred-schema"]')).toHaveLength(2)
    expect(buttonNamed('Add line')).toBeUndefined()
  })
})
