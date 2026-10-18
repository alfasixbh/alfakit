import { FormStore, type RichEditorSchema, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import type { Editor } from '@tiptap/core'
import { tick } from 'svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

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
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { store, ...view }
}

const field = (type: string, name: string, extra: Record<string, unknown> = {}) =>
  ({ type, key: name, name, statePath: name, label: name, ...extra }) as SchemaComponent

describe('TextInput autocapitalize', () => {
  it('applies the autocapitalize hint to the input', () => {
    renderForm([field('TextInput', 'name', { inputType: 'text', autocapitalize: 'words' })], {})

    expect(screen.getByLabelText('name')).toHaveAttribute('autocapitalize', 'words')
  })
})

describe('FileUpload uploadingMessage', () => {
  it('shows the custom message while a file uploads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    const { container } = renderForm(
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

    await fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] },
    })

    expect(await screen.findByText('Sending the attachment…')).toBeInTheDocument()
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

  it('lists the chosen options and moves them with Alt + arrow keys', async () => {
    const { store, container } = renderForm([select()], { tags: ['a', 'b', 'c'] })
    const chips = () =>
      Array.from(container.querySelectorAll('[data-select-chip]')).map((chip) =>
        chip.textContent?.trim(),
      )

    expect(chips()).toEqual(['Alpha', 'Beta', 'Gamma'])

    await fireEvent.keyDown(container.querySelectorAll('[data-select-chip]')[0]!, {
      key: 'ArrowRight',
      altKey: true,
    })

    expect(store.getValue('tags')).toEqual(['b', 'a', 'c'])
    expect(screen.getByText('Alpha moved to position 2 of 3')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Remove Gamma' }))
    expect(store.getValue('tags')).toEqual(['b', 'a'])
  })

  it('reorders by drag and drop', async () => {
    const { store, container } = renderForm([select()], { tags: ['a', 'b', 'c'] })
    const chips = container.querySelectorAll('[data-select-chip]')

    await fireEvent.dragStart(chips[2]!)
    await fireEvent.drop(chips[0]!)

    expect(store.getValue('tags')).toEqual(['c', 'a', 'b'])
  })

  it('keeps chips in the trigger without reorderable()', () => {
    const { container } = renderForm([select({ reorderable: undefined })], { tags: ['a'] })

    expect(container.querySelector('[data-slot="select-reorder-list"]')).toBeNull()
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

    await fireEvent.input(screen.getByPlaceholderText('Find a topic'), { target: { value: 'zzz' } })

    expect(await screen.findByText('Nothing matches')).toBeInTheDocument()
    expect(screen.queryByLabelText('Apples')).toBeNull()
  })

  it('filters after searchDebounce()', async () => {
    vi.useFakeTimers()
    renderForm([list({ searchDebounce: 300 })], { topics: [] })

    await fireEvent.input(screen.getByPlaceholderText('Find a topic'), { target: { value: 'ban' } })
    expect(screen.getByLabelText('Apples')).toBeInTheDocument()

    vi.advanceTimersByTime(300)
    await tick()
    expect(screen.queryByLabelText('Apples')).toBeNull()
    expect(screen.getByLabelText('Bananas')).toBeInTheDocument()
  })
})

describe('DatePicker locale() and datalist()', () => {
  it('offers datalist values on the native input with the field language', () => {
    const { container } = renderForm(
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
    const input = container.querySelector<HTMLInputElement>('input[type="date"]')!
    const list = container.querySelector(`#${input.getAttribute('list')}`)!

    expect(input).toHaveAttribute('lang', 'fr')
    expect(
      Array.from(list.querySelectorAll('option')).map((option) => option.getAttribute('value')),
    ).toEqual(['2026-01-01', '2026-02-01'])
  })
})

describe('ToggleButtons tooltips(), size() and fullWidth()', () => {
  it('sizes and stretches the buttons and shows tooltips', async () => {
    const { container } = renderForm(
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
    const draft = screen.getByRole('button', { name: 'Draft' })

    expect(container.querySelector('[data-slot="toggle-buttons"]')!.className).toContain('w-full')
    expect(draft.className).toContain('h-10')
    expect(draft.className).toContain('flex-1')

    await fireEvent.focus(draft)
    await waitFor(() => expect(document.body.textContent).toContain('Set as a draft first'))
  })

  it('adds a custom size string as a class', () => {
    renderForm(
      [field('ToggleButtons', 'status', { options: [{ value: 'a', label: 'A' }], size: 'my-btn' })],
      {},
    )

    expect(screen.getByRole('button', { name: 'A' }).className).toContain('my-btn')
  })
})

describe('Slider per-handle tooltips and fill sections', () => {
  it('shows only the chosen tooltips and fills the chosen sections', () => {
    const { container } = renderForm(
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
    const thumbs = screen.getAllByRole('slider')
    const fills = container.querySelectorAll<HTMLElement>('[data-slot="slider-fill"]')

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

    await fireEvent.input(screen.getByRole('slider', { name: 'Opacity' }), {
      target: { value: '40' },
    })

    expect(store.getValue('tint')).toBe('rgba(10, 20, 30, 0.4)')
  })

  it('has no opacity control for other formats', () => {
    renderForm([field('ColorPicker', 'tint', { format: 'hex' })], {})

    expect(screen.queryByRole('slider', { name: 'Opacity' })).toBeNull()
  })
})

describe('Repeater compact()', () => {
  it('marks a compact table and tightens its cells', () => {
    const input = (path: string) =>
      ({
        type: 'TextInput',
        key: path,
        name: 'qty',
        statePath: path,
        label: 'qty',
        inputType: 'text',
      }) as SchemaComponent
    const { container } = renderForm(
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

    expect(container.querySelector('[data-slot="repeater-table"]')).toHaveAttribute(
      'data-compact',
      'true',
    )
    expect(container.querySelector('tbody td')!.className).toContain('py-1')
  })
})

describe('Builder block search', () => {
  it('filters the block picker by label', async () => {
    renderForm(
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

    // Empty: the picker is shown inline.
    const menu = document.querySelector<HTMLElement>('[data-slot="builder-picker"]')!
    const search = within(menu).getByRole('textbox', { name: 'Search blocks…' })

    await fireEvent.input(search, { target: { value: 'ima' } })
    expect(within(menu).queryByRole('button', { name: 'Heading' })).toBeNull()
    expect(within(menu).getByRole('button', { name: 'Image' })).toBeInTheDocument()

    await fireEvent.input(search, { target: { value: 'zzz' } })
    expect(within(menu).getByText('No results.')).toBeInTheDocument()
  })
})

describe('Builder block actions menu', () => {
  it('puts the item actions in a menu, shows the summary and adds the first search match', async () => {
    const { store } = renderForm(
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

    expect(screen.getByText('Hello there')).toHaveAttribute('data-slot', 'builder-item-summary')
    expect(screen.queryByRole('button', { name: 'Clone' })).toBeNull()

    await fireEvent.click(screen.getByRole('button', { name: 'Actions for Note' }))
    await fireEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate' }))
    expect(store.getValue('content')).toHaveLength(2)

    await fireEvent.click(screen.getByRole('button', { name: 'Add block' }))
    const search = await screen.findByRole('textbox', { name: 'Search blocks…' })
    await fireEvent.input(search, { target: { value: 'ima' } })
    await fireEvent.keyDown(search, { key: 'Enter' })
    expect((store.getValue('content') as { type: string }[]).map((item) => item.type)).toEqual([
      'note',
      'note',
      'image',
    ])
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

  async function renderEditor(value: string) {
    const { store, container } = renderForm([editorSchema as SchemaComponent], { content: value })
    const find = () =>
      (container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
        ?.editor

    await waitFor(() => expect(find()).toBeDefined(), { timeout: 5000 })

    return { store, editor: () => find()! }
  }

  it('toggles lead paragraphs and small text', async () => {
    const { store, editor } = await renderEditor('<p>Intro</p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Lead paragraph' }))
    expect(store.getValue('content')).toBe('<p class="alfakit-lead">Intro</p>')

    editor().commands.selectAll()
    await tick()
    await fireEvent.click(screen.getByRole('button', { name: 'Small text' }))
    expect(store.getValue('content')).toBe('<p class="alfakit-lead"><small>Intro</small></p>')
  })

  it('inserts and deletes column layouts', async () => {
    vi.stubGlobal(
      'prompt',
      vi.fn(() => '3'),
    )
    const { store, editor } = await renderEditor('<p>Intro</p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Insert columns' }))
    const html = () => String(store.getValue('content'))

    expect(html()).toContain('<div data-type="grid" class="alfakit-grid alfakit-grid-cols-3">')
    expect(html().match(/data-type="gridColumn"/g)).toHaveLength(3)

    // Inside the first column: doc > grid > gridColumn > paragraph.
    editor().commands.setTextSelection(3)
    await tick()
    await fireEvent.click(screen.getByRole('button', { name: 'Delete columns' }))
    expect(html()).not.toContain('data-type="grid"')
  })
})

describe('Repeater and Builder deferLoading()', () => {
  it('shows a skeleton while the field is a deferred placeholder', () => {
    const { container } = renderForm(
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

    expect(container.querySelectorAll('[data-slot="deferred-schema"]')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Add line' })).toBeNull()
  })
})
