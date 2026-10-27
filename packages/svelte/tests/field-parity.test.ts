import { FormStore, type SchemaComponent } from '@alfakit/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { tick } from 'svelte'
import FormHarness from './FormHarness.svelte'
import Wrapper from './Wrapper.svelte'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(() => vi.unstubAllGlobals())

function renderForm(components: SchemaComponent[], state: Record<string, unknown>) {
  const store = new FormStore(
    { components, state },
    { token: 't', component: 'form', optionsUrl: '/o' },
  )
  const view = render(Wrapper, {
    props: { component: FormHarness, props: { store } },
  })

  return { store, ...view }
}

const upload = (extra: Record<string, unknown> = {}) =>
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
  }) as SchemaComponent

const slider = (extra: Record<string, unknown> = {}) =>
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
  }) as SchemaComponent

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
    const { container, store } = renderForm([upload({ maxParallelUploads: 2 })], { files: [] })

    await pick(container, ['a.pdf', 'b.pdf', 'c.pdf'])

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    releases[0]!()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    releases[1]!()
    releases[2]!()
    await waitFor(() => expect(store.getValue('files')).toHaveLength(3))
  })

  it('prepends new uploads with appendFiles(false)', async () => {
    const { releases } = deferredUploads()
    const { container, store } = renderForm([upload({ appendFiles: false })], {
      files: ['docs/old.pdf'],
    })

    await pick(container, ['a.pdf'])

    await waitFor(() => expect(releases).toHaveLength(1))
    releases[0]!()
    await waitFor(() =>
      expect(store.getValue('files')).toEqual([
        'tmp:01ARZ3NDEKTSV4RRFFQ69G5FA0.pdf',
        'docs/old.pdf',
      ]),
    )
  })

  it('formats file sizes and the size limit with the locale formatter', () => {
    const { container } = renderForm(
      [upload({ maxSize: 2048, files: [{ path: 'a.pdf', name: 'A.pdf', url: '/a', size: 1536 }] })],
      { files: ['a.pdf'] },
    )

    expect(container.textContent).toContain('≤ 2 MB')
    expect(container.textContent).toContain('1.5 kB')
  })

  it('links open and download to their own URLs and flags missing files', () => {
    const { container } = renderForm(
      [
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
      ],
      { files: ['a.pdf', 'b.pdf'] },
    )

    const opens = [...container.querySelectorAll('a[target="_blank"]')]
    const downloads = [...container.querySelectorAll('a[download]')]

    expect(opens[0]).toHaveAttribute('href', '/view/a')
    expect(downloads[0]).toHaveAttribute('href', '/dl/a')
    expect(opens[1]).toHaveAttribute('href', '/b')
    expect(screen.getByText('This file no longer exists.')).toBeInTheDocument()
  })

  // Screen readers hear which file a button acts on ("Remove Report.pdf").
  it('names the file in its buttons', () => {
    renderForm(
      [
        upload({
          reorderable: true,
          downloadable: true,
          files: [
            { path: 'a.pdf', name: 'Report.pdf', url: '/a', downloadUrl: '/dl/a' },
            { path: 'b.pdf', name: 'Notes.pdf', url: '/b' },
          ],
        }),
      ],
      { files: ['a.pdf', 'b.pdf'] },
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
    const { container } = renderForm(
      [
        upload({
          panelLayout: 'integrated',
          panelAspectRatio: '2:1',
          positions: { removeButton: 'start', uploadButton: 'end' },
          acceptedFileTypes: ['application/vnd.sketchup.skp'],
          acceptedFileTypesLabel: 'SKP',
          mimeTypeMap: { skp: 'application/vnd.sketchup.skp' },
          files: [{ path: 'a.pdf', name: 'Report.pdf' }],
        }),
      ],
      { files: ['a.pdf'] },
    )

    const zone = container.querySelector<HTMLElement>('[data-align]')!
    const item = screen.getByText('Report.pdf').closest('li')!

    expect(container.querySelector('[data-slot="file-upload"]')).toHaveAttribute(
      'data-layout',
      'integrated',
    )
    expect(zone.style.aspectRatio).toBe('2 / 1')
    expect(zone).toHaveClass('items-end')
    expect(item.firstElementChild).toHaveAttribute('aria-label', 'Remove Report.pdf')
    expect(container.querySelector('input[type="file"]')).toHaveAttribute(
      'accept',
      'application/vnd.sketchup.skp,.skp',
    )
    expect(zone).toHaveTextContent('SKP')
    expect(zone).not.toHaveTextContent('application/vnd.sketchup.skp')
  })
})

describe('Slider options', () => {
  it('names a single thumb by the label and describes it by the hint and helper text', () => {
    renderForm([slider({ hint: 'Per day', helperText: 'Rounded to 5' })], { range: 50 })

    expect(screen.getByRole('slider', { name: 'Range' })).toHaveAccessibleDescription(
      'Per day Rounded to 5',
    )
  })

  it('keeps the minimum and maximum names on a range', () => {
    renderForm([slider({ multiple: true })], { range: [20, 50] })

    expect(screen.getByRole('slider', { name: 'Minimum' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Maximum' })).toBeInTheDocument()
  })

  it('keeps the thumb inside rangePadding', async () => {
    const { store } = renderForm([slider({ rangePadding: [10, 20] })], { range: 80 })

    await fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    await tick()

    expect(store.getValue('range')).toBe(80)
  })

  it('moves both thumbs with the fixed behaviour', async () => {
    const { store } = renderForm([slider({ multiple: true, behavior: ['drag', 'fixed'] })], {
      range: [20, 50],
    })

    await fireEvent.keyDown(screen.getAllByRole('slider')[0]!, { key: 'ArrowRight' })
    await tick()

    expect(store.getValue('range')).toEqual([25, 55])
  })

  it('forces the direction with rtl()', () => {
    const { container } = renderForm([slider({ rtl: true })], { range: 10 })

    expect(container.querySelector('[dir="rtl"]')).not.toBeNull()
  })

  it('works in positions on a non-linear track and shows the real value', () => {
    renderForm(
      [
        slider({
          step: 1,
          nonLinearPoints: [
            { percent: 20, value: 50 },
            { percent: 50, value: 75, step: 5 },
          ],
        }),
      ],
      { range: 50 },
    )
    const thumb = screen.getByRole('slider')

    expect(thumb).toHaveAttribute('aria-valuenow', '20')
    expect(thumb).toHaveAttribute('aria-valuetext', '50')
  })

  it('draws the server pips with small labels', () => {
    renderForm(
      [
        slider({
          pips: true,
          pipList: [
            { value: 0, percent: 0, type: 1 },
            { value: 10, percent: 10, type: 2 },
            { value: 25, percent: 25, type: 0 },
          ],
        }),
      ],
      { range: 0 },
    )

    expect(screen.getByText('10')).toHaveClass('text-[0.625rem]')
    expect(screen.queryByText('25')).toBeNull()
  })
})

describe('file upload previews', () => {
  it('falls back to the file icon when a preview image fails to load', async () => {
    const { container } = renderForm(
      [
        upload({
          image: true,
          imagePreviewHeight: '160px',
          files: [{ path: 'posts/cover.png', name: 'cover-file.png', url: '/cover.png' }],
        }) as unknown as SchemaComponent,
      ],
      { files: ['posts/cover.png'] },
    )
    await tick()

    const img = container.querySelector('[data-slot="file-upload"] img') as HTMLImageElement | null
    expect(img).not.toBeNull()
    expect(img?.getAttribute('alt')).toBe('')
    expect(img?.style.height).toBe('160px')

    await fireEvent.error(img!)

    expect(container.querySelector('[data-slot="file-upload"] img')).toBeNull()
    expect(container.textContent).toContain('cover-file.png')
  })
})
