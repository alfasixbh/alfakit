import type {
  FileManagerEntrySchema,
  FileManagerPickerSchema,
  FileManagerSchema,
} from '@alfakit/core'
import { FILE_MANAGER_DRAG_TYPE, FormStore } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import FormHarness from './FormHarness.svelte'
import { actions, panel, registry, setPageProps } from './mocks'
import Wrapper from './Wrapper.svelte'

const file = (
  path: string,
  extra: Partial<FileManagerEntrySchema> = {},
): FileManagerEntrySchema => ({
  path,
  name: path.split('/').pop()!,
  type: 'file',
  kind: 'text',
  size: 1200,
  ...extra,
})

const folder = (path: string): FileManagerEntrySchema => ({
  path,
  name: path,
  type: 'folder',
  kind: 'folder',
})

const ACTIONS = [
  'list',
  'tree',
  'search',
  'createFolder',
  'rename',
  'move',
  'copy',
  'delete',
  'restore',
  'emptyTrash',
  'upload',
  'replace',
  'details',
  'preview',
  'download',
  'zip',
  'share',
  'links',
  'revoke',
]

const schema = (extra: Partial<FileManagerSchema> = {}): FileManagerSchema => ({
  type: 'file-manager',
  key: 'file-manager',
  actionComponent: 'file-manager',
  mode: 'manager',
  actions: Object.fromEntries(
    ACTIONS.map((name) => [name, name]),
  ) as unknown as FileManagerSchema['actions'],
  disks: [{ name: 'public', label: 'Public' }],
  disk: 'public',
  path: '',
  listing: {
    disk: 'public',
    path: '',
    breadcrumbs: [],
    entries: [folder('docs'), file('a.txt'), file('b.txt'), file('c.txt')],
  },
  tree: [{ path: 'docs', name: 'docs', hasChildren: false }],
  permissions: {
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
  },
  upload: { maxSize: 10_000_000, parallel: 2 },
  search: { recursive: true },
  trash: true,
  view: 'grid',
  maxItems: 500,
  ...extra,
})

const renderManager = (component: FileManagerSchema = schema()) =>
  render(Wrapper, { props: { component: RenderComponent, props: { component } } })

const option = (name: string) => screen.getByRole('option', { name })

beforeEach(() => {
  setPageProps({ alfakit: panel, page: { token: 'tok' } as never })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('file manager', () => {
  it('is registered as file-manager with its picker field', () => {
    expect(registry.has('file-manager')).toBe(true)
    expect(registry.has('FileManagerPicker')).toBe(true)
  })

  it('renders an accessible list of items with the folder tree', async () => {
    renderManager()

    const list = await screen.findByRole('listbox', { name: 'File manager' })

    expect(list).toHaveAttribute('aria-multiselectable', 'true')
    expect(within(list).getAllByRole('option')).toHaveLength(4)
    expect(screen.getByRole('navigation', { name: 'Folders' })).toBeInTheDocument()
  })

  it('selects with clicks, Ctrl/Cmd and Shift', async () => {
    renderManager()
    await screen.findByRole('listbox')

    await fireEvent.click(option('a.txt'))
    await fireEvent.click(option('c.txt'), { shiftKey: true })

    expect(option('b.txt')).toHaveAttribute('aria-selected', 'true')
    expect(option('docs')).toHaveAttribute('aria-selected', 'false')
    expect(document.querySelector('[data-slot="file-manager-selection"]')).toHaveTextContent(
      '3 selected',
    )

    await fireEvent.click(option('b.txt'), { ctrlKey: true })
    expect(option('b.txt')).toHaveAttribute('aria-selected', 'false')
  })

  it('moves through items with the keyboard and opens folders with Enter', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({
      listing: {
        disk: 'public',
        path: 'docs',
        breadcrumbs: [{ path: 'docs', name: 'docs' }],
        entries: [file('docs/inner.txt')],
      },
    })
    renderManager()
    await screen.findByRole('listbox')

    expect(option('docs')).toHaveAttribute('tabindex', '0')
    option('docs').focus()
    await fireEvent.keyDown(option('docs'), { key: 'ArrowRight' })
    expect(option('a.txt')).toHaveAttribute('aria-selected', 'true')

    await fireEvent.keyDown(option('a.txt'), { key: 'ArrowLeft' })
    await fireEvent.keyDown(option('docs'), { key: 'Enter' })

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![1]).toMatchObject({
      token: 'tok',
      component: 'file-manager',
      arguments: { disk: 'public', path: 'docs' },
    })
    expect(await screen.findByRole('option', { name: 'inner.txt' })).toBeInTheDocument()
  })

  it('mirrors the arrow keys right to left', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...panel.localization, direction: 'rtl' },
      } as typeof panel,
    })
    renderManager()
    await screen.findByRole('listbox')

    await fireEvent.click(option('a.txt'))
    await fireEvent.keyDown(option('a.txt'), { key: 'ArrowLeft' })

    expect(option('b.txt')).toHaveAttribute('aria-selected', 'true')
  })

  it('moves dragged items onto a folder and shows the drop zone for desktop files', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ paths: [], listing: null })
    renderManager()
    await screen.findByRole('listbox')
    const data: Record<string, string> = {}
    const dataTransfer = {
      get types() {
        return Object.keys(data)
      },
      getData: (type: string) => data[type] ?? '',
      setData: (type: string, value: string) => {
        data[type] = value
      },
      dropEffect: 'none',
      effectAllowed: 'none',
    }

    await fireEvent.dragStart(option('a.txt'), { dataTransfer })
    expect(JSON.parse(data[FILE_MANAGER_DRAG_TYPE]!)).toEqual(['a.txt'])
    await fireEvent.dragOver(option('docs'), { dataTransfer })
    expect(option('docs')).toHaveAttribute('data-drop-target')
    await fireEvent.drop(option('docs'), { dataTransfer })

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![0]).toMatchObject({ name: 'move' })
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a.txt'],
      destination: 'docs',
    })

    await fireEvent.dragOver(document.querySelector('[data-slot="file-manager-content"]')!, {
      dataTransfer: { types: ['Files'], getData: () => '' },
    })
    expect(screen.getByText('Drop files to upload them to Files')).toBeInTheDocument()
  })

  it('confirms deletes from the keyboard', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ listing: schema().listing, notifications: [] })
    renderManager()
    await screen.findByRole('listbox')

    await fireEvent.click(option('a.txt'))
    await fireEvent.keyDown(option('a.txt'), { key: 'Delete' })

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('They go to the trash, where you can restore them.'),
    ).toBeInTheDocument()
    // Every renderer puts the theme hook on the dialog content itself.
    expect(dialog.getAttribute('data-slot')).toBe('file-manager-dialog')
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a.txt'],
      permanent: false,
    })
  })

  it('picks files into a form field', async () => {
    vi.spyOn(actions, 'executeJson').mockResolvedValue({
      listing: {
        disk: 'public',
        path: '',
        breadcrumbs: [],
        entries: [
          file('a.png', { kind: 'image', value: 'a.png', selectable: true }),
          file('b.png', { kind: 'image', value: 'b.png', selectable: true }),
          file('c.txt', { value: 'c.txt', selectable: false }),
        ],
      },
    })
    const field = {
      type: 'FileManagerPicker',
      key: 'gallery',
      name: 'gallery',
      statePath: 'gallery',
      label: 'Gallery',
      multiple: true,
      files: [],
      browser: schema({
        mode: 'picker',
        token: 'manager-token',
        listing: undefined,
        tree: undefined,
        multiple: true,
        accept: ['image/*'],
      }),
    } as unknown as FileManagerPickerSchema
    const store = new FormStore(
      { components: [field], state: { gallery: [] } },
      { token: 't', component: 'form' },
    )

    render(Wrapper, { props: { component: FormHarness, props: { store } } })

    await fireEvent.click(screen.getByRole('button', { name: 'Browse files' }))
    await fireEvent.click(await screen.findByRole('option', { name: 'a.png' }))
    await fireEvent.click(screen.getByRole('option', { name: 'b.png' }))
    expect(screen.getByRole('option', { name: 'c.txt' })).toHaveAttribute('aria-disabled', 'true')
    await fireEvent.click(screen.getByRole('button', { name: 'Choose' }))

    await waitFor(() => expect(store.getValue('gallery', null)).toEqual(['a.png', 'b.png']))
    expect(actions.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'list' }),
      expect.objectContaining({
        token: 'manager-token',
        arguments: expect.objectContaining({ picker: true }),
      }),
    )
    expect(await screen.findByRole('button', { name: 'Remove a.png' })).toBeInTheDocument()
  })
})
