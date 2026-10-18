import type {
  FileManagerEntrySchema,
  FileManagerPickerSchema,
  FileManagerSchema,
} from '@alfakit/core'
import { FILE_MANAGER_DRAG_TYPE, FormStore } from '@alfakit/core'
import { defineComponent, h } from 'vue'
import { provideForm } from '../src/components/form/form-context'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import SchemaRenderer from '../src/components/schema/SchemaRenderer.vue'
import { actions, flush, mountWithAlfakit, panel, setPageProps } from './mocks'

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

const option = (name: string) =>
  document.querySelector<HTMLElement>(`[role="option"][aria-label="${name}"]`)!

async function mountManager(component: FileManagerSchema = schema()) {
  const wrapper = mountWithAlfakit(() => h(RenderComponent, { component: component as never }))
  await vi.waitFor(() => {
    if (!document.querySelector('[role="listbox"]')) throw new Error('Not loaded yet')
  })
  await flush()

  return wrapper
}

const key = (element: HTMLElement, init: KeyboardEventInit) =>
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))

const click = (element: HTMLElement, init: MouseEventInit = {}) =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }))

function drag(type: string, element: Element, dataTransfer: object) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  element.dispatchEvent(event)
}

describe('file manager', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    setPageProps({ alfakit: panel })
  })

  it('renders an accessible list of items with the folder tree', async () => {
    const wrapper = await mountManager()
    const list = document.querySelector('[role="listbox"]')!

    expect(document.getElementById(list.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'File manager',
    )
    expect(list.getAttribute('aria-multiselectable')).toBe('true')
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(4)
    expect(document.querySelector('nav[aria-label="Folders"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="file-manager"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('selects with clicks, Ctrl/Cmd and Shift', async () => {
    const wrapper = await mountManager()

    click(option('a.txt'))
    await flush()
    click(option('c.txt'), { shiftKey: true })
    await flush()

    expect(option('b.txt').getAttribute('aria-selected')).toBe('true')
    expect(option('docs').getAttribute('aria-selected')).toBe('false')
    expect(document.querySelector('[data-slot="file-manager-selection"]')?.textContent).toContain(
      '3 selected',
    )

    click(option('b.txt'), { ctrlKey: true })
    await flush()
    expect(option('b.txt').getAttribute('aria-selected')).toBe('false')
    wrapper.unmount()
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
    const wrapper = await mountManager()

    expect(option('docs').getAttribute('tabindex')).toBe('0')
    option('docs').focus()
    key(option('docs'), { key: 'ArrowRight' })
    await flush()
    expect(option('a.txt').getAttribute('aria-selected')).toBe('true')

    key(option('a.txt'), { key: 'ArrowLeft' })
    await flush()
    key(option('docs'), { key: 'Enter' })

    await vi.waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![1]).toMatchObject({
      component: 'file-manager',
      arguments: { disk: 'public', path: 'docs' },
    })
    await vi.waitFor(() => expect(option('inner.txt')).not.toBeNull())
    wrapper.unmount()
  })

  it('mirrors the arrow keys right to left', async () => {
    setPageProps({
      alfakit: {
        ...panel,
        localization: { ...panel.localization, direction: 'rtl' },
      } as typeof panel,
    })
    const wrapper = await mountManager()

    click(option('a.txt'))
    await flush()
    key(option('a.txt'), { key: 'ArrowLeft' })
    await flush()

    expect(option('b.txt').getAttribute('aria-selected')).toBe('true')
    wrapper.unmount()
  })

  it('moves dragged items onto a folder and shows the drop zone for desktop files', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ paths: [], listing: null })
    const wrapper = await mountManager()
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

    drag('dragstart', option('a.txt'), dataTransfer)
    expect(JSON.parse(data[FILE_MANAGER_DRAG_TYPE]!)).toEqual(['a.txt'])
    drag('dragover', option('docs'), dataTransfer)
    await flush()
    expect(option('docs').hasAttribute('data-drop-target')).toBe(true)
    drag('drop', option('docs'), dataTransfer)

    await vi.waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![0]).toMatchObject({ name: 'move' })
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a.txt'],
      destination: 'docs',
    })

    drag('dragover', document.querySelector('[data-slot="file-manager-content"]')!, {
      types: ['Files'],
      getData: () => '',
    })
    await flush()
    expect(document.querySelector('[data-slot="file-manager-drop"]')?.textContent).toContain(
      'Drop files to upload them to Files',
    )
    wrapper.unmount()
  })

  it('confirms deletes from the keyboard', async () => {
    const executeJson = vi
      .spyOn(actions, 'executeJson')
      .mockResolvedValue({ listing: schema().listing, notifications: [] })
    const wrapper = await mountManager()

    click(option('a.txt'))
    await flush()
    key(option('a.txt'), { key: 'Delete' })
    await flush()

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.textContent).toContain('They go to the trash, where you can restore them.')
    // Every renderer puts the theme hook on the dialog content itself.
    expect(dialog.getAttribute('data-slot')).toBe('file-manager-dialog')
    click(
      [...dialog.querySelectorAll<HTMLElement>('button')].find(
        (button) => button.textContent?.trim() === 'Delete',
      )!,
    )

    await vi.waitFor(() => expect(executeJson).toHaveBeenCalled())
    expect(executeJson.mock.calls[0]![1].arguments).toMatchObject({
      paths: ['a.txt'],
      permanent: false,
    })
    wrapper.unmount()
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
    const Form = defineComponent({
      setup() {
        provideForm(store)

        return () => h(SchemaRenderer, { components: store.state.components })
      },
    })
    const wrapper = mountWithAlfakit(() => h(Form))
    await flush()

    click(document.querySelector<HTMLElement>('button[aria-label="Browse files"]')!)
    await vi.waitFor(() => expect(option('a.png')).not.toBeNull())
    click(option('a.png'))
    await flush()
    click(option('b.png'))
    await flush()
    expect(option('c.txt').getAttribute('aria-disabled')).toBe('true')
    click(
      [...document.querySelectorAll<HTMLElement>('button')].find(
        (button) => button.textContent?.trim() === 'Choose',
      )!,
    )

    await vi.waitFor(() => expect(store.getValue('gallery', null)).toEqual(['a.png', 'b.png']))
    expect(actions.executeJson).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'list' }),
      expect.objectContaining({
        token: 'manager-token',
        arguments: expect.objectContaining({ picker: true }),
      }),
    )
    await flush()
    expect(document.querySelector('button[aria-label="Remove a.png"]')).not.toBeNull()
    wrapper.unmount()
  })
})
