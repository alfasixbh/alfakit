import type { FileUploadSchema, SliderSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FileUploadField } from '../src/components/fields/file-upload'
import { SliderField } from '../src/components/fields/slider'
import { FormProvider } from '../src/components/form/form-context'
import { Wrapper } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => vi.unstubAllGlobals())

const upload = (extra: Partial<FileUploadSchema> = {}) =>
  ({
    type: 'FileUpload',
    key: 'files',
    name: 'files',
    statePath: 'files',
    label: 'Files',
    multiple: true,
    previewable: true,
    deletable: true,
    panelLayout: 'compact',
    files: [],
    ...extra,
  }) as FileUploadSchema

function renderUpload(component: FileUploadSchema, state: unknown = []) {
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

/** Uploads that answer when released, numbered in the order they were sent. */
function deferredUploads() {
  const releases: Array<() => void> = []
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        const index = releases.length
        releases.push(() =>
          resolve(
            new Response(
              JSON.stringify({
                key: `tmp:01ARZ3NDEKTSV4RRFFQ69G5FA${index}.pdf`,
                name: 'a',
                size: 1,
              }),
              { headers: { 'Content-Type': 'application/json' } },
            ),
          ),
        )
      }),
  )
  vi.stubGlobal('fetch', fetchMock)

  return { fetchMock, releases }
}

const pick = (container: HTMLElement, names: string[]) =>
  fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
    target: { files: names.map((name) => new File(['x'], name, { type: 'application/pdf' })) },
  })

describe('FileUpload options', () => {
  it('uploads at most maxParallelUploads files at once', async () => {
    const { fetchMock, releases } = deferredUploads()
    const { container, store } = renderUpload(upload({ maxParallelUploads: 2 }))

    pick(container, ['a.pdf', 'b.pdf', 'c.pdf'])

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    releases[0]!()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    releases[1]!()
    releases[2]!()
    await waitFor(() => expect(store.getValue('files')).toHaveLength(3))
  })

  it('uploads one file at a time by default and prepends with appendFiles(false)', async () => {
    const { fetchMock, releases } = deferredUploads()
    const { container, store } = renderUpload(upload({ appendFiles: false }), ['docs/old.pdf'])

    pick(container, ['a.pdf', 'b.pdf'])

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    releases[0]!()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    releases[1]!()
    await waitFor(() =>
      expect(store.getValue('files')).toEqual([
        'tmp:01ARZ3NDEKTSV4RRFFQ69G5FA1.pdf',
        'tmp:01ARZ3NDEKTSV4RRFFQ69G5FA0.pdf',
        'docs/old.pdf',
      ]),
    )
  })

  it('formats file sizes and the size limit with the locale formatter', () => {
    renderUpload(
      upload({ maxSize: 2048, files: [{ path: 'a.pdf', name: 'A.pdf', url: '/a', size: 1536 }] }),
      ['a.pdf'],
    )

    expect(document.body.textContent).toContain('≤ 2 MB')
    expect(document.body.textContent).toContain('1.5 kB')
  })

  it('links open and download to their own URLs and flags missing files', () => {
    renderUpload(
      upload({
        openable: true,
        downloadable: true,
        files: [
          {
            path: 'a.pdf',
            name: 'Report.pdf',
            url: '/a',
            openUrl: '/view/a',
            downloadUrl: '/dl/a',
          },
          { path: 'b.pdf', name: 'Gone.pdf', url: '/b', missing: true },
        ],
      }),
      ['a.pdf', 'b.pdf'],
    )

    const opens = screen.getAllByRole('link', { name: /Open/ })
    const downloads = screen.getAllByRole('link', { name: /^Download / })

    expect(opens[0]).toHaveAttribute('href', '/view/a')
    expect(downloads[0]).toHaveAttribute('href', '/dl/a')
    expect(opens[1]).toHaveAttribute('href', '/b')
    expect(screen.getByText('This file no longer exists.')).toBeInTheDocument()
  })

  // Screen readers hear which file a button acts on ("Remove Report.pdf").
  it('names the file in its buttons', () => {
    renderUpload(
      upload({
        reorderable: true,
        downloadable: true,
        files: [
          { path: 'a.pdf', name: 'Report.pdf', url: '/a', downloadUrl: '/dl/a' },
          { path: 'b.pdf', name: 'Notes.pdf', url: '/b' },
        ],
      }),
      ['a.pdf', 'b.pdf'],
    )

    for (const name of ['Remove Report.pdf', 'Move Report.pdf down', 'Move Notes.pdf up']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Download Report.pdf' })).toHaveAttribute(
      'href',
      '/dl/a',
    )
  })

  it('applies the layout options and the MIME type map to the picker', () => {
    const { container } = renderUpload(
      upload({
        panelLayout: 'integrated',
        panelAspectRatio: '2:1',
        positions: { removeButton: 'start', uploadButton: 'end' },
        acceptedFileTypes: ['application/vnd.sketchup.skp'],
        mimeTypeMap: { skp: 'application/vnd.sketchup.skp' },
        files: [{ path: 'a.pdf', name: 'Report.pdf' }],
      }),
      ['a.pdf'],
    )

    const zone = screen.getByRole('button', { name: /Drop files/ })
    const item = screen.getByText('Report.pdf').closest('li')!

    expect(container.querySelector('[data-slot="file-upload"]')).toHaveAttribute(
      'data-layout',
      'integrated',
    )
    expect(zone.style.aspectRatio).toBe('2 / 1')
    expect(zone).toHaveClass('items-end')
    expect(item.firstElementChild).toHaveAccessibleName('Remove Report.pdf')
    expect(container.querySelector('input[type="file"]')).toHaveAttribute(
      'accept',
      'application/vnd.sketchup.skp,.skp',
    )
  })
})

const slider = (extra: Partial<SliderSchema> = {}) =>
  ({
    type: 'Slider',
    key: 'range',
    name: 'range',
    statePath: 'range',
    label: 'Range',
    min: 0,
    max: 100,
    step: 5,
    ...extra,
  }) as SliderSchema

function renderSlider(component: SliderSchema, value: unknown) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { range: value } },
    { token: 't', component: 'form' },
  )
  const view = render(
    <Wrapper>
      <FormProvider store={store}>
        <SliderField component={component} />
      </FormProvider>
    </Wrapper>,
  )

  return { store, ...view }
}

describe('Slider options', () => {
  it('names a single thumb by the label and describes it by the hint and helper text', () => {
    renderSlider(slider({ hint: 'Per day', helperText: 'Rounded to 5' }), 50)

    const thumb = screen.getByRole('slider', { name: 'Range' })

    expect(thumb).toHaveAccessibleDescription('Per day Rounded to 5')
  })

  it('keeps the minimum and maximum names on a range', () => {
    renderSlider(slider({ multiple: true }), [20, 50])

    expect(screen.getByRole('slider', { name: 'Minimum' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Maximum' })).toBeInTheDocument()
  })

  it('keeps the thumb inside rangePadding', () => {
    const { store } = renderSlider(slider({ rangePadding: [10, 20] }), 80)

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })

    expect(store.getValue('range')).toBe(80)
  })

  it('moves both thumbs with the fixed behaviour', () => {
    const { store } = renderSlider(
      slider({ multiple: true, behavior: ['drag', 'fixed'] }),
      [20, 50],
    )

    fireEvent.keyDown(screen.getAllByRole('slider')[0]!, { key: 'ArrowRight' })

    expect(store.getValue('range')).toEqual([25, 55])
  })

  it('stops a thumb at its neighbour unless unconstrained', () => {
    const { store } = renderSlider(slider({ multiple: true }), [40, 50])

    fireEvent.keyDown(screen.getAllByRole('slider')[0]!, { key: 'PageUp' })

    expect(store.getValue('range')).toEqual([50, 50])
  })

  it('forces the direction with rtl()', () => {
    const { container } = renderSlider(slider({ rtl: true }), 10)

    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('works in positions on a non-linear track and shows the real value', () => {
    const { store } = renderSlider(
      slider({
        step: 1,
        nonLinearPoints: [
          { percent: 20, value: 50 },
          { percent: 50, value: 75, step: 5 },
        ],
      }),
      50,
    )
    const thumb = screen.getByRole('slider')

    expect(thumb).toHaveAttribute('aria-valuenow', '20')
    expect(thumb).toHaveAttribute('aria-valuetext', '50')

    fireEvent.keyDown(thumb, { key: 'End' })
    expect(store.getValue('range')).toBe(100)
  })

  it('draws the server pips with small labels', () => {
    renderSlider(
      slider({
        pips: true,
        pipList: [
          { value: 0, percent: 0, type: 1 },
          { value: 10, percent: 10, type: 2 },
          { value: 25, percent: 25, type: 0 },
        ],
      }),
      0,
    )

    expect(screen.getByText('10')).toHaveClass('text-[0.625rem]')
    expect(screen.queryByText('25')).toBeNull()
  })
})

describe('file upload previews', () => {
  it('falls back to the file icon when a preview image fails to load', () => {
    const { container } = renderUpload(
      upload({
        image: true,
        imagePreviewHeight: '160px',
        files: [
          {
            path: 'posts/cover.png',
            name: 'a-very-long-cover-image-file-name.png',
            url: '/cover.png',
          },
        ],
      } as Partial<FileUploadSchema>),
      ['posts/cover.png'],
    )

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
    expect(img?.style.height).toBe('160px')
    expect(img?.style.maxWidth).toBe('50%')

    fireEvent.error(img!)

    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('a-very-long-cover-image-file-name.png')
  })
})
