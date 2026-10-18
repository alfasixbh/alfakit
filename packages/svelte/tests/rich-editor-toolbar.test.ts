import {
  FormStore,
  type FileUploadSchema,
  type RichEditorSchema,
  type SchemaComponent,
} from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import type { Editor } from '@tiptap/core'
import { tick } from 'svelte'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

const editorSchema = (extra: Partial<RichEditorSchema> = {}) =>
  ({
    type: 'RichEditor',
    key: 'content',
    name: 'content',
    statePath: 'content',
    label: 'Content',
    toolbarButtons: [
      'bold',
      'subscript',
      'superscript',
      'code',
      'highlight',
      'textColor',
      'alignCenter',
      'alignEnd',
      'table',
      'details',
      'clearFormatting',
      'attachFiles',
    ],
    textColors: [
      { value: '#dc2626', label: 'Red' },
      { value: '#2563eb', label: 'Blue' },
    ],
    fileAttachments: {
      disk: 'public',
      directory: null,
      acceptedFileTypes: ['image/png'],
      maxSize: 1,
    },
    ...extra,
  }) as RichEditorSchema

async function renderEditor(component: RichEditorSchema, value: unknown) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { content: value } },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })
  const find = () =>
    (view.container.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)
      ?.editor

  // The editor loads lazily: the first mount of a run can take longer than the default.
  await waitFor(() => expect(find()).toBeDefined(), { timeout: 5000 })

  return { store, editor: () => find()!, ...view }
}

const selectAll = async (editor: Editor) => {
  editor.commands.selectAll()
  await tick()
}

afterEach(() => vi.unstubAllGlobals())

// Evaluate the lazily loaded editor (Tiptap) once up front so its module cost is not counted
// against the first test's timeout; the field still mounts through its lazy loader.
beforeAll(async () => {
  await import('../src/components/fields/RichEditorField.svelte')
}, 60_000)

describe('RichEditor toolbar buttons', () => {
  it('applies sub/superscript, inline code and highlight marks', async () => {
    const { store, editor } = await renderEditor(editorSchema(), '<p>H2O</p>')

    await selectAll(editor())
    await fireEvent.click(screen.getByRole('button', { name: 'Superscript' }))
    expect(store.getValue('content')).toBe('<p><sup>H2O</sup></p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Subscript' }))
    expect(store.getValue('content')).toBe('<p><sub>H2O</sub></p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Highlight' }))
    expect(store.getValue('content')).toBe('<p><mark><sub>H2O</sub></mark></p>')

    // Inline code excludes every other mark.
    await fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(store.getValue('content')).toBe('<p><code>H2O</code></p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Clear formatting' }))
    expect(store.getValue('content')).toBe('<p>H2O</p>')
  })

  it('aligns paragraphs with logical values and toggles back', async () => {
    const { store } = await renderEditor(editorSchema(), '<p>Text</p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Align to end' }))
    expect(store.getValue('content')).toBe('<p style="text-align: end;">Text</p>')
    expect(screen.getByRole('button', { name: 'Align to end' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Align to end' }))
    expect(store.getValue('content')).toBe('<p>Text</p>')
  })

  it('colours text from the palette', async () => {
    const { store, editor } = await renderEditor(editorSchema(), '<p>Red</p>')

    await selectAll(editor())
    await fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
    const palette = screen.getByRole('group', { name: 'Text color' })
    await fireEvent.click(within(palette).getByRole('button', { name: 'Red' }))

    expect(store.getValue('content')).toBe(
      '<p><span data-color="#dc2626" style="color: rgb(220, 38, 38);">Red</span></p>',
    )
    expect(screen.queryByRole('group', { name: 'Text color' })).toBeNull()

    await selectAll(editor())
    await fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Remove color' }))
    expect(store.getValue('content')).toBe('<p>Red</p>')
  })

  it('inserts a table and edits it from the table toolbar', async () => {
    const { store, editor } = await renderEditor(editorSchema(), '<p>Intro</p>')

    editor().commands.setTextSelection(editor().state.doc.content.size)
    await tick()
    expect(screen.queryByRole('toolbar', { name: 'Insert table' })).toBeNull()
    await fireEvent.click(screen.getByRole('button', { name: 'Insert table' }))

    const html = () => String(store.getValue('content'))
    expect(html()).toContain('<table')
    expect(html().match(/<tr>/g)).toHaveLength(3)

    const tableToolbar = await screen.findByRole('toolbar', { name: 'Insert table' })
    await fireEvent.click(within(tableToolbar).getByRole('button', { name: 'Add row below' }))
    expect(html().match(/<tr>/g)).toHaveLength(4)

    await fireEvent.click(within(tableToolbar).getByRole('button', { name: 'Delete table' }))
    expect(html()).not.toContain('<table')
  })

  it('inserts a collapsible section', async () => {
    const { store } = await renderEditor(editorSchema(), '<p></p>')

    await fireEvent.click(screen.getByRole('button', { name: 'Collapsible section' }))

    expect(store.getValue('content')).toContain(
      '<details><summary>Summary</summary><div data-type="detailsContent"><p></p></div></details>',
    )
  })

  it('loads stored colours, alignment, tables and details', async () => {
    const html =
      '<p style="text-align: center"><span data-color="#2563eb" style="color: #2563eb">a</span><sub>b</sub></p>' +
      '<details><summary>S</summary><div data-type="detailsContent"><p>x</p></div></details>'
    const { editor } = await renderEditor(editorSchema(), html)

    // The browser normalises inline styles; the server's sanitiser accepts both forms.
    expect(editor().getHTML()).toContain(
      '<p style="text-align: center;"><span data-color="#2563eb" style="color: rgb(37, 99, 235);">a</span><sub>b</sub></p>' +
        '<details><summary>S</summary><div data-type="detailsContent"><p>x</p></div></details>',
    )
  })

  it('refuses attachments of the wrong type or size before uploading', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container } = await renderEditor(editorSchema(), '<p></p>')

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    expect(input).toHaveAttribute('accept', 'image/png')

    await fireEvent.change(input, {
      target: { files: [new File(['x'.repeat(4096)], 'big.png', { type: 'image/png' })] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is too large.')

    await fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('This file type is not allowed.')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('MarkdownEditor table', () => {
  it('stores tables as GitHub Markdown', async () => {
    const component = editorSchema({
      type: 'MarkdownEditor',
      toolbarButtons: ['bold', 'table'],
      html: '<p>Intro</p>',
    })
    const { store, editor } = await renderEditor(component, 'Intro')

    editor().commands.setTextSelection(editor().state.doc.content.size)
    await tick()
    await fireEvent.click(screen.getByRole('button', { name: 'Insert table' }))

    expect(store.getValue('content')).toBe(
      'Intro\n\n|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |',
    )
  })
})

const uploadSchema = (extra: Partial<FileUploadSchema> = {}) =>
  ({
    type: 'FileUpload',
    key: 'photo',
    name: 'photo',
    statePath: 'photo',
    label: 'Photo',
    image: true,
    previewable: true,
    deletable: true,
    panelLayout: 'compact',
    pasteable: true,
    files: [],
    ...extra,
  }) as FileUploadSchema

function renderUpload(component: FileUploadSchema) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { photo: null } },
    { token: 't', component: 'form' },
  )
  const view = render(Wrapper, { props: { component: FormHarness, props: { store } } })

  return { store, ...view }
}

function stubUploads() {
  const fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ key: 'tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png', name: 'a.png', size: 1 }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      ),
  )
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }),
  )

  return fetchMock
}

/** A paste event carrying `files` on its clipboard (jsdom has no DataTransfer). */
function paste(target: HTMLElement, files: File[]) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { files, items: [] } })

  return fireEvent(target, event)
}

describe('FileUpload image tooling', () => {
  it('uploads files pasted into the drop zone', async () => {
    const fetchMock = stubUploads()
    const { store } = renderUpload(uploadSchema())
    const file = new File(['x'], 'shot.png', { type: 'image/png' })

    await paste(screen.getByRole('button', { name: /Drop files/ }), [file])

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(store.getValue('photo')).toBe('tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png'))
  })

  it('ignores pastes when pasteable(false)', async () => {
    const fetchMock = stubUploads()
    renderUpload(uploadSchema({ pasteable: false }))

    await paste(screen.getByRole('button', { name: /Drop files/ }), [
      new File(['x'], 'shot.png', { type: 'image/png' }),
    ])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('opens the image editor before uploading and skips cancelled images', async () => {
    const fetchMock = stubUploads()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 160, height: 90, close: () => {} })),
    )
    const { container } = renderUpload(
      uploadSchema({ imageEditor: { aspectRatios: ['16:9', null], circle: false } }),
    )
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const file = new File(['x'], 'photo.png', { type: 'image/png' })

    await fireEvent.change(input, { target: { files: [file] } })

    const dialog = await screen.findByRole('dialog', { name: 'Edit image' })
    expect(await within(dialog).findByRole('group', { name: 'Crop area' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '16:9' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Free' }))
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate right' }))
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()

    await fireEvent.change(input, { target: { files: [file] } })
    const again = await screen.findByRole('dialog', { name: 'Edit image' })
    await within(again).findByRole('group', { name: 'Crop area' })
    await fireEvent.click(within(again).getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it('moves the crop area with the keyboard', async () => {
    stubUploads()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 200, height: 100, close: () => {} })),
    )
    const { container } = renderUpload(
      uploadSchema({ imageEditor: { aspectRatios: ['1:1'], circle: true } }),
    )

    await fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    })

    const crop = await screen.findByRole('group', { name: 'Crop area' })
    expect(crop).toHaveClass('rounded-full')
    expect(crop.style.left).toBe('25%')

    await fireEvent.keyDown(crop, { key: 'ArrowRight' })
    expect(crop.style.left).toBe('26%')
  })
})
