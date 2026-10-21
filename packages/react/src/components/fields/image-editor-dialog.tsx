import type {
  CropHandle,
  FileUploadImageEditorSchema,
  ImageEditorData,
  ImageEditorDragMode,
} from '@alfakit/core'
import { ImageEditor, imageEditorOptionsKey, loadEditorImage } from '@alfakit/core'
import {
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Spinner } from '../ui/spinner'

export interface ImageEditRequest {
  file: File
  resolve: (file: File | null) => void
}

const HANDLES: CropHandle[] = ['nw', 'ne', 'sw', 'se']

/**
 * `FileUpload::imageEditor()`: crop, zoom, rotate and flip an image before it is uploaded
 * (or to replace an uploaded one). Resolves the request with the edited file, or null
 * when cancelled.
 */
export function ImageEditorDialog({
  request,
  options,
}: {
  request: ImageEditRequest | null
  options: FileUploadImageEditorSchema
}) {
  const t = useT()
  const [loaded, setLoaded] = useState<{ bitmap: ImageBitmap; editor: ImageEditor } | null>(null)
  const [saving, setSaving] = useState(false)
  const hintId = useId()

  // Restart only for another image or other settings: the schema object itself is new on
  // every render of a template item (a new builder block), which kept restarting the load.
  const optionsKey = imageEditorOptionsKey(options)

  useEffect(() => {
    if (!request) return

    const options = JSON.parse(optionsKey) as FileUploadImageEditorSchema
    let cancelled = false

    loadEditorImage(request.file)
      .then((bitmap) => {
        if (cancelled) return bitmap.close()

        setLoaded({
          bitmap,
          editor: new ImageEditor({
            width: bitmap.width,
            height: bitmap.height,
            aspectRatios: options.aspectRatios,
            circle: options.circle,
            mode: options.mode,
            emptyFillColor: options.emptyFillColor,
            viewportWidth: options.viewportWidth,
            viewportHeight: options.viewportHeight,
          }),
        })
      })
      // Undecodable: upload the file as it is.
      .catch(() => !cancelled && request.resolve(request.file))

    return () => {
      cancelled = true
      setLoaded((current) => {
        current?.bitmap.close()

        return null
      })
    }
  }, [request, optionsKey])

  const finish = (file: File | null) => {
    request?.resolve(file)
  }

  const save = async () => {
    if (!request || !loaded) return

    setSaving(true)

    try {
      finish(await loaded.editor.export(loaded.bitmap, request.file))
    } catch {
      finish(request.file)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && finish(null)}>
      <DialogContent className="sm:max-w-3xl" data-slot="image-editor">
        <DialogHeader>
          <DialogTitle>{t('image_editor.title', {}, 'Edit image')}</DialogTitle>
          <DialogDescription id={hintId} className="sr-only">
            {t(
              'image_editor.keyboard_hint',
              {},
              'Arrow keys move the crop area. Shift and arrow keys resize it.',
            )}{' '}
            {t('image_editor.zoom_hint', {}, 'Plus and minus keys zoom the image.')}
          </DialogDescription>
        </DialogHeader>
        {loaded ? (
          <ImageEditorCanvas editor={loaded.editor} bitmap={loaded.bitmap} hintId={hintId} />
        ) : (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => finish(null)}>
            {t('image_editor.cancel', {}, 'Cancel')}
          </Button>
          <Button type="button" disabled={!loaded || saving} onClick={() => void save()}>
            {saving && <Spinner />}
            {t('image_editor.save', {}, 'Apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The numeric inputs, in the order Filament shows them. */
const NUMERIC_FIELDS = [
  ['x', 'image_editor.x', 'X'],
  ['y', 'image_editor.y', 'Y'],
  ['width', 'image_editor.width', 'Width'],
  ['height', 'image_editor.height', 'Height'],
  ['rotate', 'image_editor.rotation', 'Rotation'],
] as const satisfies ReadonlyArray<readonly [keyof ImageEditorData, string, string]>

function ImageEditorCanvas({
  editor,
  bitmap,
  hintId,
}: {
  editor: ImageEditor
  bitmap: ImageBitmap
  hintId: string
}) {
  const t = useT()
  const state = useStore(editor.store)
  const canvas = useRef<HTMLCanvasElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const inputsId = useId()

  // Measure the container, and follow its size.
  useEffect(() => {
    const element = frame.current

    if (!element) return

    const measure = () => editor.setContainer(element.clientWidth, element.clientHeight)
    measure()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => observer.disconnect()
  }, [editor])

  // Wheel and trackpad pinch zoom. A native listener: React's wheel listener is passive.
  useEffect(() => {
    const element = frame.current

    if (!element) return

    const onWheel = (event: WheelEvent) => {
      const rect = element.getBoundingClientRect()

      if (editor.wheel(event, { x: event.clientX - rect.left, y: event.clientY - rect.top })) {
        event.preventDefault()
      }
    }

    element.addEventListener('wheel', onWheel, { passive: false })

    return () => element.removeEventListener('wheel', onWheel)
  }, [editor])

  useEffect(() => {
    if (canvas.current) {
      editor.drawPreview(canvas.current, bitmap, globalThis.devicePixelRatio || 1)
    }
  }, [editor, bitmap, state])

  const box = editor.cropBox()
  const data = editor.getData()

  const start = (mode: ImageEditorDragMode) => (event: PointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    editor.startDrag(mode, event.clientX, event.clientY, undefined, event.pointerId ?? 0)
  }

  const end = (event: PointerEvent<HTMLElement>) => editor.endDrag(event.pointerId ?? 0)

  // Numeric inputs apply on blur and Enter; invalid values snap back to the current one.
  const commit =
    (field: keyof ImageEditorData) =>
    (event: FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const value = input.value.trim() === '' ? Number.NaN : Number(input.value)

      editor.setData({ [field]: value })
      input.value = String(editor.getData()[field])
    }

  const ratioLabel = (ratio: string | null) => ratio ?? t('image_editor.free', {}, 'Free')

  const tool = (label: string, icon: ReactNode, onClick: () => void, disabled = false) => (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  )

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Image space: left is the image's left in every reading direction. */}
        <div
          ref={frame}
          dir="ltr"
          data-slot="image-editor-viewport"
          className="bg-muted/40 relative h-72 w-full cursor-grab touch-none overflow-hidden rounded-md select-none sm:h-96"
          onPointerDown={start('pan')}
          onPointerMove={(event) =>
            editor.dragTo(event.clientX, event.clientY, event.pointerId ?? 0)
          }
          onPointerUp={end}
          onPointerCancel={end}
        >
          <canvas ref={canvas} className="pointer-events-none absolute inset-0 block size-full" />
          <div
            role="group"
            tabIndex={0}
            aria-label={t('image_editor.crop_area', {}, 'Crop area')}
            aria-describedby={hintId}
            data-slot="image-editor-crop"
            className={cn(
              'ring-ring/50 absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.5)] outline-none focus-visible:ring-[3px]',
              editor.circle && 'rounded-full',
            )}
            // Runtime geometry: no Tailwind class can hold these values.
            style={{
              left: `${box.left}%`,
              top: `${box.top}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
            onPointerDown={start('move')}
            onKeyDown={(event) => {
              if (editor.handleKey(event)) event.preventDefault()
            }}
          >
            {HANDLES.map((handle) => (
              <span
                key={handle}
                data-handle={handle}
                aria-hidden="true"
                className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/40 bg-white"
                style={{
                  left: handle.endsWith('w') ? '0%' : '100%',
                  top: handle.startsWith('n') ? '0%' : '100%',
                  cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
                }}
                onPointerDown={start(handle)}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {editor.aspectRatios.length > 1 ? (
            <div
              role="group"
              aria-label={t('image_editor.aspect_ratio', {}, 'Aspect ratio')}
              className="flex flex-wrap gap-1"
            >
              {editor.aspectRatios.map((ratio) => (
                <Button
                  key={ratio ?? 'free'}
                  type="button"
                  size="sm"
                  variant={state.aspectRatio === ratio ? 'default' : 'outline'}
                  aria-pressed={state.aspectRatio === ratio}
                  onClick={() => editor.setAspectRatio(ratio)}
                >
                  {ratioLabel(ratio)}
                </Button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-1">
            {tool(
              t('image_editor.zoom_out', {}, 'Zoom out'),
              <ZoomOutIcon />,
              () => editor.zoomOut(),
              !editor.canZoomOut,
            )}
            {tool(
              t('image_editor.zoom_in', {}, 'Zoom in'),
              <ZoomInIcon />,
              () => editor.zoomIn(),
              !editor.canZoomIn,
            )}
            {tool(t('image_editor.rotate_left', {}, 'Rotate left'), <RotateCcwIcon />, () =>
              editor.rotate(-1),
            )}
            {tool(t('image_editor.rotate_right', {}, 'Rotate right'), <RotateCwIcon />, () =>
              editor.rotate(1),
            )}
            {tool(
              t('image_editor.flip_horizontal', {}, 'Flip horizontally'),
              <FlipHorizontal2Icon />,
              () => editor.flip('x'),
            )}
            {tool(
              t('image_editor.flip_vertical', {}, 'Flip vertically'),
              <FlipVertical2Icon />,
              () => editor.flip('y'),
            )}
            {tool(t('image_editor.reset', {}, 'Reset'), <Undo2Icon />, () => editor.reset())}
          </div>
        </div>
      </div>
      {/* Numeric inputs: beside the image from md up, under it on phones. */}
      <div
        role="group"
        aria-label={t('image_editor.inputs', {}, 'Position and size')}
        data-slot="image-editor-inputs"
        className="grid grid-cols-2 content-start gap-x-3 gap-y-2 sm:grid-cols-4 md:w-40 md:shrink-0 md:grid-cols-1"
      >
        {NUMERIC_FIELDS.map(([field, key, fallback]) => (
          <div key={field} className="flex flex-col gap-1">
            <label htmlFor={`${inputsId}-${field}`} className="text-muted-foreground text-xs">
              {t(key, {}, fallback)}
            </label>
            <Input
              // Remount with the new value when the editor changes it (drag, zoom…).
              key={`${field}:${data[field]}`}
              id={`${inputsId}-${field}`}
              type="number"
              inputMode="decimal"
              step={1}
              data-field={field}
              className="h-8 tabular-nums"
              defaultValue={data[field]}
              onBlur={commit(field)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commit(field)(event)
                }
              }}
            />
          </div>
        ))}
        <div className="col-span-2 flex gap-1 sm:col-span-4 md:col-span-1">
          {(
            [
              ['x', 'image_editor.scale_x', 'Scale X'],
              ['y', 'image_editor.scale_y', 'Scale Y'],
            ] as const
          ).map(([axis, key, fallback]) => {
            const flipped = axis === 'x' ? state.flipX : state.flipY

            return (
              <Button
                key={axis}
                type="button"
                size="sm"
                variant={flipped ? 'default' : 'outline'}
                aria-pressed={flipped}
                data-field={`scale${axis.toUpperCase()}`}
                className="flex-1"
                onClick={() => editor.flip(axis)}
              >
                {t(key, {}, fallback)}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
