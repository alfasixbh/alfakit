import { describe, expect, it, vi } from 'vitest'
import {
  FILE_MANAGER_DRAG_TYPE,
  FileManagerController,
  type FileManagerEnvironment,
  fileManagerAcceptAttribute,
  fileManagerAccepts,
  fileManagerExpiry,
  fileManagerSize,
} from '../src/file-manager'
import { HttpError } from '../src/http'
import { LocaleFormatter } from '../src/i18n'
import type { FileManagerEntrySchema, FileManagerSchema } from '../src/schema/file-manager'

const file = (
  path: string,
  extra: Partial<FileManagerEntrySchema> = {},
): FileManagerEntrySchema => ({
  path,
  name: path.split('/').pop()!,
  type: 'file',
  kind: 'text',
  size: 10,
  extension: path.split('.').pop() ?? null,
  ...extra,
})

const folder = (path: string): FileManagerEntrySchema => ({
  path,
  name: path.split('/').pop()!,
  type: 'folder',
  kind: 'folder',
})

const permissions = {
  upload: true,
  createFolder: true,
  rename: true,
  move: true,
  copy: true,
  delete: true,
  restore: true,
  download: true,
  share: true,
  zip: true,
}

const schema = (extra: Partial<FileManagerSchema> = {}): FileManagerSchema => ({
  type: 'file-manager',
  key: 'file-manager',
  actionComponent: 'file-manager',
  mode: 'manager',
  actions: {
    list: 'list',
    tree: 'tree',
    search: 'search',
    createFolder: 'createFolder',
    rename: 'rename',
    move: 'move',
    copy: 'copy',
    delete: 'delete',
    restore: 'restore',
    emptyTrash: 'emptyTrash',
    upload: 'upload',
    replace: 'replace',
    details: 'details',
    preview: 'preview',
    download: 'download',
    zip: 'zip',
    share: 'share',
    links: 'links',
    revoke: 'revoke',
  },
  disks: [{ name: 'public', label: 'Public' }],
  disk: 'public',
  path: '',
  listing: {
    disk: 'public',
    path: '',
    breadcrumbs: [],
    entries: [
      folder('docs'),
      file('b.txt', { size: 30 }),
      file('a10.txt', { size: 5 }),
      file('a2.txt', { size: 20 }),
    ],
  },
  tree: [{ path: 'docs', name: 'docs', hasChildren: false }],
  permissions,
  upload: { maxSize: 1000, parallel: 2 },
  search: { recursive: true },
  trash: true,
  view: 'grid',
  maxItems: 500,
  ...extra,
})

function setup(
  component: FileManagerSchema = schema(),
  overrides: Partial<FileManagerEnvironment> = {},
) {
  const executeJson = vi.fn().mockResolvedValue({})
  const env: FileManagerEnvironment = {
    runner: { executeJson },
    token: 'tok',
    uploadEndpoint: '/u',
    t: (key, replacements = {}, fallback) =>
      Object.entries(replacements).reduce(
        (line, [name, value]) => line.replace(`:${name}`, String(value)),
        fallback ?? key,
      ),
    choice: (key, count, replacements = {}, fallback) =>
      Object.entries({ count, ...replacements }).reduce(
        (line, [name, value]) => line.replace(`:${name}`, String(value)),
        fallback ?? key,
      ),
    formatter: new LocaleFormatter('en'),
    notify: vi.fn(),
    error: vi.fn(),
    visit: vi.fn(),
    ...overrides,
  }

  return { controller: new FileManagerController(component, env, 'en'), executeJson, env }
}

const names = (controller: FileManagerController) =>
  controller.visibleEntries().map((entry) => entry.name)

describe('file manager controller', () => {
  it('sorts folders first, then naturally by name, size or date', () => {
    const { controller } = setup()

    expect(names(controller)).toEqual(['docs', 'a2.txt', 'a10.txt', 'b.txt'])

    controller.setSort('size')
    expect(names(controller)).toEqual(['docs', 'a10.txt', 'a2.txt', 'b.txt'])

    controller.setSort('size')
    expect(controller.state.sort).toEqual({ field: 'size', direction: 'desc' })
    expect(names(controller)).toEqual(['docs', 'b.txt', 'a2.txt', 'a10.txt'])
  })

  it('filters the open folder by the query without asking the server', () => {
    const { controller, executeJson } = setup()

    controller.setQuery('A1')

    expect(names(controller)).toEqual(['a10.txt'])
    expect(executeJson).not.toHaveBeenCalled()
  })

  it('searches below the folder when asked, debounced', async () => {
    vi.useFakeTimers()
    const { controller, executeJson } = setup()
    executeJson.mockResolvedValue({ entries: [file('docs/deep.txt')], truncated: true })

    controller.setRecursive(true)
    controller.setQuery('dee')
    controller.setQuery('deep')
    await vi.advanceTimersByTimeAsync(400)

    expect(executeJson).toHaveBeenCalledTimes(1)
    expect(executeJson.mock.calls[0]![1].arguments).toEqual({
      disk: 'public',
      path: '',
      query: 'deep',
      recursive: true,
    })
    expect(names(controller)).toEqual(['deep.txt'])
    expect(controller.state.resultsTruncated).toBe(true)
    vi.useRealTimers()
  })

  it('selects with clicks, Ctrl/Cmd toggles and Shift ranges', () => {
    const { controller } = setup()

    controller.click('a2.txt')
    controller.click('b.txt', { shift: true })
    expect(controller.state.selection).toEqual(['a2.txt', 'a10.txt', 'b.txt'])

    controller.click('a10.txt', { toggle: true })
    expect(controller.state.selection).toEqual(['a2.txt', 'b.txt'])

    controller.click('docs')
    expect(controller.state.selection).toEqual(['docs'])
    expect(controller.state.announcement).toBe('1 selected')
  })

  it('moves the focus and the selection with the keyboard, by rows in the grid', () => {
    const { controller } = setup()

    controller.click('docs')
    expect(controller.handleKey({ key: 'ArrowRight' }, 2)).toEqual({
      handled: true,
      focus: 'a2.txt',
    })
    expect(controller.handleKey({ key: 'ArrowDown' }, 2)).toEqual({ handled: true, focus: 'b.txt' })
    expect(controller.state.selection).toEqual(['b.txt'])

    controller.handleKey({ key: 'ArrowUp', shiftKey: true }, 2)
    expect(controller.state.selection).toEqual(['a2.txt', 'a10.txt', 'b.txt'])

    controller.handleKey({ key: 'Home', ctrlKey: true }, 2)
    expect(controller.state.focus).toBe('docs')
    expect(controller.state.selection).toHaveLength(3)

    controller.handleKey({ key: ' ' }, 2)
    expect(controller.state.selection).toEqual(['a2.txt', 'a10.txt', 'b.txt', 'docs'])

    controller.handleKey({ key: 'Escape' }, 2)
    expect(controller.state.selection).toEqual([])

    controller.handleKey({ key: 'a', metaKey: true }, 2)
    expect(controller.state.selection).toHaveLength(4)
  })

  it('mirrors left and right in right-to-left layouts, and ignores them in the list', () => {
    const { controller } = setup()

    controller.click('a2.txt')
    expect(controller.handleKey({ key: 'ArrowLeft' }, 4, 'rtl').focus).toBe('a10.txt')
    expect(controller.handleKey({ key: 'ArrowRight' }, 4, 'rtl').focus).toBe('a2.txt')

    controller.setView('list')
    expect(controller.handleKey({ key: 'ArrowRight' }, 4).handled).toBe(false)
    expect(controller.handleKey({ key: 'ArrowDown' }, 4).focus).toBe('a10.txt')
  })

  it('opens folders with Enter, deletes with Delete and renames with F2', async () => {
    const { controller, executeJson } = setup()
    executeJson.mockResolvedValue({
      listing: {
        disk: 'public',
        path: 'docs',
        breadcrumbs: [{ path: 'docs', name: 'docs' }],
        entries: [],
      },
    })

    controller.click('b.txt')
    controller.handleKey({ key: 'Delete' })
    expect(controller.state.dialog).toEqual({ type: 'delete', paths: ['b.txt'], permanent: false })

    controller.handleKey({ key: 'F2' })
    expect(controller.state.dialog).toMatchObject({ type: 'rename', entry: { path: 'b.txt' } })

    controller.closeDialog()
    controller.click('docs')
    controller.handleKey({ key: 'Enter' })
    await vi.waitFor(() => expect(controller.state.path).toBe('docs'))
    expect(controller.state.breadcrumbs).toEqual([{ path: 'docs', name: 'docs' }])
  })

  it('drags the selection onto a folder to move it, and copies with a modifier', async () => {
    const { controller, executeJson } = setup()
    executeJson.mockResolvedValue({ paths: [], listing: null })
    const data: Record<string, string> = {}
    const transfer = {
      types: [] as string[],
      getData: (type: string) => data[type] ?? '',
      setData: (type: string, value: string) => {
        data[type] = value
        transfer.types = Object.keys(data)
      },
      dropEffect: 'none',
      effectAllowed: 'none',
    }

    controller.click('a2.txt')
    controller.click('b.txt', { toggle: true })
    controller.dragStart('b.txt', transfer)

    expect(JSON.parse(data[FILE_MANAGER_DRAG_TYPE]!)).toEqual(['a2.txt', 'b.txt'])
    expect(controller.dragOver('docs', transfer)).toBe(true)
    expect(transfer.dropEffect).toBe('move')
    expect(controller.state.dropTarget).toBe('docs')

    // Not onto the folder the items are already in.
    expect(controller.dragOver('', transfer)).toBe(false)

    await controller.drop('docs', transfer)
    expect(executeJson.mock.calls[0]![0].name).toBe('move')
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a2.txt', 'b.txt'],
      destination: 'docs',
    })

    controller.click('a2.txt')
    await controller.drop('docs', transfer, true)
    const copy = executeJson.mock.calls.find(([action]) => action.name === 'copy')
    expect(copy?.[1].arguments).toMatchObject({ paths: ['a2.txt', 'b.txt'], destination: 'docs' })
  })

  it('refuses to drop a folder into itself', () => {
    const { controller } = setup()
    const transfer = { types: [FILE_MANAGER_DRAG_TYPE], getData: () => '["docs"]' }

    controller.click('docs')

    expect(controller.canDrop('docs', transfer)).toBe(false)
  })

  it('uploads dropped files with progress, a few at a time, then refreshes once', async () => {
    const resolvers: Array<() => void> = []
    const uploader = vi.fn(
      (_endpoint: string, upload: File, onProgress: (progress: number) => void) => {
        onProgress(0.5)

        return new Promise<{ key: string }>((resolve) =>
          resolvers.push(() => resolve({ key: `tmp:${upload.name}` })),
        )
      },
    )
    const { controller, executeJson } = setup(schema(), { uploader })
    executeJson.mockImplementation((action: { name: string }) =>
      Promise.resolve(
        action.name === 'list' ? { listing: schema().listing } : { notifications: [] },
      ),
    )
    const files = ['1.txt', '2.txt', '3.txt'].map((name) => new File(['x'], name))

    const done = controller.drop('', { types: ['Files'], files, getData: () => '' })

    expect(uploader).toHaveBeenCalledTimes(2)
    expect(controller.state.uploads.map((upload) => upload.status)).toEqual([
      'uploading',
      'uploading',
      'queued',
    ])
    expect(controller.state.uploads[0]!.progress).toBe(0.5)

    resolvers.shift()!()
    await vi.waitFor(() => expect(uploader).toHaveBeenCalledTimes(3))
    resolvers.splice(0).forEach((resolve) => resolve())
    await done

    const uploads = executeJson.mock.calls.filter(([action]) => action.name === 'upload')
    expect(uploads.map(([, context]) => context.arguments.key)).toEqual([
      'tmp:1.txt',
      'tmp:2.txt',
      'tmp:3.txt',
    ])
    expect(executeJson.mock.calls.filter(([action]) => action.name === 'list')).toHaveLength(1)
    expect(controller.state.uploads.every((upload) => upload.status === 'done')).toBe(true)
  })

  it('rejects files over the size limit before uploading them', async () => {
    const uploader = vi.fn()
    const { controller } = setup(schema(), { uploader })

    await controller.upload([new File(['x'.repeat(2000)], 'big.bin')])

    expect(uploader).not.toHaveBeenCalled()
    expect(controller.state.uploads[0]).toMatchObject({
      status: 'error',
      error: 'big.bin is larger than 1,000 bytes.',
    })
  })

  it('shows server validation errors in the open dialog', async () => {
    const { controller, executeJson } = setup()
    executeJson.mockRejectedValue(
      new HttpError(422, { errors: { name: ['An item called “docs” already exists here.'] } }),
    )

    controller.openDialog({ type: 'createFolder' })
    expect(await controller.createFolder('docs')).toBe(false)

    expect(controller.state.dialog).toEqual({ type: 'createFolder' })
    expect(controller.state.error).toBe('An item called “docs” already exists here.')
  })

  it('downloads one file directly and several as a zip', async () => {
    const { controller, executeJson, env } = setup()
    executeJson.mockResolvedValue({ url: '/signed' })

    await controller.download(['b.txt'])
    await controller.download(['b.txt', 'docs'])

    expect(executeJson.mock.calls.map(([action]) => action.name)).toEqual(['download', 'zip'])
    expect(env.visit).toHaveBeenCalledTimes(2)
  })

  it('runs picker requests with the file manager page token and picker arguments', async () => {
    const component = schema({
      mode: 'picker',
      token: 'picker-token',
      listing: undefined,
      accept: ['image/*'],
    })
    const { controller, executeJson } = setup(component)
    executeJson.mockResolvedValue({
      listing: {
        disk: 'public',
        path: '',
        breadcrumbs: [],
        entries: [file('a.png', { value: 'a.png', selectable: true })],
      },
    })

    expect(controller.state.loaded).toBe(false)
    await controller.ensureLoaded()

    expect(executeJson.mock.calls[0]![1]).toEqual({
      token: 'picker-token',
      component: 'file-manager',
      arguments: { disk: 'public', path: '', picker: true, accept: ['image/*'] },
    })

    controller.click('a.png')
    expect(controller.chosen().map((entry) => entry.value)).toEqual(['a.png'])
  })

  it('formats sizes and expiries, and matches accepted types', () => {
    const formatter = new LocaleFormatter('en')

    expect(fileManagerSize(1536, formatter)).toBe('1.5 kB')
    expect(fileManagerSize(0, formatter)).toBe('0 bytes')
    expect(fileManagerSize(1, formatter)).toBe('1 byte')
    expect(fileManagerSize(11, formatter)).toBe('11 bytes')
    expect(fileManagerSize(11, new LocaleFormatter('fr'))).toMatch(/^11\s+octets$/u)
    expect(fileManagerExpiry(60)).toEqual({ key: 'expiry_hours', count: 1 })
    expect(fileManagerExpiry(10080)).toEqual({ key: 'expiry_days', count: 7 })
    expect(fileManagerExpiry(45)).toEqual({ key: 'expiry_minutes', count: 45 })
    expect(fileManagerAccepts(['image/*', '.csv'], { name: 'a.PNG', type: 'image/png' })).toBe(true)
    expect(fileManagerAccepts(['image/*', '.csv'], { name: 'list.csv', type: 'text/csv' })).toBe(
      true,
    )
    expect(fileManagerAccepts(['image/*'], { name: 'a.pdf', type: 'application/pdf' })).toBe(false)
    expect(fileManagerAcceptAttribute(['image/*', 'csv'])).toBe('image/*,.csv')
  })
})
