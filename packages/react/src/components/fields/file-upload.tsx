import type { FileUploadSchema, UploadedFile } from '@alfakit/core'
import {
  canEditImage,
  concurrencyLimiter,
  cssAspectRatio,
  editableImageName,
  fetchEditableImage,
  fieldMemory,
  fileManagerSize,
  filesFromClipboard,
  fileUploadAccept,
  fileUploadEntries,
  fileUploadPaths,
  insertUploadedFile,
  moveRepeaterItem,
  panelUploadOptions,
  requestJson,
  transformImage,
  uploadedFileLinks,
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
} from 'lucide-react'
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useChoice, useFormatter, usePanel, useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { useField, useFormStore } from '../form/form-context'
import { FieldWrapper } from '../schema/field-wrapper'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import type { ImageEditRequest } from './image-editor-dialog'
import { ImageEditorDialog } from './image-editor-dialog-lazy'

interface LocalFile extends UploadedFile {
  progress?: number
  error?: string
  preview?: string
}

export function FileUploadField({ component }: { component: FileUploadSchema }) {
  const t = useT()
  const formatter = useFormatter()
  const choice = useChoice()
  const panel = usePanel()
  const { value, setValue, error, id, disabled, readOnly, aria } = useField<
    string | string[] | null
  >(component)
  // Read-only keeps open/download links but hides upload and remove controls.
  const locked = disabled || readOnly
  const store = useFormStore()
  // In-flight uploads and the metadata of files uploaded in this session (the server schema
  // only knows about saved files) live in the form's field memory, not in component state:
  // a virtualised Repeater item unmounts when scrolled out of view and finds them again,
  // local image previews included, when it mounts back.
  const uploadingStore = fieldMemory<LocalFile[]>(
    store,
    `${component.statePath}:uploading`,
    () => [],
  )
  const uploadedStore = fieldMemory<FileUploadSchema['files']>(
    store,
    `${component.statePath}:uploaded`,
    () => [],
  )
  const uploading = useStore(uploadingStore)
  const uploaded = useStore(uploadedStore)
  const setUploading = uploadingStore.set
  const setUploaded = uploadedStore.set
  const [dragging, setDragging] = useState(false)
  // Previews whose image failed to load (missing or unreachable file) show the file icon.
  const [brokenPreviews, setBrokenPreviews] = useState<ReadonlySet<string>>(() => new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragPath, setDragPath] = useState<string | null>(null)
  // The image open in the editor (`imageEditor()`), one at a time.
  const [editing, setEditing] = useState<ImageEditRequest | null>(null)
  const editImage = (file: File) =>
    new Promise<File | null>((resolve) =>
      setEditing({
        file,
        resolve: (edited) => {
          setEditing(null)
          resolve(edited)
        },
      }),
    )
  // Object URLs made for local image previews; released when the file is removed.
  const objectUrls = fieldMemory<Set<string>>(
    store,
    `${component.statePath}:previews`,
    () => new Set(),
  ).get()

  const releasePreview = (url: string | undefined) => {
    if (url && objectUrls.delete(url)) URL.revokeObjectURL(url)
  }

  const paths = fileUploadPaths(value)
  const files: LocalFile[] = fileUploadEntries(paths, component.files, uploaded)
  const maxFiles = component.multiple ? (component.maxFiles ?? Infinity) : 1
  const canAddMore = files.length + uploading.length < maxFiles

  const commit = (next: string[]) => setValue(component.multiple ? next : (next[0] ?? null))

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

    for (const [position, picked] of accepted.entries()) {
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

      const local = pendingFile(file, position)
      setUploading((state) => [...state, local])

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
      setUploading((state) => [
        ...state,
        {
          path: file.name,
          name: file.name,
          size: file.size,
          error: t('form.file_too_small', {}, 'This file is too small.'),
        },
      ])

      return null
    }

    if (component.maxSize && file.size > component.maxSize * 1024) {
      setUploading((state) => [
        ...state,
        {
          path: file.name,
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
      setUploading((state) => [
        ...state,
        {
          path: `failed:${existing.path}`,
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

    const local = pendingFile(file, `edit:${existing.path}`)
    setUploading((state) => [...state, local])
    await send(endpoint, file, local, existing.path)
  }

  const send = async (endpoint: string, file: File, local: LocalFile, replacing?: string) => {
    try {
      // Large files go in resumable chunks; progress covers the whole file.
      const response = await uploadTemporaryFile(endpoint, file, {
        ...panelUploadOptions(panel, component.uploadPolicy),
        onProgress: (progress) =>
          setUploading((state) =>
            state.map((item) => (item.path === local.path ? { ...item, progress } : item)),
          ),
      })

      setUploaded((state) => [
        ...state,
        {
          path: response.key,
          name: response.name,
          size: response.size,
          temporary: true,
          url: local.preview,
        },
      ])
      setUploading((state) => state.filter((item) => item.path !== local.path))
      // Read the store, not `value`: it's stale after the first file of a batch.
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
      setUploading((state) =>
        state.map((item) =>
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

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)

    if (!locked && event.dataTransfer.files.length > 0) {
      void upload(event.dataTransfer.files)
    }
  }

  // `pasteable()`: images and files pasted while the drop zone has focus.
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (locked || component.pasteable === false) return

    const pasted = filesFromClipboard(event.clipboardData)

    if (pasted.length > 0) {
      event.preventDefault()
      void upload(pasted)
    }
  }

  const move = (from: number, to: number) => commit(moveRepeaterItem(paths, from, to) as string[])
  const reorderable = Boolean(component.reorderable && component.multiple && !locked)

  // `previewable(false)` shows every file as a name and icon, without the image.
  const isImage = (file: LocalFile) =>
    component.previewable !== false &&
    (component.image || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.name))
  const circle = component.panelLayout === 'circle' || component.avatar
  const integrated = component.panelLayout === 'integrated' && !circle
  const removeAtStart = component.positions?.removeButton === 'start'
  const progressAtStart = component.positions?.progressIndicator === 'start'
  const uploadAlign = component.positions?.uploadButton ?? 'center'

  // `imageEditor()`: uploaded JPEG, PNG and WebP images can be edited again.
  const canEditExisting = (file: LocalFile, index: number) =>
    Boolean(component.imageEditor) &&
    !locked &&
    index < files.length &&
    !file.missing &&
    Boolean(file.url ?? file.preview) &&
    editableImageName(file) !== null

  const renderRemove = (file: LocalFile) =>
    component.deletable &&
    !locked && (
      <Button
        type="button"
        variant={circle ? 'secondary' : 'ghost'}
        size="icon-xs"
        className={cn(circle && 'rounded-full shadow')}
        aria-label={t('file_upload.remove', { name: file.name }, 'Remove :name')}
        onClick={() => {
          if (file.error || file.progress !== undefined) {
            releasePreview(file.preview)
            setUploading((state) => state.filter((item) => item.path !== file.path))
          } else {
            remove(file.path)
          }
        }}
      >
        <XIcon />
      </Button>
    )

  return (
    <FieldWrapper field={component} htmlFor={id} error={error}>
      <div
        data-slot="file-upload"
        data-layout={component.panelLayout}
        className={cn('flex flex-col gap-3', integrated && 'rounded-md border p-2')}
      >
        {(files.length > 0 || uploading.length > 0) && (
          <ul
            className={cn(
              'grid gap-2',
              component.panelLayout === 'grid' && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
              circle && 'justify-items-center',
            )}
          >
            {[...files, ...uploading].map((file, index) => (
              <li
                key={file.path}
                draggable={reorderable && index < files.length}
                onDragStart={() => setDragPath(file.path)}
                onDragOver={(event) => reorderable && event.preventDefault()}
                onDrop={(event) => {
                  if (!reorderable || dragPath === null) return
                  event.preventDefault()
                  event.stopPropagation()
                  const from = paths.indexOf(dragPath)
                  if (from !== -1 && index < files.length) move(from, index)
                  setDragPath(null)
                }}
                onDragEnd={() => setDragPath(null)}
                className={cn(
                  dragPath === file.path && 'opacity-50',
                  'bg-muted/30 relative flex min-w-0 items-center gap-3 overflow-hidden rounded-md border p-2 text-sm',
                  circle && 'size-28 justify-center rounded-full border-0 p-0',
                  file.error && 'border-destructive',
                )}
              >
                {!circle && removeAtStart && renderRemove(file)}
                {!circle && progressAtStart && file.progress !== undefined && !file.error && (
                  <Spinner />
                )}
                {isImage(file) && (file.url || file.preview) && !brokenPreviews.has(file.path) ? (
                  <img
                    src={file.url ?? file.preview}
                    alt=""
                    onError={() => setBrokenPreviews((current) => new Set(current).add(file.path))}
                    className={cn(
                      'size-12 shrink-0 rounded object-cover',
                      circle && 'size-28 rounded-full',
                    )}
                    style={
                      !circle && component.imagePreviewHeight
                        ? {
                            height: cssLength(component.imagePreviewHeight),
                            width: 'auto',
                            maxWidth: '50%',
                          }
                        : undefined
                    }
                  />
                ) : (
                  !circle && <FileIcon className="text-muted-foreground size-6 shrink-0" />
                )}
                {!circle && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.name}</p>
                    <p
                      className={cn(
                        'text-muted-foreground text-xs',
                        file.missing && 'text-destructive',
                      )}
                    >
                      {file.error ??
                        (file.missing
                          ? t('form.file_missing', {}, 'This file no longer exists.')
                          : file.progress !== undefined && !file.error
                            ? (component.uploadingMessage ?? t('form.uploading', {}, 'Uploading…'))
                            : file.size
                              ? fileManagerSize(file.size, formatter)
                              : file.temporary
                                ? t('form.uploading', {}, 'Pending')
                                : '')}
                    </p>
                  </div>
                )}
                <div
                  className={cn('flex items-center gap-1', circle && 'absolute -end-1 -bottom-1')}
                >
                  {(circle || !progressAtStart) && file.progress !== undefined && !file.error && (
                    <Spinner />
                  )}
                  {reorderable && index < files.length && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t('file_upload.move_up', { name: file.name }, 'Move :name up')}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <ChevronUpIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t(
                          'file_upload.move_down',
                          { name: file.name },
                          'Move :name down',
                        )}
                        disabled={index === files.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ChevronDownIcon />
                      </Button>
                    </>
                  )}
                  {canEditExisting(file, index) && (
                    <Button
                      type="button"
                      variant={circle ? 'secondary' : 'ghost'}
                      size="icon-xs"
                      className={cn(circle && 'rounded-full shadow')}
                      aria-label={t('file_upload.edit', { name: file.name }, 'Edit :name')}
                      title={t('image_editor.title', {}, 'Edit image')}
                      data-action="edit-image"
                      onClick={() => void editExisting(file)}
                    >
                      <PencilIcon />
                    </Button>
                  )}
                  {component.openable && uploadedFileLinks(file).open && (
                    <Button asChild type="button" variant="ghost" size="icon-xs">
                      <a
                        href={uploadedFileLinks(file).open}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${t('file_upload.open', { name: file.name }, 'Open :name')} ${t('opens_in_new_tab', {}, '(opens in a new tab)')}`}
                      >
                        <ExternalLinkIcon />
                      </a>
                    </Button>
                  )}
                  {component.downloadable && uploadedFileLinks(file).download && (
                    <Button asChild type="button" variant="ghost" size="icon-xs">
                      <a
                        href={uploadedFileLinks(file).download}
                        download
                        aria-label={t(
                          'file_upload.download',
                          { name: file.name },
                          'Download :name',
                        )}
                      >
                        <DownloadIcon />
                      </a>
                    </Button>
                  )}
                  {(circle || !removeAtStart) && renderRemove(file)}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canAddMore && !locked && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            aria-describedby={aria['aria-describedby']}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onPaste={onPaste}
            style={
              !circle && component.panelAspectRatio
                ? { aspectRatio: cssAspectRatio(component.panelAspectRatio) }
                : undefined
            }
            data-align={uploadAlign}
            className={cn(
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
            <UploadCloudIcon className="size-5" />
            {!circle && (
              <span>
                {component.placeholder ??
                  t('form.drop_files', {}, 'Drop files here or click to browse')}
              </span>
            )}
            {!circle &&
              (component.acceptedFileTypesLabel || component.maxSize || component.minFiles) && (
                <span className="text-muted-foreground text-xs">
                  {[
                    component.acceptedFileTypesLabel,
                    component.maxSize
                      ? `≤ ${fileManagerSize(component.maxSize * 1024, formatter)}`
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
                    .join(' · ')}
                </span>
              )}
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          tabIndex={-1}
          {...aria}
          multiple={component.multiple}
          accept={fileUploadAccept(component)}
          disabled={locked}
          onChange={(event) => {
            // Copy the list: clearing the input empties it while the editor is open.
            const picked = event.target.files ? Array.from(event.target.files) : []
            event.target.value = ''
            void upload(picked)
          }}
        />
        {component.imageEditor && (
          <ImageEditorDialog request={editing} options={component.imageEditor} />
        )}
      </div>
    </FieldWrapper>
  )
}

/** `imagePreviewHeight()`: numbers are pixels, strings are CSS lengths (`'250px'`, `'10rem'`). */
function cssLength(value: number | string): string {
  return typeof value === 'number' || /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value
}
