import { FormStore, type RichEditorSchema, type SchemaComponent } from '@alfakit/core'
import type { Editor } from '@tiptap/vue-3'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import RichEditorField from '../src/components/fields/RichEditorField.vue'
import { provideForm } from '../src/components/form/form-context'
import { mountWithAlfakit } from './mocks'

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
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(RichEditorField, { component })
    },
  })
  const wrapper = mountWithAlfakit(() => h(Form), { attachTo: document.body })
  const editor = () =>
    (wrapper.element.querySelector?.('.ProseMirror') ?? document.querySelector('.ProseMirror')) as
      (HTMLElement & { editor?: Editor }) | null

  return { store, wrapper, editor: () => editor()?.editor }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('RichEditor extensions', () => {
  it('stores JSON documents', async () => {
    const { store, editor } = renderEditor(editorSchema({ json: true }), {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    })

    await vi.waitFor(() => expect(editor()).toBeDefined())
    editor()!.commands.insertContent(' world')

    expect(JSON.stringify(store.getValue('content'))).toContain('world')
    expect(store.getValue('content')).toMatchObject({ type: 'doc' })
  })

  it('inserts mentions from the suggestion list', async () => {
    const { store, editor } = renderEditor(
      editorSchema({ mentions: [{ trigger: '#', items: [{ id: 'js', label: 'JavaScript' }] }] }),
      '<p></p>',
    )

    await vi.waitFor(() => expect(editor()).toBeDefined())
    editor()!.commands.insertContent('#ja')
    await nextTick()

    const option = document.querySelector('[role="option"]') as HTMLElement
    expect(option.textContent).toContain('#JavaScript')
    option.click()

    expect(String(store.getValue('content'))).toContain('data-type="mention"')
  })

  it('shows custom block previews from the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ preview: '<h2>Hero preview</h2>' }), { status: 200 }),
      ),
    )

    renderEditor(
      editorSchema({
        customBlocks: [
          {
            id: 'hero',
            label: 'Hero',
            action: { type: 'Action', name: 'customBlock:hero', hasModal: true },
          },
        ],
      }),
      '<div data-type="customBlock" data-id="hero" data-config="{}"></div>',
    )

    await flushPromises()
    await vi.waitFor(() => expect(document.body.textContent).toContain('Hero preview'))
    expect(document.querySelector('[aria-label="Insert block"]')).not.toBeNull()
  })
})
