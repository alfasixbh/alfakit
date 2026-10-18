import type { FileUploadSchema, RichEditorSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import type { Editor } from '@tiptap/vue-3'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import FileUploadField from '../src/components/fields/FileUploadField.vue'
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

function mountField(store: FormStore, render: () => unknown) {
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return render
    },
  })

  return mountWithAlfakit(() => h(Form), { attachTo: document.body })
}

function renderEditor(component: RichEditorSchema, value: unknown) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { content: value } },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const wrapper = mountField(store, () => h(RichEditorField, { component }))
  const editor = () =>
    (document.querySelector('.ProseMirror') as (HTMLElement & { editor?: Editor }) | null)?.editor

  return { store, wrapper, editor }
}

/** The element with this role and accessible name (aria-label), optionally inside `within`. */
function byRole(role: string, name: string, within: ParentNode = document): HTMLElement | null {
  const selector =
    role === 'button'
      ? `button[aria-label="${name}"], [role="button"][aria-label="${name}"]`
      : `[role="${role}"][aria-label="${name}"]`

  return within.querySelector<HTMLElement>(selector)
}

function getByRole(role: string, name: string, within: ParentNode = document): HTMLElement {
  const element = byRole(role, name, within)

  if (!element) throw new Error(`No ${role} named "${name}"`)

  return element
}

async function findByRole(role: string, name: string, within: ParentNode = document) {
  let element: HTMLElement | null = null
  await vi.waitFor(() => {
    element = byRole(role, name, within)
    expect(element).not.toBeNull()
  })

  return element as unknown as HTMLElement
}

async function click(element: Element) {
  ;(element as HTMLElement).click()
  await nextTick()
}

async function selectAll(editor: Editor) {
  editor.commands.selectAll()
  await nextTick()
}

function pickFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('RichEditor toolbar buttons', () => {
  it('applies sub/superscript, inline code and highlight marks', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>H2O</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    await selectAll(editor()!)
    await click(getByRole('button', 'Superscript'))
    expect(store.getValue('content')).toBe('<p><sup>H2O</sup></p>')

    await click(getByRole('button', 'Subscript'))
    expect(store.getValue('content')).toBe('<p><sub>H2O</sub></p>')

    await click(getByRole('button', 'Highlight'))
    expect(store.getValue('content')).toBe('<p><mark><sub>H2O</sub></mark></p>')

    // Inline code excludes every other mark.
    await click(getByRole('button', 'Code'))
    expect(store.getValue('content')).toBe('<p><code>H2O</code></p>')

    await click(getByRole('button', 'Clear formatting'))
    expect(store.getValue('content')).toBe('<p>H2O</p>')
  })

  it('aligns paragraphs with logical values and toggles back', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>Text</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    await click(getByRole('button', 'Align to end'))
    expect(store.getValue('content')).toBe('<p style="text-align: end;">Text</p>')
    await vi.waitFor(() =>
      expect(getByRole('button', 'Align to end').getAttribute('aria-pressed')).toBe('true'),
    )

    await click(getByRole('button', 'Align to end'))
    expect(store.getValue('content')).toBe('<p>Text</p>')
  })

  it('colours text from the palette', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>Red</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    await selectAll(editor()!)
    await click(getByRole('button', 'Text color'))
    const palette = getByRole('group', 'Text color')
    expect(palette.dataset.slot).toBe('rich-editor-text-colors')
    await click(getByRole('button', 'Red', palette))

    expect(store.getValue('content')).toBe(
      '<p><span data-color="#dc2626" style="color: rgb(220, 38, 38);">Red</span></p>',
    )
    expect(byRole('group', 'Text color')).toBeNull()

    await selectAll(editor()!)
    await click(getByRole('button', 'Text color'))
    await click(getByRole('button', 'Remove color'))
    expect(store.getValue('content')).toBe('<p>Red</p>')
  })

  it('offers a custom colour input when customTextColors is on', async () => {
    const { store, editor } = renderEditor(editorSchema({ customTextColors: true }), '<p>Hi</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    await selectAll(editor()!)
    await click(getByRole('button', 'Text color'))
    const input = document.querySelector<HTMLInputElement>('input[type="color"]')!
    expect(input.getAttribute('aria-label')).toBe('Custom color')

    input.value = '#2563eb'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(String(store.getValue('content'))).toContain('data-color="#2563eb"')
  })

  it('inserts a table and edits it from the table toolbar', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p>Intro</p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    editor()!.commands.setTextSelection(editor()!.state.doc.content.size)
    await nextTick()
    expect(byRole('toolbar', 'Insert table')).toBeNull()
    await click(getByRole('button', 'Insert table'))

    const html = () => String(store.getValue('content'))
    expect(html()).toContain('<table')
    expect(html().match(/<tr>/g)).toHaveLength(3)

    const tableToolbar = await findByRole('toolbar', 'Insert table')
    expect(tableToolbar.dataset.slot).toBe('rich-editor-table-toolbar')
    await click(getByRole('button', 'Add row below', tableToolbar))
    expect(html().match(/<tr>/g)).toHaveLength(4)

    await click(getByRole('button', 'Delete table', tableToolbar))
    expect(html()).not.toContain('<table')
  })

  it('inserts a collapsible section', async () => {
    const { store, editor } = renderEditor(editorSchema(), '<p></p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    await click(getByRole('button', 'Collapsible section'))

    expect(store.getValue('content')).toContain(
      '<details><summary>Summary</summary><div data-type="detailsContent"><p></p></div></details>',
    )
  })

  it('loads stored colours, alignment, tables and details', async () => {
    const html =
      '<p style="text-align: center"><span data-color="#2563eb" style="color: #2563eb">a</span><sub>b</sub></p>' +
      '<details><summary>S</summary><div data-type="detailsContent"><p>x</p></div></details>'
    const { editor } = renderEditor(editorSchema(), html)
    await vi.waitFor(() => expect(editor()).toBeDefined())

    // The browser normalises inline styles; the server's sanitiser accepts both forms.
    expect(editor()!.getHTML()).toContain(
      '<p style="text-align: center;"><span data-color="#2563eb" style="color: rgb(37, 99, 235);">a</span><sub>b</sub></p>' +
        '<details><summary>S</summary><div data-type="detailsContent"><p>x</p></div></details>',
    )
  })

  it('refuses attachments of the wrong type or size before uploading', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { editor } = renderEditor(editorSchema(), '<p></p>')
    await vi.waitFor(() => expect(editor()).toBeDefined())

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    expect(input.getAttribute('accept')).toBe('image/png')

    pickFiles(input, [new File(['x'.repeat(4096)], 'big.png', { type: 'image/png' })])
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'This file is too large.',
      ),
    )

    pickFiles(input, [new File(['x'], 'a.gif', { type: 'image/gif' })])
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        'This file type is not allowed.',
      ),
    )
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
    await vi.waitFor(() => expect(editor()).toBeDefined())

    editor()!.commands.setTextSelection(editor()!.state.doc.content.size)
    await nextTick()
    await click(getByRole('button', 'Insert table'))

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
  const wrapper = mountField(store, () => h(FileUploadField, { component }))

  return { store, wrapper }
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

function paste(target: Element, files: File[]) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { files, items: [] } })
  target.dispatchEvent(event)
}

const dropZone = () => {
  const zone = Array.from(document.querySelectorAll<HTMLElement>('[role="button"]')).find(
    (element) => /Drop files/.test(element.textContent ?? ''),
  )

  if (!zone) throw new Error('No drop zone')

  return zone
}

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')

async function findEditDialog() {
  await vi.waitFor(() => expect(dialog()?.textContent).toContain('Edit image'))

  return dialog()!
}

describe('FileUpload image tooling', () => {
  it('uploads files pasted into the drop zone', async () => {
    const fetchMock = stubUploads()
    const { store } = renderUpload(uploadSchema())
    const file = new File(['x'], 'shot.png', { type: 'image/png' })

    paste(dropZone(), [file])

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await vi.waitFor(() =>
      expect(store.getValue('photo')).toBe('tmp:01ARZ3NDEKTSV4RRFFQ69G5FAV.png'),
    )
  })

  it('ignores pastes when pasteable(false)', () => {
    const fetchMock = stubUploads()
    renderUpload(uploadSchema({ pasteable: false }))

    paste(dropZone(), [new File(['x'], 'shot.png', { type: 'image/png' })])

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('opens the image editor before uploading and skips cancelled images', async () => {
    const fetchMock = stubUploads()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 160, height: 90, close: () => {} })),
    )
    renderUpload(uploadSchema({ imageEditor: { aspectRatios: ['16:9', null], circle: false } }))
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    const file = new File(['x'], 'photo.png', { type: 'image/png' })

    pickFiles(input, [file])

    const open = await findEditDialog()
    await findByRole('group', 'Crop area', open)
    const ratios = getByRole('group', 'Aspect ratio', open)
    const sixteenNine = Array.from(ratios.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === '16:9',
    )!
    expect(sixteenNine.getAttribute('aria-pressed')).toBe('true')
    const free = Array.from(ratios.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Free',
    )!
    await click(free)
    await click(getByRole('button', 'Rotate right', open))
    const cancel = Array.from(open.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancel',
    )!
    await click(cancel)

    await vi.waitFor(() => expect(dialog()).toBeNull())
    expect(fetchMock).not.toHaveBeenCalled()

    pickFiles(input, [file])
    const again = await findEditDialog()
    await findByRole('group', 'Crop area', again)
    const apply = Array.from(again.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Apply',
    )!
    await click(apply)

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    await flushPromises()
  })

  it('moves the crop area with the keyboard', async () => {
    stubUploads()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 200, height: 100, close: () => {} })),
    )
    renderUpload(uploadSchema({ imageEditor: { aspectRatios: ['1:1'], circle: true } }))

    pickFiles(document.querySelector<HTMLInputElement>('input[type="file"]')!, [
      new File(['x'], 'a.png', { type: 'image/png' }),
    ])

    const crop = await findByRole('group', 'Crop area')
    expect(crop.classList.contains('rounded-full')).toBe(true)
    expect(crop.style.left).toBe('25%')

    crop.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(crop.style.left).toBe('26%')
  })
})
