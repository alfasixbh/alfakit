import type { FileUploadSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, shallowRef } from 'vue'
import FileUploadField from '../src/components/fields/FileUploadField.vue'
import { provideForm } from '../src/components/form/form-context'
import { mountWithAlfakit } from './mocks'

/** A 2D context whose every method is a no-op (jsdom has no canvas). */
const fakeContext = new Proxy({}, { get: () => () => undefined, set: () => true })

beforeEach(() => {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: 400, height: 200, close: () => undefined })),
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    fakeContext as CanvasRenderingContext2D,
  )
  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, type?: string) {
    callback(new Blob(['edited'], { type: type ?? 'image/png' }))
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const upload = (extra: Partial<FileUploadSchema> = {}) =>
  ({
    type: 'FileUpload',
    key: 'files',
    name: 'files',
    statePath: 'files',
    label: 'Files',
    multiple: false,
    image: true,
    previewable: true,
    deletable: true,
    panelLayout: 'compact',
    imageEditor: { aspectRatios: [null], circle: false },
    files: [],
    ...extra,
  }) as FileUploadSchema

function renderUpload(component: FileUploadSchema, state: unknown = null) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { files: state } },
    { token: 't', component: 'form' },
  )
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return () => h(FileUploadField, { component })
    },
  })
  mountWithAlfakit(() => h(Form), { attachTo: document.body })

  return { store }
}

/** A fetch response for an image (jsdom's Blob doesn't round-trip through `Response`). */
const imageResponse = () =>
  ({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) }) as Response

const field = (label: string): HTMLInputElement | null => {
  const element = [...document.querySelectorAll('label')].find(
    (item) => item.textContent?.trim() === label,
  )

  return element ? (document.getElementById(element.htmlFor) as HTMLInputElement | null) : null
}

const button = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)

const buttonWithText = (text: string) =>
  [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === text)

const cropBox = () => document.querySelector<HTMLElement>('[data-slot="image-editor-crop"]')!

const type = async (input: HTMLInputElement, value: string) => {
  input.value = value
  input.dispatchEvent(new Event('change'))
  await flushPromises()
}

const openPicked = async () => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [new File(['x'], 'a.png', { type: 'image/png' })],
  })
  input.dispatchEvent(new Event('change'))
  await vi.waitFor(() => expect(field('Width')).not.toBeNull())
}

describe('image editor', () => {
  it('keeps loading the image when the field re-renders with an equal schema (a new builder block)', async () => {
    const component = shallowRef(upload())
    const store = new FormStore(
      { components: [component.value as SchemaComponent], state: { files: null } },
      { token: 't', component: 'form' },
    )
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(FileUploadField, { component: component.value })
      },
    })
    mountWithAlfakit(() => h(Form), { attachTo: document.body })

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['x'], 'a.png', { type: 'image/png' })],
    })
    input.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect(createImageBitmap).toHaveBeenCalledTimes(1))

    // A template item's schema is a new object on every render.
    component.value = { ...component.value, imageEditor: { ...component.value.imageEditor! } }

    await vi.waitFor(() => expect(field('Width')).not.toBeNull())
    expect(createImageBitmap).toHaveBeenCalledTimes(1)
  })

  it('zooms the image under the crop box with the buttons and keys', async () => {
    renderUpload(upload())
    await openPicked()

    expect(field('Width')!.value).toBe('400')
    expect(button('Zoom out')!.disabled).toBe(false)

    button('Zoom in')!.click()
    await vi.waitFor(() => expect(field('Width')!.value).toBe('333'))
    // The crop box keeps its place on screen and frames fewer image pixels.
    expect(parseFloat(cropBox().style.width)).toBeCloseTo(100)

    cropBox().dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }))
    await vi.waitFor(() => expect(field('Width')!.value).toBe('400'))
  })

  it('binds the numeric inputs to the crop box both ways', async () => {
    renderUpload(upload())
    await openPicked()

    await type(field('Width')!, '100')
    await vi.waitFor(() => expect(cropBox().style.width).toBe('25%'))

    await type(field('X')!, '50')
    await vi.waitFor(() => expect(cropBox().style.left).toBe('12.5%'))

    // Out of range values are clamped; empty ones snap back.
    await type(field('X')!, '9999')
    expect(field('X')!.value).toBe('300')

    await type(field('Height')!, '')
    expect(field('Height')!.value).toBe('200')

    // Scale toggles flip the image.
    buttonWithText('Scale X')!.click()
    await flushPromises()
    expect(buttonWithText('Scale X')!.getAttribute('aria-pressed')).toBe('true')
    expect(field('X')!.value).toBe('0')
  })

  it('edits an uploaded image and uploads it in its place', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ key: 'tmp:edited.png', name: 'a.png', size: 6 }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return imageResponse()
    })
    vi.stubGlobal('fetch', fetchMock)

    const { store } = renderUpload(
      upload({
        multiple: true,
        files: [
          { path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' },
          { path: 'docs/b.pdf', name: 'b.pdf', url: '/storage/docs/b.pdf' },
        ],
      }),
      ['photos/a.png', 'docs/b.pdf'],
    )
    await flushPromises()

    // Only editable images get the button.
    expect(document.querySelectorAll('button[aria-label="Edit a.png"]')).toHaveLength(1)

    button('Edit a.png')!.click()
    await vi.waitFor(() => expect(field('Width')).not.toBeNull())
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/storage/photos/a.png')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'same-origin' })

    buttonWithText('Apply')!.click()

    await vi.waitFor(() =>
      expect(store.getValue('files')).toEqual(['tmp:edited.png', 'docs/b.pdf']),
    )
  })

  it('keeps the file when editing is cancelled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => imageResponse()),
    )
    const files = [{ path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' }]
    const { store } = renderUpload(upload({ files }), 'photos/a.png')
    await flushPromises()

    button('Edit a.png')!.click()
    await vi.waitFor(() => expect(field('Width')).not.toBeNull())
    buttonWithText('Cancel')!.click()

    await vi.waitFor(() => expect(field('Width')).toBeNull())
    expect(store.getValue('files')).toBe('photos/a.png')
  })

  it('shows an error when the uploaded image cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 403 })),
    )
    const files = [{ path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' }]
    renderUpload(upload({ files }), 'photos/a.png')
    await flushPromises()

    button('Edit a.png')!.click()

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('The image could not be opened.'),
    )
  })

  it('has no edit button without imageEditor()', async () => {
    const files = [{ path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' }]
    renderUpload(upload({ files, imageEditor: null }), 'photos/a.png')
    await flushPromises()

    expect(button('Edit a.png')).toBeNull()
  })
})
