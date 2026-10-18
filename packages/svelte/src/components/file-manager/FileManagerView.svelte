<script lang="ts">
  import type {
    FileManagerEntrySchema,
    FileManagerEnvironment,
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
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import CheckIcon from '@lucide/svelte/icons/check'
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
  import CopyIcon from '@lucide/svelte/icons/copy'
  import DownloadIcon from '@lucide/svelte/icons/download'
  import FolderInputIcon from '@lucide/svelte/icons/folder-input'
  import FolderOpenIcon from '@lucide/svelte/icons/folder-open'
  import FolderPlusIcon from '@lucide/svelte/icons/folder-plus'
  import FolderTreeIcon from '@lucide/svelte/icons/folder-tree'
  import InfoIcon from '@lucide/svelte/icons/info'
  import LayoutGridIcon from '@lucide/svelte/icons/layout-grid'
  import LinkIcon from '@lucide/svelte/icons/link'
  import ListIcon from '@lucide/svelte/icons/list'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
  import SearchIcon from '@lucide/svelte/icons/search'
  import Share2Icon from '@lucide/svelte/icons/share-2'
  import SquarePenIcon from '@lucide/svelte/icons/square-pen'
  import Trash2Icon from '@lucide/svelte/icons/trash-2'
  import UploadIcon from '@lucide/svelte/icons/upload'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, onMount, tick, untrack } from 'svelte'
  import {
    useActionRunner,
    useChoice,
    useDirection,
    useFormatter,
    usePanel,
    useT,
  } from '../../context.svelte'
  import { useIsMobile } from '../../hooks/mobile.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import { usePageActionContext } from '../actions/action-context'
  import ImageEditorDialog, { type ImageEditRequest } from '../fields/ImageEditorDialog.svelte'
  import { showToast } from '../notifications/toast'
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
  import FileManagerDetails from './FileManagerDetails.svelte'
  import FileManagerIcon from './FileManagerIcon.svelte'
  import FileManagerTree from './FileManagerTree.svelte'

  /**
   * The file manager of alfasix/alfakit-file-manager: a folder tree, breadcrumbs, grid and
   * list views, sorting, search, multi-selection with mouse and keyboard, drag and drop
   * (uploads and moves), uploads with progress, previews, details, sharing and the trash.
   * Everything is listed, checked and changed by the server.
   */
  let {
    schema,
    onChoose,
    onCancel,
  }: {
    schema: FileManagerSchema
    /** Picker: called with the chosen files. */
    onChoose?: (entries: FileManagerEntrySchema[]) => void
    onCancel?: () => void
  } = $props()

  const SELECT =
    'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'
  const SORT_FIELDS: FileManagerSortField[] = ['name', 'size', 'modified', 'type']
  const IMAGE_EDITOR = { aspectRatios: [null], circle: false }

  const runner = useActionRunner()
  const page = usePageActionContext()
  const panel = usePanel()
  const t = useT()
  const choice = useChoice()
  const direction = $derived(useDirection())
  const formatter = useFormatter()
  const mobile = useIsMobile()
  const labelId = $props.id()
  const hintId = `${labelId}-hint`
  const nameId = `${labelId}-name`
  const errorId = `${labelId}-error`
  const tt = (key: string, replacements: Record<string, string | number> = {}, fallback?: string) =>
    t(`file-manager.${key}`, replacements, fallback)

  const environment = (): FileManagerEnvironment => ({
    runner,
    token: page.token,
    uploadEndpoint: panel.endpoints.upload,
    uploadChunkEndpoint: panel.endpoints.uploadChunks,
    uploadChunkSize: panel.uploadChunkSize,
    t,
    choice,
    formatter: formatter.current,
    notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
    error: (message) => showToast(clientErrorNotification('file-manager', message)),
  })

  const controller = new FileManagerController(
    untrack(() => $state.snapshot(schema) as FileManagerSchema),
    environment(),
    formatter.current.locale,
  )
  const store = useStore(controller.store)
  const ui = $derived(store.current)

  let first = true

  $effect(() => {
    const next = $state.snapshot(schema) as FileManagerSchema

    if (first) {
      first = false

      return
    }

    untrack(() => controller.setSchema(next))
  })

  $effect(() => {
    void formatter.current
    untrack(() => controller.setEnvironment(environment()))
  })

  onMount(() => {
    if (schema.mode === 'picker') void controller.ensureLoaded()
  })
  onDestroy(() => controller.dispose())

  const picker = $derived(schema.mode === 'picker')
  const entries = $derived.by(() => {
    void ui

    return controller.visibleEntries()
  })
  const selected = $derived.by(() => {
    void ui

    return controller.selectedEntries()
  })
  const chosen = $derived.by(() => {
    void ui

    return controller.chosen()
  })
  const single = $derived(selected.length === 1 ? selected[0] : undefined)
  const canWrite = $derived(!picker && !ui.trash)
  const focusPath = $derived(ui.focus ?? entries[0]?.path ?? null)
  const folderLabel = $derived(
    ui.trash
      ? tt('trash', {}, 'Trash')
      : (ui.breadcrumbs[ui.breadcrumbs.length - 1]?.name ?? tt('root', {}, 'Files')),
  )
  const can = (ability: Parameters<FileManagerController['can']>[0]) => controller.can(ability)

  let listElement: HTMLElement | null = $state(null)
  const items: Record<string, HTMLElement> = {}
  let uploadInput: HTMLInputElement | null = $state(null)
  let foldersOpen = $state(false)
  let pointer = 'mouse'
  let broken = $state<string[]>([])

  const register = (element: HTMLElement, path: string) => {
    items[path] = element

    return {
      destroy: () => {
        if (items[path] === element) delete items[path]
      },
    }
  }

  const focusItem = async (path: string | undefined) => {
    if (!path) return
    await tick()
    items[path]?.focus()
  }

  const columns = () => {
    if (!listElement || ui.view !== 'grid' || typeof getComputedStyle === 'undefined') return 1

    return Math.max(
      1,
      getComputedStyle(listElement).gridTemplateColumns.split(' ').filter(Boolean).length,
    )
  }

  const onItemKeyDown = (event: KeyboardEvent) => {
    const result = controller.handleKey(event, columns(), direction)

    if (result.handled) {
      event.preventDefault()
      void focusItem(result.focus)
    }
  }

  const onItemClick = (entry: FileManagerEntrySchema, event: MouseEvent) =>
    controller.click(entry.path, {
      shift: event.shiftKey,
      toggle: event.metaKey || event.ctrlKey,
      touch: pointer === 'touch',
    })

  const onItemDoubleClick = (entry: FileManagerEntrySchema) => {
    if (picker && entry.type === 'file') {
      if (entry.selectable !== false && entry.value) onChoose?.([entry])

      return
    }

    controller.openEntry(entry)
  }

  const copying = (event: DragEvent) => event.ctrlKey || event.altKey || event.metaKey

  const dropHandlers = (target: string) => ({
    ondragover: (event: DragEvent) => {
      if (event.dataTransfer && controller.dragOver(target, event.dataTransfer, copying(event))) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    ondragleave: (event: DragEvent) => {
      const current = event.currentTarget as HTMLElement | null

      if (!current?.contains(event.relatedTarget as Node | null)) controller.dragLeave(target)
    },
    ondrop: (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (event.dataTransfer) void controller.drop(target, event.dataTransfer, copying(event))
    },
  })

  const openTreeFolder = (path: string) => {
    foldersOpen = false
    void controller.open(path)
  }

  const onUpload = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement

    if (input.files) void controller.upload(Array.from(input.files))
    input.value = ''
  }

  const sizeOf = (entry: FileManagerEntrySchema) =>
    entry.type === 'file' ? fileManagerSize(entry.size, formatter.current) : ''
  const locationOf = (entry: FileManagerEntrySchema) =>
    ui.results !== null && entry.path.includes('/')
      ? entry.path.slice(0, entry.path.lastIndexOf('/'))
      : null
  const thumbnailOf = (entry: FileManagerEntrySchema) =>
    entry.thumbnail && !broken.includes(entry.path) ? entry.thumbnail : null

  // ---------------------------------------------------------------- Uploads

  const uploadsDone = $derived(ui.uploads.filter((upload) => upload.status === 'done').length)
  const uploadsFinished = $derived(
    ui.uploads.every((upload) => upload.status === 'done' || upload.status === 'error'),
  )

  // ---------------------------------------------------------------- Dialogs

  const dialog = $derived(ui.dialog)
  const share = $derived(schema.share)
  let name = $state('')
  let expiry = $state('')
  let copied = $state(false)
  let lastDialog = ''

  $effect(() => {
    const current = dialog
    const signature = current
      ? `${current.type}:${'entry' in current ? current.entry.path : ''}`
      : ''

    if (signature === lastDialog) return

    lastDialog = signature

    untrack(() => {
      if (current?.type === 'rename') name = current.entry.name
      if (current?.type === 'createFolder') name = ''
      if (current?.type === 'share') {
        expiry = String(share?.expiries[0] ?? '')
        copied = false
      }
    })
  })

  const close = () => controller.closeDialog()
  const onDialogOpen = (open: boolean) => {
    if (!open) close()
  }

  const submitName = (event: SubmitEvent) => {
    event.preventDefault()

    if (dialog?.type === 'rename') void controller.rename(dialog.entry.path, name)
    else void controller.createFolder(name)
  }

  const submitTransfer = () => {
    if (dialog?.type === 'move' || dialog?.type === 'copy')
      void controller.transfer(dialog.type, dialog.paths, dialog.destination)
  }

  const chooseDestination = (path: string) => {
    if (dialog?.type === 'move' || dialog?.type === 'copy')
      controller.openDialog({ ...dialog, destination: path })
  }

  const submitDelete = () => {
    if (dialog?.type === 'delete') void controller.remove(dialog.paths)
    else void controller.emptyTrash()
  }

  const expiryLabel = (minutes: number) => {
    const label = fileManagerExpiry(minutes)

    return choice(`file-manager.${label.key}`, label.count, {}, ':count')
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      copied = false
    }
  }

  // ---------------------------------------------------------------- Preview

  const preview = $derived(ui.preview)
  const previewData = $derived(preview?.data ?? null)
  const previous = $derived.by(() => {
    void ui.preview

    return controller.previewSibling(-1)
  })
  const next = $derived.by(() => {
    void ui.preview

    return controller.previewSibling(1)
  })
  let editing = $state<ImageEditRequest | null>(null)

  const editImage = async () => {
    const data = previewData
    const current = preview

    if (!data?.url || !current) return

    const source = await fetchEditableImage(data.url, current.entry.name)

    if (!source) return

    editing = {
      file: source,
      resolve: (edited) => {
        editing = null
        if (edited && edited !== source) void controller.saveEditedImage(edited)
      },
    }
  }

  const onPreviewKeyDown = (event: KeyboardEvent) => {
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
</script>

<Card
  class="relative gap-0 overflow-hidden py-0"
  data-slot="file-manager"
  data-view={ui.view}
  data-mode={schema.mode}
  aria-labelledby={labelId}
>
  <span id={labelId} class="sr-only">{tt('label', {}, 'File manager')}</span>
  <div class="sr-only" role="status" aria-live="polite">{ui.announcement}</div>

  <div class="flex flex-wrap items-center gap-2 border-b p-3" data-slot="file-manager-toolbar">
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      class="md:hidden"
      aria-label={tt('toggle_folders', {}, 'Show folders')}
      onclick={() => (foldersOpen = true)}
    >
      <FolderTreeIcon aria-hidden="true" />
    </Button>
    {#if schema.disks.length > 1}
      <label class="flex items-center">
        <span class="sr-only">{tt('disk', {}, 'Storage')}</span>
        <select
          class={SELECT}
          value={ui.disk}
          onchange={(event) => controller.setDisk(event.currentTarget.value)}
        >
          {#each schema.disks as disk (disk.name)}
            <option value={disk.name}>{disk.label}</option>
          {/each}
        </select>
      </label>
    {/if}
    <nav
      aria-label={tt('breadcrumb', {}, 'Folder path')}
      class="min-w-0 flex-1"
      data-slot="file-manager-breadcrumb"
    >
      <ol class="flex min-w-0 flex-wrap items-center gap-1 text-sm">
        <li class="flex items-center">
          <button
            type="button"
            class="hover:bg-accent rounded px-1.5 py-1 font-medium"
            aria-current={!ui.trash && ui.path === '' ? 'page' : undefined}
            onclick={() => (ui.trash ? void controller.showTrash(false) : void controller.open(''))}
          >
            {tt('root', {}, 'Files')}
          </button>
        </li>
        {#if ui.trash}
          <li class="flex min-w-0 items-center gap-1">
            <ChevronRightIcon
              class="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
            <span class="truncate px-1.5 py-1 font-medium" aria-current="page"
              >{tt('trash', {}, 'Trash')}</span
            >
          </li>
        {:else}
          {#each ui.breadcrumbs as crumb, index (crumb.path)}
            <li class="flex min-w-0 items-center gap-1">
              <ChevronRightIcon
                class="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
                aria-hidden="true"
              />
              {#if index === ui.breadcrumbs.length - 1}
                <span class="truncate px-1.5 py-1 font-medium" aria-current="page"
                  >{crumb.name}</span
                >
              {:else}
                <button
                  type="button"
                  class="hover:bg-accent truncate rounded px-1.5 py-1"
                  onclick={() => void controller.open(crumb.path)}
                >
                  {crumb.name}
                </button>
              {/if}
            </li>
          {/each}
        {/if}
      </ol>
    </nav>
    <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <div class="relative min-w-40 flex-1 sm:flex-none">
        <SearchIcon
          class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={ui.query}
          oninput={(event: Event) =>
            controller.setQuery((event.currentTarget as HTMLInputElement).value)}
          placeholder={tt('search_placeholder', {}, 'Search…')}
          aria-label={tt('search', {}, 'Search in this folder')}
          class="h-9 ps-8 sm:w-52"
          disabled={ui.trash}
        />
      </div>
      {#if schema.search.recursive && !ui.trash}
        <label class="flex items-center gap-2 text-sm">
          <Checkbox
            checked={ui.recursive}
            onCheckedChange={(checked) => controller.setRecursive(checked === true)}
          />
          {tt('search_everywhere', {}, 'Include subfolders')}
        </label>
      {/if}
      <label class="flex items-center gap-1">
        <span class="sr-only">{tt('sort', {}, 'Sort by')}</span>
        <select
          class={SELECT}
          value={ui.sort.field}
          onchange={(event) =>
            controller.setSort(
              event.currentTarget.value as FileManagerSortField,
              ui.sort.direction,
            )}
        >
          {#each SORT_FIELDS as field (field)}
            <option value={field}>{tt(`sort_${field}`, {}, field)}</option>
          {/each}
        </select>
      </label>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={ui.sort.direction === 'asc'
          ? tt('ascending', {}, 'Ascending')
          : tt('descending', {}, 'Descending')}
        onclick={() =>
          controller.setSort(ui.sort.field, ui.sort.direction === 'asc' ? 'desc' : 'asc')}
      >
        {#if ui.sort.direction === 'asc'}<ArrowUpIcon aria-hidden="true" />{:else}<ArrowDownIcon
            aria-hidden="true"
          />{/if}
      </Button>
      <div class="flex rounded-md border" role="group" aria-label={tt('view', {}, 'View')}>
        <Button
          type="button"
          variant={ui.view === 'grid' ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-pressed={ui.view === 'grid'}
          aria-label={tt('view_grid', {}, 'Grid')}
          onclick={() => controller.setView('grid')}
        >
          <LayoutGridIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant={ui.view === 'list' ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-pressed={ui.view === 'list'}
          aria-label={tt('view_list', {}, 'List')}
          onclick={() => controller.setView('list')}
        >
          <ListIcon aria-hidden="true" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={tt('refresh', {}, 'Refresh')}
        onclick={() => void controller.refresh()}
      >
        <RefreshCwIcon aria-hidden="true" class={cn(ui.loading && 'animate-spin')} />
      </Button>
      {#if !ui.trash && can('createFolder')}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onclick={() => controller.openDialog({ type: 'createFolder' })}
        >
          <FolderPlusIcon aria-hidden="true" />
          <span class="max-sm:sr-only">{tt('new_folder', {}, 'New folder')}</span>
        </Button>
      {/if}
      {#if !ui.trash && can('upload') && schema.upload}
        <Button type="button" size="sm" onclick={() => uploadInput?.click()}>
          <UploadIcon aria-hidden="true" />
          <span class="max-sm:sr-only">{tt('upload', {}, 'Upload')}</span>
        </Button>
        <input
          bind:this={uploadInput}
          type="file"
          multiple
          hidden
          accept={fileManagerAcceptAttribute(schema.upload.accept)}
          data-slot="file-manager-upload-input"
          onchange={onUpload}
        />
      {/if}
      {#if schema.trash && !picker}
        <Button
          type="button"
          variant={ui.trash ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={ui.trash}
          onclick={() => void controller.showTrash(!ui.trash)}
        >
          <Trash2Icon aria-hidden="true" />
          <span class="max-sm:sr-only"
            >{ui.trash ? tt('back_to_files', {}, 'Back to files') : tt('trash', {}, 'Trash')}</span
          >
        </Button>
      {/if}
    </div>
  </div>

  {#if selected.length > 0 && !picker}
    <div
      class="bg-muted/50 flex flex-wrap items-center gap-1 border-b px-3 py-2 text-sm"
      data-slot="file-manager-selection"
    >
      <span class="me-2 font-medium"
        >{tt('selected', { count: selected.length }, ':count selected')}</span
      >
      {#if ui.trash}
        {#if can('restore')}
          <Button type="button" variant="ghost" size="sm" onclick={() => void controller.restore()}>
            <RotateCcwIcon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('restore', {}, 'Restore')}</span>
          </Button>
        {/if}
        {#if can('delete')}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive"
            onclick={() => controller.confirmDelete()}
          >
            <Trash2Icon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('delete_permanently', {}, 'Delete permanently')}</span>
          </Button>
        {/if}
      {:else}
        {#if single}
          {@const entry = single}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => controller.openEntry(entry)}
          >
            {#if entry.type === 'folder'}<FolderOpenIcon aria-hidden="true" />{:else}<SearchIcon
                aria-hidden="true"
              />{/if}
            <span class="max-md:sr-only"
              >{entry.type === 'folder'
                ? tt('open', {}, 'Open')
                : tt('preview', {}, 'Preview')}</span
            >
          </Button>
        {/if}
        {#if can('download') && (single?.type === 'file' || can('zip'))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => void controller.download()}
          >
            <DownloadIcon aria-hidden="true" />
            <span class="max-md:sr-only"
              >{single?.type === 'file'
                ? tt('download', {}, 'Download')
                : tt('download_zip', {}, 'Download as zip')}</span
            >
          </Button>
        {/if}
        {#if single && can('rename')}
          {@const entry = single}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => controller.openDialog({ type: 'rename', entry })}
          >
            <PencilIcon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('rename', {}, 'Rename')}</span>
          </Button>
        {/if}
        {#if can('move')}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() =>
              controller.openDialog({ type: 'move', paths: ui.selection, destination: ui.path })}
          >
            <FolderInputIcon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('move', {}, 'Move')}</span>
          </Button>
        {/if}
        {#if can('copy')}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() =>
              controller.openDialog({ type: 'copy', paths: ui.selection, destination: ui.path })}
          >
            <CopyIcon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('copy', {}, 'Copy')}</span>
          </Button>
        {/if}
        {#if single?.type === 'file' && can('share') && schema.share}
          {@const entry = single}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onclick={() => void controller.openShare(entry)}
          >
            <Share2Icon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('share', {}, 'Share')}</span>
          </Button>
        {/if}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={() => void controller.showDetails(single)}
        >
          <InfoIcon aria-hidden="true" />
          <span class="max-md:sr-only">{tt('details', {}, 'Details')}</span>
        </Button>
        {#if can('delete')}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive"
            onclick={() => controller.confirmDelete()}
          >
            <Trash2Icon aria-hidden="true" />
            <span class="max-md:sr-only">{tt('delete', {}, 'Delete')}</span>
          </Button>
        {/if}
      {/if}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="ms-auto"
        aria-label={tt('clear_selection', {}, 'Clear selection')}
        onclick={() => controller.clearSelection()}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  {/if}

  <div class={cn('flex', picker ? 'h-[60vh]' : 'min-h-[28rem]')}>
    <aside
      class="hidden w-60 shrink-0 overflow-y-auto border-e p-2 md:block"
      data-slot="file-manager-sidebar"
    >
      <FileManagerTree
        {controller}
        active={ui.trash ? null : ui.path}
        dropHandlers={canWrite ? dropHandlers : undefined}
        onOpen={openTreeFolder}
      />
    </aside>

    <div
      class="relative min-w-0 flex-1 overflow-y-auto"
      data-slot="file-manager-content"
      data-drop-target={ui.dropTarget === '' ? '' : undefined}
      role="presentation"
      {...canWrite ? dropHandlers('') : {}}
    >
      {#if ui.trash && ui.retentionDays}
        <p class="text-muted-foreground border-b px-4 py-2 text-xs">
          {tt(
            'trash_hint',
            { days: ui.retentionDays },
            'Items in the trash are deleted for good after :days days.',
          )}
        </p>
      {/if}
      {#if ui.truncated || ui.resultsTruncated}
        <p class="text-muted-foreground border-b px-4 py-2 text-xs" role="note">
          {ui.resultsTruncated
            ? tt('search_truncated', {}, 'Only the first results are shown. Refine your search.')
            : tt('truncated', {}, 'This folder has more items than can be shown here.')}
        </p>
      {/if}
      <p id={hintId} class="sr-only">
        {tt('keyboard', {}, 'Arrow keys move between items, Shift selects a range, Enter opens.')}
      </p>

      {#if (ui.loading || ui.searching) && entries.length === 0}
        <div class="flex justify-center py-16">
          <Spinner />
          <span class="sr-only">{tt('loading', {}, 'Loading files')}</span>
        </div>
      {:else if entries.length === 0}
        <div
          class="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center text-sm"
          data-slot="file-manager-empty"
        >
          <FolderOpenIcon class="size-10 opacity-40" aria-hidden="true" />
          <p class="text-foreground font-medium">
            {ui.query
              ? tt('no_results', {}, 'Nothing matches your search')
              : ui.trash
                ? tt('empty_trash_state', {}, 'The trash is empty')
                : tt('empty', {}, 'This folder is empty')}
          </p>
          {#if !ui.query && canWrite && can('upload')}
            <p>{tt('empty_hint', {}, 'Drop files here or choose Upload.')}</p>
          {/if}
        </div>
      {:else}
        <div
          bind:this={listElement}
          role="listbox"
          tabindex="-1"
          aria-multiselectable={!picker || schema.multiple === true}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          aria-busy={ui.loading || undefined}
          data-slot="file-manager-items"
          class={cn(
            ui.view === 'grid'
              ? 'grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
              : 'flex flex-col p-1',
            ui.loading && 'opacity-60',
          )}
        >
          {#if ui.view === 'list'}
            <div
              class="text-muted-foreground hidden grid-cols-[1fr_7rem_10rem] gap-3 px-3 py-1.5 text-xs font-medium sm:grid"
              aria-hidden="true"
            >
              <span>{tt('name', {}, 'Name')}</span>
              <span class="text-end">{tt('size', {}, 'Size')}</span>
              <span>{tt('modified', {}, 'Modified')}</span>
            </div>
          {/if}
          {#each entries as entry (entry.path)}
            {@const isSelected = ui.selection.includes(entry.path)}
            {@const disabled = picker && entry.type === 'file' && entry.selectable === false}
            {@const thumbnail = thumbnailOf(entry)}
            {@const location = locationOf(entry)}
            <div
              use:register={entry.path}
              role="option"
              aria-label={entry.name}
              aria-selected={isSelected}
              aria-disabled={disabled || undefined}
              tabindex={entry.path === focusPath ? 0 : -1}
              draggable={canWrite && (can('move') || can('copy'))}
              data-slot="file-manager-item"
              data-type={entry.type}
              data-kind={entry.kind}
              data-selected={isSelected ? '' : undefined}
              data-drop-target={ui.dropTarget === entry.path ? '' : undefined}
              title={entry.name}
              class={cn(
                'group focus-visible:ring-ring/50 relative cursor-default rounded-lg outline-none select-none focus-visible:ring-[3px]',
                ui.view === 'grid'
                  ? 'hover:bg-accent/50 flex flex-col gap-2 border p-2'
                  : 'hover:bg-accent/50 grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2 sm:grid-cols-[auto_1fr_7rem_10rem]',
                isSelected && 'bg-primary/10 border-primary/40 hover:bg-primary/15',
                ui.dropTarget === entry.path && 'ring-primary ring-2',
                disabled && 'opacity-50',
              )}
              {...entry.type === 'folder' && canWrite ? dropHandlers(entry.path) : {}}
              onpointerdown={(event) => (pointer = event.pointerType)}
              onclick={(event) => onItemClick(entry, event)}
              ondblclick={() => onItemDoubleClick(entry)}
              onkeydown={onItemKeyDown}
              onfocus={() => controller.focus(entry.path)}
              ondragstart={(event) =>
                event.dataTransfer && controller.dragStart(entry.path, event.dataTransfer)}
              ondragend={() => controller.dragEnd()}
            >
              {#if ui.view === 'grid'}
                <div
                  class="bg-muted/60 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md"
                >
                  {#if thumbnail}
                    <img
                      src={thumbnail}
                      alt=""
                      loading="lazy"
                      draggable="false"
                      class="size-full object-cover"
                      onerror={() => (broken = [...broken, entry.path])}
                    />
                  {:else}
                    <FileManagerIcon {entry} class="size-10" />
                  {/if}
                </div>
                <div class="min-w-0 px-0.5">
                  <p class="truncate text-sm font-medium">{entry.name}</p>
                  <p class="text-muted-foreground truncate text-xs">
                    {location ??
                      (entry.type === 'folder' ? tt('kinds.folder', {}, 'Folder') : sizeOf(entry))}
                  </p>
                </div>
              {:else}
                {#if thumbnail}
                  <img
                    src={thumbnail}
                    alt=""
                    loading="lazy"
                    draggable="false"
                    class="size-8 rounded object-cover"
                    onerror={() => (broken = [...broken, entry.path])}
                  />
                {:else}
                  <FileManagerIcon {entry} class="size-5" />
                {/if}
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{entry.name}</p>
                  {#if location}<p class="text-muted-foreground truncate text-xs">
                      {location}
                    </p>{/if}
                </div>
                <span class="text-muted-foreground hidden text-end text-sm tabular-nums sm:block"
                  >{sizeOf(entry)}</span
                >
                <span class="text-muted-foreground hidden truncate text-sm sm:block">
                  {entry.modified ? formatter.current.dateTime(entry.modified) : ''}
                </span>
              {/if}
              {#if isSelected}
                <CheckIcon
                  class="bg-primary text-primary-foreground absolute end-1.5 top-1.5 size-4 rounded-full p-0.5"
                  aria-hidden="true"
                />
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      {#if ui.dropTarget === ''}
        <div
          class="border-primary bg-primary/5 text-primary pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed text-sm font-medium"
          data-slot="file-manager-drop"
        >
          {tt('drop_here', { folder: folderLabel }, 'Drop files to upload them to :folder')}
        </div>
      {/if}
    </div>

    {#if ui.detailsOpen}
      <aside
        class="hidden w-72 shrink-0 overflow-y-auto border-s md:block"
        data-slot="file-manager-details"
      >
        <FileManagerDetails {controller} />
      </aside>
    {/if}
  </div>

  {#if ui.trash && entries.length > 0 && can('delete')}
    <div class="flex justify-end border-t p-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onclick={() => controller.openDialog({ type: 'emptyTrash' })}
      >
        <Trash2Icon aria-hidden="true" />
        {tt('empty_trash', {}, 'Empty trash')}
      </Button>
    </div>
  {/if}

  {#if picker}
    <div
      class="flex flex-wrap items-center justify-end gap-2 border-t p-3"
      data-slot="file-manager-picker-footer"
    >
      <span class="text-muted-foreground me-auto text-sm">
        {selected.length > 0 ? tt('selected', { count: chosen.length }, ':count selected') : ''}
      </span>
      <Button type="button" variant="outline" onclick={() => onCancel?.()}
        >{tt('cancel', {}, 'Cancel')}</Button
      >
      <Button type="button" disabled={chosen.length === 0} onclick={() => onChoose?.(chosen)}>
        <CheckIcon aria-hidden="true" />
        {tt('picker_choose', {}, 'Choose')}
      </Button>
    </div>
  {/if}

  <Sheet open={foldersOpen} onOpenChange={(open) => (foldersOpen = open)}>
    <SheetContent side={direction === 'rtl' ? 'right' : 'left'} class="p-4">
      <SheetHeader class="p-0">
        <SheetTitle>{tt('folders', {}, 'Folders')}</SheetTitle>
      </SheetHeader>
      <FileManagerTree
        {controller}
        active={ui.trash ? null : ui.path}
        dropHandlers={canWrite ? dropHandlers : undefined}
        onOpen={openTreeFolder}
      />
    </SheetContent>
  </Sheet>

  <Sheet
    open={ui.detailsOpen && mobile.current}
    onOpenChange={(open) => !open && controller.closeDetails()}
  >
    <SheetContent side={direction === 'rtl' ? 'left' : 'right'} class="p-0">
      <SheetHeader>
        <SheetTitle>{tt('details', {}, 'Details')}</SheetTitle>
      </SheetHeader>
      <FileManagerDetails {controller} hideHeading />
    </SheetContent>
  </Sheet>

  {#if ui.uploads.length > 0}
    <section
      class="bg-popover fixed end-4 bottom-4 z-40 flex max-h-80 w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border shadow-lg"
      aria-label={tt('uploads', {}, 'Uploads')}
      data-slot="file-manager-uploads"
    >
      <header class="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
        <UploadIcon class="size-4" aria-hidden="true" />
        <span class="flex-1" role="status">
          {tt(
            'uploads_summary',
            { done: uploadsDone, total: ui.uploads.length },
            ':done of :total uploaded',
          )}
        </span>
        {#if uploadsFinished}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={tt('dismiss', {}, 'Dismiss')}
            onclick={() => controller.clearUploads()}
          >
            <XIcon aria-hidden="true" />
          </Button>
        {/if}
      </header>
      <ul class="flex flex-col gap-2 overflow-y-auto p-3">
        {#each ui.uploads as upload (upload.id)}
          <li class="flex flex-col gap-1 text-sm" data-status={upload.status}>
            <div class="flex items-center gap-2">
              <span class="min-w-0 flex-1 truncate">{upload.name}</span>
              {#if upload.status === 'done'}
                <CheckIcon
                  class="size-4 text-emerald-600"
                  aria-label={tt('upload_done', {}, 'Uploaded')}
                />
              {:else if upload.status === 'error'}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={tt('dismiss', {}, 'Dismiss')}
                  onclick={() => controller.dismissUpload(upload.id)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              {:else}
                <span class="text-muted-foreground text-xs tabular-nums"
                  >{formatter.current.percent(upload.progress)}</span
                >
              {/if}
            </div>
            {#if upload.status === 'error'}
              <p class="text-destructive text-xs" role="alert">
                {upload.error ?? tt('upload_failed', {}, 'Failed')}
              </p>
            {:else if upload.status !== 'done'}
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(upload.progress * 100)}
                aria-label={tt(
                  'upload_progress',
                  { name: upload.name, percent: formatter.current.percent(upload.progress) },
                  ':name, :percent uploaded',
                )}
                class="bg-muted h-1.5 overflow-hidden rounded-full"
              >
                <div
                  class="bg-primary h-full rounded-full transition-[width]"
                  style:width={`${upload.progress * 100}%`}
                ></div>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <Dialog
    open={dialog?.type === 'createFolder' || dialog?.type === 'rename'}
    onOpenChange={onDialogOpen}
  >
    <DialogContent data-slot="file-manager-dialog">
      <form class="flex flex-col gap-4" onsubmit={submitName}>
        <DialogHeader>
          <DialogTitle>
            {dialog?.type === 'rename'
              ? tt('rename_heading', { name: dialog.entry.name }, 'Rename “:name”')
              : tt('new_folder', {}, 'New folder')}
          </DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <label for={nameId} class="text-sm font-medium">
            {dialog?.type === 'rename'
              ? tt('name', {}, 'Name')
              : tt('folder_name', {}, 'Folder name')}
          </label>
          <Input
            id={nameId}
            bind:value={name}
            aria-invalid={ui.error ? true : undefined}
            aria-describedby={ui.error ? errorId : undefined}
          />
          {#if ui.error}<p id={errorId} class="text-destructive text-sm" role="alert">
              {ui.error}
            </p>{/if}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onclick={close}
            >{tt('cancel', {}, 'Cancel')}</Button
          >
          <Button type="submit" disabled={ui.busy || name.trim() === ''}>
            {#if ui.busy}<Spinner />{/if}
            {dialog?.type === 'rename' ? tt('save', {}, 'Save') : tt('create', {}, 'Create')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <Dialog open={dialog?.type === 'move' || dialog?.type === 'copy'} onOpenChange={onDialogOpen}>
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
      <div class="max-h-72 overflow-y-auto rounded-md border p-2">
        {#if dialog?.type === 'move' || dialog?.type === 'copy'}
          <FileManagerTree {controller} active={dialog.destination} onOpen={chooseDestination} />
        {/if}
      </div>
      {#if ui.error}<p class="text-destructive text-sm" role="alert">{ui.error}</p>{/if}
      <DialogFooter>
        <Button type="button" variant="outline" onclick={close}>{tt('cancel', {}, 'Cancel')}</Button
        >
        <Button type="button" disabled={ui.busy} onclick={submitTransfer}>
          {#if ui.busy}<Spinner />{/if}
          {dialog?.type === 'copy'
            ? tt('copy_here', {}, 'Copy here')
            : tt('move_here', {}, 'Move here')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog
    open={dialog?.type === 'delete' || dialog?.type === 'emptyTrash'}
    onOpenChange={onDialogOpen}
  >
    <DialogContent data-slot="file-manager-dialog">
      <DialogHeader>
        <DialogTitle>
          {dialog?.type === 'delete'
            ? choice('file-manager.delete_heading', dialog.paths.length, {}, 'Delete :count items?')
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
              ? tt('empty_trash_description', {}, 'Everything in the trash is deleted for good.')
              : tt('delete_description', {}, 'They are deleted for good. This cannot be undone.')}
        </DialogDescription>
      </DialogHeader>
      {#if ui.error}<p class="text-destructive text-sm" role="alert">{ui.error}</p>{/if}
      <DialogFooter>
        <Button type="button" variant="outline" onclick={close}>{tt('cancel', {}, 'Cancel')}</Button
        >
        <Button type="button" variant="destructive" disabled={ui.busy} onclick={submitDelete}>
          {#if ui.busy}<Spinner />{/if}
          {dialog?.type === 'emptyTrash'
            ? tt('empty_trash', {}, 'Empty trash')
            : dialog?.type === 'delete' && dialog.permanent
              ? tt('delete_permanently', {}, 'Delete permanently')
              : tt('delete', {}, 'Delete')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog open={dialog?.type === 'share'} onOpenChange={onDialogOpen}>
    <DialogContent data-slot="file-manager-dialog">
      {#if dialog?.type === 'share'}
        {@const current = dialog}
        <DialogHeader>
          <DialogTitle
            >{tt('share_heading', { name: current.entry.name }, 'Share “:name”')}</DialogTitle
          >
          <DialogDescription
            >{tt(
              'share_hint',
              {},
              'Anyone with the link can open this file, without signing in.',
            )}</DialogDescription
          >
        </DialogHeader>
        <div class="flex flex-wrap items-end gap-2">
          <label class="flex min-w-40 flex-1 flex-col gap-1 text-sm">
            <span class="font-medium">{tt('share_expiry', {}, 'Link expires after')}</span>
            <select bind:value={expiry} class={SELECT}>
              {#each share?.expiries ?? [] as minutes (minutes)}
                <option value={String(minutes)}>{expiryLabel(minutes)}</option>
              {/each}
              {#if share?.publicLinks}<option value="never"
                  >{tt('expiry_never', {}, 'Never')}</option
                >{/if}
            </select>
          </label>
          <Button
            type="button"
            disabled={ui.busy}
            onclick={() => void controller.createLink(expiry === 'never' ? null : Number(expiry))}
          >
            {#if ui.busy}<Spinner />{:else}<LinkIcon aria-hidden="true" />{/if}
            {tt('create_link', {}, 'Create link')}
          </Button>
        </div>
        {#if ui.error}<p class="text-destructive text-sm" role="alert">{ui.error}</p>{/if}
        {#if current.url}
          {@const url = current.url}
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">{tt('link', {}, 'Shareable link')}</span>
            <div class="flex gap-2">
              <Input
                readonly
                value={url}
                dir="ltr"
                aria-label={tt('link', {}, 'Shareable link')}
                onfocus={(event: FocusEvent) => (event.currentTarget as HTMLInputElement).select()}
              />
              <Button type="button" variant="outline" onclick={() => void copy(url)}>
                {#if copied}<CheckIcon aria-hidden="true" />{:else}<CopyIcon
                    aria-hidden="true"
                  />{/if}
                {copied ? tt('link_copied', {}, 'Link copied') : tt('copy_link', {}, 'Copy link')}
              </Button>
            </div>
            <span class="text-muted-foreground text-xs">
              {current.expiresAt
                ? tt(
                    'link_expires',
                    { date: formatter.current.dateTime(current.expiresAt) },
                    'Expires :date',
                  )
                : tt('link_never_expires', {}, 'Never expires')}
            </span>
          </div>
        {/if}
        {#if share?.publicLinks}
          <div class="flex flex-col gap-2" data-slot="file-manager-links">
            <h4 class="text-sm font-medium">{tt('links', {}, 'Links')}</h4>
            {#if current.links === null}
              <Spinner />
            {:else if current.links.length === 0}
              <p class="text-muted-foreground text-sm">{tt('no_links', {}, 'No links yet')}</p>
            {:else}
              <ul class="flex max-h-48 flex-col divide-y overflow-y-auto rounded-md border">
                {#each current.links as link (link.id)}
                  <li class="flex items-center gap-2 px-3 py-2 text-sm">
                    <div class="min-w-0 flex-1">
                      <p
                        class={cn('truncate', link.expired && 'text-muted-foreground line-through')}
                        dir="ltr"
                      >
                        {link.url}
                      </p>
                      <p class="text-muted-foreground text-xs">
                        {link.expired
                          ? tt('link_expired', {}, 'Expired')
                          : link.expiresAt
                            ? tt(
                                'link_expires',
                                { date: formatter.current.dateTime(link.expiresAt) },
                                'Expires :date',
                              )
                            : tt('link_never_expires', {}, 'Never expires')}
                        ·
                        {choice(
                          'file-manager.link_downloads',
                          link.downloads,
                          {},
                          ':count downloads',
                        )}
                      </p>
                    </div>
                    {#if link.url && !link.expired}
                      {@const linkUrl = link.url}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={tt('copy_link', {}, 'Copy link')}
                        onclick={() => void copy(linkUrl)}
                      >
                        <CopyIcon aria-hidden="true" />
                      </Button>
                    {/if}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="text-destructive"
                      onclick={() => void controller.revokeLink(link.id)}
                    >
                      {tt('revoke', {}, 'Revoke')}
                    </Button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
        <DialogFooter>
          <Button type="button" variant="outline" onclick={close}>{tt('close', {}, 'Close')}</Button
          >
        </DialogFooter>
      {/if}
    </DialogContent>
  </Dialog>

  <Dialog open={preview !== null} onOpenChange={(open) => !open && controller.closePreview()}>
    <DialogContent
      class="flex max-h-[90vh] flex-col sm:max-w-4xl"
      data-slot="file-manager-preview"
      onkeydown={onPreviewKeyDown}
    >
      <DialogHeader>
        <DialogTitle class="truncate pe-8">{preview?.entry.name}</DialogTitle>
      </DialogHeader>
      <div
        class="bg-muted/40 flex min-h-64 flex-1 items-center justify-center overflow-auto rounded-md"
      >
        {#if !previewData}
          <Spinner />
        {:else if !previewData.previewable}
          <div
            class="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm"
          >
            {#if preview}<FileManagerIcon entry={preview.entry} class="size-12" />{/if}
            <p>{tt('preview_unavailable', {}, 'There is no preview for this type of file.')}</p>
          </div>
        {:else if previewData.kind === 'image'}
          <img
            src={previewData.url}
            alt={preview?.entry.name ?? ''}
            class="max-h-[70vh] max-w-full object-contain"
          />
        {:else if previewData.kind === 'pdf'}
          <iframe
            src={previewData.url}
            title={preview?.entry.name ?? ''}
            class="h-[70vh] w-full rounded-md bg-white"
          ></iframe>
        {:else if previewData.kind === 'video'}
          <video src={previewData.url} controls class="max-h-[70vh] max-w-full">
            <track kind="captions" />
          </video>
        {:else if previewData.kind === 'audio'}
          <audio src={previewData.url} controls class="w-full max-w-md"></audio>
        {:else}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <pre
            class="h-full max-h-[70vh] w-full overflow-auto p-4 font-mono text-xs whitespace-pre-wrap"
            dir="auto"
            tabindex="0">{previewData.text}</pre>
        {/if}
      </div>
      {#if previewData?.truncated}
        <p class="text-muted-foreground text-xs">
          {tt('preview_truncated', {}, 'Only the beginning of this file is shown.')}
        </p>
      {/if}
      <DialogFooter class="flex-row flex-wrap items-center sm:justify-between">
        <div class="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!previous}
            aria-label={tt('previous', {}, 'Previous file')}
            onclick={() => previous && void controller.openPreview(previous)}
          >
            <ChevronLeftIcon class="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!next}
            aria-label={tt('next', {}, 'Next file')}
            onclick={() => next && void controller.openPreview(next)}
          >
            <ChevronRightIcon class="rtl:rotate-180" aria-hidden="true" />
          </Button>
        </div>
        <div class="flex gap-2">
          {#if previewData?.editable && previewData.url}
            <Button type="button" variant="outline" size="sm" onclick={() => void editImage()}>
              <SquarePenIcon aria-hidden="true" />
              {tt('edit_image', {}, 'Edit image')}
            </Button>
          {/if}
          {#if previewData?.downloadUrl}
            <Button size="sm" href={previewData.downloadUrl} external>
              <DownloadIcon aria-hidden="true" />
              {tt('download', {}, 'Download')}
            </Button>
          {/if}
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <ImageEditorDialog request={editing} options={IMAGE_EDITOR} />
</Card>
