import type {
  FileManagerEntrySchema,
  FileManagerEnvironment,
  FileManagerKind,
  FileManagerSchema,
  FileManagerSortField,
} from '@alfakit/core'
import {
  FileManagerController,
  clientErrorNotification,
  fetchEditableImage,
  fileManagerAcceptAttribute,
  fileManagerExpiry,
  fileManagerSize,
} from '@alfakit/core'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileIcon,
  FileImageIcon,
  FileMusicIcon,
  FilePlayIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  FolderInputIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  FolderTreeIcon,
  InfoIcon,
  LayoutGridIcon,
  LinkIcon,
  ListIcon,
  PencilIcon,
  PresentationIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  Share2Icon,
  SquarePenIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  useActionRunner,
  useChoice,
  useDirection,
  useFormatter,
  usePanel,
  useT,
} from '../../context'
import { useIsMobile } from '../../hooks/use-mobile'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { ImageEditorDialog, type ImageEditRequest } from '../fields/image-editor-dialog'
import { showToast } from '../notifications/flash-toasts'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet'
import { Spinner } from '../ui/spinner'

const SELECT =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'

const KIND_ICONS: Record<FileManagerKind, LucideIcon> = {
  folder: FolderIcon,
  image: FileImageIcon,
  video: FilePlayIcon,
  audio: FileMusicIcon,
  pdf: FileTextIcon,
  text: FileTextIcon,
  archive: FileArchiveIcon,
  document: FileTextIcon,
  spreadsheet: FileSpreadsheetIcon,
  presentation: PresentationIcon,
  other: FileIcon,
}

const SORT_FIELDS: FileManagerSortField[] = ['name', 'size', 'modified', 'type']

const IMAGE_EDITOR = { aspectRatios: [null], circle: false }

/**
 * The file manager of alfasix/alfakit-file-manager (schema component `file-manager`): a
 * folder tree, breadcrumbs, grid and list views, sorting, search, multi-selection with
 * mouse and keyboard, drag and drop (uploads and moves), uploads with progress, previews,
 * details, sharing and the trash. Everything is listed, checked and changed by the server.
 */
export function FileManager({ component }: { component?: FileManagerSchema }) {
  return component ? (
    <FileManagerView key={`${component.disk}:${component.mode}`} schema={component} />
  ) : null
}

export interface FileManagerViewProps {
  schema: FileManagerSchema
  /** Picker: called with the chosen files. */
  onChoose?: (entries: FileManagerEntrySchema[]) => void
  onCancel?: () => void
}

export function FileManagerView({ schema, onChoose, onCancel }: FileManagerViewProps) {
  const runner = useActionRunner()
  const page = usePageActionContext()
  const panel = usePanel()
  const t = useT()
  const choice = useChoice()
  const direction = useDirection()
  const formatter = useFormatter()
  const labelId = useId()
  const hintId = useId()
  const tt = (key: string, replacements?: Record<string, string | number>, fallback?: string) =>
    t(`file-manager.${key}`, replacements, fallback)

  const environment = (): FileManagerEnvironment => ({
    runner,
    token: page.token,
    uploadEndpoint: panel.endpoints.upload,
    uploadChunkEndpoint: panel.endpoints.uploadChunks,
    uploadChunkSize: panel.uploadChunkSize,
    t,
    choice,
    formatter,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('file-manager', message)),
  })
  const [controller] = useState(
    () => new FileManagerController(schema, environment(), formatter.locale),
  )

  useEffect(() => {
    controller.setEnvironment(environment())
  })

  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false

      return
    }

    controller.setSchema(schema)
  }, [controller, schema])

  useEffect(() => {
    if (schema.mode === 'picker') void controller.ensureLoaded()

    return () => controller.dispose()
  }, [controller, schema.mode])

  const state = useStore(controller.store)
  const entries = controller.visibleEntries()
  const selected = controller.selectedEntries()
  const picker = schema.mode === 'picker'
  const listRef = useRef<HTMLDivElement | null>(null)
  const items = useRef(new Map<string, HTMLElement>())
  const uploadInput = useRef<HTMLInputElement | null>(null)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const mobile = useIsMobile()
  const focusPath = state.focus ?? entries[0]?.path ?? null

  const focusItem = (path: string | undefined) => {
    if (path) requestAnimationFrame(() => items.current.get(path)?.focus())
  }

  const columns = () => {
    const element = listRef.current

    if (!element || state.view !== 'grid' || typeof getComputedStyle === 'undefined') return 1

    return Math.max(
      1,
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
    )
  }

  const onItemKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const result = controller.handleKey(event, columns(), direction)

    if (result.handled) {
      event.preventDefault()
      focusItem(result.focus)
    }
  }

  // Taps add to the selection once something is selected (there is no Ctrl on touch screens).
  const pointer = useRef('mouse')

  const onItemClick = (entry: FileManagerEntrySchema, event: MouseEvent<HTMLElement>) => {
    controller.click(entry.path, {
      shift: event.shiftKey,
      toggle: event.metaKey || event.ctrlKey,
      touch: pointer.current === 'touch',
    })
  }

  const onItemDoubleClick = (entry: FileManagerEntrySchema) => {
    if (picker && entry.type === 'file') {
      if (entry.selectable !== false && entry.value) onChoose?.([entry])

      return
    }

    controller.openEntry(entry)
  }

  const copying = (event: DragEvent) => event.ctrlKey || event.altKey || event.metaKey

  const dropHandlers = (target: string) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (controller.dragOver(target, event.dataTransfer, copying(event))) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        controller.dragLeave(target)
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      void controller.drop(target, event.dataTransfer, copying(event))
    },
  })

  const canWrite = !picker && !state.trash
  const single = selected.length === 1 ? selected[0] : undefined
  const folderLabel = state.trash
    ? tt('trash', {}, 'Trash')
    : (state.breadcrumbs[state.breadcrumbs.length - 1]?.name ?? tt('root', {}, 'Files'))

  const tree = (
    <FolderTree
      controller={controller}
      onOpen={(path) => {
        setFoldersOpen(false)
        void controller.open(path)
      }}
      active={state.trash ? null : state.path}
      dropHandlers={canWrite ? dropHandlers : undefined}
      dropTarget={state.dropTarget}
    />
  )

  return (
    <Card
      className="relative gap-0 overflow-hidden py-0"
      data-slot="file-manager"
      data-view={state.view}
      data-mode={schema.mode}
      aria-labelledby={labelId}
    >
      <span id={labelId} className="sr-only">
        {tt('label', {}, 'File manager')}
      </span>
      <div className="sr-only" role="status" aria-live="polite">
        {state.announcement}
      </div>

      <div
        className="flex flex-wrap items-center gap-2 border-b p-3"
        data-slot="file-manager-toolbar"
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setFoldersOpen(true)}
          aria-label={tt('toggle_folders', {}, 'Show folders')}
        >
          <FolderTreeIcon aria-hidden="true" />
        </Button>
        {schema.disks.length > 1 && (
          <label className="flex items-center">
            <span className="sr-only">{tt('disk', {}, 'Storage')}</span>
            <select
              className={SELECT}
              value={state.disk}
              onChange={(event) => controller.setDisk(event.target.value)}
            >
              {schema.disks.map((disk) => (
                <option key={disk.name} value={disk.name}>
                  {disk.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <nav
          aria-label={tt('breadcrumb', {}, 'Folder path')}
          className="min-w-0 flex-[1_1_12rem]"
          data-slot="file-manager-breadcrumb"
        >
          <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            <li className="flex items-center">
              <button
                type="button"
                className="hover:bg-accent rounded px-1.5 py-1 font-medium"
                aria-current={!state.trash && state.path === '' ? 'page' : undefined}
                onClick={() =>
                  state.trash ? void controller.showTrash(false) : void controller.open('')
                }
              >
                {tt('root', {}, 'Files')}
              </button>
            </li>
            {state.trash ? (
              <Crumb current>{tt('trash', {}, 'Trash')}</Crumb>
            ) : (
              state.breadcrumbs.map((crumb, index) => (
                <Crumb
                  key={crumb.path}
                  current={index === state.breadcrumbs.length - 1}
                  onClick={() => void controller.open(crumb.path)}
                >
                  {crumb.name}
                </Crumb>
              ))
            )}
          </ol>
        </nav>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-40 flex-1 sm:flex-none">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={state.query}
              onChange={(event) => controller.setQuery(event.target.value)}
              placeholder={tt('search_placeholder', {}, 'Search…')}
              aria-label={tt('search', {}, 'Search in this folder')}
              className="h-9 ps-8 sm:w-52"
              disabled={state.trash}
            />
          </div>
          {schema.search.recursive && !state.trash && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={state.recursive}
                onCheckedChange={(checked) => controller.setRecursive(checked === true)}
              />
              {tt('search_everywhere', {}, 'Include subfolders')}
            </label>
          )}
          <label className="flex items-center gap-1">
            <span className="sr-only">{tt('sort', {}, 'Sort by')}</span>
            <select
              className={SELECT}
              value={state.sort.field}
              onChange={(event) =>
                controller.setSort(event.target.value as FileManagerSortField, state.sort.direction)
              }
            >
              {SORT_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {tt(`sort_${field}`, {}, field)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() =>
              controller.setSort(state.sort.field, state.sort.direction === 'asc' ? 'desc' : 'asc')
            }
            aria-label={
              state.sort.direction === 'asc'
                ? tt('ascending', {}, 'Ascending')
                : tt('descending', {}, 'Descending')
            }
          >
            {state.sort.direction === 'asc' ? (
              <ArrowUpIcon aria-hidden="true" />
            ) : (
              <ArrowDownIcon aria-hidden="true" />
            )}
          </Button>
          <div className="flex rounded-md border" role="group" aria-label={tt('view', {}, 'View')}>
            <Button
              type="button"
              variant={state.view === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-pressed={state.view === 'grid'}
              aria-label={tt('view_grid', {}, 'Grid')}
              onClick={() => controller.setView('grid')}
            >
              <LayoutGridIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={state.view === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-pressed={state.view === 'list'}
              aria-label={tt('view_list', {}, 'List')}
              onClick={() => controller.setView('list')}
            >
              <ListIcon aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void controller.refresh()}
            aria-label={tt('refresh', {}, 'Refresh')}
          >
            <RefreshCwIcon aria-hidden="true" className={cn(state.loading && 'animate-spin')} />
          </Button>
          {!state.trash && controller.can('createFolder') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => controller.openDialog({ type: 'createFolder' })}
            >
              <FolderPlusIcon aria-hidden="true" />
              <span className="max-sm:sr-only">{tt('new_folder', {}, 'New folder')}</span>
            </Button>
          )}
          {!state.trash && controller.can('upload') && schema.upload && (
            <>
              <Button type="button" size="sm" onClick={() => uploadInput.current?.click()}>
                <UploadIcon aria-hidden="true" />
                <span className="max-sm:sr-only">{tt('upload', {}, 'Upload')}</span>
              </Button>
              <input
                ref={uploadInput}
                type="file"
                multiple
                hidden
                accept={fileManagerAcceptAttribute(schema.upload.accept)}
                data-slot="file-manager-upload-input"
                onChange={(event) => {
                  if (event.target.files) void controller.upload(Array.from(event.target.files))
                  event.target.value = ''
                }}
              />
            </>
          )}
          {schema.trash && !picker && (
            <Button
              type="button"
              variant={state.trash ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={state.trash}
              onClick={() => void controller.showTrash(!state.trash)}
            >
              <Trash2Icon aria-hidden="true" />
              <span className="max-sm:sr-only">
                {state.trash ? tt('back_to_files', {}, 'Back to files') : tt('trash', {}, 'Trash')}
              </span>
            </Button>
          )}
        </div>
      </div>

      {selected.length > 0 && !picker && (
        <div
          className="bg-muted/50 flex flex-wrap items-center gap-1 border-b px-3 py-2 text-sm"
          data-slot="file-manager-selection"
        >
          <span className="me-2 font-medium">
            {tt('selected', { count: selected.length }, ':count selected')}
          </span>
          {state.trash ? (
            <>
              {controller.can('restore') && (
                <ToolButton icon={RotateCcwIcon} onClick={() => void controller.restore()}>
                  {tt('restore', {}, 'Restore')}
                </ToolButton>
              )}
              {controller.can('delete') && (
                <ToolButton
                  icon={Trash2Icon}
                  onClick={() => controller.confirmDelete()}
                  destructive
                >
                  {tt('delete_permanently', {}, 'Delete permanently')}
                </ToolButton>
              )}
            </>
          ) : (
            <>
              {single && (
                <ToolButton
                  icon={single.type === 'folder' ? FolderOpenIcon : SearchIcon}
                  onClick={() => controller.openEntry(single)}
                >
                  {single.type === 'folder' ? tt('open', {}, 'Open') : tt('preview', {}, 'Preview')}
                </ToolButton>
              )}
              {controller.can('download') && (single?.type === 'file' || controller.can('zip')) && (
                <ToolButton icon={DownloadIcon} onClick={() => void controller.download()}>
                  {single?.type === 'file'
                    ? tt('download', {}, 'Download')
                    : tt('download_zip', {}, 'Download as zip')}
                </ToolButton>
              )}
              {single && controller.can('rename') && (
                <ToolButton
                  icon={PencilIcon}
                  onClick={() => controller.openDialog({ type: 'rename', entry: single })}
                >
                  {tt('rename', {}, 'Rename')}
                </ToolButton>
              )}
              {controller.can('move') && (
                <ToolButton
                  icon={FolderInputIcon}
                  onClick={() =>
                    controller.openDialog({
                      type: 'move',
                      paths: state.selection,
                      destination: state.path,
                    })
                  }
                >
                  {tt('move', {}, 'Move')}
                </ToolButton>
              )}
              {controller.can('copy') && (
                <ToolButton
                  icon={CopyIcon}
                  onClick={() =>
                    controller.openDialog({
                      type: 'copy',
                      paths: state.selection,
                      destination: state.path,
                    })
                  }
                >
                  {tt('copy', {}, 'Copy')}
                </ToolButton>
              )}
              {single?.type === 'file' && controller.can('share') && schema.share && (
                <ToolButton icon={Share2Icon} onClick={() => void controller.openShare(single)}>
                  {tt('share', {}, 'Share')}
                </ToolButton>
              )}
              <ToolButton icon={InfoIcon} onClick={() => void controller.showDetails(single)}>
                {tt('details', {}, 'Details')}
              </ToolButton>
              {controller.can('delete') && (
                <ToolButton
                  icon={Trash2Icon}
                  onClick={() => controller.confirmDelete()}
                  destructive
                >
                  {tt('delete', {}, 'Delete')}
                </ToolButton>
              )}
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ms-auto"
            onClick={() => controller.clearSelection()}
            aria-label={tt('clear_selection', {}, 'Clear selection')}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className={cn('flex', picker ? 'h-[60vh]' : 'min-h-[28rem]')}>
        <aside
          className="hidden w-60 shrink-0 overflow-y-auto border-e p-2 md:block"
          data-slot="file-manager-sidebar"
        >
          {tree}
        </aside>

        <div
          className="relative min-w-0 flex-1 overflow-y-auto"
          data-slot="file-manager-content"
          data-drop-target={state.dropTarget === '' ? '' : undefined}
          {...(canWrite ? dropHandlers('') : {})}
        >
          {state.trash && state.retentionDays && (
            <p className="text-muted-foreground border-b px-4 py-2 text-xs">
              {tt(
                'trash_hint',
                { days: state.retentionDays },
                'Items in the trash are deleted for good after :days days.',
              )}
            </p>
          )}
          {(state.truncated || state.resultsTruncated) && (
            <p className="text-muted-foreground border-b px-4 py-2 text-xs" role="note">
              {state.resultsTruncated
                ? tt(
                    'search_truncated',
                    {},
                    'Only the first results are shown. Refine your search.',
                  )
                : tt('truncated', {}, 'This folder has more items than can be shown here.')}
            </p>
          )}
          <p id={hintId} className="sr-only">
            {tt(
              'keyboard',
              {},
              'Arrow keys move between items, Shift selects a range, Enter opens.',
            )}
          </p>

          {(state.loading || state.searching) && entries.length === 0 ? (
            <div className="flex justify-center py-16">
              <Spinner />
              <span className="sr-only">{tt('loading', {}, 'Loading files')}</span>
            </div>
          ) : entries.length === 0 ? (
            <div
              className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center text-sm"
              data-slot="file-manager-empty"
            >
              <FolderOpenIcon className="size-10 opacity-40" aria-hidden="true" />
              <p className="text-foreground font-medium">
                {state.query
                  ? tt('no_results', {}, 'Nothing matches your search')
                  : state.trash
                    ? tt('empty_trash_state', {}, 'The trash is empty')
                    : tt('empty', {}, 'This folder is empty')}
              </p>
              {!state.query && canWrite && controller.can('upload') && (
                <p>{tt('empty_hint', {}, 'Drop files here or choose Upload.')}</p>
              )}
            </div>
          ) : (
            <div
              ref={listRef}
              role="listbox"
              aria-multiselectable={!picker || schema.multiple === true}
              aria-labelledby={labelId}
              aria-describedby={hintId}
              aria-busy={state.loading || undefined}
              data-slot="file-manager-items"
              className={cn(
                state.view === 'grid'
                  ? 'grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                  : 'flex flex-col p-1',
                state.loading && 'opacity-60',
              )}
            >
              {state.view === 'list' && (
                <div
                  className="text-muted-foreground hidden grid-cols-[1fr_7rem_10rem] gap-3 px-3 py-1.5 text-xs font-medium sm:grid"
                  aria-hidden="true"
                >
                  <span>{tt('name', {}, 'Name')}</span>
                  <span className="text-end">{tt('size', {}, 'Size')}</span>
                  <span>{tt('modified', {}, 'Modified')}</span>
                </div>
              )}
              {entries.map((entry) => (
                <EntryItem
                  key={entry.path}
                  entry={entry}
                  view={state.view}
                  selected={state.selection.includes(entry.path)}
                  focusable={entry.path === focusPath}
                  dropTarget={state.dropTarget === entry.path}
                  disabled={picker && entry.type === 'file' && entry.selectable === false}
                  draggable={canWrite && (controller.can('move') || controller.can('copy'))}
                  showLocation={state.results !== null}
                  formatter={formatter}
                  tt={tt}
                  ref={(element) => {
                    if (element) items.current.set(entry.path, element)
                    else items.current.delete(entry.path)
                  }}
                  onPointerDown={(event) => (pointer.current = event.pointerType)}
                  onClick={(event) => onItemClick(entry, event)}
                  onDoubleClick={() => onItemDoubleClick(entry)}
                  onKeyDown={onItemKeyDown}
                  onFocus={() => controller.focus(entry.path)}
                  onDragStart={(event) => controller.dragStart(entry.path, event.dataTransfer)}
                  onDragEnd={() => controller.dragEnd()}
                  dropHandlers={
                    entry.type === 'folder' && canWrite ? dropHandlers(entry.path) : undefined
                  }
                />
              ))}
            </div>
          )}

          {state.dropTarget === '' && (
            <div
              className="border-primary bg-primary/5 text-primary pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed text-sm font-medium"
              data-slot="file-manager-drop"
            >
              {tt('drop_here', { folder: folderLabel }, 'Drop files to upload them to :folder')}
            </div>
          )}
        </div>

        {state.detailsOpen && (
          <aside
            className="hidden w-72 shrink-0 overflow-y-auto border-s md:block"
            data-slot="file-manager-details"
          >
            <Details controller={controller} tt={tt} formatter={formatter} />
          </aside>
        )}
      </div>

      {state.trash && entries.length > 0 && controller.can('delete') && (
        <div className="flex justify-end border-t p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => controller.openDialog({ type: 'emptyTrash' })}
          >
            <Trash2Icon aria-hidden="true" />
            {tt('empty_trash', {}, 'Empty trash')}
          </Button>
        </div>
      )}

      {picker && (
        <div
          className="flex flex-wrap items-center justify-end gap-2 border-t p-3"
          data-slot="file-manager-picker-footer"
        >
          <span className="text-muted-foreground me-auto text-sm">
            {selected.length > 0
              ? tt('selected', { count: controller.chosen().length }, ':count selected')
              : ''}
          </span>
          <Button type="button" variant="outline" onClick={onCancel}>
            {tt('cancel', {}, 'Cancel')}
          </Button>
          <Button
            type="button"
            disabled={controller.chosen().length === 0}
            onClick={() => onChoose?.(controller.chosen())}
          >
            <CheckIcon aria-hidden="true" />
            {tt('picker_choose', {}, 'Choose')}
          </Button>
        </div>
      )}

      <Sheet open={foldersOpen} onOpenChange={setFoldersOpen}>
        <SheetContent side={direction === 'rtl' ? 'right' : 'left'} className="p-4">
          <SheetHeader className="p-0">
            <SheetTitle>{tt('folders', {}, 'Folders')}</SheetTitle>
          </SheetHeader>
          {tree}
        </SheetContent>
      </Sheet>

      <Sheet
        open={state.detailsOpen && mobile}
        onOpenChange={(open) => !open && controller.closeDetails()}
      >
        <SheetContent side={direction === 'rtl' ? 'left' : 'right'} className="p-0">
          <SheetHeader>
            <SheetTitle>{tt('details', {}, 'Details')}</SheetTitle>
          </SheetHeader>
          <Details controller={controller} tt={tt} formatter={formatter} hideHeading />
        </SheetContent>
      </Sheet>

      <Uploads controller={controller} tt={tt} />
      <Dialogs controller={controller} tt={tt} choice={choice} formatter={formatter} />
      <Preview controller={controller} tt={tt} direction={direction} />
    </Card>
  )
}

type Translate = (
  key: string,
  replacements?: Record<string, string | number>,
  fallback?: string,
) => string

function Crumb({
  children,
  current,
  onClick,
}: {
  children: ReactNode
  current?: boolean
  onClick?: () => void
}) {
  return (
    <li className="flex min-w-0 items-center gap-1">
      <ChevronRightIcon
        className="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
        aria-hidden="true"
      />
      {current || !onClick ? (
        <span className="truncate px-1.5 py-1 font-medium" aria-current="page">
          {children}
        </span>
      ) : (
        <button
          type="button"
          className="hover:bg-accent truncate rounded px-1.5 py-1"
          onClick={onClick}
        >
          {children}
        </button>
      )}
    </li>
  )
}

function ToolButton({
  icon: IconComponent,
  children,
  onClick,
  destructive,
}: {
  icon: LucideIcon
  children: ReactNode
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(destructive && 'text-destructive hover:text-destructive')}
    >
      <IconComponent aria-hidden="true" />
      <span className="max-md:sr-only">{children}</span>
    </Button>
  )
}

interface DropHandlers {
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDragLeave: (event: DragEvent<HTMLElement>) => void
  onDrop: (event: DragEvent<HTMLElement>) => void
}

function EntryIcon({ entry, className }: { entry: FileManagerEntrySchema; className?: string }) {
  const IconComponent = KIND_ICONS[entry.kind] ?? FileIcon

  return (
    <IconComponent
      className={cn(entry.type === 'folder' && 'text-primary', className)}
      aria-hidden="true"
    />
  )
}

function EntryItem({
  entry,
  view,
  selected,
  focusable,
  dropTarget,
  disabled,
  draggable,
  showLocation,
  formatter,
  tt,
  ref,
  dropHandlers,
  ...handlers
}: {
  entry: FileManagerEntrySchema
  view: 'grid' | 'list'
  selected: boolean
  focusable: boolean
  dropTarget: boolean
  disabled: boolean
  draggable: boolean
  showLocation: boolean
  formatter: ReturnType<typeof useFormatter>
  tt: Translate
  ref: (element: HTMLDivElement | null) => void
  dropHandlers?: DropHandlers
  onPointerDown: (event: PointerEvent<HTMLElement>) => void
  onClick: (event: MouseEvent<HTMLElement>) => void
  onDoubleClick: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onFocus: () => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onDragEnd: () => void
}) {
  const [broken, setBroken] = useState(false)
  const size = entry.type === 'file' ? fileManagerSize(entry.size, formatter) : ''
  const modified = entry.modified ? formatter.dateTime(entry.modified) : ''
  const location =
    showLocation && entry.path.includes('/')
      ? entry.path.slice(0, entry.path.lastIndexOf('/'))
      : null
  const thumbnail = entry.thumbnail && !broken ? entry.thumbnail : null

  return (
    <div
      ref={ref}
      role="option"
      aria-label={entry.name}
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={focusable ? 0 : -1}
      draggable={draggable}
      data-slot="file-manager-item"
      data-type={entry.type}
      data-kind={entry.kind}
      data-selected={selected ? '' : undefined}
      data-drop-target={dropTarget ? '' : undefined}
      title={entry.name}
      className={cn(
        'group focus-visible:ring-ring/50 relative cursor-default rounded-lg outline-none select-none focus-visible:ring-[3px]',
        view === 'grid'
          ? 'hover:bg-accent/50 flex flex-col gap-2 border p-2'
          : 'hover:bg-accent/50 grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2 sm:grid-cols-[auto_1fr_7rem_10rem]',
        selected && 'bg-primary/10 border-primary/40 hover:bg-primary/15',
        dropTarget && 'ring-primary ring-2',
        disabled && 'opacity-50',
      )}
      {...handlers}
      {...dropHandlers}
    >
      {view === 'grid' ? (
        <>
          <div className="bg-muted/60 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                draggable={false}
                className="size-full object-cover"
                onError={() => setBroken(true)}
              />
            ) : (
              <EntryIcon entry={entry} className="size-10" />
            )}
          </div>
          <div className="min-w-0 px-0.5">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {location ?? (entry.type === 'folder' ? tt(`kinds.folder`, {}, 'Folder') : size)}
            </p>
          </div>
        </>
      ) : (
        <>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              draggable={false}
              className="size-8 rounded object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <EntryIcon entry={entry} className="size-5" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            {location && <p className="text-muted-foreground truncate text-xs">{location}</p>}
          </div>
          <span className="text-muted-foreground hidden text-end text-sm tabular-nums sm:block">
            {size}
          </span>
          <span className="text-muted-foreground hidden truncate text-sm sm:block">{modified}</span>
        </>
      )}
      {selected && (
        <CheckIcon
          className="bg-primary text-primary-foreground absolute end-1.5 top-1.5 size-4 rounded-full p-0.5"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

function FolderTree({
  controller,
  onOpen,
  active,
  dropHandlers,
  dropTarget,
}: {
  controller: FileManagerController
  onOpen: (path: string) => void
  active: string | null
  dropHandlers?: (target: string) => DropHandlers
  dropTarget?: string | null
}) {
  const t = useT()
  useStore(controller.store)

  const renderLevel = (parent: string, level: number): ReactNode => {
    const folders = controller.children(parent)

    if (!folders || folders.length === 0) return null

    return (
      <ul className="flex flex-col" role={level === 1 ? undefined : 'group'}>
        {folders.map((folder) => {
          const expanded = controller.isExpanded(folder.path)

          return (
            <li key={folder.path} data-slot="file-manager-tree-item">
              <div
                className={cn(
                  'hover:bg-accent flex items-center gap-1 rounded-md pe-2 text-sm',
                  active === folder.path && 'bg-accent font-medium',
                  dropTarget === folder.path && 'ring-primary ring-2',
                )}
                style={{ paddingInlineStart: `${(level - 1) * 0.75}rem` }}
                {...(dropHandlers ? dropHandlers(folder.path) : {})}
              >
                {folder.hasChildren ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground rounded p-1"
                    aria-expanded={expanded}
                    aria-label={t(
                      expanded ? 'file-manager.collapse' : 'file-manager.expand',
                      { name: folder.name },
                      expanded ? 'Collapse :name' : 'Expand :name',
                    )}
                    onClick={() => void controller.toggleFolder(folder.path)}
                  >
                    <ChevronRightIcon
                      className={cn(
                        'size-3.5 transition-transform',
                        expanded ? 'rotate-90' : 'rtl:rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <span className="w-5.5 shrink-0" aria-hidden="true" />
                )}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-start"
                  aria-current={active === folder.path ? 'page' : undefined}
                  onClick={() => onOpen(folder.path)}
                >
                  <FolderIcon className="text-primary size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{folder.name}</span>
                </button>
              </div>
              {expanded && renderLevel(folder.path, level + 1)}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <nav aria-label={t('file-manager.folders', {}, 'Folders')} data-slot="file-manager-tree">
      <button
        type="button"
        className={cn(
          'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm',
          active === '' && 'bg-accent font-medium',
          dropTarget === '' && active !== '' && 'ring-primary ring-2',
        )}
        aria-current={active === '' ? 'page' : undefined}
        onClick={() => onOpen('')}
      >
        <FolderOpenIcon className="text-primary size-4" aria-hidden="true" />
        {t('file-manager.root', {}, 'Files')}
      </button>
      {renderLevel('', 1)}
    </nav>
  )
}

function Details({
  controller,
  tt,
  formatter,
  hideHeading,
}: {
  controller: FileManagerController
  tt: Translate
  formatter: ReturnType<typeof useFormatter>
  hideHeading?: boolean
}) {
  const state = useStore(controller.store)
  const details = state.details

  return (
    <div className="flex flex-col gap-4 p-4">
      {!hideHeading && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{tt('details', {}, 'Details')}</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => controller.closeDetails()}
            aria-label={tt('close', {}, 'Close')}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      )}
      {!details ? (
        <p className="text-muted-foreground text-sm">{tt('picker_empty', {}, 'No file chosen')}</p>
      ) : (
        <>
          <div className="bg-muted/60 flex aspect-video items-center justify-center overflow-hidden rounded-md">
            {details.thumbnail ? (
              <img src={details.thumbnail} alt="" className="size-full object-contain" />
            ) : (
              <EntryIcon entry={details} className="size-12" />
            )}
          </div>
          <p className="font-medium break-all">{details.name}</p>
          {state.detailsLoading && <Spinner />}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <DetailRow
              label={tt('type', {}, 'Type')}
              value={details.mime ?? tt(`kinds.${details.kind}`, {}, details.kind)}
            />
            {details.type === 'file' && (
              <DetailRow
                label={tt('size', {}, 'Size')}
                value={fileManagerSize(details.size, formatter)}
              />
            )}
            {details.items !== undefined && (
              <DetailRow
                label={tt('items', {}, 'Items')}
                value={`${formatter.number(details.items)}${details.itemsTruncated ? '+' : ''}`}
              />
            )}
            {details.width && details.height && (
              <DetailRow
                label={tt('dimensions', {}, 'Dimensions')}
                value={tt(
                  'dimensions_value',
                  {
                    width: formatter.number(details.width),
                    height: formatter.number(details.height),
                  },
                  ':width × :height px',
                )}
              />
            )}
            {details.trashed ? (
              <>
                <DetailRow
                  label={tt('original_location', {}, 'Original location')}
                  value={details.trashed.originalPath}
                />
                {details.trashed.deletedAt && (
                  <DetailRow
                    label={tt('deleted_at', {}, 'Deleted')}
                    value={formatter.dateTime(details.trashed.deletedAt)}
                  />
                )}
              </>
            ) : (
              <>
                {details.modified && (
                  <DetailRow
                    label={tt('modified', {}, 'Modified')}
                    value={formatter.dateTime(details.modified)}
                  />
                )}
                {details.location !== undefined && (
                  <DetailRow
                    label={tt('location', {}, 'Location')}
                    value={details.location === '' ? tt('root', {}, 'Files') : details.location}
                  />
                )}
                {details.links !== undefined && (
                  <DetailRow
                    label={tt('links', {}, 'Links')}
                    value={formatter.number(details.links)}
                  />
                )}
              </>
            )}
          </dl>
        </>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all">{value}</dd>
    </>
  )
}

function Uploads({ controller, tt }: { controller: FileManagerController; tt: Translate }) {
  const state = useStore(controller.store)
  const formatter = useFormatter()

  if (state.uploads.length === 0) return null

  const done = state.uploads.filter((upload) => upload.status === 'done').length
  const finished = state.uploads.every(
    (upload) => upload.status === 'done' || upload.status === 'error',
  )

  return (
    <section
      className="bg-popover fixed end-4 bottom-4 z-40 flex max-h-80 w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border shadow-lg"
      aria-label={tt('uploads', {}, 'Uploads')}
      data-slot="file-manager-uploads"
    >
      <header className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
        <UploadIcon className="size-4" aria-hidden="true" />
        <span className="flex-1" role="status">
          {tt('uploads_summary', { done, total: state.uploads.length }, ':done of :total uploaded')}
        </span>
        {finished && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => controller.clearUploads()}
            aria-label={tt('dismiss', {}, 'Dismiss')}
          >
            <XIcon aria-hidden="true" />
          </Button>
        )}
      </header>
      <ul className="flex flex-col gap-2 overflow-y-auto p-3">
        {state.uploads.map((upload) => (
          <li key={upload.id} className="flex flex-col gap-1 text-sm" data-status={upload.status}>
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{upload.name}</span>
              {upload.status === 'done' ? (
                <CheckIcon
                  className="size-4 text-emerald-600"
                  aria-label={tt('upload_done', {}, 'Uploaded')}
                />
              ) : upload.status === 'error' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => controller.dismissUpload(upload.id)}
                  aria-label={tt('dismiss', {}, 'Dismiss')}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              ) : (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatter.percent(upload.progress)}
                </span>
              )}
            </div>
            {upload.status === 'error' ? (
              <p className="text-destructive text-xs" role="alert">
                {upload.error ?? tt('upload_failed', {}, 'Failed')}
              </p>
            ) : (
              upload.status !== 'done' && (
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(upload.progress * 100)}
                  aria-label={tt(
                    'upload_progress',
                    { name: upload.name, percent: formatter.percent(upload.progress) },
                    ':name, :percent uploaded',
                  )}
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                >
                  <div
                    className="bg-primary h-full rounded-full transition-[width]"
                    style={{ width: `${upload.progress * 100}%` }}
                  />
                </div>
              )
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Dialogs({
  controller,
  tt,
  choice,
  formatter,
}: {
  controller: FileManagerController
  tt: Translate
  choice: ReturnType<typeof useChoice>
  formatter: ReturnType<typeof useFormatter>
}) {
  const state = useStore(controller.store)
  const dialog = state.dialog
  const [name, setName] = useState('')
  const [expiry, setExpiry] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const nameId = useId()
  const errorId = useId()
  const close = () => controller.closeDialog()
  const share = controller.component.share

  // Reset the inputs when another dialog opens (state derived during render, no effect).
  const dialogKey = dialog ? `${dialog.type}:${'entry' in dialog ? dialog.entry.path : ''}` : ''
  const [openedDialog, setOpenedDialog] = useState('')

  if (dialogKey !== openedDialog) {
    setOpenedDialog(dialogKey)

    if (dialog?.type === 'rename') setName(dialog.entry.name)
    if (dialog?.type === 'createFolder') setName('')
    if (dialog?.type === 'share') {
      setExpiry(String(share?.expiries[0] ?? ''))
      setCopied(false)
    }
  }

  const error = state.error ? (
    <p id={errorId} className="text-destructive text-sm" role="alert">
      {state.error}
    </p>
  ) : null

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <Dialog
        open={dialog?.type === 'createFolder' || dialog?.type === 'rename'}
        onOpenChange={(open) => !open && close()}
      >
        {/* The title and the labelled field say it all: no description. */}
        <DialogContent data-slot="file-manager-dialog" aria-describedby={undefined}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()

              if (dialog?.type === 'rename') void controller.rename(dialog.entry.path, name)
              else void controller.createFolder(name)
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog?.type === 'rename'
                  ? tt('rename_heading', { name: dialog.entry.name }, 'Rename “:name”')
                  : tt('new_folder', {}, 'New folder')}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <label htmlFor={nameId} className="text-sm font-medium">
                {dialog?.type === 'rename'
                  ? tt('name', {}, 'Name')
                  : tt('folder_name', {}, 'Folder name')}
              </label>
              <Input
                id={nameId}
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                aria-invalid={state.error ? true : undefined}
                aria-describedby={state.error ? errorId : undefined}
              />
              {error}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                {tt('cancel', {}, 'Cancel')}
              </Button>
              <Button type="submit" disabled={state.busy || name.trim() === ''}>
                {state.busy && <Spinner />}
                {dialog?.type === 'rename' ? tt('save', {}, 'Save') : tt('create', {}, 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === 'move' || dialog?.type === 'copy'}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent data-slot="file-manager-dialog">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === 'move' || dialog?.type === 'copy'
                ? choice(
                    `file-manager.${dialog.type}_heading`,
                    dialog.paths.length,
                    {},
                    dialog.type === 'move' ? 'Move :count items' : 'Copy :count items',
                  )
                : ''}
            </DialogTitle>
            <DialogDescription>{tt('destination', {}, 'Destination folder')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-md border p-2">
            {(dialog?.type === 'move' || dialog?.type === 'copy') && (
              <FolderTree
                controller={controller}
                active={dialog.destination}
                onOpen={(path) => controller.openDialog({ ...dialog, destination: path })}
              />
            )}
          </div>
          {error}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {tt('cancel', {}, 'Cancel')}
            </Button>
            <Button
              type="button"
              disabled={state.busy}
              onClick={() => {
                if (dialog?.type === 'move' || dialog?.type === 'copy')
                  void controller.transfer(dialog.type, dialog.paths, dialog.destination)
              }}
            >
              {state.busy && <Spinner />}
              {dialog?.type === 'copy'
                ? tt('copy_here', {}, 'Copy here')
                : tt('move_here', {}, 'Move here')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog?.type === 'delete' || dialog?.type === 'emptyTrash'}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent data-slot="file-manager-dialog">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === 'delete'
                ? choice(
                    'file-manager.delete_heading',
                    dialog.paths.length,
                    {},
                    'Delete :count items?',
                  )
                : tt('empty_trash_heading', {}, 'Empty the trash?')}
            </DialogTitle>
            <DialogDescription>
              {dialog?.type === 'delete' && !dialog.permanent
                ? tt(
                    'delete_description_trash',
                    {},
                    'They go to the trash, where you can restore them.',
                  )
                : dialog?.type === 'emptyTrash'
                  ? tt(
                      'empty_trash_description',
                      {},
                      'Everything in the trash is deleted for good.',
                    )
                  : tt(
                      'delete_description',
                      {},
                      'They are deleted for good. This cannot be undone.',
                    )}
            </DialogDescription>
          </DialogHeader>
          {error}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {tt('cancel', {}, 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={state.busy}
              onClick={() => {
                if (dialog?.type === 'delete') void controller.remove(dialog.paths)
                else void controller.emptyTrash()
              }}
            >
              {state.busy && <Spinner />}
              {dialog?.type === 'emptyTrash'
                ? tt('empty_trash', {}, 'Empty trash')
                : dialog?.type === 'delete' && dialog.permanent
                  ? tt('delete_permanently', {}, 'Delete permanently')
                  : tt('delete', {}, 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.type === 'share'} onOpenChange={(open) => !open && close()}>
        <DialogContent data-slot="file-manager-dialog">
          {dialog?.type === 'share' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {tt('share_heading', { name: dialog.entry.name }, 'Share “:name”')}
                </DialogTitle>
                <DialogDescription>
                  {tt(
                    'share_hint',
                    {},
                    'Anyone with the link can open this file, without signing in.',
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
                  <span className="font-medium">
                    {tt('share_expiry', {}, 'Link expires after')}
                  </span>
                  <select
                    className={SELECT}
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                  >
                    {(share?.expiries ?? []).map((minutes) => {
                      const label = fileManagerExpiry(minutes)

                      return (
                        <option key={minutes} value={minutes}>
                          {choice(`file-manager.${label.key}`, label.count, {}, `:count`)}
                        </option>
                      )
                    })}
                    {share?.publicLinks && (
                      <option value="never">{tt('expiry_never', {}, 'Never')}</option>
                    )}
                  </select>
                </label>
                <Button
                  type="button"
                  disabled={state.busy}
                  onClick={() =>
                    void controller.createLink(expiry === 'never' ? null : Number(expiry))
                  }
                >
                  {state.busy ? <Spinner /> : <LinkIcon aria-hidden="true" />}
                  {tt('create_link', {}, 'Create link')}
                </Button>
              </div>
              {error}
              {dialog.url && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{tt('link', {}, 'Shareable link')}</span>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={dialog.url}
                      dir="ltr"
                      onFocus={(event) => event.target.select()}
                      aria-label={tt('link', {}, 'Shareable link')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void copy(dialog.url ?? '')}
                    >
                      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                      {copied
                        ? tt('link_copied', {}, 'Link copied')
                        : tt('copy_link', {}, 'Copy link')}
                    </Button>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {dialog.expiresAt
                      ? tt(
                          'link_expires',
                          { date: formatter.dateTime(dialog.expiresAt) },
                          'Expires :date',
                        )
                      : tt('link_never_expires', {}, 'Never expires')}
                  </span>
                </div>
              )}
              {share?.publicLinks && (
                <div className="flex flex-col gap-2" data-slot="file-manager-links">
                  <h4 className="text-sm font-medium">{tt('links', {}, 'Links')}</h4>
                  {dialog.links === null ? (
                    <Spinner />
                  ) : dialog.links.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {tt('no_links', {}, 'No links yet')}
                    </p>
                  ) : (
                    <ul className="flex max-h-48 flex-col divide-y overflow-y-auto rounded-md border">
                      {dialog.links.map((link) => (
                        <li key={link.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'truncate',
                                link.expired && 'text-muted-foreground line-through',
                              )}
                              dir="ltr"
                            >
                              {link.url}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {link.expired
                                ? tt('link_expired', {}, 'Expired')
                                : link.expiresAt
                                  ? tt(
                                      'link_expires',
                                      { date: formatter.dateTime(link.expiresAt) },
                                      'Expires :date',
                                    )
                                  : tt('link_never_expires', {}, 'Never expires')}
                              {' · '}
                              {choice(
                                'file-manager.link_downloads',
                                link.downloads,
                                {},
                                ':count downloads',
                              )}
                            </p>
                          </div>
                          {link.url && !link.expired && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => void copy(link.url ?? '')}
                              aria-label={tt('copy_link', {}, 'Copy link')}
                            >
                              <CopyIcon aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => void controller.revokeLink(link.id)}
                          >
                            {tt('revoke', {}, 'Revoke')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  {tt('close', {}, 'Close')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Preview({
  controller,
  tt,
  direction,
}: {
  controller: FileManagerController
  tt: Translate
  direction: 'ltr' | 'rtl'
}) {
  const state = useStore(controller.store)
  const preview = state.preview
  const data = preview?.data
  const [editing, setEditing] = useState<ImageEditRequest | null>(null)
  const previous = controller.previewSibling(-1)
  const next = controller.previewSibling(1)

  const edit = async () => {
    if (!data?.url || !preview) return

    const source = await fetchEditableImage(data.url, preview.entry.name)

    if (!source) return

    setEditing({
      file: source,
      resolve: (edited) => {
        setEditing(null)
        if (edited && edited !== source) void controller.saveEditedImage(edited)
      },
    })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const back = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'

    if (
      event.target instanceof HTMLElement &&
      ['VIDEO', 'AUDIO', 'INPUT'].includes(event.target.tagName)
    )
      return

    if (event.key === back && previous) void controller.openPreview(previous)
    if (event.key === forward && next) void controller.openPreview(next)
  }

  return (
    <>
      <Dialog open={preview !== null} onOpenChange={(open) => !open && controller.closePreview()}>
        <DialogContent
          className="flex max-h-[90vh] flex-col sm:max-w-4xl"
          data-slot="file-manager-preview"
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
        >
          <DialogHeader>
            <DialogTitle className="truncate pe-8">{preview?.entry.name}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/40 flex min-h-64 flex-1 items-center justify-center overflow-auto rounded-md">
            {!data ? (
              <Spinner />
            ) : !data.previewable ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm">
                {preview && <EntryIcon entry={preview.entry} className="size-12" />}
                <p>{tt('preview_unavailable', {}, 'There is no preview for this type of file.')}</p>
              </div>
            ) : data.kind === 'image' ? (
              <img
                src={data.url}
                alt={preview?.entry.name ?? ''}
                className="max-h-[70vh] max-w-full object-contain"
              />
            ) : data.kind === 'pdf' ? (
              <iframe
                src={data.url}
                title={preview?.entry.name ?? ''}
                className="h-[70vh] w-full rounded-md bg-white"
              />
            ) : data.kind === 'video' ? (
              <video src={data.url} controls className="max-h-[70vh] max-w-full">
                <track kind="captions" />
              </video>
            ) : data.kind === 'audio' ? (
              <audio src={data.url} controls className="w-full max-w-md" />
            ) : (
              <pre
                className="h-full max-h-[70vh] w-full overflow-auto p-4 font-mono text-xs whitespace-pre-wrap"
                dir="auto"
                tabIndex={0}
              >
                {data.text}
              </pre>
            )}
          </div>
          {data?.truncated && (
            <p className="text-muted-foreground text-xs">
              {tt('preview_truncated', {}, 'Only the beginning of this file is shown.')}
            </p>
          )}
          <DialogFooter className="flex-row flex-wrap items-center sm:justify-between">
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!previous}
                onClick={() => previous && void controller.openPreview(previous)}
                aria-label={tt('previous', {}, 'Previous file')}
              >
                <ChevronLeftIcon className="rtl:rotate-180" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!next}
                onClick={() => next && void controller.openPreview(next)}
                aria-label={tt('next', {}, 'Next file')}
              >
                <ChevronRightIcon className="rtl:rotate-180" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex gap-2">
              {data?.editable && data.url && (
                <Button type="button" variant="outline" size="sm" onClick={() => void edit()}>
                  <SquarePenIcon aria-hidden="true" />
                  {tt('edit_image', {}, 'Edit image')}
                </Button>
              )}
              {data?.downloadUrl && (
                <Button type="button" size="sm" asChild>
                  <a href={data.downloadUrl}>
                    <DownloadIcon aria-hidden="true" />
                    {tt('download', {}, 'Download')}
                  </a>
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ImageEditorDialog request={editing} options={IMAGE_EDITOR} />
    </>
  )
}
