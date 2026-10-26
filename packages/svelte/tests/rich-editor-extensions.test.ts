import { FormStore, type RichEditorSchema, type SchemaComponent } from '@alfakit/core'
import { render, waitFor } from '@testing-library/svelte'
import type { Editor } from '@tiptap/core'
import { tick } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FormHarness from './FormHarness.svelte'
import { actions } from './mocks'
import Wrapper from './Wrapper.svelte'

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

async function renderEditor(component: RichEditorSchema, value: unknown) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { content: value } },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })
  const editor = () =>
    (view.container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
      ?.editor

  await waitFor(() => expect(editor()).toBeDefined(), { timeout: 5000 })

  return { store, editor: () => editor()!, ...view }
}

afterEach(() => vi.unstubAllGlobals())

describe('RichEditor extensions', () => {
  it('stores JSON documents', async () => {
    const { store, editor } = await renderEditor(editorSchema({ json: true }), {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    })

    editor().commands.insertContent(' world')

    expect(store.getValue('content')).toMatchObject({ type: 'doc' })
    expect(JSON.stringify(store.getValue('content'))).toContain('world')
  })

  it('inserts mentions from the suggestion list', async () => {
    const { store, editor, container } = await renderEditor(
      editorSchema({ mentions: [{ trigger: '#', items: [{ id: 'js', label: 'JavaScript' }] }] }),
      '<p></p>',
    )

    editor().commands.insertContent('#ja')
    await tick()

    const option = container.querySelector('[role="option"]') as HTMLElement
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

    const { container } = await renderEditor(
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

    await waitFor(() => expect(container.textContent).toContain('Hero preview'))
    expect(container.querySelector('[aria-label="Insert block"]')).not.toBeNull()
  })

  it('inserts a second block after the first instead of replacing it (W-S2-05)', async () => {
    vi.spyOn(actions, 'runField').mockResolvedValue({
      id: 'divider',
      config: {},
      preview: '<hr>',
    } as never)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ preview: '<hr>' }))),
    )

    const { store, editor, getByRole } = await renderEditor(
      editorSchema({
        activePanel: 'customBlocks',
        customBlocks: [
          {
            id: 'divider',
            label: 'Divider',
            action: { type: 'Action', name: 'customBlock:divider', hasAction: true },
          },
        ],
      }),
      '<p>Intro</p>',
    )
    editor().commands.focus('end')

    getByRole('button', { name: 'Divider' }).click()
    await waitFor(() =>
      expect(
        (String(store.getValue('content')).match(/data-type="customBlock"/g) ?? []).length,
      ).toBe(1),
    )
    getByRole('button', { name: 'Divider' }).click()
    await waitFor(() =>
      expect(
        (String(store.getValue('content')).match(/data-type="customBlock"/g) ?? []).length,
      ).toBe(2),
    )
    vi.restoreAllMocks()
  })
})
