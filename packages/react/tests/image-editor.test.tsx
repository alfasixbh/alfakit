import type { FileUploadSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FileUploadField } from '../src/components/fields/file-upload'
import { FormProvider } from '../src/components/form/form-context'
import { Wrapper } from './mocks'

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
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <FileUploadField component={component} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

const openPicked = async (container: HTMLElement) => {
  fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
    target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
  })

  return screen.findByLabelText('Width')
}

/** A fetch response for an image (jsdom's Blob doesn't round-trip through `Response`). */
const imageResponse = () =>
  ({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) }) as Response

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement

const cropBox = () => document.querySelector<HTMLElement>('[data-slot="image-editor-crop"]')!

describe('image editor', () => {
  it('keeps loading the image when the field re-renders with an equal schema (a new builder block)', async () => {
    const component = upload()
    const { store, container, rerender } = renderUpload(component)

    fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(createImageBitmap).toHaveBeenCalledTimes(1))

    // A template item's schema is a new object on every render.
    rerender(
      <Wrapper>
        <FormProvider store={store}>
          <FileUploadField
            component={{ ...component, imageEditor: { ...component.imageEditor! } }}
          />
        </FormProvider>
      </Wrapper>,
    )

    expect(await screen.findByLabelText('Width')).toBeInTheDocument()
    expect(createImageBitmap).toHaveBeenCalledTimes(1)
  })

  it('zooms the image under the crop box with the buttons and keys', async () => {
    const { container } = renderUpload(upload())
    await openPicked(container)

    expect(field('Width').value).toBe('400')
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))

    // The crop box keeps its place on screen and frames fewer image pixels.
    await waitFor(() => expect(field('Width').value).toBe('333'))
    expect(parseFloat(cropBox().style.width)).toBeCloseTo(100)

    fireEvent.keyDown(cropBox(), { key: '-' })
    await waitFor(() => expect(field('Width').value).toBe('400'))
  })

  it('binds the numeric inputs to the crop box both ways', async () => {
    const { container } = renderUpload(upload())
    await openPicked(container)

    const width = field('Width')
    fireEvent.change(width, { target: { value: '100' } })
    fireEvent.blur(width)

    await waitFor(() => expect(cropBox().style.width).toBe('25%'))

    const x = field('X')
    fireEvent.change(x, { target: { value: '50' } })
    fireEvent.keyDown(x, { key: 'Enter' })
    await waitFor(() => expect(cropBox().style.left).toBe('12.5%'))

    // Out of range values are clamped; empty ones snap back.
    fireEvent.change(field('X'), { target: { value: '9999' } })
    fireEvent.blur(field('X'))
    await waitFor(() => expect(field('X').value).toBe('300'))

    fireEvent.change(field('Height'), { target: { value: '' } })
    fireEvent.blur(field('Height'))
    expect(field('Height').value).toBe('200')

    // Scale toggles flip the image.
    const scaleX = screen.getByRole('button', { name: 'Scale X' })
    fireEvent.click(scaleX)
    expect(scaleX).toHaveAttribute('aria-pressed', 'true')
    expect(field('X').value).toBe('0')
  })

  it('edits an uploaded image and uploads it in its place', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
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

    // Only editable images get the button.
    const edit = screen.getAllByRole('button', { name: /^Edit a\.png$/ })
    expect(edit).toHaveLength(1)

    fireEvent.click(edit[0]!)

    await screen.findByLabelText('Width')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/storage/photos/a.png')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: 'same-origin' })

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(store.getValue('files')).toEqual(['tmp:edited.png', 'docs/b.pdf']))
  })

  it('keeps the file when editing is cancelled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => imageResponse()),
    )
    const files = [{ path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' }]
    const { store } = renderUpload(upload({ files }), 'photos/a.png')

    fireEvent.click(screen.getByRole('button', { name: /^Edit a\.png$/ }))
    await screen.findByLabelText('Width')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByLabelText('Width')).toBeNull())
    expect(store.getValue('files')).toBe('photos/a.png')
  })

  it('shows an error when the uploaded image cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 403 })),
    )
    const files = [{ path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' }]
    renderUpload(upload({ files }), 'photos/a.png')

    fireEvent.click(screen.getByRole('button', { name: /^Edit a\.png$/ }))

    expect(await screen.findByText('The image could not be opened.')).toBeInTheDocument()
  })

  it('has no edit button without imageEditor()', () => {
    const files = [{ path: 'photos/a.png', name: 'a.png', url: '/storage/photos/a.png' }]
    renderUpload(upload({ files, imageEditor: null }), 'photos/a.png')

    expect(screen.queryByRole('button', { name: /^Edit a\.png$/ })).toBeNull()
  })
})
