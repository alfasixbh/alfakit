import type {
  FileManagerEntrySchema,
  FileManagerPickerSchema,
  FileManagerSchema,
} from '@alfakit/core'
import { FILE_MANAGER_DRAG_TYPE, FormStore } from '@alfakit/core'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PageActionProvider } from '../src/components/actions/action-context'
import { FormProvider } from '../src/components/form/form-context'
import { RenderComponent, SchemaRenderer } from '../src/components/schema/schema-renderer'
import { Wrapper, actions, panel, setPageProps } from './mocks'

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

const schema = (extra: Partial<FileManagerSchema> = {}): FileManagerSchema => ({
  type: 'file-manager',
  key: 'file-manager',
  actionComponent: 'file-manager',
  mode: 'manager',
  actions: Object.fromEntries(
    [
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
    ].map((name) => [name, name]),
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

function renderManager(component: FileManagerSchema = schema()) {
  return render(
    <Wrapper>
      <PageActionProvider value={{ token: 'tok', component: 'page' }}>
        <RenderComponent component={component as never} />
      </PageActionProvider>
    </Wrapper>,
  )
}

const option = (name: string) => screen.getByRole('option', { name })

afterEach(() => {
  vi.restoreAllMocks()
  setPageProps({ alfakit: panel })
})

describe('file manager', () => {
  it('renders an accessible list of items with the folder tree', async () => {
    renderManager()

    const list = await screen.findByRole('listbox', { name: 'File manager' })

    expect(list).toHaveAttribute('aria-multiselectable', 'true')
    expect(within(list).getAllByRole('option')).toHaveLength(4)
    expect(screen.getByRole('navigation', { name: 'Folders' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="file-manager"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="file-manager-items"]')).not.toBeNull()
  })

  it('selects with clicks, Ctrl/Cmd and Shift, and shows the selection actions', async () => {
    renderManager()
    await screen.findByRole('listbox')

    fireEvent.click(option('a.txt'))
    fireEvent.click(option('c.txt'), { shiftKey: true })

    expect(option('a.txt')).toHaveAttribute('aria-selected', 'true')
    expect(option('b.txt')).toHaveAttribute('aria-selected', 'true')
    expect(option('docs')).toHaveAttribute('aria-selected', 'false')
    expect(document.querySelector('[data-slot="file-manager-selection"]')).toHaveTextContent(
      '3 selected',
    )

    fireEvent.click(option('b.txt'), { ctrlKey: true })
    expect(option('b.txt')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('button', { name: 'Download as zip' })).toBeInTheDocument()
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

    const docs = option('docs')
    expect(docs).toHaveAttribute('tabindex', '0')
    docs.focus()
    fireEvent.keyDown(docs, { key: 'ArrowRight' })
    expect(option('a.txt')).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(option('a.txt'), { key: 'ArrowLeft' })
    fireEvent.keyDown(option('docs'), { key: 'Enter' })

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![1]).toMatchObject({
      token: 'tok',
      component: 'file-manager',
      arguments: { disk: 'public', path: 'docs' },
    })
    expect(await screen.findByRole('option', { name: 'inner.txt' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Folder path' })).getByText('docs'),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('mirrors the arrow keys right to left', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...(panel.localization ?? {}), direction: 'rtl' },
      } as typeof panel,
    })
    renderManager()
    await screen.findByRole('listbox')

    fireEvent.click(option('a.txt'))
    fireEvent.keyDown(option('a.txt'), { key: 'ArrowLeft' })

    expect(option('b.txt')).toHaveAttribute('aria-selected', 'true')
  })

  it('confirms deletes from the keyboard and sends them to the server', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ listing: schema().listing, notifications: [] })
    renderManager()
    await screen.findByRole('listbox')

    fireEvent.click(option('a.txt'))
    fireEvent.keyDown(option('a.txt'), { key: 'Delete' })

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('They go to the trash, where you can restore them.'),
    ).toBeInTheDocument()
    // Every renderer puts the theme hook on the dialog content itself.
    expect(dialog.getAttribute('data-slot')).toBe('file-manager-dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![0]).toMatchObject({ name: 'delete' })
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a.txt'],
      permanent: false,
    })
  })

  it('moves dragged items onto a folder', async () => {
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

    fireEvent.dragStart(option('a.txt'), { dataTransfer })
    expect(JSON.parse(data[FILE_MANAGER_DRAG_TYPE]!)).toEqual(['a.txt'])

    fireEvent.dragOver(option('docs'), { dataTransfer })
    expect(option('docs')).toHaveAttribute('data-drop-target')
    fireEvent.drop(option('docs'), { dataTransfer })

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![0]).toMatchObject({ name: 'move' })
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a.txt'],
      destination: 'docs',
    })
  })

  it('shows the drop zone for files dragged from the desktop', async () => {
    renderManager()
    await screen.findByRole('listbox')
    const content = document.querySelector('[data-slot="file-manager-content"]')!

    fireEvent.dragOver(content, { dataTransfer: { types: ['Files'], getData: () => '' } })

    expect(screen.getByText('Drop files to upload them to Files')).toBeInTheDocument()
  })

  it('creates folders through the dialog', async () => {
    const executeJson = vi.spyOn(actions, 'executeJson').mockResolvedValue({
      path: 'New',
      parent: '',
      nodes: [],
      listing: schema().listing,
      notifications: [],
    })
    renderManager()
    await screen.findByRole('listbox')

    fireEvent.click(screen.getByRole('button', { name: 'New folder' }))
    fireEvent.change(await screen.findByLabelText('Folder name'), { target: { value: 'New' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({ path: '', name: 'New' })
  })

  it('picks files into a form field', async () => {
    const browser = schema({
      mode: 'picker',
      token: 'manager-token',
      listing: undefined,
      tree: undefined,
      multiple: true,
      accept: ['image/*'],
    })
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
    const field: FileManagerPickerSchema = {
      type: 'FileManagerPicker',
      key: 'gallery',
      name: 'gallery',
      statePath: 'gallery',
      label: 'Gallery',
      multiple: true,
      files: [],
      browser,
    } as FileManagerPickerSchema
    const store = new FormStore(
      { components: [field], state: { gallery: [] } },
      { token: 't', component: 'form' },
    )

    render(
      <Wrapper>
        <PageActionProvider value={{ token: 'tok', component: 'page' }}>
          <FormProvider store={store}>
            <SchemaRenderer components={store.state.components} />
          </FormProvider>
        </PageActionProvider>
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Browse files' }))
    fireEvent.click(await screen.findByRole('option', { name: 'a.png' }))
    fireEvent.click(screen.getByRole('option', { name: 'b.png' }))
    expect(screen.getByRole('option', { name: 'c.txt' })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }))

    await waitFor(() => expect(store.getValue('gallery', null)).toEqual(['a.png', 'b.png']))
    expect(actions.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'list' }),
      expect.objectContaining({
        token: 'manager-token',
        arguments: expect.objectContaining({ picker: true, accept: ['image/*'] }),
      }),
    )
    expect(screen.getByRole('button', { name: 'Remove a.png' })).toBeInTheDocument()
  })
})
