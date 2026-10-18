import type { RichEditorSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RichEditorField } from '../src/components/fields/rich-editor'
import { FormProvider } from '../src/components/form/form-context'
import { Wrapper } from './mocks'

const editorSchema = (extra: Partial<RichEditorSchema> = {}) =>
  ({
    type: 'RichEditor',
    key: 'content',
    name: 'content',
    statePath: 'content',
    label: 'Content',
    toolbarButtons: ['bold', '|', 'customBlocks', 'mergeTags'],
    fileAttachments: { disk: 'public', directory: null },
    ...extra,
  }) as RichEditorSchema

function renderEditor(component: RichEditorSchema, value: unknown) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { content: value } },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <RichEditorField component={component} />
      </FormProvider>
    </Wrapper>,
  )

  const editor = () =>
    (view.container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
      ?.editor

  return { store, editor, ...view }
}

afterEach(() => vi.unstubAllGlobals())

describe('RichEditor extensions', () => {
  it('stores JSON documents', async () => {
    const { store, editor } = renderEditor(editorSchema({ json: true }), {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    })

    await waitFor(() => expect(editor()).toBeDefined())
    expect(screen.getByText('Hello')).toBeInTheDocument()

    act(() => {
      editor()!.commands.insertContent(' world')
    })

    expect(store.getValue('content')).toMatchObject({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
    expect(JSON.stringify(store.getValue('content'))).toContain('world')
  })

  it('inserts mentions from the suggestion list', async () => {
    const { store, editor } = renderEditor(
      editorSchema({
        mentions: [
          {
            trigger: '#',
            items: [
              { id: 'php', label: 'PHP' },
              { id: 'js', label: 'JavaScript' },
            ],
          },
        ],
      }),
      '<p></p>',
    )

    await waitFor(() => expect(editor()).toBeDefined())

    act(() => {
      editor()!.commands.insertContent('#ja')
    })

    const option = await screen.findByRole('option', { name: '#JavaScript' })
    fireEvent.click(option)

    expect(String(store.getValue('content'))).toContain('data-type="mention"')
    expect(String(store.getValue('content'))).toContain('data-id="js"')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('inserts merge tags from the toolbar and shows custom block previews', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ preview: '<h2>Hero preview</h2>' }), { status: 200 }),
      ),
    )

    const { store, editor, container } = renderEditor(
      editorSchema({
        mergeTags: [{ id: 'name', label: 'Name' }],
        customBlocks: [
          {
            id: 'hero',
            label: 'Hero',
            action: { type: 'Action', name: 'customBlock:hero', hasAction: true, hasModal: true },
          },
        ],
      }),
      '<div data-type="customBlock" data-id="hero" data-config="{&quot;heading&quot;:&quot;Hi&quot;}"></div>',
    )

    await waitFor(() => expect(editor()).toBeDefined())
    await waitFor(() => expect(container.textContent).toContain('Hero preview'))

    act(() => {
      editor()!
        .chain()
        .focus()
        .insertContent({ type: 'mergeTag', attrs: { id: 'name' } })
        .run()
    })

    expect(String(store.getValue('content'))).toContain('data-type="mergeTag"')
    expect(String(store.getValue('content'))).toContain('{{ name }}')
    expect(screen.getByRole('button', { name: 'Insert merge tag' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insert block' })).toBeInTheDocument()
  })
})
