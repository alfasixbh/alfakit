<script lang="ts">
import { defineComponent } from 'vue'
import { lazyComponent } from '../../lib/lazy'

// The image editor's code loads with the first image to edit, not with the form.
const ImageEditorDialog = lazyComponent(
  'ImageEditorDialog',
  () => import('./ImageEditorDialog.vue').then((module) => module.default),
  defineComponent({ name: 'ImageEditorDialogLoading', render: () => null }),
)
</script>

<script setup lang="ts">
import type { FileUploadSchema, UploadedFile } from '@alfakit/core'
import {
  canEditImage,
  concurrencyLimiter,
  cssAspectRatio,
  editableImageName,
  fetchEditableImage,
  fieldMemory,
  fileUploadAccept,
  filesFromClipboard,
  fileUploadEntries,
  fileUploadPaths,
  fileManagerSize,
  insertUploadedFile,
  moveRepeaterItem,
  requestJson,
  transformImage,
  uploadedFileLinks,
  panelUploadOptions,
  uploadTemporaryFile,
} from '@alfakit/core'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  PencilIcon,
  UploadCloudIcon,
  XIcon,
} from '@lucide/vue'
import { computed, ref, shallowRef, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useChoice, useFormatter, usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'
import { useField, useFormStore } from '../form/form-context'
import FieldWrapper from '../schema/FieldWrapper.vue'
import Button from '../ui/Button.vue'
import Spinner from '../ui/Spinner.vue'
import type { ImageEditRequest } from './ImageEditorDialog.vue'

interface LocalFile extends UploadedFile {
  progress?: number
  error?: string
  preview?: string
}

const props = defineProps<{ component: FileUploadSchema }>()
const t = useT()
const formatter = useFormatter()
const choice = useChoice()
const panel = usePanel()
const {
  value,
  setValue,
  error,
  id,
  disabled: fieldDisabled,
  readOnly,
  aria,
} = useField<string | string[] | null>(() => props.component)
// Read-only keeps open/download links but hides upload and remove controls.
const disabled = computed(() => fieldDisabled.value || readOnly.value)
const store = useFormStore()
// In-flight uploads and the metadata of files uploaded in this session (the server schema
// only knows about saved files) live in the form's field memory, not in component state:
// a virtualised Repeater item unmounts when scrolled out of view and finds them again,
// local image previews included, when it mounts back.
const uploadingStore = fieldMemory<LocalFile[]>(
  store,
  `${props.component.statePath}:uploading`,
  () => [],
)
const uploadedStore = fieldMemory<FileUploadSchema['files']>(
  store,
  `${props.component.statePath}:uploaded`,
  () => [],
)
const uploadingState = useStore(uploadingStore)
const uploadedState = useStore(uploadedStore)
const uploading = computed({
  get: () => uploadingState.value,
  set: (next: LocalFile[]) => uploadingStore.set(next),
})
const uploaded = computed({
  get: () => uploadedState.value,
  set: (next: FileUploadSchema['files']) => uploadedStore.set(next),
})
const dragging = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const dragPath = ref<string | null>(null)
// The image open in the editor (`imageEditor()`), one at a time.
const editing = shallowRef<ImageEditRequest | null>(null)
const editorRequested = ref(false)

watch(editing, (request) => {
  if (request) editorRequested.value = true
})
const editImage = (file: File) =>
  new Promise<File | null>((resolve) => {
    editing.value = {
      file,
      resolve: (edited) => {
        editing.value = null
        resolve(edited)
      },
    }
  })
// Object URLs made for local image previews; released when the file is removed.
const objectUrls = fieldMemory<Set<string>>(
  store,
  `${props.component.statePath}:previews`,
  () => new Set(),
).get()

const releasePreview = (url: string | undefined) => {
  if (url && objectUrls.delete(url)) URL.revokeObjectURL(url)
}

const paths = computed(() => fileUploadPaths(value.value))
const files = computed<LocalFile[]>(() =>
  fileUploadEntries(paths.value, props.component.files, uploaded.value),
)
const maxFiles = computed(() =>
  props.component.multiple ? (props.component.maxFiles ?? Infinity) : 1,
)
const canAddMore = computed(() => files.value.length + uploading.value.length < maxFiles.value)
const circle = computed(() => props.component.panelLayout === 'circle' || props.component.avatar)
const integrated = computed(() => props.component.panelLayout === 'integrated' && !circle.value)
const removeAtStart = computed(() => props.component.positions?.removeButton === 'start')
const progressAtStart = computed(() => props.component.positions?.progressIndicator === 'start')
const uploadAlign = computed(() => props.component.positions?.uploadButton ?? 'center')

const commit = (next: string[]) => setValue(props.component.multiple ? next : (next[0] ?? null))

const upload = async (list: FileList | File[]) => {
  const endpoint = panel.value.endpoints.upload

  if (!endpoint) {
    return
  }

  const accepted = Array.from(list).slice(
    0,
    Math.max(0, maxFiles.value - files.value.length - uploading.value.length),
  )

  // `maxParallelUploads()`: files are prepared (edited, resized) one by one and then
  // queued, so at most that many upload at once.
  const limit = concurrencyLimiter(props.component.maxParallelUploads ?? 1)
  const queued: Promise<void>[] = []

  for (const [position, picked] of accepted.entries()) {
    let original = picked
    const edit = Boolean(props.component.imageEditor && canEditImage(picked))

    if (edit) {
      const edited = await editImage(picked)

      // Cancelled: the file is not uploaded.
      if (!edited) continue

      original = edited
    }

    const file = await prepare(original, edit)

    if (!file) continue

    const local = pendingFile(file, position)
    uploading.value = [...uploading.value, local]

    // Submits wait for queued and running uploads, so saving now doesn't drop the file.
    queued.push(store.trackUpload(limit(() => send(endpoint, file, local))))
  }

  await Promise.all(queued)
}

/** Resize and orient a picked (or edited) file, and check its size. Null when rejected. */
const prepare = async (original: File, edited: boolean): Promise<File | null> => {
  const file =
    props.component.imageCropAspectRatio ||
    props.component.imageResizeTargetWidth ||
    props.component.imageResizeTargetHeight ||
    props.component.orientImagesFromExif
      ? await transformImage(original, {
          // The editor already cropped the image.
          aspectRatio: edited ? null : props.component.imageCropAspectRatio,
          mode: props.component.imageResizeMode,
          width: props.component.imageResizeTargetWidth,
          height: props.component.imageResizeTargetHeight,
          orient: props.component.orientImagesFromExif,
        })
      : original

  if (props.component.minSize && file.size < props.component.minSize * 1024) {
    uploading.value = [
      ...uploading.value,
      {
        path: file.name,
        name: file.name,
        size: file.size,
        error: t('form.file_too_small', {}, 'This file is too small.'),
      },
    ]
    failed(file.name)

    return null
  }

  if (props.component.maxSize && file.size > props.component.maxSize * 1024) {
    uploading.value = [
      ...uploading.value,
      {
        path: file.name,
        name: file.name,
        size: file.size,
        error: t('form.file_too_large', {}, 'This file is too large.'),
      },
    ]
    failed(file.name)

    return null
  }

  return file
}

/** The in-progress entry shown while `file` uploads. */
const pendingFile = (file: File, position: number | string): LocalFile => {
  const local: LocalFile = {
    // Unique within the batch and across re-picks of a changed file.
    path: `pending:${position}:${file.lastModified}:${file.size}:${file.name}`,
    name: file.name,
    size: file.size,
    progress: 0,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
  }
  if (local.preview) objectUrls.add(local.preview)

  return local
}

// `imageEditor()`: uploaded JPEG, PNG and WebP images can be edited again.
const canEditExisting = (file: LocalFile, index: number) =>
  Boolean(props.component.imageEditor) &&
  !disabled.value &&
  index < files.value.length &&
  !file.missing &&
  Boolean(file.url ?? file.preview) &&
  editableImageName(file) !== null

/**
 * The "Edit" button on an uploaded image: open it in the editor and upload the result
 * in its place (the old file goes like any removed one: a temporary upload is deleted
 * now, a stored file when the form is saved with `deleteRemovedFiles()`).
 */
const editExisting = async (existing: LocalFile) => {
  const endpoint = panel.value.endpoints.upload
  const url = existing.url ?? existing.preview
  const name = editableImageName(existing)

  if (!endpoint || !url || !name) return

  const source = await fetchEditableImage(url, name)

  if (!source) {
    uploading.value = [
      ...uploading.value,
      {
        path: `failed:${existing.path}`,
        name: existing.name,
        error: t('image_editor.load_failed', {}, 'The image could not be opened.'),
      },
    ]

    return
  }

  const edited = await editImage(source)

  // Cancelled, or the editor couldn't decode it: keep the file as it is.
  if (!edited || edited === source) return

  const file = await prepare(edited, true)

  if (!file) return

  const local = pendingFile(file, `edit:${existing.path}`)
  uploading.value = [...uploading.value, local]
  await store.trackUpload(send(endpoint, file, local, existing.path))
}

const send = async (endpoint: string, file: File, local: LocalFile, replacing?: string) => {
  try {
    // Large files go in resumable chunks; progress covers the whole file.
    const response = await uploadTemporaryFile(endpoint, file, {
      ...panelUploadOptions(panel.value, props.component.uploadPolicy),
      onProgress: (progress) => {
        uploading.value = uploading.value.map((item) =>
          item.path === local.path ? { ...item, progress } : item,
        )
      },
    })

    uploaded.value = [
      ...uploaded.value,
      {
        path: response.key,
        name: response.name,
        size: response.size,
        temporary: true,
        url: local.preview,
      },
    ]
    uploading.value = uploading.value.filter((item) => item.path !== local.path)
    // Read the store, not `value`: it may lag behind within a batch.
    const current = fileUploadPaths(
      store.getValue<string | string[] | null>(props.component.statePath, null),
    )

    if (replacing !== undefined && current.includes(replacing)) {
      // An edited image takes the old one's place.
      commit(current.map((path) => (path === replacing ? response.key : path)))
      discard(replacing)
    } else {
      commit(insertUploadedFile(current, response.key, props.component, maxFiles.value))
    }
  } catch (uploadError) {
    const message =
      (uploadError as { errors?: Record<string, string[]> }).errors?.file?.[0] ??
      (uploadError as Error).message
    uploading.value = uploading.value.map((item) =>
      item.path === local.path ? { ...item, error: message, progress: undefined } : item,
    )
    failed(local.path)
  }
}

/** A picked file that didn't upload: saving stops until it is removed. */
const failed = (path: string) =>
  store.failUpload(
    path,
    props.component.statePath,
    t(
      'form.upload_not_saved',
      {},
      "A file didn't upload. Remove it or upload it again before saving.",
    ),
  )

const remove = (path: string) => {
  commit(paths.value.filter((item) => item !== path))
  discard(path)
}

/** Release a file that left the field: its preview, and a temporary upload's file. */
const discard = (path: string) => {
  releasePreview(uploadedStore.get().find((file) => file.path === path)?.url)

  if (path.startsWith('tmp:') && panel.value.endpoints.uploadDestroy) {
    void requestJson(panel.value.endpoints.uploadDestroy, {
      method: 'DELETE',
      body: { key: path },
    }).catch(() => undefined)
  }
}

const removeEntry = (file: LocalFile) => {
  if (file.error || file.progress !== undefined) {
    releasePreview(file.preview)
    store.forgetFailedUpload(file.path)
    uploading.value = uploading.value.filter((item) => item.path !== file.path)
  } else {
    remove(file.path)
  }
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  dragging.value = false

  if (!disabled.value && event.dataTransfer && event.dataTransfer.files.length > 0) {
    void upload(event.dataTransfer.files)
  }
}

// `pasteable()`: images and files pasted while the drop zone has focus.
const onPaste = (event: ClipboardEvent) => {
  if (disabled.value || props.component.pasteable === false) return

  const pasted = filesFromClipboard(event.clipboardData)

  if (pasted.length > 0) {
    event.preventDefault()
    void upload(pasted)
  }
}

const onPick = (event: Event) => {
  const input = event.target as HTMLInputElement
  // Copy the list: clearing the input empties it while the editor is open.
  const picked = input.files ? Array.from(input.files) : []
  input.value = ''
  void upload(picked)
}

const move = (from: number, to: number) =>
  commit(moveRepeaterItem(paths.value, from, to) as string[])
const reorderable = computed(() =>
  Boolean(props.component.reorderable && props.component.multiple && !disabled.value),
)

const onItemDrop = (event: DragEvent, index: number) => {
  if (!reorderable.value || dragPath.value === null) return
  event.preventDefault()
  event.stopPropagation()
  const from = paths.value.indexOf(dragPath.value)
  if (from !== -1 && index < files.value.length) move(from, index)
  dragPath.value = null
}

const hints = computed(() =>
  [
    props.component.acceptedFileTypesLabel,
    props.component.maxSize
      ? `≤ ${fileManagerSize(props.component.maxSize * 1024, formatter.value)}`
      : null,
    props.component.minFiles
      ? choice(
          'form.min_files',
          props.component.minFiles,
          {},
          'At least :count file|At least :count files',
        )
      : null,
  ]
    .filter(Boolean)
    .join(' · '),
)

// `previewable(false)` shows every file as a name and icon, without the image.
const isImage = (file: LocalFile) =>
  props.component.previewable !== false &&
  (props.component.image || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.name))

// Previews whose image failed to load (missing or unreachable file) show the file icon.
const brokenPreviews = ref<ReadonlySet<string>>(new Set())

/** `imagePreviewHeight()`: numbers are pixels, strings are CSS lengths (`'250px'`, `'10rem'`). */
function cssLength(value: number | string): string {
  return typeof value === 'number' || /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value
}
</script>

<template>
  <FieldWrapper :field="props.component" :html-for="id" :error="error">
    <div
      data-slot="file-upload"
      :data-layout="props.component.panelLayout"
      :class="cn('flex flex-col gap-3', integrated && 'rounded-md border p-2')"
    >
      <ul
        v-if="files.length > 0 || uploading.length > 0"
        :class="
          cn(
            'grid gap-2',
            props.component.panelLayout === 'grid' && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
            circle && 'justify-items-center',
          )
        "
      >
        <li
          v-for="(file, index) in [...files, ...uploading]"
          :key="file.path"
          :draggable="reorderable && index < files.length"
          :class="
            cn(
              dragPath === file.path && 'opacity-50',
              'bg-muted/30 relative flex min-w-0 items-center gap-3 overflow-hidden rounded-md border p-2 text-sm',
              circle && 'size-28 justify-center rounded-full border-0 p-0',
              file.error && 'border-destructive',
            )
          "
          @dragstart="dragPath = file.path"
          @dragover="reorderable && $event.preventDefault()"
          @drop="onItemDrop($event, index)"
          @dragend="dragPath = null"
        >
          <Button
            v-if="!circle && removeAtStart && props.component.deletable && !disabled"
            type="button"
            variant="ghost"
            size="icon-xs"
            :aria-label="t('file_upload.remove', { name: file.name }, 'Remove :name')"
            @click="removeEntry(file)"
            ><XIcon
          /></Button>
          <Spinner
            v-if="!circle && progressAtStart && file.progress !== undefined && !file.error"
          />
          <img
            v-if="isImage(file) && (file.url || file.preview) && !brokenPreviews.has(file.path)"
            :src="file.url ?? file.preview"
            alt=""
            :class="cn('size-12 shrink-0 rounded object-cover', circle && 'size-28 rounded-full')"
            :style="
              !circle && props.component.imagePreviewHeight
                ? {
                    height: cssLength(props.component.imagePreviewHeight),
                    width: 'auto',
                    maxWidth: '50%',
                  }
                : undefined
            "
            @error="brokenPreviews = new Set(brokenPreviews).add(file.path)"
          />
          <FileIcon v-else-if="!circle" class="text-muted-foreground size-6 shrink-0" />
          <div v-if="!circle" class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ file.name }}</p>
            <p :class="cn('text-muted-foreground text-xs', file.missing && 'text-destructive')">
              {{
                file.error ??
                (file.missing
                  ? t('form.file_missing', {}, 'This file no longer exists.')
                  : file.progress !== undefined && !file.error
                    ? (props.component.uploadingMessage ?? t('form.uploading', {}, 'Uploading…'))
                    : file.size
                      ? fileManagerSize(file.size, formatter)
                      : file.temporary
                        ? t('form.uploading', {}, 'Pending')
                        : '')
              }}
            </p>
          </div>
          <div :class="cn('flex items-center gap-1', circle && 'absolute -end-1 -bottom-1')">
            <Spinner
              v-if="(circle || !progressAtStart) && file.progress !== undefined && !file.error"
            />
            <template v-if="reorderable && index < files.length">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                :aria-label="t('file_upload.move_up', { name: file.name }, 'Move :name up')"
                :disabled="index === 0"
                @click="move(index, index - 1)"
                ><ChevronUpIcon
              /></Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                :aria-label="t('file_upload.move_down', { name: file.name }, 'Move :name down')"
                :disabled="index === files.length - 1"
                @click="move(index, index + 1)"
                ><ChevronDownIcon
              /></Button>
            </template>
            <Button
              v-if="canEditExisting(file, index)"
              type="button"
              :variant="circle ? 'secondary' : 'ghost'"
              size="icon-xs"
              :class="cn(circle && 'rounded-full shadow')"
              :aria-label="t('file_upload.edit', { name: file.name }, 'Edit :name')"
              :title="t('image_editor.title', {}, 'Edit image')"
              data-action="edit-image"
              @click="void editExisting(file)"
              ><PencilIcon
            /></Button>
            <Button
              v-if="props.component.openable && uploadedFileLinks(file).open"
              as-child
              type="button"
              variant="ghost"
              size="icon-xs"
            >
              <a
                :href="uploadedFileLinks(file).open"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="`${t('file_upload.open', { name: file.name }, 'Open :name')} ${t('opens_in_new_tab', {}, '(opens in a new tab)')}`"
                ><ExternalLinkIcon
              /></a>
            </Button>
            <Button
              v-if="props.component.downloadable && uploadedFileLinks(file).download"
              as-child
              type="button"
              variant="ghost"
              size="icon-xs"
            >
              <a
                :href="uploadedFileLinks(file).download"
                download
                :aria-label="t('file_upload.download', { name: file.name }, 'Download :name')"
                ><DownloadIcon
              /></a>
            </Button>
            <Button
              v-if="props.component.deletable && !disabled && (circle || !removeAtStart)"
              type="button"
              :variant="circle ? 'secondary' : 'ghost'"
              size="icon-xs"
              :class="cn(circle && 'rounded-full shadow')"
              :aria-label="t('file_upload.remove', { name: file.name }, 'Remove :name')"
              @click="removeEntry(file)"
              ><XIcon
            /></Button>
          </div>
        </li>
      </ul>
      <div
        v-if="canAddMore && !disabled"
        role="button"
        tabindex="0"
        :data-align="uploadAlign"
        :style="
          !circle && props.component.panelAspectRatio
            ? { aspectRatio: cssAspectRatio(props.component.panelAspectRatio) }
            : undefined
        "
        :class="
          cn(
            'text-muted-foreground hover:border-ring flex cursor-pointer flex-col justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-sm transition-colors',
            uploadAlign === 'start'
              ? 'items-start text-start'
              : uploadAlign === 'end'
                ? 'items-end text-end'
                : 'items-center text-center',
            integrated && 'border-transparent',
            dragging && 'border-ring bg-accent',
            circle && 'size-28 items-center rounded-full py-0',
          )
        "
        :aria-describedby="aria['aria-describedby']"
        @click="inputRef?.click()"
        @keydown.enter.prevent="inputRef?.click()"
        @keydown.space.prevent="inputRef?.click()"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop="onDrop"
        @paste="onPaste"
      >
        <UploadCloudIcon class="size-5" />
        <span v-if="!circle">{{
          props.component.placeholder ??
          t('form.drop_files', {}, 'Drop files here or click to browse')
        }}</span>
        <span v-if="!circle && hints" class="text-muted-foreground text-xs">{{ hints }}</span>
      </div>
      <input
        :id="id"
        ref="inputRef"
        type="file"
        class="sr-only"
        tabindex="-1"
        :aria-invalid="aria['aria-invalid']"
        :aria-describedby="aria['aria-describedby']"
        :aria-required="aria['aria-required']"
        :multiple="props.component.multiple"
        :accept="fileUploadAccept(props.component)"
        :disabled="disabled"
        @change="onPick"
      />
      <!-- Mounted from the first edit on (it stays for its closing animation). -->
      <ImageEditorDialog
        v-if="props.component.imageEditor && (editing || editorRequested)"
        :request="editing"
        :options="props.component.imageEditor"
      />
    </div>
  </FieldWrapper>
</template>
