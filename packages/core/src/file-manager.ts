import type { ActionContext, ActionRunner } from './actions'
import { fileManagerSize } from './file-size'
import { HttpError } from './http'
import type { LocaleFormatter } from './i18n'
import type { ActionSchema } from './schema/actions'
import type {
  FileManagerDetailsSchema,
  FileManagerEntrySchema,
  FileManagerFolderSchema,
  FileManagerLinkSchema,
  FileManagerListingSchema,
  FileManagerPermissionsSchema,
  FileManagerPreviewSchema,
  FileManagerResult,
  FileManagerSchema,
} from './schema/file-manager'
import type { NotificationSchema } from './schema/notifications'
import { createStore, type Store } from './store'
import { postFormWithProgress, uploadTemporaryFile } from './uploads'

/**
 * The framework-agnostic half of the file manager (alfasix/alfakit-file-manager): the open
 * folder, the folder tree, sorting, search, the selection and its keyboard model, drag and
 * drop, the upload queue with progress, dialogs, details and previews. Renderers draw the
 * state and wire events to it. Every listing, check and change is made by the server: the
 * controller only sends the user's intent (with paths relative to the manager's root).
 */

/** The registry key of the file manager (and of the picker's browser). */
export const FILE_MANAGER_REGISTRY_KEY = 'file-manager'

/** The registry key of the `FileManagerPicker` field. */
export const FILE_MANAGER_PICKER_REGISTRY_KEY = 'FileManagerPicker'

/** The drag data type of items dragged inside the file manager. */
export const FILE_MANAGER_DRAG_TYPE = 'application/x-alfakit-files'

export type FileManagerSortField = 'name' | 'size' | 'modified' | 'type'

export interface FileManagerSort {
  field: FileManagerSortField
  direction: 'asc' | 'desc'
}

export interface FileManagerUpload {
  id: string
  name: string
  size: number
  /** 0…1 */
  progress: number
  status: 'queued' | 'uploading' | 'saving' | 'done' | 'error'
  error?: string
}

export type FileManagerDialog =
  | { type: 'createFolder' }
  | { type: 'rename'; entry: FileManagerEntrySchema }
  | { type: 'move' | 'copy'; paths: string[]; destination: string }
  | { type: 'delete'; paths: string[]; permanent: boolean }
  | { type: 'emptyTrash' }
  | {
      type: 'share'
      entry: FileManagerEntrySchema
      links: FileManagerLinkSchema[] | null
      url: string | null
      expiresAt: string | null
    }

export interface FileManagerPreviewState {
  entry: FileManagerEntrySchema
  data: FileManagerPreviewSchema | null
  loading: boolean
}

export interface FileManagerState {
  disk: string
  path: string
  /** The trash is shown instead of a folder. */
  trash: boolean
  retentionDays: number | null
  breadcrumbs: FileManagerListingSchema['breadcrumbs']
  entries: FileManagerEntrySchema[]
  truncated: boolean
  /** The folder has been loaded at least once (pickers load when opened). */
  loaded: boolean
  loading: boolean
  view: 'grid' | 'list'
  sort: FileManagerSort
  query: string
  recursive: boolean
  /** Results of a search below the current folder, or null. */
  results: FileManagerEntrySchema[] | null
  resultsTruncated: boolean
  searching: boolean
  selection: string[]
  /** The item a Shift range starts from. */
  anchor: string | null
  /** The item with the keyboard focus. */
  focus: string | null
  /** Sub-folders by parent path (`''` is the root). */
  tree: Record<string, FileManagerFolderSchema[]>
  expanded: string[]
  /** The folder a drag hovers (`''` is the open folder), or null. */
  dropTarget: string | null
  uploads: FileManagerUpload[]
  detailsOpen: boolean
  details: FileManagerDetailsSchema | null
  detailsLoading: boolean
  preview: FileManagerPreviewState | null
  dialog: FileManagerDialog | null
  /** A dialog's request is running. */
  busy: boolean
  /** A dialog's validation error. */
  error: string | null
  /** For a polite live region. */
  announcement: string
}

export interface FileManagerEnvironment {
  runner: Pick<ActionRunner, 'executeJson'>
  /** The page's context token (the picker uses the file manager page's own token). */
  token: string
  /** `panel.endpoints.upload`. */
  uploadEndpoint?: string
  /** `panel.endpoints.uploadChunks`: files over `uploadChunkSize` go in resumable chunks. */
  uploadChunkEndpoint?: string
  /** `panel.uploadChunkSize` in bytes. */
  uploadChunkSize?: number
  t: (key: string, replacements?: Record<string, string | number>, fallback?: string) => string
  choice: (
    key: string,
    count: number,
    replacements?: Record<string, string | number>,
    fallback?: string,
  ) => string
  /** The panel's locale formatter (`useFormatter()`). */
  formatter: Pick<LocaleFormatter, 'number'>
  notify(notifications: NotificationSchema[]): void
  error(message: string): void
  /** Start a download (defaults to following the link). */
  visit?(url: string): void
  /** Uploads a file to the temporary upload endpoint (defaults to `uploadTemporaryFile()`). */
  uploader?: FileManagerUploader
}

export type FileManagerUploader = (
  endpoint: string,
  file: File,
  onProgress: (progress: number) => void,
) => Promise<{ key: string }>

/** The keys `handleKey()` reads from a keyboard event. */
export interface FileManagerKeyEvent {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

export interface FileManagerKeyResult {
  handled: boolean
  /** The item to focus next. */
  focus?: string
}

/** Modifier keys of a click. */
export interface FileManagerClick {
  shift?: boolean
  toggle?: boolean
  /** A tap: once something is selected, taps add to (or remove from) the selection. */
  touch?: boolean
}

/** What `dragOver()` / `drop()` read from a drag event. */
export interface FileManagerDataTransfer {
  types: readonly string[]
  files?: FileList | File[] | null
  getData(type: string): string
  setData?(type: string, data: string): void
  dropEffect?: string
  effectAllowed?: string
}

const SEARCH_DELAY = 300

let uploadSequence = 0

/** `60` → `{ key: 'expiry_hours', count: 1 }`: the label of a link expiry in minutes. */
export function fileManagerExpiry(minutes: number): { key: string; count: number } {
  if (minutes % 1440 === 0) return { key: 'expiry_days', count: minutes / 1440 }
  if (minutes % 60 === 0) return { key: 'expiry_hours', count: minutes / 60 }

  return { key: 'expiry_minutes', count: minutes }
}

/** Whether a file matches upload `accept` patterns (`image/*`, `application/pdf`, `.csv`). */
export function fileManagerAccepts(
  patterns: string[] | undefined,
  file: Pick<File, 'name' | 'type'>,
): boolean {
  if (!patterns || patterns.length === 0) return true

  const extension = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase() ?? ''
  const type = file.type.toLowerCase()

  return patterns.some((pattern) => {
    const value = pattern.trim().toLowerCase()

    if (value.includes('/')) {
      // The browser's type is only a hint: unknown types are left to the server.
      if (type === '') return true

      return value.endsWith('/*') ? type.startsWith(value.slice(0, -1)) : type === value
    }

    return value.replace(/^\./, '') === extension
  })
}

/** The `accept` attribute of the upload input. */
export function fileManagerAcceptAttribute(patterns: string[] | undefined): string | undefined {
  return patterns && patterns.length > 0
    ? patterns
        .map((pattern) =>
          pattern.includes('/') || pattern.startsWith('.') ? pattern : `.${pattern}`,
        )
        .join(',')
    : undefined
}

/**
 * Upload a file to the panel's temporary upload endpoint in one request with progress
 * events. Rejects with an `HttpError` carrying Laravel's validation errors.
 */
export function uploadWithProgress(
  endpoint: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<{ key: string }> {
  const body = new FormData()
  body.append('file', file, file.name)

  return postFormWithProgress<{ key: string }>(endpoint, body, onProgress)
}

/** The first validation message of a failed request, or its message. */
export function fileManagerErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpError) {
    const first = Object.values(error.errors).find((messages) => messages.length > 0)?.[0]

    if (first) return first
    if (error.status === 403) return fallback
    if (error.status === 429 && error.message) return error.message
  }

  return fallback
}

export class FileManagerController {
  public readonly store: Store<FileManagerState>

  private listRequests = 0
  private searchRequests = 0
  private searchTimer: ReturnType<typeof setTimeout> | null = null
  private collator: Intl.Collator
  private activeUploads = 0
  private uploadQueue: Array<() => Promise<void>> = []
  private uploadsSettled: Array<() => void> = []
  private pendingRefresh = false

  constructor(
    private schema: FileManagerSchema,
    private env: FileManagerEnvironment,
    locale?: string,
  ) {
    this.collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' })
    const listing = schema.listing

    this.store = createStore<FileManagerState>({
      disk: listing?.disk ?? schema.disk,
      path: listing?.path ?? schema.path,
      trash: false,
      retentionDays: null,
      breadcrumbs: listing?.breadcrumbs ?? [],
      entries: listing?.entries ?? [],
      truncated: listing?.truncated ?? false,
      loaded: listing !== undefined,
      loading: false,
      view: schema.view,
      sort: { field: 'name', direction: 'asc' },
      query: '',
      recursive: false,
      results: null,
      resultsTruncated: false,
      searching: false,
      selection: [],
      anchor: null,
      focus: null,
      tree: schema.tree ? { '': schema.tree } : {},
      expanded: [],
      dropTarget: null,
      uploads: [],
      detailsOpen: false,
      details: null,
      detailsLoading: false,
      preview: null,
      dialog: null,
      busy: false,
      error: null,
      announcement: '',
    })
  }

  get state(): FileManagerState {
    return this.store.get()
  }

  get component(): FileManagerSchema {
    return this.schema
  }

  get permissions(): FileManagerPermissionsSchema {
    return this.schema.permissions
  }

  get isPicker(): boolean {
    return this.schema.mode === 'picker'
  }

  setEnvironment(env: FileManagerEnvironment): void {
    this.env = env
  }

  /** A fresh schema from the server (the page reloaded): take its listing. */
  setSchema(schema: FileManagerSchema): void {
    this.schema = schema

    if (schema.listing && !this.state.trash) {
      this.applyListing(schema.listing, true)
    }

    if (schema.tree) {
      this.store.update({ tree: { ...this.state.tree, '': schema.tree } })
    }
  }

  /** May the user run this operation (the server checks again). */
  can(ability: keyof FileManagerPermissionsSchema): boolean {
    return this.schema.permissions[ability] === true
  }

  // ---------------------------------------------------------------- Entries

  /** The entries shown: search results, or the folder filtered by the query, sorted. */
  visibleEntries(): FileManagerEntrySchema[] {
    const state = this.state
    const query = state.query.trim().toLocaleLowerCase()
    const source =
      state.results ??
      (query === ''
        ? state.entries
        : state.entries.filter((entry) => entry.name.toLocaleLowerCase().includes(query)))

    return this.sortEntries(source)
  }

  sortEntries(entries: FileManagerEntrySchema[]): FileManagerEntrySchema[] {
    const { field, direction } = this.state.sort
    const factor = direction === 'asc' ? 1 : -1

    return [...entries].sort((a, b) => {
      // Folders always come first.
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1

      let result = 0

      if (field === 'size') result = (a.size ?? 0) - (b.size ?? 0)
      else if (field === 'modified') result = (a.modified ?? '').localeCompare(b.modified ?? '')
      else if (field === 'type')
        result = this.collator.compare(a.extension ?? a.kind, b.extension ?? b.kind)

      return (result === 0 ? this.collator.compare(a.name, b.name) : result) * factor
    })
  }

  entry(path: string): FileManagerEntrySchema | undefined {
    return (
      this.state.entries.find((entry) => entry.path === path) ??
      this.state.results?.find((entry) => entry.path === path)
    )
  }

  selectedEntries(): FileManagerEntrySchema[] {
    const selected = new Set(this.state.selection)

    return this.visibleEntries().filter((entry) => selected.has(entry.path))
  }

  isSelected(path: string): boolean {
    return this.state.selection.includes(path)
  }

  /** Picker: the selected files that may be chosen. */
  chosen(): FileManagerEntrySchema[] {
    return this.selectedEntries().filter(
      (entry) => entry.type === 'file' && entry.selectable !== false && entry.value,
    )
  }

  // ---------------------------------------------------------------- Navigation

  /** Open a folder (`''` is the root). */
  async open(path: string, disk: string = this.state.disk): Promise<void> {
    const request = ++this.listRequests
    this.cancelSearch()
    this.store.update({ loading: true, query: '', results: null })

    try {
      const result = await this.run<{ listing: FileManagerListingSchema }>(
        'list',
        { path, ...this.pickerArguments() },
        disk,
      )

      if (request !== this.listRequests) return

      this.applyListing(result.listing, true)
      this.expandTo(result.listing.path)
      this.announce(this.folderName(result.listing))
    } catch (error) {
      if (request === this.listRequests) this.fail(error)
    } finally {
      if (request === this.listRequests) this.store.update({ loading: false })
    }
  }

  /** Open the folder's parent. */
  up(): void {
    const state = this.state

    if (state.trash || state.path === '') return

    const parent =
      state.breadcrumbs.length > 1 ? state.breadcrumbs[state.breadcrumbs.length - 2]!.path : ''
    void this.open(parent)
  }

  refresh(): Promise<void> {
    return this.state.trash ? this.showTrash(true) : this.open(this.state.path)
  }

  /** Load the folder the picker opens in, the first time it is shown. */
  ensureLoaded(): Promise<void> {
    return this.state.loaded ? Promise.resolve() : this.open(this.state.path)
  }

  setDisk(disk: string): void {
    if (disk === this.state.disk) return

    this.store.update({ disk, tree: {}, expanded: [], trash: false })
    void this.open('', disk)
    void this.loadFolders('', disk)
  }

  /** Show the trash (or go back to the files). */
  async showTrash(show: boolean): Promise<void> {
    if (!show) {
      this.store.update({ trash: false })
      await this.open(this.state.path)

      return
    }

    const request = ++this.listRequests
    this.cancelSearch()
    this.store.update({ loading: true, query: '', results: null })

    try {
      const result = await this.run<{ listing: FileManagerListingSchema }>('list', { trash: true })

      if (request !== this.listRequests) return

      this.applyListing(result.listing, true)
      this.announce(this.env.t('file-manager.trash', {}, 'Trash'))
    } catch (error) {
      if (request === this.listRequests) this.fail(error)
    } finally {
      if (request === this.listRequests) this.store.update({ loading: false })
    }
  }

  /** Open a folder, preview a file, or (picker) choose it. */
  openEntry(entry: FileManagerEntrySchema): void {
    if (this.state.trash) return

    if (entry.type === 'folder') {
      void this.open(entry.path)

      return
    }

    if (!this.isPicker) void this.openPreview(entry)
  }

  // ---------------------------------------------------------------- View

  setView(view: 'grid' | 'list'): void {
    this.store.update({ view })
  }

  /** Sort by a field; the same field again flips the direction. */
  setSort(field: FileManagerSortField, direction?: 'asc' | 'desc'): void {
    const current = this.state.sort

    this.store.update({
      sort: {
        field,
        direction:
          direction ??
          (current.field === field ? (current.direction === 'asc' ? 'desc' : 'asc') : 'asc'),
      },
    })
  }

  setQuery(query: string): void {
    this.store.update({ query })
    this.scheduleSearch()
  }

  setRecursive(recursive: boolean): void {
    this.store.update({ recursive: recursive && this.schema.search.recursive })
    this.scheduleSearch()
  }

  private scheduleSearch(): void {
    this.cancelSearch()

    const { query, recursive } = this.state

    if (!recursive || query.trim() === '' || this.state.trash) {
      this.store.update({ results: null, resultsTruncated: false, searching: false })

      return
    }

    this.store.update({ searching: true })
    this.searchTimer = setTimeout(() => void this.search(), SEARCH_DELAY)
  }

  private cancelSearch(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }

    this.searchRequests++
  }

  /** Search the open folder and every folder below it (the server limits the results). */
  async search(): Promise<void> {
    const request = ++this.searchRequests
    const query = this.state.query.trim()

    try {
      const result = await this.run<{ entries: FileManagerEntrySchema[]; truncated: boolean }>(
        'search',
        {
          path: this.state.path,
          query,
          recursive: true,
          ...this.pickerArguments(),
        },
      )

      if (request !== this.searchRequests) return

      this.store.update({
        results: result.entries,
        resultsTruncated: result.truncated,
        searching: false,
      })
      this.announce(
        this.env.choice(
          'file-manager.search_results',
          result.entries.length,
          { query },
          ':count results for “:query”',
        ),
      )
    } catch (error) {
      if (request === this.searchRequests) {
        this.store.update({ searching: false })
        this.fail(error)
      }
    }
  }

  // ---------------------------------------------------------------- Tree

  children(path: string): FileManagerFolderSchema[] | undefined {
    return this.state.tree[path]
  }

  isExpanded(path: string): boolean {
    return this.state.expanded.includes(path)
  }

  async toggleFolder(path: string): Promise<void> {
    if (this.isExpanded(path)) {
      this.store.update({ expanded: this.state.expanded.filter((item) => item !== path) })

      return
    }

    this.store.update({ expanded: [...this.state.expanded, path] })

    if (!this.state.tree[path]) await this.loadFolders(path)
  }

  async loadFolders(path: string, disk: string = this.state.disk): Promise<void> {
    try {
      const result = await this.run<{ path: string; nodes: FileManagerFolderSchema[] }>(
        'tree',
        { path },
        disk,
      )

      this.store.update({ tree: { ...this.state.tree, [result.path]: result.nodes } })
    } catch {
      // The tree is a shortcut: a folder that can't be read just shows no children.
      this.store.update({ tree: { ...this.state.tree, [path]: [] } })
    }
  }

  /** Expand the tree down to `path` (after opening it from the breadcrumb or the list). */
  private expandTo(path: string): void {
    if (path === '') return

    const segments = path.split('/')
    const expanded = new Set(this.state.expanded)

    for (let index = 1; index < segments.length; index++) {
      expanded.add(segments.slice(0, index).join('/'))
    }

    this.store.update({ expanded: [...expanded] })

    for (const folder of expanded) {
      if (!this.state.tree[folder]) void this.loadFolders(folder)
    }
  }

  // ---------------------------------------------------------------- Selection

  /**
   * A click: select the item, toggle it (Ctrl/Cmd, taps while something is selected, every
   * click in a picker of several files) or select a range (Shift).
   */
  click(path: string, modifiers: FileManagerClick = {}): void {
    const state = this.state
    const multiple = !this.isPicker || this.schema.multiple === true

    if (modifiers.shift && state.anchor !== null && multiple) {
      this.store.update({ selection: this.range(state.anchor, path), focus: path })
    } else if (
      multiple &&
      (modifiers.toggle ||
        (modifiers.touch && state.selection.length > 0) ||
        (this.isPicker && !modifiers.shift))
    ) {
      this.toggle(path)

      return
    } else {
      this.store.update({ selection: [path], anchor: path, focus: path })
    }

    this.announceSelection()
  }

  toggle(path: string): void {
    const selected = this.isSelected(path)
    const multiple = !this.isPicker || this.schema.multiple === true
    const selection = selected
      ? this.state.selection.filter((item) => item !== path)
      : multiple
        ? [...this.state.selection, path]
        : [path]

    this.store.update({ selection, anchor: path, focus: path })
    this.announceSelection()
  }

  selectAll(): void {
    if (this.isPicker && this.schema.multiple !== true) return

    this.store.update({ selection: this.visibleEntries().map((entry) => entry.path) })
    this.announceSelection()
  }

  clearSelection(): void {
    this.store.update({ selection: [], anchor: null })
    this.announceSelection()
  }

  focus(path: string): void {
    this.store.update({ focus: path })
  }

  private range(from: string, to: string): string[] {
    const paths = this.visibleEntries().map((entry) => entry.path)
    const start = paths.indexOf(from)
    const end = paths.indexOf(to)

    if (start === -1 || end === -1) return [to]

    return paths.slice(Math.min(start, end), Math.max(start, end) + 1)
  }

  /**
   * The keyboard model of the item list: arrows move (by rows in the grid, mirrored right
   * to left), Shift extends the selection, Ctrl/Cmd moves without selecting, Space toggles,
   * Enter opens, Backspace goes up, Delete deletes, F2 renames, Ctrl/Cmd+A selects all and
   * Escape clears the selection.
   */
  handleKey(
    event: FileManagerKeyEvent,
    columns = 1,
    direction: 'ltr' | 'rtl' = 'ltr',
  ): FileManagerKeyResult {
    const entries = this.visibleEntries()
    const paths = entries.map((entry) => entry.path)
    const state = this.state
    const current = state.focus !== null ? paths.indexOf(state.focus) : -1
    const command = event.ctrlKey === true || event.metaKey === true
    const grid = state.view === 'grid'
    const step = grid ? Math.max(1, columns) : 1
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'

    let target: number | null

    switch (event.key) {
      case 'ArrowDown':
        target = current === -1 ? 0 : Math.min(paths.length - 1, current + step)
        break
      case 'ArrowUp':
        if (event.altKey) {
          this.up()

          return { handled: true }
        }

        target = current === -1 ? 0 : Math.max(0, current - step)
        break
      case forward:
        if (!grid) return { handled: false }
        target = current === -1 ? 0 : Math.min(paths.length - 1, current + 1)
        break
      case backward:
        if (!grid) return { handled: false }
        target = current === -1 ? 0 : Math.max(0, current - 1)
        break
      case 'Home':
        target = 0
        break
      case 'End':
        target = paths.length - 1
        break
      case ' ':
      case 'Spacebar': {
        if (current === -1) return { handled: true }
        this.toggle(paths[current]!)

        return { handled: true, focus: paths[current] }
      }
      case 'Enter': {
        const entry = entries[current]

        if (!entry) return { handled: false }

        if (this.isPicker && entry.type === 'file') {
          this.click(entry.path)

          return { handled: true, focus: entry.path }
        }

        this.openEntry(entry)

        return { handled: true }
      }
      case 'Backspace':
        if (state.trash || state.path === '') return { handled: false }
        this.up()

        return { handled: true }
      case 'Delete':
        if (state.selection.length === 0 || !this.can('delete') || this.isPicker)
          return { handled: false }
        this.confirmDelete(state.selection)

        return { handled: true }
      case 'F2': {
        const entry =
          state.selection.length === 1 ? this.entry(state.selection[0]!) : entries[current]

        if (!entry || !this.can('rename') || state.trash || this.isPicker) return { handled: false }
        this.openDialog({ type: 'rename', entry })

        return { handled: true }
      }
      case 'a':
      case 'A':
        if (!command) return { handled: false }
        this.selectAll()

        return { handled: true }
      case 'Escape':
        if (state.selection.length === 0) return { handled: false }
        this.clearSelection()

        return { handled: true, focus: state.focus ?? undefined }
      default:
        return { handled: false }
    }

    if (target === null || target < 0 || paths.length === 0) return { handled: true }

    const path = paths[target]!

    if (event.shiftKey) {
      const anchor = state.anchor ?? paths[Math.max(0, current)] ?? path
      this.store.update({ selection: this.range(anchor, path), anchor, focus: path })
      this.announceSelection()
    } else if (command) {
      this.store.update({ focus: path })
    } else {
      this.store.update({ selection: [path], anchor: path, focus: path })
      this.announceSelection()
    }

    return { handled: true, focus: path }
  }

  // ---------------------------------------------------------------- Dialogs

  openDialog(dialog: FileManagerDialog): void {
    this.store.update({ dialog, error: null, busy: false })
  }

  closeDialog(): void {
    this.store.update({ dialog: null, error: null, busy: false })
  }

  confirmDelete(paths: string[] = this.state.selection): void {
    if (paths.length === 0) return

    this.openDialog({
      type: 'delete',
      paths,
      permanent: this.state.trash || this.schema.trash !== true,
    })
  }

  async createFolder(name: string): Promise<boolean> {
    return this.submit(async () => {
      const result = await this.run<
        { path: string; parent: string; nodes: FileManagerFolderSchema[] } & FileManagerResult
      >('createFolder', { path: this.state.path, name, current: this.state.path })

      this.applyResult(result)
      this.store.update({
        tree: { ...this.state.tree, [result.parent]: result.nodes },
        selection: [result.path],
        anchor: result.path,
        focus: result.path,
      })
    })
  }

  async rename(path: string, name: string): Promise<boolean> {
    return this.submit(async () => {
      const result = await this.run<{ path: string } & FileManagerResult>('rename', {
        path,
        name,
        current: this.state.path,
      })

      this.applyResult(result)
      this.store.update({ selection: [result.path], anchor: result.path, focus: result.path })
      this.reloadTreeOf(path)
    })
  }

  /** Move or copy items into a folder. */
  async transfer(type: 'move' | 'copy', paths: string[], destination: string): Promise<boolean> {
    return this.submit(async () => {
      const result = await this.run<{ paths: string[] } & FileManagerResult>(type, {
        paths,
        destination,
        current: this.state.path,
      })

      this.applyResult(result)
      this.store.update({ selection: [], anchor: null })
      void this.loadFolders(destination)

      if (type === 'move') paths.forEach((path) => this.reloadTreeOf(path))
    })
  }

  async remove(paths: string[], permanent = false): Promise<boolean> {
    return this.submit(async () => {
      const result = await this.run<FileManagerResult>('delete', {
        paths,
        permanent,
        trash: this.state.trash,
        current: this.state.path,
      })

      this.applyResult(result)
      this.store.update({ selection: [], anchor: null, details: null })

      if (!this.state.trash) paths.forEach((path) => this.reloadTreeOf(path))
    })
  }

  async restore(paths: string[] = this.state.selection): Promise<boolean> {
    return this.submit(async () => {
      const result = await this.run<FileManagerResult>('restore', { paths })

      this.applyResult(result)
      this.store.update({ selection: [], anchor: null })
      void this.loadFolders('')
    })
  }

  async emptyTrash(): Promise<boolean> {
    return this.submit(async () => {
      const result = await this.run<FileManagerResult>('emptyTrash', {})

      this.applyResult(result)
      this.store.update({ selection: [], anchor: null })
    })
  }

  // ---------------------------------------------------------------- Sharing

  async openShare(entry: FileManagerEntrySchema): Promise<void> {
    this.openDialog({ type: 'share', entry, links: null, url: null, expiresAt: null })

    if (!this.schema.share?.publicLinks) return

    try {
      const result = await this.run<{ links: FileManagerLinkSchema[] }>('links', {
        path: entry.path,
      })
      const dialog = this.state.dialog

      if (dialog?.type === 'share' && dialog.entry.path === entry.path) {
        this.store.update({ dialog: { ...dialog, links: result.links } })
      }
    } catch (error) {
      this.fail(error)
    }
  }

  /** Create a link (`expiry` in minutes; null: a public link that never expires). */
  async createLink(expiry: number | null): Promise<string | null> {
    const dialog = this.state.dialog

    if (dialog?.type !== 'share') return null

    let url: string | null = null

    await this.submit(async () => {
      const result = await this.run<
        { url: string; expiresAt: string | null; link?: FileManagerLinkSchema } & FileManagerResult
      >('share', { path: dialog.entry.path, expiry })

      this.applyResult(result)
      url = result.url
      const current = this.state.dialog

      if (current?.type === 'share') {
        this.store.update({
          dialog: {
            ...current,
            url: result.url,
            expiresAt: result.expiresAt,
            links: result.link && current.links ? [result.link, ...current.links] : current.links,
          },
        })
      }
    }, false)

    return url
  }

  async revokeLink(id: number): Promise<void> {
    const dialog = this.state.dialog

    if (dialog?.type !== 'share') return

    try {
      const result = await this.run<FileManagerResult>('revoke', { id })

      this.applyResult(result)
      const current = this.state.dialog

      if (current?.type === 'share') {
        this.store.update({
          dialog: { ...current, links: (current.links ?? []).filter((link) => link.id !== id) },
        })
      }
    } catch (error) {
      this.fail(error)
    }
  }

  // ---------------------------------------------------------------- Downloads

  /** Download one file, or several items as a zip. */
  async download(paths: string[] = this.state.selection): Promise<void> {
    if (paths.length === 0) return

    const single = paths.length === 1 ? this.entry(paths[0]!) : undefined

    try {
      const result =
        single?.type === 'file'
          ? await this.run<{ url: string }>('download', { path: single.path })
          : await this.run<{ url: string }>('zip', { paths })

      this.visit(result.url)
    } catch (error) {
      this.fail(error)
    }
  }

  private visit(url: string): void {
    if (this.env.visit) {
      this.env.visit(url)

      return
    }

    if (typeof window !== 'undefined') window.location.assign(url)
  }

  // ---------------------------------------------------------------- Details and preview

  async showDetails(
    entry: FileManagerEntrySchema | undefined = this.selectedEntries()[0],
  ): Promise<void> {
    this.store.update({ detailsOpen: true })

    if (!entry || this.state.trash) {
      this.store.update({ details: entry ? { ...entry } : null })

      return
    }

    this.store.update({ detailsLoading: true, details: { ...entry } })

    try {
      const result = await this.run<{ details: FileManagerDetailsSchema }>('details', {
        path: entry.path,
      })

      if (this.state.details?.path === entry.path) this.store.update({ details: result.details })
    } catch (error) {
      this.fail(error)
    } finally {
      this.store.update({ detailsLoading: false })
    }
  }

  closeDetails(): void {
    this.store.update({ detailsOpen: false })
  }

  async openPreview(entry: FileManagerEntrySchema): Promise<void> {
    this.store.update({ preview: { entry, data: null, loading: true } })

    try {
      const result = await this.run<{ preview: FileManagerPreviewSchema }>('preview', {
        path: entry.path,
      })

      if (this.state.preview?.entry.path === entry.path) {
        this.store.update({ preview: { entry, data: result.preview, loading: false } })
      }
    } catch (error) {
      this.store.update({ preview: null })
      this.fail(error)
    }
  }

  closePreview(): void {
    this.store.update({ preview: null })
  }

  /** The previous (-1) or next (+1) file of the list in the preview. */
  previewSibling(offset: -1 | 1): FileManagerEntrySchema | undefined {
    const current = this.state.preview?.entry.path
    const files = this.visibleEntries().filter((entry) => entry.type === 'file')
    const index = files.findIndex((entry) => entry.path === current)

    return index === -1 ? undefined : files[index + offset]
  }

  /** Save an image from the image editor over the previewed file. */
  async saveEditedImage(file: File): Promise<boolean> {
    const preview = this.state.preview
    const endpoint = this.env.uploadEndpoint

    if (!preview || !endpoint) return false

    try {
      const uploaded = await this.sendFile(endpoint, file, () => {})
      const result = await this.run<FileManagerResult>('replace', {
        path: preview.entry.path,
        key: uploaded.key,
        current: this.state.path,
      })

      this.applyResult(result)
      await this.openPreview(this.entry(preview.entry.path) ?? preview.entry)

      return true
    } catch (error) {
      this.fail(error)

      return false
    }
  }

  // ---------------------------------------------------------------- Uploads

  /** Upload files into a folder (the open one by default), a few at a time. */
  upload(files: FileList | File[], folder: string = this.state.path): Promise<void> {
    const endpoint = this.env.uploadEndpoint
    const options = this.schema.upload

    if (!endpoint || !options || !this.can('upload') || this.state.trash) return Promise.resolve()

    const list = Array.from(files)
    const items: FileManagerUpload[] = list.map((file) => ({
      id: `upload-${++uploadSequence}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'queued',
    }))

    this.store.update({ uploads: [...this.state.uploads, ...items] })

    const done = new Promise<void>((resolve) => this.uploadsSettled.push(resolve))

    list.forEach((file, index) => {
      const item = items[index]!

      if (file.size > options.maxSize) {
        this.updateUpload(item.id, {
          status: 'error',
          error: this.env.t(
            'file-manager.too_large',
            { name: file.name, max: fileManagerSize(options.maxSize, this.env.formatter) },
            ':name is larger than :max.',
          ),
        })

        return
      }

      this.uploadQueue.push(() => this.sendUpload(endpoint, file, item.id, folder))
    })

    this.pump()

    return done
  }

  private pump(): void {
    const limit = Math.max(1, this.schema.upload?.parallel ?? 3)

    while (this.activeUploads < limit && this.uploadQueue.length > 0) {
      const task = this.uploadQueue.shift()!
      this.activeUploads++

      void task().finally(() => {
        this.activeUploads--
        this.pump()
      })
    }

    if (this.activeUploads === 0 && this.uploadQueue.length === 0) {
      const settled = this.uploadsSettled
      this.uploadsSettled = []

      if (this.pendingRefresh) {
        this.pendingRefresh = false
        void this.refresh().then(() => settled.forEach((resolve) => resolve()))
      } else {
        settled.forEach((resolve) => resolve())
      }
    }
  }

  private async sendUpload(
    endpoint: string,
    file: File,
    id: string,
    folder: string,
  ): Promise<void> {
    this.updateUpload(id, { status: 'uploading' })

    try {
      const uploaded = await this.sendFile(endpoint, file, (progress) =>
        this.updateUpload(id, { progress }),
      )

      this.updateUpload(id, { status: 'saving', progress: 1 })

      const result = await this.run<FileManagerResult>('upload', {
        path: folder,
        key: uploaded.key,
        current: this.state.path,
        refresh: false,
      })

      this.env.notify(result.notifications ?? [])
      this.updateUpload(id, { status: 'done' })
      this.pendingRefresh = true
    } catch (error) {
      this.updateUpload(id, {
        status: 'error',
        error: fileManagerErrorMessage(
          error,
          this.env.t('file-manager.error', {}, 'Something went wrong. Try again.'),
        ),
      })
    }
  }

  /** The environment's uploader, or the temporary upload (chunked when large) with the policy. */
  private sendFile(
    endpoint: string,
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<{ key: string }> {
    if (this.env.uploader) return this.env.uploader(endpoint, file, onProgress)

    return uploadTemporaryFile(endpoint, file, {
      chunkEndpoint: this.env.uploadChunkEndpoint,
      chunkSize: this.env.uploadChunkSize,
      policy: this.schema.upload?.policy,
      onProgress,
      singleRequestProgress: true,
    })
  }

  private updateUpload(id: string, patch: Partial<FileManagerUpload>): void {
    this.store.update({
      uploads: this.state.uploads.map((upload) =>
        upload.id === id ? { ...upload, ...patch } : upload,
      ),
    })
  }

  dismissUpload(id: string): void {
    this.store.update({ uploads: this.state.uploads.filter((upload) => upload.id !== id) })
  }

  /** Remove finished and failed uploads from the list. */
  clearUploads(): void {
    this.store.update({
      uploads: this.state.uploads.filter(
        (upload) => upload.status !== 'done' && upload.status !== 'error',
      ),
    })
  }

  // ---------------------------------------------------------------- Drag and drop

  /** Start dragging an item: the selection (or the item alone, when it isn't selected). */
  dragStart(path: string, transfer: FileManagerDataTransfer): void {
    if (!this.isSelected(path)) this.store.update({ selection: [path], anchor: path, focus: path })

    transfer.setData?.(FILE_MANAGER_DRAG_TYPE, JSON.stringify(this.state.selection))
    transfer.setData?.(
      'text/plain',
      this.state.selection.map((item) => item.split('/').pop()).join('\n'),
    )
    transfer.effectAllowed = 'copyMove'
  }

  /**
   * A drag over `target` (a folder's path, `''` for the open folder). Returns whether it can
   * be dropped there, and highlights the target.
   */
  dragOver(target: string, transfer: FileManagerDataTransfer, copy = false): boolean {
    const accepted = this.canDrop(target, transfer, copy)

    if (accepted) {
      transfer.dropEffect =
        transfer.types.includes(FILE_MANAGER_DRAG_TYPE) && !copy ? 'move' : 'copy'
    }

    const dropTarget = accepted ? target : null

    if (this.state.dropTarget !== dropTarget) this.store.update({ dropTarget })

    return accepted
  }

  dragLeave(target: string): void {
    if (this.state.dropTarget === target) this.store.update({ dropTarget: null })
  }

  dragEnd(): void {
    if (this.state.dropTarget !== null) this.store.update({ dropTarget: null })
  }

  canDrop(target: string, transfer: FileManagerDataTransfer, copy = false): boolean {
    if (this.state.trash) return false

    if (transfer.types.includes(FILE_MANAGER_DRAG_TYPE)) {
      if (!this.can(copy ? 'copy' : 'move') || this.isPicker) return false

      const folder = target === '' ? this.state.path : target

      // Never into a dragged folder (or below it). The selection is what is being dragged.
      return !this.state.selection.some(
        (path) =>
          folder === path || folder.startsWith(`${path}/`) || (!copy && parentOf(path) === folder),
      )
    }

    return (
      transfer.types.includes('Files') && this.can('upload') && this.schema.upload !== undefined
    )
  }

  /** Drop on `target`: upload dragged files, or move (copy with Ctrl/Alt) dragged items. */
  drop(target: string, transfer: FileManagerDataTransfer, copy = false): Promise<unknown> {
    const accepted = this.canDrop(target, transfer, copy)
    const folder = target === '' ? this.state.path : target

    this.store.update({ dropTarget: null })

    if (!accepted) return Promise.resolve()

    if (transfer.types.includes(FILE_MANAGER_DRAG_TYPE)) {
      let paths: string[]

      try {
        const data = JSON.parse(transfer.getData(FILE_MANAGER_DRAG_TYPE)) as unknown
        paths = Array.isArray(data)
          ? data.filter((path): path is string => typeof path === 'string')
          : []
      } catch {
        paths = []
      }

      return paths.length > 0
        ? this.transfer(copy ? 'copy' : 'move', paths, folder)
        : Promise.resolve()
    }

    const files = transfer.files ? Array.from(transfer.files) : []

    return files.length > 0 ? this.upload(files, folder) : Promise.resolve()
  }

  // ---------------------------------------------------------------- Internals

  private pickerArguments(): Record<string, unknown> {
    return this.isPicker ? { picker: true, accept: this.schema.accept } : {}
  }

  private applyListing(listing: FileManagerListingSchema, resetSelection: boolean): void {
    const paths = new Set(listing.entries.map((entry) => entry.path))
    const keep =
      resetSelection && listing.path !== this.state.path
        ? []
        : this.state.selection.filter((path) => paths.has(path))

    this.store.update({
      disk: listing.disk,
      path: listing.path,
      trash: listing.trash === true,
      retentionDays: listing.retentionDays ?? null,
      breadcrumbs: listing.breadcrumbs,
      entries: listing.entries,
      truncated: listing.truncated === true,
      loaded: true,
      selection: keep,
      anchor: keep.includes(this.state.anchor ?? '') ? this.state.anchor : null,
      focus:
        this.state.focus !== null && paths.has(this.state.focus)
          ? this.state.focus
          : (listing.entries[0]?.path ?? null),
    })

    this.syncLocation()
  }

  private applyResult(result: FileManagerResult): void {
    this.env.notify(result.notifications ?? [])

    if (result.listing) this.applyListing(result.listing, false)
  }

  /** Reload the tree level an item belongs to (after it was renamed, moved or deleted). */
  private reloadTreeOf(path: string): void {
    const parent = parentOf(path)

    if (this.state.tree[parent]) void this.loadFolders(parent)
  }

  private async submit(task: () => Promise<void>, close = true): Promise<boolean> {
    this.store.update({ busy: true, error: null })

    try {
      await task()

      if (close) this.store.update({ dialog: null })

      return true
    } catch (error) {
      const message = fileManagerErrorMessage(
        error,
        this.env.t('file-manager.error', {}, 'Something went wrong. Try again.'),
      )

      if (this.state.dialog) {
        this.store.update({ error: message })
      } else {
        this.env.error(message)
      }

      return false
    } finally {
      this.store.update({ busy: false })
    }
  }

  private fail(error: unknown): void {
    this.env.error(
      fileManagerErrorMessage(
        error,
        this.env.t('file-manager.error', {}, 'Something went wrong. Try again.'),
      ),
    )
  }

  private run<T>(
    name: keyof FileManagerSchema['actions'],
    args: Record<string, unknown>,
    disk: string = this.state.disk,
  ): Promise<T> {
    const action: ActionSchema = {
      type: 'Action',
      name: this.schema.actions[name],
      hasAction: true,
    }
    const context: ActionContext = {
      token: this.schema.token ?? this.env.token,
      component: this.schema.actionComponent,
      arguments: { disk, ...args },
    }

    return this.env.runner.executeJson<T>(action, context)
  }

  private folderName(listing: FileManagerListingSchema): string {
    return (
      listing.breadcrumbs[listing.breadcrumbs.length - 1]?.name ??
      this.env.t('file-manager.root', {}, 'Files')
    )
  }

  private announceSelection(): void {
    const count = this.state.selection.length

    this.announce(
      count === 0 ? '' : this.env.t('file-manager.selected', { count }, ':count selected'),
    )
  }

  private announce(message: string): void {
    this.store.update({ announcement: message })
  }

  /** Keep `?disk=&path=` in the address bar, so a reload or a shared URL opens the folder. */
  private syncLocation(): void {
    if (
      !this.schema.syncUrl ||
      typeof window === 'undefined' ||
      typeof window.history?.replaceState !== 'function'
    )
      return

    try {
      const url = new URL(window.location.href)
      const state = this.state

      if (state.disk === this.schema.disks[0]?.name) url.searchParams.delete('disk')
      else url.searchParams.set('disk', state.disk)

      if (state.path === '' || state.trash) url.searchParams.delete('path')
      else url.searchParams.set('path', state.path)

      if (url.href !== window.location.href)
        window.history.replaceState(window.history.state, '', url)
    } catch {
      // Sandboxed or unusual environments: the address bar just doesn't follow.
    }
  }

  dispose(): void {
    this.cancelSearch()
    this.uploadQueue = []
  }
}

function parentOf(path: string): string {
  const index = path.lastIndexOf('/')

  return index === -1 ? '' : path.slice(0, index)
}

export { fileManagerSize }
