import type { RichEditorSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RichEditorField } from '../src/components/fields/rich-editor'
import { FormProvider } from '../src/components/form/form-context'
import { SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper } from './mocks'

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
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SchemaRenderer components={store.state.components} />
      </FormProvider>
    </Wrapper>,
  )

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

    fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
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

  it('lists the chosen options and moves them with Alt + arrow keys', () => {
    const { store, container } = renderForm([select()], { tags: ['a', 'b', 'c'] })
    const chips = () =>
      Array.from(container.querySelectorAll('[data-select-chip]')).map((chip) => chip.textContent)

    expect(chips()).toEqual(['Alpha', 'Beta', 'Gamma'])

    fireEvent.keyDown(container.querySelectorAll('[data-select-chip]')[0]!, {
      key: 'ArrowRight',
      altKey: true,
    })

    expect(store.getValue('tags')).toEqual(['b', 'a', 'c'])
    expect(screen.getByText('Alpha moved to position 2 of 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Gamma' }))
    expect(store.getValue('tags')).toEqual(['b', 'a'])
  })

  it('reorders by drag and drop', () => {
    const { store, container } = renderForm([select()], { tags: ['a', 'b', 'c'] })
    const chips = container.querySelectorAll('[data-select-chip]')

    fireEvent.dragStart(chips[2]!)
    fireEvent.dragOver(chips[0]!)
    fireEvent.drop(chips[0]!)

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

  it('uses the search prompt and the no results message', () => {
    renderForm([list()], { topics: [] })

    fireEvent.change(screen.getByPlaceholderText('Find a topic'), { target: { value: 'zzz' } })

    expect(screen.getByText('Nothing matches')).toBeInTheDocument()
    expect(screen.queryByLabelText('Apples')).toBeNull()
  })

  it('filters after searchDebounce()', () => {
    vi.useFakeTimers()
    renderForm([list({ searchDebounce: 300 })], { topics: [] })

    fireEvent.change(screen.getByPlaceholderText('Find a topic'), { target: { value: 'ban' } })
    expect(screen.getByLabelText('Apples')).toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(300))
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
    const input = screen.getByLabelText('starts_on')
    const list = container.querySelector(`#${input.getAttribute('list')}`)

    expect(input).toHaveAttribute('lang', 'fr')
    expect(
      Array.from(list!.querySelectorAll('option')).map((option) => option.getAttribute('value')),
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

    fireEvent.focus(draft)
    expect((await screen.findByRole('tooltip')).textContent).toBe('Set as a draft first')
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

    expect(thumbs[0]!.textContent).toBe('20')
    expect(thumbs[1]!.textContent).toBe('')
    expect(fills).toHaveLength(1)
    expect(fills[0]!.style.top).toBe('20%')
    expect(fills[0]!.style.height).toBe('60%')
  })
})

describe('ColorPicker rgba()', () => {
  it('sets the alpha channel with the opacity control', () => {
    const { store } = renderForm([field('ColorPicker', 'tint', { format: 'rgba' })], {
      tint: 'rgba(10, 20, 30, 1)',
    })

    fireEvent.change(screen.getByRole('slider', { name: 'Opacity' }), { target: { value: '40' } })

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

    fireEvent.change(within(menu).getByRole('textbox', { name: 'Search blocks…' }), {
      target: { value: 'ima' },
    })

    expect(within(menu).queryByRole('button', { name: 'Heading' })).toBeNull()
    expect(within(menu).getByRole('button', { name: 'Image' })).toBeInTheDocument()

    fireEvent.change(within(menu).getByRole('textbox', { name: 'Search blocks…' }), {
      target: { value: 'zzz' },
    })
    expect(within(menu).getByText('No results.')).toBeInTheDocument()
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
    const view = render(
      <Wrapper>
        <FormProvider store={store}>
          <RichEditorField component={editorSchema} />
        </FormProvider>
      </Wrapper>,
    )
    const editor = () =>
      (view.container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
        ?.editor

    return { store, editor }
  }

  it('toggles lead paragraphs and small text', async () => {
    const { store, editor } = renderEditor('<p>Intro</p>')
    await waitFor(() => expect(editor()).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Lead paragraph' }))
    expect(store.getValue('content')).toBe('<p class="alfakit-lead">Intro</p>')

    act(() => void editor()!.commands.selectAll())
    fireEvent.click(screen.getByRole('button', { name: 'Small text' }))
    expect(store.getValue('content')).toBe('<p class="alfakit-lead"><small>Intro</small></p>')
  })

  it('inserts and deletes column layouts', async () => {
    vi.stubGlobal(
      'prompt',
      vi.fn(() => '3'),
    )
    const { store, editor } = renderEditor('<p>Intro</p>')
    await waitFor(() => expect(editor()).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Insert columns' }))
    const html = () => String(store.getValue('content'))

    expect(html()).toContain('<div data-type="grid" class="alfakit-grid alfakit-grid-cols-3">')
    expect(html().match(/data-type="gridColumn"/g)).toHaveLength(3)

    // Inside the first column: doc > grid > gridColumn > paragraph.
    act(() => void editor()!.commands.setTextSelection(3))
    fireEvent.click(screen.getByRole('button', { name: 'Delete columns' }))
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
