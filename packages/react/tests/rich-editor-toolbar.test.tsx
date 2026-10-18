import type { FileUploadSchema, RichEditorSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FileUploadField } from '../src/components/fields/file-upload'
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

const selectAll = (editor: Editor) => act(() => void editor.commands.selectAll())

afterEach(() => vi.unstubAllGlobals())

describe('RichEditor toolbar buttons', () => {
  it('applies sub/superscript, inline code and highlight marks', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>H2O</p>')
    await waitFor(() => expect(editor()).toBeDefined())

    selectAll(editor()!)
    fireEvent.click(screen.getByRole('button', { name: 'Superscript' }))
    expect(store.getValue('content')).toBe('<p><sup>H2O</sup></p>')

    fireEvent.click(screen.getByRole('button', { name: 'Subscript' }))
    expect(store.getValue('content')).toBe('<p><sub>H2O</sub></p>')

    fireEvent.click(screen.getByRole('button', { name: 'Highlight' }))
    expect(store.getValue('content')).toBe('<p><mark><sub>H2O</sub></mark></p>')

    // Inline code excludes every other mark.
    fireEvent.click(screen.getByRole('button', { name: 'Code' }))
    expect(store.getValue('content')).toBe('<p><code>H2O</code></p>')

    fireEvent.click(screen.getByRole('button', { name: 'Clear formatting' }))
    expect(store.getValue('content')).toBe('<p>H2O</p>')
  })

  it('aligns paragraphs with logical values and toggles back', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>Text</p>')
    await waitFor(() => expect(editor()).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Align to end' }))
    expect(store.getValue('content')).toBe('<p style="text-align: end;">Text</p>')
    expect(screen.getByRole('button', { name: 'Align to end' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Align to end' }))
    expect(store.getValue('content')).toBe('<p>Text</p>')
  })

  it('colours text from the palette', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>Red</p>')
    await waitFor(() => expect(editor()).toBeDefined())

    selectAll(editor()!)
    fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
    const palette = screen.getByRole('group', { name: 'Text color' })
    fireEvent.click(within(palette).getByRole('button', { name: 'Red' }))

    expect(store.getValue('content')).toBe(
      '<p><span data-color="#dc2626" style="color: rgb(220, 38, 38);">Red</span></p>',
    )
    expect(screen.queryByRole('group', { name: 'Text color' })).toBeNull()

    selectAll(editor()!)
    fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove color' }))
    expect(store.getValue('content')).toBe('<p>Red</p>')
  })

  it('inserts a table and edits it from the table toolbar', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>Intro</p>')
    await waitFor(() => expect(editor()).toBeDefined())

    act(() => void editor()!.commands.setTextSelection(editor()!.state.doc.content.size))
    expect(screen.queryByRole('toolbar', { name: 'Insert table' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Insert table' }))

    const html = () => String(store.getValue('content'))
    expect(html()).toContain('<table')
    expect(html().match(/<tr>/g)).toHaveLength(3)

    const tableToolbar = await screen.findByRole('toolbar', { name: 'Insert table' })
    fireEvent.click(within(tableToolbar).getByRole('button', { name: 'Add row below' }))
    expect(html().match(/<tr>/g)).toHaveLength(4)

    fireEvent.click(within(tableToolbar).getByRole('button', { name: 'Delete table' }))
    expect(html()).not.toContain('<table')
  })

  it('inserts a collapsible section', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p></p>')
    await waitFor(() => expect(editor()).toBeDefined())

    fireEvent.click(screen.getByRole('button', { name: 'Collapsible section' }))

    expect(store.getValue('content')).toContain(
      '<details><summary>Summary</summary><div data-type="detailsContent"><p></p></div></details>',
    )
  })

  it('loads stored colours, alignment, tables and details', async () => {
    const html =
      '<p style="text-align: center"><span data-color="#2563eb" style="color: #2563eb">a</span><sub>b</sub></p>' +
      '<details><summary>S</summary><div data-type="detailsContent"><p>x</p></div></details>'
    const { editor } = renderEditor(editorSchema(), html)
    await waitFor(() => expect(editor()).toBeDefined())

    // The browser normalises inline styles; the server's sanitiser accepts both forms.
    expect(editor()!.getHTML()).toContain(
      '<p style="text-align: center;"><span data-color="#2563eb" style="color: rgb(37, 99, 235);">a</span><sub>b</sub></p>' +
        '<details><summary>S</summary><div data-type="detailsContent"><p>x</p></div></details>',
    )
  })

  it('refuses attachments of the wrong type or size before uploading', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { container, editor } = renderEditor(editorSchema(), '<p></p>')
    await waitFor(() => expect(editor()).toBeDefined())

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    expect(input).toHaveAttribute('accept', 'image/png')

    fireEvent.change(input, {
      target: { files: [new File(['x'.repeat(4096)], 'big.png', { type: 'image/png' })] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is too large.')

    fireEvent.change(input, {
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
    const { store, editor } = renderEditor(component, 'Intro')
    await waitFor(() => expect(editor()).toBeDefined())

    act(() => void editor()!.commands.setTextSelection(editor()!.state.doc.content.size))
    fireEvent.click(screen.getByRole('button', { name: 'Insert table' }))

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
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <FileUploadField component={component} />
      </FormProvider>
    </Wrapper>,
  )

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

describe('FileUpload image tooling', () => {
  it('uploads files pasted into the drop zone', async () => {
    const fetchMock = stubUploads()
    const { store } = renderUpload(uploadSchema())
    const file = new File(['x'], 'shot.png', { type: 'image/png' })

    fireEvent.paste(screen.getByRole('button', { name: /Drop files/ }), {
      clipboardData: { files: [file], items: [] },
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(store.getValue('photo')).toBe('tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png'))
  })

  it('ignores pastes when pasteable(false)', () => {
    const fetchMock = stubUploads()
    renderUpload(uploadSchema({ pasteable: false }))

    fireEvent.paste(screen.getByRole('button', { name: /Drop files/ }), {
      clipboardData: { files: [new File(['x'], 'shot.png', { type: 'image/png' })], items: [] },
    })

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

    fireEvent.change(input, { target: { files: [file] } })

    const dialog = await screen.findByRole('dialog', { name: 'Edit image' })
    expect(await within(dialog).findByRole('group', { name: 'Crop area' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: '16:9' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Free' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate right' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { files: [file] } })
    const again = await screen.findByRole('dialog', { name: 'Edit image' })
    await within(again).findByRole('group', { name: 'Crop area' })
    fireEvent.click(within(again).getByRole('button', { name: 'Apply' }))

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

    fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    })

    const crop = await screen.findByRole('group', { name: 'Crop area' })
    expect(crop).toHaveClass('rounded-full')
    expect(crop.style.left).toBe('25%')

    fireEvent.keyDown(crop, { key: 'ArrowRight' })
    expect(crop.style.left).toBe('26%')
  })
})
