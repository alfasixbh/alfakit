import type { FileUploadSchema, SliderSchema } from '@alfakit/core'
import { FormStore, type SchemaComponent } from '@alfakit/core'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import FileUploadField from '../src/components/fields/FileUploadField.vue'
import SliderField from '../src/components/fields/SliderField.vue'
import { provideForm } from '../src/components/form/form-context'
import { mountWithAlfakit } from './mocks'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function mountField(store: FormStore, render: () => unknown) {
  const Form = defineComponent({
    setup() {
      provideForm(store)

      return render
    },
  })

  return mountWithAlfakit(() => h(Form), { attachTo: document.body })
}

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
  mountField(store, () => h(FileUploadField, { component }))

  return { store }
}

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

function pick(names: string[]) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: names.map((name) => new File(['x'], name, { type: 'application/pdf' })),
  })
  input.dispatchEvent(new Event('change'))
}

describe('FileUpload options', () => {
  it('uploads at most maxParallelUploads files at once', async () => {
    const { fetchMock, releases } = deferredUploads()
    const { store } = renderUpload(upload({ maxParallelUploads: 2 }))
    await flushPromises()

    pick(['a.pdf', 'b.pdf', 'c.pdf'])

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    releases[0]!()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    releases[1]!()
    releases[2]!()
    await vi.waitFor(() => expect(store.getValue('files')).toHaveLength(3))
  })

  it('prepends new uploads with appendFiles(false)', async () => {
    const { releases } = deferredUploads()
    const { store } = renderUpload(upload({ appendFiles: false }), ['docs/old.pdf'])
    await flushPromises()

    pick(['a.pdf'])

    await vi.waitFor(() => expect(releases).toHaveLength(1))
    releases[0]!()
    await vi.waitFor(() =>
      expect(store.getValue('files')).toEqual([
        'tmp:01ARZ3NDEKTSV4RRFFQ69G5FA0.pdf',
        'docs/old.pdf',
      ]),
    )
  })

  it('links open and download to their own URLs and flags missing files', async () => {
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
    await flushPromises()

    const opens = [...document.querySelectorAll('a[target="_blank"]')]
    const downloads = [...document.querySelectorAll('a[download]')]

    expect(opens[0]!.getAttribute('href')).toBe('/view/a')
    expect(downloads[0]!.getAttribute('href')).toBe('/dl/a')
    expect(opens[1]!.getAttribute('href')).toBe('/b')
    expect(document.body.textContent).toContain('This file no longer exists.')
  })

  it('applies the layout options and the MIME type map to the picker', async () => {
    renderUpload(
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
    await flushPromises()

    const zone = document.querySelector<HTMLElement>('[data-align]')!
    const item = document.querySelector('li')!

    expect(document.querySelector('[data-slot="file-upload"]')!.getAttribute('data-layout')).toBe(
      'integrated',
    )
    expect(zone.style.aspectRatio).toBe('2 / 1')
    expect(zone.className).toContain('items-end')
    expect(item.firstElementChild!.getAttribute('aria-label')).toBe('Remove')
    expect(document.querySelector('input[type="file"]')!.getAttribute('accept')).toBe(
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

async function renderSlider(component: SliderSchema, value: unknown) {
  const store = new FormStore(
    { components: [component as SchemaComponent], state: { range: value } },
    { token: 't', component: 'form' },
  )
  mountField(store, () => h(SliderField, { component }))
  await flushPromises()

  return { store, thumbs: [...document.querySelectorAll<HTMLElement>('[role="slider"]')] }
}

const press = async (element: HTMLElement, key: string) => {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await nextTick()
}

describe('Slider options', () => {
  it('keeps the thumb inside rangePadding', async () => {
    const { store, thumbs } = await renderSlider(slider({ rangePadding: [10, 20] }), 80)

    await press(thumbs[0]!, 'ArrowRight')

    expect(store.getValue('range')).toBe(80)
  })

  it('moves both thumbs with the fixed behaviour', async () => {
    const { store, thumbs } = await renderSlider(
      slider({ multiple: true, behavior: ['drag', 'fixed'] }),
      [20, 50],
    )

    await press(thumbs[0]!, 'ArrowRight')

    expect(store.getValue('range')).toEqual([25, 55])
  })

  it('forces the direction with rtl()', async () => {
    await renderSlider(slider({ rtl: true }), 10)

    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('works in positions on a non-linear track and shows the real value', async () => {
    const { thumbs } = await renderSlider(
      slider({
        step: 1,
        nonLinearPoints: [
          { percent: 20, value: 50 },
          { percent: 50, value: 75, step: 5 },
        ],
      }),
      50,
    )

    expect(thumbs[0]!.getAttribute('aria-valuenow')).toBe('20')
    expect(thumbs[0]!.getAttribute('aria-valuetext')).toBe('50')
  })

  it('draws the server pips with small labels', async () => {
    await renderSlider(
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

    const labels = [...document.querySelectorAll('span.tabular-nums')].map((label) => [
      label.textContent,
      label.className.includes('text-[0.625rem]'),
    ])

    expect(labels).toContainEqual(['10', true])
    expect(labels.map(([text]) => text)).not.toContain('25')
  })
})

describe('file upload previews', () => {
  it('falls back to the file icon when a preview image fails to load', async () => {
    renderUpload(
      upload({
        image: true,
        imagePreviewHeight: '160px',
        files: [{ path: 'posts/cover.png', name: 'cover-file.png', url: '/cover.png' }],
      } as Partial<FileUploadSchema>),
      ['posts/cover.png'],
    )
    await nextTick()

    const img = document.querySelector('[data-slot="file-upload"] img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
    expect(img?.style.height).toBe('160px')

    img?.dispatchEvent(new Event('error'))
    await nextTick()

    expect(document.querySelector('[data-slot="file-upload"] img')).toBeNull()
    expect(document.body.textContent).toContain('cover-file.png')
  })
})
