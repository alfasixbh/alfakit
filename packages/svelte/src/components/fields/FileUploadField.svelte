<script lang="ts" module>
  import type { ComponentProps } from 'svelte'
  import { lazyLoader } from '../../lib/lazy'
  import type ImageEditorDialogComponent from './ImageEditorDialog.svelte'

  // The image editor's code loads with the first image to edit, not with the form.
  const imageEditor = lazyLoader<ComponentProps<typeof ImageEditorDialogComponent>>(() =>
    import('./ImageEditorDialog.svelte').then((module) => module.default),
  )
</script>

<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { uniqueKey } from '../../lib/keys'
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
    fileManagerSize,
    fileUploadEntries,
    fileUploadPaths,
    insertUploadedFile,
    moveRepeaterItem,
    requestJson,
    transformImage,
    uploadedFileLinks,
    panelUploadOptions,
    uploadTemporaryFile,
  } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up'
  import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload'
  import DownloadIcon from '@lucide/svelte/icons/download'
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link'
  import FileIcon from '@lucide/svelte/icons/file'
  import PencilIcon from '@lucide/svelte/icons/pencil'
  import XIcon from '@lucide/svelte/icons/x'
  import { untrack } from 'svelte'
  import { useChoice, useFormatter, usePanel, useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'
  import { useField, useFormStore } from '../form/form-context.svelte'
  import FieldWrapper from '../schema/FieldWrapper.svelte'
  import { Button } from '../ui/button'
  import { Spinner } from '../ui/spinner'
  import type { ImageEditRequest } from './ImageEditorDialog.svelte'
  import Lazy from '../../lib/Lazy.svelte'

  interface LocalFile extends UploadedFile {
    progress?: number
    error?: string
    preview?: string
  }

  let { component }: { component: FileUploadSchema } = $props()

  const t = useT()
  const formatter = useFormatter()
  const choice = useChoice()
  const panel = usePanel()
  const field = useField<string | string[] | null>(() => component)
  // Read-only keeps open/download links but hides upload and remove controls.
  const locked = $derived(field.disabled || field.readOnly)
  const store = useFormStore()
  // Memory is keyed by the path the field mounted with; a field keeps its path for its lifetime.
  const statePath = untrack(() => component.statePath)
  // In-flight uploads and the metadata of files uploaded in this session (the server schema
  // only knows about saved files) live in the form's field memory, not in component state:
  // a virtualised Repeater item unmounts when scrolled out of view and finds them again,
  // local image previews included, when it mounts back.
  const uploadingStore = fieldMemory<LocalFile[]>(store, `${statePath}:uploading`, () => [])
  const uploadedStore = fieldMemory<FileUploadSchema['files']>(
    store,
    `${statePath}:uploaded`,
    () => [],
  )
  const uploadingState = useStore(uploadingStore)
  const uploadedState = useStore(uploadedStore)
  const uploading = $derived(uploadingState.current)
  const uploaded = $derived(uploadedState.current)
  // Unique id for files that are still uploading or were rejected locally, so
  // picking the same file twice never produces two list items with one key.
  let localId = 0
  let dragging = $state(false)
  let input = $state<HTMLInputElement | null>(null)
  let dragPath = $state<string | null>(null)
  // The image open in the editor (`imageEditor()`), one at a time.
  let editing = $state.raw<ImageEditRequest | null>(null)
  let editorRequested = $state(false)

  $effect.pre(() => {
    if (editing) editorRequested = true
  })

  const editImage = (file: File) =>
    new Promise<File | null>((resolve) => {
      editing = {
        file,
        resolve: (edited) => {
          editing = null
          resolve(edited)
        },
      }
    })
  // Object URLs made for local image previews; released when the file is removed.
  // Not reactive state: nothing renders from it.
  const objectUrls = fieldMemory<string[]>(store, `${statePath}:previews`, () => []).get()

  const releasePreview = (url: string | undefined) => {
    const index = url ? objectUrls.indexOf(url) : -1

    if (index === -1) return
    objectUrls.splice(index, 1)
    URL.revokeObjectURL(url as string)
  }

  const paths = $derived(fileUploadPaths(field.value))
  const files = $derived<LocalFile[]>(fileUploadEntries(paths, component.files, uploaded))
  const maxFiles = $derived(component.multiple ? (component.maxFiles ?? Infinity) : 1)
  const listed = $derived([...files, ...uploading])
  const canAddMore = $derived(files.length + uploading.length < maxFiles)
  const circle = $derived(component.panelLayout === 'circle' || component.avatar)
  const integrated = $derived(component.panelLayout === 'integrated' && !circle)
  const removeAtStart = $derived(component.positions?.removeButton === 'start')
  const progressAtStart = $derived(component.positions?.progressIndicator === 'start')
  const uploadAlign = $derived(component.positions?.uploadButton ?? 'center')

  const commit = (next: string[]) => field.setValue(component.multiple ? next : (next[0] ?? null))

  const upload = async (list: FileList | File[]) => {
    const endpoint = panel.endpoints.upload

    if (!endpoint) {
      return
    }

    const accepted = Array.from(list).slice(
      0,
      Math.max(0, maxFiles - files.length - uploading.length),
    )

    // `maxParallelUploads()`: files are prepared (edited, resized) one by one and then
    // queued, so at most that many upload at once.
    const limit = concurrencyLimiter(component.maxParallelUploads ?? 1)
    const queued: Promise<void>[] = []

    for (const picked of accepted) {
      let original = picked
      const edit = Boolean(component.imageEditor && canEditImage(picked))

      if (edit) {
        const edited = await editImage(picked)

        // Cancelled: the file is not uploaded.
        if (!edited) continue

        original = edited
      }

      const file = await prepare(original, edit)

      if (!file) continue

      const local = pendingFile(file)
      uploadingStore.set([...uploadingStore.get(), local])

      queued.push(limit(() => send(endpoint, file, local)))
    }

    await Promise.all(queued)
  }

  /** Resize and orient a picked (or edited) file, and check its size. Null when rejected. */
  const prepare = async (original: File, edited: boolean): Promise<File | null> => {
    const file =
      component.imageCropAspectRatio ||
      component.imageResizeTargetWidth ||
      component.imageResizeTargetHeight ||
      component.orientImagesFromExif
        ? await transformImage(original, {
            // The editor already cropped the image.
            aspectRatio: edited ? null : component.imageCropAspectRatio,
            mode: component.imageResizeMode,
            width: component.imageResizeTargetWidth,
            height: component.imageResizeTargetHeight,
            orient: component.orientImagesFromExif,
          })
        : original

    if (component.minSize && file.size < component.minSize * 1024) {
      uploadingStore.set([
        ...uploadingStore.get(),
        {
          path: `rejected:${++localId}:${file.name}`,
          name: file.name,
          size: file.size,
          error: t('form.file_too_small', {}, 'This file is too small.'),
        },
      ])

      return null
    }

    if (component.maxSize && file.size > component.maxSize * 1024) {
      uploadingStore.set([
        ...uploadingStore.get(),
        {
          path: `rejected:${++localId}:${file.name}`,
          name: file.name,
          size: file.size,
          error: t('form.file_too_large', {}, 'This file is too large.'),
        },
      ])

      return null
    }

    return file
  }

  /** The in-progress entry shown while `file` uploads. */
  const pendingFile = (file: File): LocalFile => {
    const local: LocalFile = {
      path: `pending:${++localId}:${file.name}`,
      name: file.name,
      size: file.size,
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }
    if (local.preview) objectUrls.push(local.preview)

    return local
  }

  // `imageEditor()`: uploaded JPEG, PNG and WebP images can be edited again.
  const canEditExisting = (file: LocalFile, index: number) =>
    Boolean(component.imageEditor) &&
    !locked &&
    index < files.length &&
    !file.missing &&
    Boolean(file.url ?? file.preview) &&
    editableImageName(file) !== null

  /**
   * The "Edit" button on an uploaded image: open it in the editor and upload the result
   * in its place (the old file goes like any removed one: a temporary upload is deleted
   * now, a stored file when the form is saved with `deleteRemovedFiles()`).
   */
  const editExisting = async (existing: LocalFile) => {
    const endpoint = panel.endpoints.upload
    const url = existing.url ?? existing.preview
    const name = editableImageName(existing)

    if (!endpoint || !url || !name) return

    const source = await fetchEditableImage(url, name)

    if (!source) {
      uploadingStore.set([
        ...uploadingStore.get(),
        {
          path: `failed:${++localId}:${existing.path}`,
          name: existing.name,
          error: t('image_editor.load_failed', {}, 'The image could not be opened.'),
        },
      ])

      return
    }

    const edited = await editImage(source)

    // Cancelled, or the editor couldn't decode it: keep the file as it is.
    if (!edited || edited === source) return

    const file = await prepare(edited, true)

    if (!file) return

    const local = pendingFile(file)
    uploadingStore.set([...uploadingStore.get(), local])
    await send(endpoint, file, local, existing.path)
  }

  // Reads the stores, not the derived values: several uploads may finish in one tick.
  const send = async (endpoint: string, file: File, local: LocalFile, replacing?: string) => {
    try {
      // Large files go in resumable chunks; progress covers the whole file.
      const response = await uploadTemporaryFile(endpoint, file, {
        ...panelUploadOptions(panel, component.uploadPolicy),
        onProgress: (progress) =>
          uploadingStore.set(
            uploadingStore
              .get()
              .map((item) => (item.path === local.path ? { ...item, progress } : item)),
          ),
      })

      uploadedStore.set([
        ...uploadedStore.get(),
        {
          path: response.key,
          name: response.name,
          size: response.size,
          temporary: true,
          url: local.preview,
        },
      ])
      uploadingStore.set(uploadingStore.get().filter((item) => item.path !== local.path))
      const current = fileUploadPaths(
        store.getValue<string | string[] | null>(component.statePath, null),
      )

      if (replacing !== undefined && current.includes(replacing)) {
        // An edited image takes the old one's place.
        commit(current.map((path) => (path === replacing ? response.key : path)))
        discard(replacing)
      } else {
        commit(insertUploadedFile(current, response.key, component, maxFiles))
      }
    } catch (uploadError) {
      const message =
        (uploadError as { errors?: Record<string, string[]> }).errors?.file?.[0] ??
        (uploadError as Error).message
      uploadingStore.set(
        uploadingStore
          .get()
          .map((item) =>
            item.path === local.path ? { ...item, error: message, progress: undefined } : item,
          ),
      )
    }
  }

  const remove = (path: string) => {
    commit(paths.filter((item) => item !== path))
    discard(path)
  }

  /** Release a file that left the field: its preview, and a temporary upload's file. */
  const discard = (path: string) => {
    releasePreview(uploadedStore.get().find((file) => file.path === path)?.url)

    if (path.startsWith('tmp:') && panel.endpoints.uploadDestroy) {
      void requestJson(panel.endpoints.uploadDestroy, {
        method: 'DELETE',
        body: { key: path },
      }).catch(() => undefined)
    }
  }

  const ondrop = (event: DragEvent) => {
    event.preventDefault()
    dragging = false

    if (!locked && event.dataTransfer && event.dataTransfer.files.length > 0) {
      void upload(event.dataTransfer.files)
    }
  }

  // `pasteable()`: images and files pasted while the drop zone has focus.
  const onpaste = (event: ClipboardEvent) => {
    if (locked || component.pasteable === false) return

    const pasted = filesFromClipboard(event.clipboardData)

    if (pasted.length > 0) {
      event.preventDefault()
      void upload(pasted)
    }
  }

  const move = (from: number, to: number) => commit(moveRepeaterItem(paths, from, to) as string[])
  const reorderable = $derived(Boolean(component.reorderable && component.multiple && !locked))

  const onItemDrop = (event: DragEvent, index: number) => {
    if (!reorderable || dragPath === null) return
    event.preventDefault()
    event.stopPropagation()
    const from = paths.indexOf(dragPath)
    if (from !== -1 && index < files.length) move(from, index)
    dragPath = null
  }

  const hints = $derived(
    [
      component.acceptedFileTypes?.join(', '),
      component.maxSize
        ? `≤ ${fileManagerSize(component.maxSize * 1024, formatter.current)}`
        : null,
      component.minFiles
        ? choice(
            'form.min_files',
            component.minFiles,
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
    component.previewable !== false &&
    (component.image || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.name))

  // Previews whose image failed to load (missing or unreachable file) show the file icon.
  const brokenPreviews = new SvelteSet<string>()

  /** `imagePreviewHeight()`: numbers are pixels, strings are CSS lengths (`'250px'`, `'10rem'`). */
  function cssLength(value: number | string): string {
    return typeof value === 'number' || /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value
  }
</script>

{#snippet removeButton(file: LocalFile)}
  {#if component.deletable && !locked}
    <Button
      type="button"
      variant={circle ? 'secondary' : 'ghost'}
      size="icon-xs"
      class={cn(circle && 'rounded-full shadow')}
      aria-label={t('file_upload.remove', { name: file.name }, 'Remove :name')}
      onclick={() => {
        if (file.error || file.progress !== undefined) {
          releasePreview(file.preview)
          uploadingStore.set(uploadingStore.get().filter((item) => item.path !== file.path))
        } else {
          remove(file.path)
        }
      }}
    >
      <XIcon />
    </Button>
  {/if}
{/snippet}

<FieldWrapper field={component} htmlFor={field.id} error={field.error}>
  <div
    data-slot="file-upload"
    data-layout={component.panelLayout}
    class={cn('flex flex-col gap-3', integrated && 'rounded-md border p-2')}
  >
    {#if files.length > 0 || uploading.length > 0}
      <ul
        class={cn(
          'grid gap-2',
          component.panelLayout === 'grid' && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
          circle && 'justify-items-center',
        )}
      >
        {#each listed as file, fileIndex (uniqueKey(listed, fileIndex, (item) => item.path))}
          <li
            draggable={reorderable && fileIndex < files.length}
            ondragstart={() => (dragPath = file.path)}
            ondragover={(event) => reorderable && event.preventDefault()}
            ondrop={(event) => onItemDrop(event, fileIndex)}
            ondragend={() => (dragPath = null)}
            class={cn(
              dragPath === file.path && 'opacity-50',
              'bg-muted/30 relative flex min-w-0 items-center gap-3 overflow-hidden rounded-md border p-2 text-sm',
              circle && 'size-28 justify-center rounded-full border-0 p-0',
              file.error && 'border-destructive',
            )}
          >
            {#if !circle && removeAtStart}{@render removeButton(file)}{/if}
            {#if !circle && progressAtStart && file.progress !== undefined && !file.error}<Spinner
              />{/if}
            {#if isImage(file) && (file.url || file.preview) && !brokenPreviews.has(file.path)}
              <img
                src={file.url ?? file.preview}
                alt=""
                onerror={() => brokenPreviews.add(file.path)}
                class={cn(
                  'size-12 shrink-0 rounded object-cover',
                  circle && 'size-28 rounded-full',
                )}
                style:height={!circle && component.imagePreviewHeight
                  ? cssLength(component.imagePreviewHeight)
                  : undefined}
                style:width={!circle && component.imagePreviewHeight ? 'auto' : undefined}
                style:max-width={!circle && component.imagePreviewHeight ? '50%' : undefined}
              />
            {:else if !circle}
              <FileIcon class="text-muted-foreground size-6 shrink-0" />
            {/if}
            {#if !circle}
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium">{file.name}</p>
                <p class={cn('text-muted-foreground text-xs', file.missing && 'text-destructive')}>
                  {file.error ??
                    (file.missing
                      ? t('form.file_missing', {}, 'This file no longer exists.')
                      : file.progress !== undefined && !file.error
                        ? (component.uploadingMessage ?? t('form.uploading', {}, 'Uploading…'))
                        : file.size
                          ? fileManagerSize(file.size, formatter.current)
                          : file.temporary
                            ? t('form.uploading', {}, 'Pending')
                            : '')}
                </p>
              </div>
            {/if}
            <div class={cn('flex items-center gap-1', circle && 'absolute -end-1 -bottom-1')}>
              {#if (circle || !progressAtStart) && file.progress !== undefined && !file.error}<Spinner
                />{/if}
              {#if reorderable && fileIndex < files.length}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('file_upload.move_up', { name: file.name }, 'Move :name up')}
                  disabled={fileIndex === 0}
                  onclick={() => move(fileIndex, fileIndex - 1)}><ChevronUpIcon /></Button
                >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('file_upload.move_down', { name: file.name }, 'Move :name down')}
                  disabled={fileIndex === files.length - 1}
                  onclick={() => move(fileIndex, fileIndex + 1)}><ChevronDownIcon /></Button
                >
              {/if}
              {#if canEditExisting(file, fileIndex)}
                <Button
                  type="button"
                  variant={circle ? 'secondary' : 'ghost'}
                  size="icon-xs"
                  class={cn(circle && 'rounded-full shadow')}
                  aria-label={t('file_upload.edit', { name: file.name }, 'Edit :name')}
                  title={t('image_editor.title', {}, 'Edit image')}
                  data-action="edit-image"
                  onclick={() => void editExisting(file)}><PencilIcon /></Button
                >
              {/if}
              {#if component.openable && uploadedFileLinks(file).open}
                <Button
                  href={uploadedFileLinks(file).open}
                  external
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`${t('file_upload.open', { name: file.name }, 'Open :name')} ${t('opens_in_new_tab', {}, '(opens in a new tab)')}`}
                  ><ExternalLinkIcon /></Button
                >
              {/if}
              {#if component.downloadable && uploadedFileLinks(file).download}
                <Button
                  href={uploadedFileLinks(file).download}
                  external
                  download
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('file_upload.download', { name: file.name }, 'Download :name')}
                  ><DownloadIcon /></Button
                >
              {/if}
              {#if circle || !removeAtStart}{@render removeButton(file)}{/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    {#if canAddMore && !locked}
      <div
        role="button"
        tabindex="0"
        onclick={() => input?.click()}
        aria-describedby={field.aria['aria-describedby']}
        onkeydown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            input?.click()
          }
        }}
        ondragover={(event) => {
          event.preventDefault()
          dragging = true
        }}
        ondragleave={() => (dragging = false)}
        {ondrop}
        {onpaste}
        data-align={uploadAlign}
        style:aspect-ratio={!circle ? cssAspectRatio(component.panelAspectRatio) : undefined}
        class={cn(
          'text-muted-foreground hover:border-ring flex cursor-pointer flex-col justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-sm transition-colors',
          uploadAlign === 'start'
            ? 'items-start text-start'
            : uploadAlign === 'end'
              ? 'items-end text-end'
              : 'items-center text-center',
          integrated && 'border-transparent',
          dragging && 'border-ring bg-accent',
          circle && 'size-28 items-center rounded-full py-0',
        )}
      >
        <CloudUploadIcon class="size-5" />
        {#if !circle}<span
            >{component.placeholder ??
              t('form.drop_files', {}, 'Drop files here or click to browse')}</span
          >{/if}
        {#if !circle && hints}
          <span class="text-muted-foreground text-xs">{hints}</span>
        {/if}
      </div>
    {/if}
    <input
      bind:this={input}
      id={field.id}
      type="file"
      class="sr-only"
      tabindex="-1"
      {...field.aria}
      multiple={component.multiple}
      accept={fileUploadAccept(component)}
      disabled={locked}
      onchange={(event) => {
        // Copy the list: clearing the input empties it while the editor is open.
        const target = event.currentTarget
        const picked = target.files ? Array.from(target.files) : []
        target.value = ''
        void upload(picked)
      }}
    />
    <!-- Mounted from the first edit on (it stays for its closing animation). -->
    {#if component.imageEditor && (editing || editorRequested)}
      <Lazy loader={imageEditor} props={{ request: editing, options: component.imageEditor }}>
        {#snippet fallback()}{/snippet}
      </Lazy>
    {/if}
  </div>
</FieldWrapper>
