<script setup lang="ts">
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
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FolderInputIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  FolderTreeIcon,
  InfoIcon,
  LayoutGridIcon,
  LinkIcon,
  ListIcon,
  PencilIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  Share2Icon,
  SquarePenIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, useId, watch } from 'vue'
import {
  useActionRunner,
  useChoice,
  useDirection,
  useFormatter,
  usePanel,
  useT,
} from '../../context'
import { useIsMobile } from '../../composables/use-mobile'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import ImageEditorDialog, { type ImageEditRequest } from '../fields/ImageEditorDialog.vue'
import { showToast } from '../notifications/flash-toasts'
import Button from '../ui/Button.vue'
import Card from '../ui/Card.vue'
import Checkbox from '../ui/Checkbox.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import Input from '../ui/Input.vue'
import Sheet from '../ui/Sheet.vue'
import SheetContent from '../ui/SheetContent.vue'
import SheetHeader from '../ui/SheetHeader.vue'
import SheetTitle from '../ui/SheetTitle.vue'
import Spinner from '../ui/Spinner.vue'
import FileManagerDetails from './FileManagerDetails.vue'
import FileManagerIcon from './FileManagerIcon.vue'
import FileManagerTree from './FileManagerTree.vue'

/**
 * The file manager of alfasix/alfakit-file-manager: a folder tree, breadcrumbs, grid and
 * list views, sorting, search, multi-selection with mouse and keyboard, drag and drop
 * (uploads and moves), uploads with progress, previews, details, sharing and the trash.
 * Everything is listed, checked and changed by the server.
 */
const props = defineProps<{
  schema: FileManagerSchema
  /** Picker: called with the chosen files. */
  onChoose?: (entries: FileManagerEntrySchema[]) => void
  onCancel?: () => void
}>()

const SELECT =
  'border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-0 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'
const SORT_FIELDS: FileManagerSortField[] = ['name', 'size', 'modified', 'type']
const IMAGE_EDITOR = { aspectRatios: [null], circle: false }

const runner = useActionRunner()
const page = usePageActionContext()
const panel = usePanel()
const t = useT()
const choice = useChoice()
const direction = useDirection()
const formatter = useFormatter()
const mobile = useIsMobile()
const labelId = useId()
const hintId = useId()
const nameId = useId()
const errorId = useId()
const tt = (key: string, replacements: Record<string, string | number> = {}, fallback?: string) =>
  t(`file-manager.${key}`, replacements, fallback)

const environment = (): FileManagerEnvironment => ({
  runner,
  token: page.token,
  uploadEndpoint: panel.value.endpoints.upload,
  uploadChunkEndpoint: panel.value.endpoints.uploadChunks,
  uploadChunkSize: panel.value.uploadChunkSize,
  t,
  choice,
  formatter: formatter.value,
  notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
  error: (message) => showToast(clientErrorNotification('file-manager', message)),
})

const controller = new FileManagerController(
  toRaw(props.schema),
  environment(),
  formatter.value.locale,
)
const state = useStore(controller.store)

watch(
  () => props.schema,
  (schema) => controller.setSchema(toRaw(schema)),
)
watch([formatter, direction], () => controller.setEnvironment(environment()))

onMounted(() => {
  if (props.schema.mode === 'picker') void controller.ensureLoaded()
})
onBeforeUnmount(() => controller.dispose())

const picker = computed(() => props.schema.mode === 'picker')
const entries = computed(() => {
  void state.value

  return controller.visibleEntries()
})
const selected = computed(() => {
  void state.value

  return controller.selectedEntries()
})
const chosen = computed(() => {
  void state.value

  return controller.chosen()
})
const single = computed(() => (selected.value.length === 1 ? selected.value[0] : undefined))
const canWrite = computed(() => !picker.value && !state.value.trash)
const focusPath = computed(() => state.value.focus ?? entries.value[0]?.path ?? null)
const folderLabel = computed(() =>
  state.value.trash
    ? tt('trash', {}, 'Trash')
    : (state.value.breadcrumbs[state.value.breadcrumbs.length - 1]?.name ??
      tt('root', {}, 'Files')),
)
const can = (ability: Parameters<FileManagerController['can']>[0]) => controller.can(ability)

const listRef = ref<HTMLElement | null>(null)
const items = new Map<string, HTMLElement>()
const uploadInput = ref<HTMLInputElement | null>(null)
const foldersOpen = ref(false)
const pointer = ref('mouse')
const broken = ref(new Set<string>())

const setItem = (path: string) => (element: unknown) => {
  if (element instanceof HTMLElement) items.set(path, element)
  else items.delete(path)
}

const focusItem = (path: string | undefined) => {
  if (path) void nextTick(() => items.get(path)?.focus())
}

const columns = () => {
  const element = listRef.value

  if (!element || state.value.view !== 'grid' || typeof getComputedStyle === 'undefined') return 1

  return Math.max(
    1,
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
  )
}

const onItemKeyDown = (event: KeyboardEvent) => {
  const result = controller.handleKey(event, columns(), direction.value)

  if (result.handled) {
    event.preventDefault()
    focusItem(result.focus)
  }
}

const onItemClick = (entry: FileManagerEntrySchema, event: MouseEvent) =>
  controller.click(entry.path, {
    shift: event.shiftKey,
    toggle: event.metaKey || event.ctrlKey,
    touch: pointer.value === 'touch',
  })

const onItemDoubleClick = (entry: FileManagerEntrySchema) => {
  if (picker.value && entry.type === 'file') {
    if (entry.selectable !== false && entry.value) props.onChoose?.([entry])

    return
  }

  controller.openEntry(entry)
}

const copying = (event: DragEvent) => event.ctrlKey || event.altKey || event.metaKey

const dropHandlers = (target: string) => ({
  dragover: (event: DragEvent) => {
    if (event.dataTransfer && controller.dragOver(target, event.dataTransfer, copying(event))) {
      event.preventDefault()
      event.stopPropagation()
    }
  },
  dragleave: (event: DragEvent) => {
    const current = event.currentTarget as HTMLElement | null

    if (!current?.contains(event.relatedTarget as Node | null)) controller.dragLeave(target)
  },
  drop: (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) void controller.drop(target, event.dataTransfer, copying(event))
  },
})

const onDragStart = (entry: FileManagerEntrySchema, event: DragEvent) => {
  if (event.dataTransfer) controller.dragStart(entry.path, event.dataTransfer)
}

const openTreeFolder = (path: string) => {
  foldersOpen.value = false
  void controller.open(path)
}

const onUpload = (event: Event) => {
  const input = event.target as HTMLInputElement

  if (input.files) void controller.upload(Array.from(input.files))
  input.value = ''
}

const sizeOf = (entry: FileManagerEntrySchema) =>
  entry.type === 'file' ? fileManagerSize(entry.size, formatter.value) : ''
const locationOf = (entry: FileManagerEntrySchema) =>
  state.value.results !== null && entry.path.includes('/')
    ? entry.path.slice(0, entry.path.lastIndexOf('/'))
    : null
const thumbnailOf = (entry: FileManagerEntrySchema) =>
  entry.thumbnail && !broken.value.has(entry.path) ? entry.thumbnail : null
const markBroken = (path: string) => {
  broken.value = new Set([...broken.value, path])
}

// ---------------------------------------------------------------- Uploads

const uploadsDone = computed(
  () => state.value.uploads.filter((upload) => upload.status === 'done').length,
)
const uploadsFinished = computed(() =>
  state.value.uploads.every((upload) => upload.status === 'done' || upload.status === 'error'),
)

// ---------------------------------------------------------------- Dialogs

const dialog = computed(() => state.value.dialog)
const name = ref('')
const expiry = ref('')
const copied = ref(false)
const share = computed(() => props.schema.share)

watch(
  () =>
    [
      dialog.value?.type,
      dialog.value && 'entry' in dialog.value ? dialog.value.entry.path : null,
    ] as const,
  () => {
    const current = dialog.value

    if (current?.type === 'rename') name.value = current.entry.name
    if (current?.type === 'createFolder') name.value = ''
    if (current?.type === 'share') {
      expiry.value = String(share.value?.expiries[0] ?? '')
      copied.value = false
    }
  },
)

const close = () => controller.closeDialog()
const onDialogOpen = (open: boolean) => {
  if (!open) close()
}

const submitName = () => {
  const current = dialog.value

  if (current?.type === 'rename') void controller.rename(current.entry.path, name.value)
  else void controller.createFolder(name.value)
}

const submitTransfer = () => {
  const current = dialog.value

  if (current?.type === 'move' || current?.type === 'copy')
    void controller.transfer(current.type, current.paths, current.destination)
}

const chooseDestination = (path: string) => {
  const current = dialog.value

  if (current?.type === 'move' || current?.type === 'copy')
    controller.openDialog({ ...current, destination: path })
}

const submitDelete = () => {
  const current = dialog.value

  if (current?.type === 'delete') void controller.remove(current.paths)
  else void controller.emptyTrash()
}

const expiryLabel = (minutes: number) => {
  const label = fileManagerExpiry(minutes)

  return choice(`file-manager.${label.key}`, label.count, {}, ':count')
}

const copy = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
  } catch {
    copied.value = false
  }
}

// ---------------------------------------------------------------- Preview

const preview = computed(() => state.value.preview)
const previewData = computed(() => preview.value?.data ?? null)
const previous = computed(() => {
  void state.value.preview

  return controller.previewSibling(-1)
})
const next = computed(() => {
  void state.value.preview

  return controller.previewSibling(1)
})
const editing = ref<ImageEditRequest | null>(null)

const editImage = async () => {
  const data = previewData.value
  const current = preview.value

  if (!data?.url || !current) return

  const source = await fetchEditableImage(data.url, current.entry.name)

  if (!source) return

  editing.value = {
    file: source,
    resolve: (edited) => {
      editing.value = null
      if (edited && edited !== source) void controller.saveEditedImage(edited)
    },
  }
}

const onPreviewKeyDown = (event: KeyboardEvent) => {
  const back = direction.value === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
  const forward = direction.value === 'rtl' ? 'ArrowLeft' : 'ArrowRight'

  if (
    event.target instanceof HTMLElement &&
    ['VIDEO', 'AUDIO', 'INPUT'].includes(event.target.tagName)
  )
    return

  if (event.key === back && previous.value) void controller.openPreview(previous.value)
  if (event.key === forward && next.value) void controller.openPreview(next.value)
}
</script>

<template>
  <Card
    class="relative gap-0 overflow-hidden py-0"
    data-slot="file-manager"
    :data-view="state.view"
    :data-mode="schema.mode"
    :aria-labelledby="labelId"
  >
    <span :id="labelId" class="sr-only">{{ tt('label', {}, 'File manager') }}</span>
    <div class="sr-only" role="status" aria-live="polite">{{ state.announcement }}</div>

    <div class="flex flex-wrap items-center gap-2 border-b p-3" data-slot="file-manager-toolbar">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        class="md:hidden"
        :aria-label="tt('toggle_folders', {}, 'Show folders')"
        @click="foldersOpen = true"
      >
        <FolderTreeIcon aria-hidden="true" />
      </Button>
      <label v-if="schema.disks.length > 1" class="flex items-center">
        <span class="sr-only">{{ tt('disk', {}, 'Storage') }}</span>
        <select
          :class="SELECT"
          :value="state.disk"
          @change="controller.setDisk(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="disk in schema.disks" :key="disk.name" :value="disk.name">
            {{ disk.label }}
          </option>
        </select>
      </label>
      <nav
        :aria-label="tt('breadcrumb', {}, 'Folder path')"
        class="min-w-0 flex-[1_1_12rem]"
        data-slot="file-manager-breadcrumb"
      >
        <ol class="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <li class="flex items-center">
            <button
              type="button"
              class="hover:bg-accent rounded px-1.5 py-1 font-medium"
              :aria-current="!state.trash && state.path === '' ? 'page' : undefined"
              @click="state.trash ? controller.showTrash(false) : controller.open('')"
            >
              {{ tt('root', {}, 'Files') }}
            </button>
          </li>
          <li v-if="state.trash" class="flex min-w-0 items-center gap-1">
            <ChevronRightIcon
              class="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
              aria-hidden="true"
            />
            <span class="truncate px-1.5 py-1 font-medium" aria-current="page">{{
              tt('trash', {}, 'Trash')
            }}</span>
          </li>
          <template v-else>
            <li
              v-for="(crumb, index) in state.breadcrumbs"
              :key="crumb.path"
              class="flex min-w-0 items-center gap-1"
            >
              <ChevronRightIcon
                class="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
                aria-hidden="true"
              />
              <span
                v-if="index === state.breadcrumbs.length - 1"
                class="truncate px-1.5 py-1 font-medium"
                aria-current="page"
              >
                {{ crumb.name }}
              </span>
              <button
                v-else
                type="button"
                class="hover:bg-accent truncate rounded px-1.5 py-1"
                @click="controller.open(crumb.path)"
              >
                {{ crumb.name }}
              </button>
            </li>
          </template>
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
            :model-value="state.query"
            :placeholder="tt('search_placeholder', {}, 'Search…')"
            :aria-label="tt('search', {}, 'Search in this folder')"
            class="h-9 ps-8 sm:w-52"
            :disabled="state.trash"
            @update:model-value="controller.setQuery(String($event))"
          />
        </div>
        <label
          v-if="schema.search.recursive && !state.trash"
          class="flex items-center gap-2 text-sm"
        >
          <Checkbox
            :model-value="state.recursive"
            @update:model-value="controller.setRecursive($event === true)"
          />
          {{ tt('search_everywhere', {}, 'Include subfolders') }}
        </label>
        <label class="flex items-center gap-1">
          <span class="sr-only">{{ tt('sort', {}, 'Sort by') }}</span>
          <select
            :class="SELECT"
            :value="state.sort.field"
            @change="
              controller.setSort(
                ($event.target as HTMLSelectElement).value as FileManagerSortField,
                state.sort.direction,
              )
            "
          >
            <option v-for="field in SORT_FIELDS" :key="field" :value="field">
              {{ tt(`sort_${field}`, {}, field) }}
            </option>
          </select>
        </label>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          :aria-label="
            state.sort.direction === 'asc'
              ? tt('ascending', {}, 'Ascending')
              : tt('descending', {}, 'Descending')
          "
          @click="
            controller.setSort(state.sort.field, state.sort.direction === 'asc' ? 'desc' : 'asc')
          "
        >
          <ArrowUpIcon v-if="state.sort.direction === 'asc'" aria-hidden="true" />
          <ArrowDownIcon v-else aria-hidden="true" />
        </Button>
        <div class="flex rounded-md border" role="group" :aria-label="tt('view', {}, 'View')">
          <Button
            type="button"
            :variant="state.view === 'grid' ? 'secondary' : 'ghost'"
            size="icon-sm"
            :aria-pressed="state.view === 'grid'"
            :aria-label="tt('view_grid', {}, 'Grid')"
            @click="controller.setView('grid')"
          >
            <LayoutGridIcon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            :variant="state.view === 'list' ? 'secondary' : 'ghost'"
            size="icon-sm"
            :aria-pressed="state.view === 'list'"
            :aria-label="tt('view_list', {}, 'List')"
            @click="controller.setView('list')"
          >
            <ListIcon aria-hidden="true" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="tt('refresh', {}, 'Refresh')"
          @click="controller.refresh()"
        >
          <RefreshCwIcon aria-hidden="true" :class="cn(state.loading && 'animate-spin')" />
        </Button>
        <Button
          v-if="!state.trash && can('createFolder')"
          type="button"
          variant="outline"
          size="sm"
          @click="controller.openDialog({ type: 'createFolder' })"
        >
          <FolderPlusIcon aria-hidden="true" />
          <span class="max-sm:sr-only">{{ tt('new_folder', {}, 'New folder') }}</span>
        </Button>
        <template v-if="!state.trash && can('upload') && schema.upload">
          <Button type="button" size="sm" @click="uploadInput?.click()">
            <UploadIcon aria-hidden="true" />
            <span class="max-sm:sr-only">{{ tt('upload', {}, 'Upload') }}</span>
          </Button>
          <input
            ref="uploadInput"
            type="file"
            multiple
            hidden
            :accept="fileManagerAcceptAttribute(schema.upload.accept)"
            data-slot="file-manager-upload-input"
            @change="onUpload"
          />
        </template>
        <Button
          v-if="schema.trash && !picker"
          type="button"
          :variant="state.trash ? 'secondary' : 'ghost'"
          size="sm"
          :aria-pressed="state.trash"
          @click="controller.showTrash(!state.trash)"
        >
          <Trash2Icon aria-hidden="true" />
          <span class="max-sm:sr-only">{{
            state.trash ? tt('back_to_files', {}, 'Back to files') : tt('trash', {}, 'Trash')
          }}</span>
        </Button>
      </div>
    </div>

    <div
      v-if="selected.length > 0 && !picker"
      class="bg-muted/50 flex flex-wrap items-center gap-1 border-b px-3 py-2 text-sm"
      data-slot="file-manager-selection"
    >
      <span class="me-2 font-medium">{{
        tt('selected', { count: selected.length }, ':count selected')
      }}</span>
      <template v-if="state.trash">
        <Button
          v-if="can('restore')"
          type="button"
          variant="ghost"
          size="sm"
          @click="controller.restore()"
        >
          <RotateCcwIcon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('restore', {}, 'Restore') }}</span>
        </Button>
        <Button
          v-if="can('delete')"
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          @click="controller.confirmDelete()"
        >
          <Trash2Icon aria-hidden="true" />
          <span class="max-md:sr-only">{{
            tt('delete_permanently', {}, 'Delete permanently')
          }}</span>
        </Button>
      </template>
      <template v-else>
        <Button
          v-if="single"
          type="button"
          variant="ghost"
          size="sm"
          @click="controller.openEntry(single)"
        >
          <FolderOpenIcon v-if="single.type === 'folder'" aria-hidden="true" />
          <SearchIcon v-else aria-hidden="true" />
          <span class="max-md:sr-only">{{
            single.type === 'folder' ? tt('open', {}, 'Open') : tt('preview', {}, 'Preview')
          }}</span>
        </Button>
        <Button
          v-if="can('download') && (single?.type === 'file' || can('zip'))"
          type="button"
          variant="ghost"
          size="sm"
          @click="controller.download()"
        >
          <DownloadIcon aria-hidden="true" />
          <span class="max-md:sr-only">{{
            single?.type === 'file'
              ? tt('download', {}, 'Download')
              : tt('download_zip', {}, 'Download as zip')
          }}</span>
        </Button>
        <Button
          v-if="single && can('rename')"
          type="button"
          variant="ghost"
          size="sm"
          @click="controller.openDialog({ type: 'rename', entry: single })"
        >
          <PencilIcon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('rename', {}, 'Rename') }}</span>
        </Button>
        <Button
          v-if="can('move')"
          type="button"
          variant="ghost"
          size="sm"
          @click="
            controller.openDialog({ type: 'move', paths: state.selection, destination: state.path })
          "
        >
          <FolderInputIcon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('move', {}, 'Move') }}</span>
        </Button>
        <Button
          v-if="can('copy')"
          type="button"
          variant="ghost"
          size="sm"
          @click="
            controller.openDialog({ type: 'copy', paths: state.selection, destination: state.path })
          "
        >
          <CopyIcon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('copy', {}, 'Copy') }}</span>
        </Button>
        <Button
          v-if="single?.type === 'file' && can('share') && schema.share"
          type="button"
          variant="ghost"
          size="sm"
          @click="controller.openShare(single)"
        >
          <Share2Icon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('share', {}, 'Share') }}</span>
        </Button>
        <Button type="button" variant="ghost" size="sm" @click="controller.showDetails(single)">
          <InfoIcon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('details', {}, 'Details') }}</span>
        </Button>
        <Button
          v-if="can('delete')"
          type="button"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          @click="controller.confirmDelete()"
        >
          <Trash2Icon aria-hidden="true" />
          <span class="max-md:sr-only">{{ tt('delete', {}, 'Delete') }}</span>
        </Button>
      </template>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="ms-auto"
        :aria-label="tt('clear_selection', {}, 'Clear selection')"
        @click="controller.clearSelection()"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>

    <div :class="cn('flex', picker ? 'h-[60vh]' : 'min-h-[28rem]')">
      <aside
        class="hidden w-60 shrink-0 overflow-y-auto border-e p-2 md:block"
        data-slot="file-manager-sidebar"
      >
        <FileManagerTree
          :controller="controller"
          :active="state.trash ? null : state.path"
          :drop-handlers="canWrite ? dropHandlers : undefined"
          @open="openTreeFolder"
        />
      </aside>

      <div
        class="relative min-w-0 flex-1 overflow-y-auto"
        data-slot="file-manager-content"
        :data-drop-target="state.dropTarget === '' ? '' : undefined"
        v-on="canWrite ? dropHandlers('') : {}"
      >
        <p
          v-if="state.trash && state.retentionDays"
          class="text-muted-foreground border-b px-4 py-2 text-xs"
        >
          {{
            tt(
              'trash_hint',
              { days: state.retentionDays },
              'Items in the trash are deleted for good after :days days.',
            )
          }}
        </p>
        <p
          v-if="state.truncated || state.resultsTruncated"
          class="text-muted-foreground border-b px-4 py-2 text-xs"
          role="note"
        >
          {{
            state.resultsTruncated
              ? tt('search_truncated', {}, 'Only the first results are shown. Refine your search.')
              : tt('truncated', {}, 'This folder has more items than can be shown here.')
          }}
        </p>
        <p :id="hintId" class="sr-only">
          {{
            tt('keyboard', {}, 'Arrow keys move between items, Shift selects a range, Enter opens.')
          }}
        </p>

        <div
          v-if="(state.loading || state.searching) && entries.length === 0"
          class="flex justify-center py-16"
        >
          <Spinner />
          <span class="sr-only">{{ tt('loading', {}, 'Loading files') }}</span>
        </div>
        <div
          v-else-if="entries.length === 0"
          class="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center text-sm"
          data-slot="file-manager-empty"
        >
          <FolderOpenIcon class="size-10 opacity-40" aria-hidden="true" />
          <p class="text-foreground font-medium">
            {{
              state.query
                ? tt('no_results', {}, 'Nothing matches your search')
                : state.trash
                  ? tt('empty_trash_state', {}, 'The trash is empty')
                  : tt('empty', {}, 'This folder is empty')
            }}
          </p>
          <p v-if="!state.query && canWrite && can('upload')">
            {{ tt('empty_hint', {}, 'Drop files here or choose Upload.') }}
          </p>
        </div>
        <div
          v-else
          ref="listRef"
          role="listbox"
          :aria-multiselectable="!picker || schema.multiple === true"
          :aria-labelledby="labelId"
          :aria-describedby="hintId"
          :aria-busy="state.loading || undefined"
          data-slot="file-manager-items"
          :class="
            cn(
              state.view === 'grid'
                ? 'grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                : 'flex flex-col p-1',
              state.loading && 'opacity-60',
            )
          "
        >
          <div
            v-if="state.view === 'list'"
            class="text-muted-foreground hidden grid-cols-[1fr_7rem_10rem] gap-3 px-3 py-1.5 text-xs font-medium sm:grid"
            aria-hidden="true"
          >
            <span>{{ tt('name', {}, 'Name') }}</span>
            <span class="text-end">{{ tt('size', {}, 'Size') }}</span>
            <span>{{ tt('modified', {}, 'Modified') }}</span>
          </div>
          <div
            v-for="entry in entries"
            :key="entry.path"
            :ref="setItem(entry.path)"
            role="option"
            :aria-label="entry.name"
            :aria-selected="state.selection.includes(entry.path)"
            :aria-disabled="
              (picker && entry.type === 'file' && entry.selectable === false) || undefined
            "
            :tabindex="entry.path === focusPath ? 0 : -1"
            :draggable="canWrite && (can('move') || can('copy'))"
            data-slot="file-manager-item"
            :data-type="entry.type"
            :data-kind="entry.kind"
            :data-selected="state.selection.includes(entry.path) ? '' : undefined"
            :data-drop-target="state.dropTarget === entry.path ? '' : undefined"
            :title="entry.name"
            :class="
              cn(
                'group focus-visible:ring-ring/50 relative cursor-default rounded-lg outline-none select-none focus-visible:ring-[3px]',
                state.view === 'grid'
                  ? 'hover:bg-accent/50 flex flex-col gap-2 border p-2'
                  : 'hover:bg-accent/50 grid grid-cols-[auto_1fr] items-center gap-3 px-3 py-2 sm:grid-cols-[auto_1fr_7rem_10rem]',
                state.selection.includes(entry.path) &&
                  'bg-primary/10 border-primary/40 hover:bg-primary/15',
                state.dropTarget === entry.path && 'ring-primary ring-2',
                picker && entry.type === 'file' && entry.selectable === false && 'opacity-50',
              )
            "
            v-on="entry.type === 'folder' && canWrite ? dropHandlers(entry.path) : {}"
            @pointerdown="pointer = $event.pointerType"
            @click="onItemClick(entry, $event)"
            @dblclick="onItemDoubleClick(entry)"
            @keydown="onItemKeyDown"
            @focus="controller.focus(entry.path)"
            @dragstart="onDragStart(entry, $event)"
            @dragend="controller.dragEnd()"
          >
            <template v-if="state.view === 'grid'">
              <div
                class="bg-muted/60 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md"
              >
                <img
                  v-if="thumbnailOf(entry)"
                  :src="thumbnailOf(entry) ?? undefined"
                  alt=""
                  loading="lazy"
                  :draggable="false"
                  class="size-full object-cover"
                  @error="markBroken(entry.path)"
                />
                <FileManagerIcon v-else :entry="entry" class="size-10" />
              </div>
              <div class="min-w-0 px-0.5">
                <p class="truncate text-sm font-medium">{{ entry.name }}</p>
                <p class="text-muted-foreground truncate text-xs">
                  {{
                    locationOf(entry) ??
                    (entry.type === 'folder' ? tt('kinds.folder', {}, 'Folder') : sizeOf(entry))
                  }}
                </p>
              </div>
            </template>
            <template v-else>
              <img
                v-if="thumbnailOf(entry)"
                :src="thumbnailOf(entry) ?? undefined"
                alt=""
                loading="lazy"
                :draggable="false"
                class="size-8 rounded object-cover"
                @error="markBroken(entry.path)"
              />
              <FileManagerIcon v-else :entry="entry" class="size-5" />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ entry.name }}</p>
                <p v-if="locationOf(entry)" class="text-muted-foreground truncate text-xs">
                  {{ locationOf(entry) }}
                </p>
              </div>
              <span class="text-muted-foreground hidden text-end text-sm tabular-nums sm:block">{{
                sizeOf(entry)
              }}</span>
              <span class="text-muted-foreground hidden truncate text-sm sm:block">
                {{ entry.modified ? formatter.dateTime(entry.modified) : '' }}
              </span>
            </template>
            <CheckIcon
              v-if="state.selection.includes(entry.path)"
              class="bg-primary text-primary-foreground absolute end-1.5 top-1.5 size-4 rounded-full p-0.5"
              aria-hidden="true"
            />
          </div>
        </div>

        <div
          v-if="state.dropTarget === ''"
          class="border-primary bg-primary/5 text-primary pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed text-sm font-medium"
          data-slot="file-manager-drop"
        >
          {{ tt('drop_here', { folder: folderLabel }, 'Drop files to upload them to :folder') }}
        </div>
      </div>

      <aside
        v-if="state.detailsOpen"
        class="hidden w-72 shrink-0 overflow-y-auto border-s md:block"
        data-slot="file-manager-details"
      >
        <FileManagerDetails :controller="controller" />
      </aside>
    </div>

    <div
      v-if="state.trash && entries.length > 0 && can('delete')"
      class="flex justify-end border-t p-3"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        @click="controller.openDialog({ type: 'emptyTrash' })"
      >
        <Trash2Icon aria-hidden="true" />
        {{ tt('empty_trash', {}, 'Empty trash') }}
      </Button>
    </div>

    <div
      v-if="picker"
      class="flex flex-wrap items-center justify-end gap-2 border-t p-3"
      data-slot="file-manager-picker-footer"
    >
      <span class="text-muted-foreground me-auto text-sm">
        {{ selected.length > 0 ? tt('selected', { count: chosen.length }, ':count selected') : '' }}
      </span>
      <Button type="button" variant="outline" @click="onCancel?.()">{{
        tt('cancel', {}, 'Cancel')
      }}</Button>
      <Button type="button" :disabled="chosen.length === 0" @click="onChoose?.(chosen)">
        <CheckIcon aria-hidden="true" />
        {{ tt('picker_choose', {}, 'Choose') }}
      </Button>
    </div>

    <Sheet :open="foldersOpen" @update:open="foldersOpen = $event">
      <SheetContent :side="direction === 'rtl' ? 'right' : 'left'" class="p-4">
        <SheetHeader class="p-0">
          <SheetTitle>{{ tt('folders', {}, 'Folders') }}</SheetTitle>
        </SheetHeader>
        <FileManagerTree
          :controller="controller"
          :active="state.trash ? null : state.path"
          :drop-handlers="canWrite ? dropHandlers : undefined"
          @open="openTreeFolder"
        />
      </SheetContent>
    </Sheet>

    <Sheet
      :open="state.detailsOpen && mobile"
      @update:open="(open) => !open && controller.closeDetails()"
    >
      <SheetContent :side="direction === 'rtl' ? 'left' : 'right'" class="p-0">
        <SheetHeader>
          <SheetTitle>{{ tt('details', {}, 'Details') }}</SheetTitle>
        </SheetHeader>
        <FileManagerDetails :controller="controller" hide-heading />
      </SheetContent>
    </Sheet>

    <section
      v-if="state.uploads.length > 0"
      class="bg-popover fixed end-4 bottom-4 z-40 flex max-h-80 w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border shadow-lg"
      :aria-label="tt('uploads', {}, 'Uploads')"
      data-slot="file-manager-uploads"
    >
      <header class="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
        <UploadIcon class="size-4" aria-hidden="true" />
        <span class="flex-1" role="status">
          {{
            tt(
              'uploads_summary',
              { done: uploadsDone, total: state.uploads.length },
              ':done of :total uploaded',
            )
          }}
        </span>
        <Button
          v-if="uploadsFinished"
          type="button"
          variant="ghost"
          size="icon-xs"
          :aria-label="tt('dismiss', {}, 'Dismiss')"
          @click="controller.clearUploads()"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </header>
      <ul class="flex flex-col gap-2 overflow-y-auto p-3">
        <li
          v-for="upload in state.uploads"
          :key="upload.id"
          class="flex flex-col gap-1 text-sm"
          :data-status="upload.status"
        >
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 truncate">{{ upload.name }}</span>
            <CheckIcon
              v-if="upload.status === 'done'"
              class="size-4 text-emerald-600"
              :aria-label="tt('upload_done', {}, 'Uploaded')"
            />
            <Button
              v-else-if="upload.status === 'error'"
              type="button"
              variant="ghost"
              size="icon-xs"
              :aria-label="tt('dismiss', {}, 'Dismiss')"
              @click="controller.dismissUpload(upload.id)"
            >
              <XIcon aria-hidden="true" />
            </Button>
            <span v-else class="text-muted-foreground text-xs tabular-nums">{{
              formatter.percent(upload.progress)
            }}</span>
          </div>
          <p v-if="upload.status === 'error'" class="text-destructive text-xs" role="alert">
            {{ upload.error ?? tt('upload_failed', {}, 'Failed') }}
          </p>
          <div
            v-else-if="upload.status !== 'done'"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="Math.round(upload.progress * 100)"
            :aria-label="
              tt(
                'upload_progress',
                { name: upload.name, percent: formatter.percent(upload.progress) },
                ':name, :percent uploaded',
              )
            "
            class="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            <div
              class="bg-primary h-full rounded-full transition-[width]"
              :style="{ width: `${upload.progress * 100}%` }"
            />
          </div>
        </li>
      </ul>
    </section>

    <Dialog
      :open="dialog?.type === 'createFolder' || dialog?.type === 'rename'"
      @update:open="onDialogOpen"
    >
      <!-- The title and the labelled field say it all: no description. -->
      <DialogContent data-slot="file-manager-dialog" :aria-describedby="undefined">
        <form class="flex flex-col gap-4" @submit.prevent="submitName">
          <DialogHeader>
            <DialogTitle>
              {{
                dialog?.type === 'rename'
                  ? tt('rename_heading', { name: dialog.entry.name }, 'Rename “:name”')
                  : tt('new_folder', {}, 'New folder')
              }}
            </DialogTitle>
          </DialogHeader>
          <div class="flex flex-col gap-2">
            <label :for="nameId" class="text-sm font-medium">
              {{
                dialog?.type === 'rename'
                  ? tt('name', {}, 'Name')
                  : tt('folder_name', {}, 'Folder name')
              }}
            </label>
            <Input
              :id="nameId"
              v-model="name"
              autofocus
              :aria-invalid="state.error ? true : undefined"
              :aria-describedby="state.error ? errorId : undefined"
            />
            <p v-if="state.error" :id="errorId" class="text-destructive text-sm" role="alert">
              {{ state.error }}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="close">{{
              tt('cancel', {}, 'Cancel')
            }}</Button>
            <Button type="submit" :disabled="state.busy || name.trim() === ''">
              <Spinner v-if="state.busy" />
              {{ dialog?.type === 'rename' ? tt('save', {}, 'Save') : tt('create', {}, 'Create') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="dialog?.type === 'move' || dialog?.type === 'copy'" @update:open="onDialogOpen">
      <DialogContent data-slot="file-manager-dialog">
        <DialogHeader>
          <DialogTitle>
            {{
              dialog?.type === 'move' || dialog?.type === 'copy'
                ? choice(
                    `file-manager.${dialog.type}_heading`,
                    dialog.paths.length,
                    {},
                    dialog.type === 'move' ? 'Move :count items' : 'Copy :count items',
                  )
                : ''
            }}
          </DialogTitle>
          <DialogDescription>{{ tt('destination', {}, 'Destination folder') }}</DialogDescription>
        </DialogHeader>
        <div class="max-h-72 overflow-y-auto rounded-md border p-2">
          <FileManagerTree
            v-if="dialog?.type === 'move' || dialog?.type === 'copy'"
            :controller="controller"
            :active="dialog.destination"
            @open="chooseDestination"
          />
        </div>
        <p v-if="state.error" class="text-destructive text-sm" role="alert">{{ state.error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" @click="close">{{
            tt('cancel', {}, 'Cancel')
          }}</Button>
          <Button type="button" :disabled="state.busy" @click="submitTransfer">
            <Spinner v-if="state.busy" />
            {{
              dialog?.type === 'copy'
                ? tt('copy_here', {}, 'Copy here')
                : tt('move_here', {}, 'Move here')
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      :open="dialog?.type === 'delete' || dialog?.type === 'emptyTrash'"
      @update:open="onDialogOpen"
    >
      <DialogContent data-slot="file-manager-dialog">
        <DialogHeader>
          <DialogTitle>
            {{
              dialog?.type === 'delete'
                ? choice(
                    'file-manager.delete_heading',
                    dialog.paths.length,
                    {},
                    'Delete :count items?',
                  )
                : tt('empty_trash_heading', {}, 'Empty the trash?')
            }}
          </DialogTitle>
          <DialogDescription>
            {{
              dialog?.type === 'delete' && !dialog.permanent
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
                    )
            }}
          </DialogDescription>
        </DialogHeader>
        <p v-if="state.error" class="text-destructive text-sm" role="alert">{{ state.error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" @click="close">{{
            tt('cancel', {}, 'Cancel')
          }}</Button>
          <Button type="button" variant="destructive" :disabled="state.busy" @click="submitDelete">
            <Spinner v-if="state.busy" />
            {{
              dialog?.type === 'emptyTrash'
                ? tt('empty_trash', {}, 'Empty trash')
                : dialog?.type === 'delete' && dialog.permanent
                  ? tt('delete_permanently', {}, 'Delete permanently')
                  : tt('delete', {}, 'Delete')
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="dialog?.type === 'share'" @update:open="onDialogOpen">
      <DialogContent data-slot="file-manager-dialog">
        <template v-if="dialog?.type === 'share'">
          <DialogHeader>
            <DialogTitle>{{
              tt('share_heading', { name: dialog.entry.name }, 'Share “:name”')
            }}</DialogTitle>
            <DialogDescription>{{
              tt('share_hint', {}, 'Anyone with the link can open this file, without signing in.')
            }}</DialogDescription>
          </DialogHeader>
          <div class="flex flex-wrap items-end gap-2">
            <label class="flex min-w-40 flex-1 flex-col gap-1 text-sm">
              <span class="font-medium">{{ tt('share_expiry', {}, 'Link expires after') }}</span>
              <select v-model="expiry" :class="SELECT">
                <option
                  v-for="minutes in share?.expiries ?? []"
                  :key="minutes"
                  :value="String(minutes)"
                >
                  {{ expiryLabel(minutes) }}
                </option>
                <option v-if="share?.publicLinks" value="never">
                  {{ tt('expiry_never', {}, 'Never') }}
                </option>
              </select>
            </label>
            <Button
              type="button"
              :disabled="state.busy"
              @click="controller.createLink(expiry === 'never' ? null : Number(expiry))"
            >
              <Spinner v-if="state.busy" />
              <LinkIcon v-else aria-hidden="true" />
              {{ tt('create_link', {}, 'Create link') }}
            </Button>
          </div>
          <p v-if="state.error" class="text-destructive text-sm" role="alert">{{ state.error }}</p>
          <div v-if="dialog.url" class="flex flex-col gap-1">
            <span class="text-sm font-medium">{{ tt('link', {}, 'Shareable link') }}</span>
            <div class="flex gap-2">
              <Input
                readonly
                :model-value="dialog.url"
                dir="ltr"
                :aria-label="tt('link', {}, 'Shareable link')"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <Button type="button" variant="outline" @click="copy(dialog.url ?? '')">
                <CheckIcon v-if="copied" aria-hidden="true" />
                <CopyIcon v-else aria-hidden="true" />
                {{
                  copied ? tt('link_copied', {}, 'Link copied') : tt('copy_link', {}, 'Copy link')
                }}
              </Button>
            </div>
            <span class="text-muted-foreground text-xs">
              {{
                dialog.expiresAt
                  ? tt(
                      'link_expires',
                      { date: formatter.dateTime(dialog.expiresAt) },
                      'Expires :date',
                    )
                  : tt('link_never_expires', {}, 'Never expires')
              }}
            </span>
          </div>
          <div v-if="share?.publicLinks" class="flex flex-col gap-2" data-slot="file-manager-links">
            <h4 class="text-sm font-medium">{{ tt('links', {}, 'Links') }}</h4>
            <Spinner v-if="dialog.links === null" />
            <p v-else-if="dialog.links.length === 0" class="text-muted-foreground text-sm">
              {{ tt('no_links', {}, 'No links yet') }}
            </p>
            <ul v-else class="flex max-h-48 flex-col divide-y overflow-y-auto rounded-md border">
              <li
                v-for="link in dialog.links"
                :key="link.id"
                class="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <div class="min-w-0 flex-1">
                  <p
                    :class="cn('truncate', link.expired && 'text-muted-foreground line-through')"
                    dir="ltr"
                  >
                    {{ link.url }}
                  </p>
                  <p class="text-muted-foreground text-xs">
                    {{
                      link.expired
                        ? tt('link_expired', {}, 'Expired')
                        : link.expiresAt
                          ? tt(
                              'link_expires',
                              { date: formatter.dateTime(link.expiresAt) },
                              'Expires :date',
                            )
                          : tt('link_never_expires', {}, 'Never expires')
                    }}
                    ·
                    {{
                      choice('file-manager.link_downloads', link.downloads, {}, ':count downloads')
                    }}
                  </p>
                </div>
                <Button
                  v-if="link.url && !link.expired"
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  :aria-label="tt('copy_link', {}, 'Copy link')"
                  @click="copy(link.url ?? '')"
                >
                  <CopyIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive"
                  @click="controller.revokeLink(link.id)"
                >
                  {{ tt('revoke', {}, 'Revoke') }}
                </Button>
              </li>
            </ul>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="close">{{
              tt('close', {}, 'Close')
            }}</Button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>

    <Dialog :open="preview !== null" @update:open="(open) => !open && controller.closePreview()">
      <DialogContent
        class="flex max-h-[90vh] flex-col sm:max-w-4xl"
        data-slot="file-manager-preview"
        :aria-describedby="undefined"
        @keydown="onPreviewKeyDown"
      >
        <DialogHeader>
          <DialogTitle class="truncate pe-8">{{ preview?.entry.name }}</DialogTitle>
        </DialogHeader>
        <div
          class="bg-muted/40 flex min-h-64 flex-1 items-center justify-center overflow-auto rounded-md"
        >
          <Spinner v-if="!previewData" />
          <div
            v-else-if="!previewData.previewable"
            class="text-muted-foreground flex flex-col items-center gap-2 p-8 text-center text-sm"
          >
            <FileManagerIcon v-if="preview" :entry="preview.entry" class="size-12" />
            <p>{{ tt('preview_unavailable', {}, 'There is no preview for this type of file.') }}</p>
          </div>
          <img
            v-else-if="previewData.kind === 'image'"
            :src="previewData.url"
            :alt="preview?.entry.name ?? ''"
            class="max-h-[70vh] max-w-full object-contain"
          />
          <iframe
            v-else-if="previewData.kind === 'pdf'"
            :src="previewData.url"
            :title="preview?.entry.name ?? ''"
            class="h-[70vh] w-full rounded-md bg-white"
          />
          <video
            v-else-if="previewData.kind === 'video'"
            :src="previewData.url"
            controls
            class="max-h-[70vh] max-w-full"
          >
            <track kind="captions" />
          </video>
          <audio
            v-else-if="previewData.kind === 'audio'"
            :src="previewData.url"
            controls
            class="w-full max-w-md"
          />
          <pre
            v-else
            class="h-full max-h-[70vh] w-full overflow-auto p-4 font-mono text-xs whitespace-pre-wrap"
            dir="auto"
            tabindex="0"
            >{{ previewData.text }}</pre>
        </div>
        <p v-if="previewData?.truncated" class="text-muted-foreground text-xs">
          {{ tt('preview_truncated', {}, 'Only the beginning of this file is shown.') }}
        </p>
        <DialogFooter class="flex-row flex-wrap items-center sm:justify-between">
          <div class="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              :disabled="!previous"
              :aria-label="tt('previous', {}, 'Previous file')"
              @click="previous && controller.openPreview(previous)"
            >
              <ChevronLeftIcon class="rtl:rotate-180" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              :disabled="!next"
              :aria-label="tt('next', {}, 'Next file')"
              @click="next && controller.openPreview(next)"
            >
              <ChevronRightIcon class="rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
          <div class="flex gap-2">
            <Button
              v-if="previewData?.editable && previewData.url"
              type="button"
              variant="outline"
              size="sm"
              @click="editImage"
            >
              <SquarePenIcon aria-hidden="true" />
              {{ tt('edit_image', {}, 'Edit image') }}
            </Button>
            <Button v-if="previewData?.downloadUrl" type="button" size="sm" as-child>
              <a :href="previewData.downloadUrl">
                <DownloadIcon aria-hidden="true" />
                {{ tt('download', {}, 'Download') }}
              </a>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ImageEditorDialog :request="editing" :options="IMAGE_EDITOR" />
  </Card>
</template>
