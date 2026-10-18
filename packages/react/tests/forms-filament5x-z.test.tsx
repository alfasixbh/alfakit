import type { RichEditorSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
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
  // ProseMirror scrolls the selection into view; jsdom has no layout.
  const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList
  Element.prototype.getClientRects ??= emptyRects
  Range.prototype.getClientRects ??= emptyRects
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
})

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <form>
          <SchemaRenderer components={store.state.components} />
        </form>
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

const keyValue = {
  type: 'KeyValue',
  key: 'meta',
  name: 'meta',
  statePath: 'meta',
  label: 'Meta',
  keyLabel: 'Key',
  valueLabel: 'Value',
  addActionLabel: 'Add row',
  addable: true,
  deletable: false,
  reorderable: true,
  editableKeys: true,
  editableValues: true,
} as SchemaComponent

describe('KeyValue reordering with buttons (A30)', () => {
  it('announces the new position and keeps focus on the moved row', async () => {
    const { store, container } = renderForm([keyValue], { meta: { a: '1', b: '2', c: '3' } })

    const down = container.querySelector<HTMLElement>('[data-index="0"] [data-item-move="down"]')!
    down.focus()
    fireEvent.click(down)

    expect(store.getValue('meta')).toEqual([
      { key: 'b', value: '2' },
      { key: 'a', value: '1' },
      { key: 'c', value: '3' },
    ])
    expect(container.querySelector('[data-slot="item-move-status"]')?.textContent).toBe(
      'a moved to position 2 of 3',
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        container.querySelector('[data-index="1"] [data-item-move="down"]'),
      ),
    )
  })
})

describe('Builder grouped picker (A20, A31)', () => {
  it('shows group headings and the custom search texts', async () => {
    renderForm(
      [
        {
          type: 'Builder',
          key: 'content',
          name: 'content',
          statePath: 'content',
          label: 'Content',
          items: [],
          blocks: [
            { name: 'note', label: 'Note', schema: [], state: { type: 'note', data: {} } },
            {
              name: 'video',
              label: 'Video',
              group: 'Media',
              schema: [],
              state: { type: 'video', data: {} },
            },
          ],
          blockSearch: true,
          blockSearchPrompt: 'Find a block',
          blockNoSearchResultsMessage: 'Nothing here',
          blockNumbers: false,
          blockLabels: true,
          addable: true,
          deletable: true,
          reorderable: false,
          addActionLabel: 'Add block',
        } as unknown as SchemaComponent,
      ],
      { content: [] },
    )

    // Empty: the picker is shown inline.
    expect(await screen.findByRole('group', { name: 'Media' })).toBeInTheDocument()
    const search = screen.getByLabelText('Find a block')
    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(await screen.findByText('Nothing here')).toBeInTheDocument()
  })
})

describe('OneTimeCodeInput (A26)', () => {
  it('keeps digits and submits the form once the code is complete', async () => {
    const submit = vi.fn((event: Event) => event.preventDefault())
    const { store, container } = renderForm(
      [
        {
          type: 'OneTimeCodeInput',
          key: 'code',
          name: 'code',
          statePath: 'code',
          label: 'Code',
          length: 4,
          submitOnCompletion: true,
        } as SchemaComponent,
      ],
      {},
    )
    container.querySelector('form')!.addEventListener('submit', submit)
    const input = screen.getByLabelText('Code')

    expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    expect(input).toHaveAttribute('inputmode', 'numeric')

    fireEvent.change(input, { target: { value: '12a' } })
    expect(store.getValue('code')).toBe('12')
    fireEvent.change(input, { target: { value: '1234' } })
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
  })
})

describe('RichEditor toolbar keyboard and new tools (A7, A29)', () => {
  it('has one tab stop, moves with arrows and returns to the editor with Escape', async () => {
    const component = {
      type: 'RichEditor',
      key: 'content',
      name: 'content',
      statePath: 'content',
      label: 'Content',
      toolbarButtons: ['bold', 'italic', 'h4', 'paragraph'],
      fileAttachments: { disk: 'public', directory: null },
    } as unknown as RichEditorSchema
    const store = new FormStore(
      { components: [component as SchemaComponent], state: { content: '<p>Hi</p>' } },
      { token: 't', component: 'form' },
    )
    const view = render(
      <Wrapper>
        <FormProvider store={store}>
          <RichEditorField component={component} />
        </FormProvider>
      </Wrapper>,
    )

    const toolbar = await screen.findByRole('toolbar', { name: 'Formatting' })
    const buttons = Array.from(toolbar.querySelectorAll('button'))

    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1, -1])
    expect(screen.getByRole('button', { name: 'Heading 4' })).toBeInTheDocument()

    buttons[0]!.focus()
    fireEvent.keyDown(buttons[0]!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(buttons[1])

    fireEvent.keyDown(buttons[1]!, { key: 'Escape' })
    const prose = view.container.querySelector('.ProseMirror') as HTMLElement & { editor?: Editor }
    await waitFor(() => expect(prose.contains(document.activeElement)).toBe(true))

    act(() => void prose.editor?.commands.selectAll())
    fireEvent.click(screen.getByRole('button', { name: 'Heading 4' }))
    expect(String(store.getValue('content'))).toContain('<h4>')
  })
})
