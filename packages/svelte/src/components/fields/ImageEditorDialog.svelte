<script lang="ts" module>
  export interface ImageEditRequest {
    file: File
    resolve: (file: File | null) => void
  }
</script>

<script lang="ts">
  import type {
    CropHandle,
    FileUploadImageEditorSchema,
    ImageEditorData,
    ImageEditorDragMode,
    ImageEditorState,
  } from '@alfakit/core'
  import { ImageEditor, imageEditorOptionsKey, loadEditorImage } from '@alfakit/core'
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
  import RotateCwIcon from '@lucide/svelte/icons/rotate-cw'
  // Lucide renamed flip-horizontal-2 / flip-vertical-2 (the icons React uses) to these.
  import FlipHorizontal2Icon from '@lucide/svelte/icons/triangles-centerline-dashed-horizontal'
  import FlipVertical2Icon from '@lucide/svelte/icons/triangles-centerline-dashed-vertical'
  import Undo2Icon from '@lucide/svelte/icons/undo-2'
  import ZoomInIcon from '@lucide/svelte/icons/zoom-in'
  import ZoomOutIcon from '@lucide/svelte/icons/zoom-out'
  import { untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import type { LucideIconComponent } from '../../lib/icons'
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

  /**
   * `FileUpload::imageEditor()`: crop, zoom, rotate and flip an image before it is uploaded
   * (or to replace an uploaded one). Resolves the request with the edited file, or null
   * when cancelled.
   */
  let {
    request,
    options,
  }: { request: ImageEditRequest | null; options: FileUploadImageEditorSchema } = $props()

  const HANDLES: CropHandle[] = ['nw', 'ne', 'sw', 'se']

  /** The numeric inputs, in the order Filament shows them. */
  const NUMERIC_FIELDS = [
    ['x', 'image_editor.x', 'X'],
    ['y', 'image_editor.y', 'Y'],
    ['width', 'image_editor.width', 'Width'],
    ['height', 'image_editor.height', 'Height'],
    ['rotate', 'image_editor.rotation', 'Rotation'],
  ] as const satisfies ReadonlyArray<readonly [keyof ImageEditorData, string, string]>

  const SCALES = [
    ['x', 'image_editor.scale_x', 'Scale X'],
    ['y', 'image_editor.scale_y', 'Scale Y'],
  ] as const

  const t = useT()
  const hintId = $props.id()
  const inputsId = `${hintId}-inputs`

  let loaded = $state.raw<{ bitmap: ImageBitmap; editor: ImageEditor } | null>(null)
  let editorState = $state.raw<ImageEditorState | null>(null)
  let saving = $state(false)
  let canvas = $state<HTMLCanvasElement | null>(null)
  let frame = $state<HTMLDivElement | null>(null)

  // Restart only for another image or other settings: the schema object itself is new on
  // every render of a template item (a new builder block), which kept restarting the load.
  // (Read through deriveds: they only notify when the value changes, while props spread
  // from a new object notify on every render.)
  const optionsKey = $derived(imageEditorOptionsKey(options))
  const currentRequest = $derived(request)

  $effect(() => {
    const current = currentRequest
    void optionsKey
    const settings = untrack(() => options)

    if (!current) return

    let cancelled = false

    loadEditorImage(current.file)
      .then((bitmap) => {
        if (cancelled) return bitmap.close()

        loaded = {
          bitmap,
          editor: new ImageEditor({
            width: bitmap.width,
            height: bitmap.height,
            aspectRatios: settings.aspectRatios,
            circle: settings.circle,
            mode: settings.mode,
            emptyFillColor: settings.emptyFillColor,
            viewportWidth: settings.viewportWidth,
            viewportHeight: settings.viewportHeight,
          }),
        }
      })
      // Undecodable: upload the file as it is.
      .catch(() => !cancelled && current.resolve(current.file))

    return () => {
      cancelled = true
      untrack(() => loaded)?.bitmap.close()
      loaded = null
    }
  })

  // Follow the editor's store (rotation, flips, aspect ratio, crop).
  $effect(() => {
    const editor = loaded?.editor

    if (!editor) {
      editorState = null

      return
    }

    editorState = editor.state

    return editor.store.subscribe((next) => {
      editorState = next
    })
  })

  // Redraw on every change (crop, zoom, rotation, flips, container size).
  $effect(() => {
    const current = loaded
    const state = editorState

    if (!current || !canvas || !state) return

    current.editor.drawPreview(canvas, current.bitmap, globalThis.devicePixelRatio || 1)
  })

  // Measure the container and follow its size; zoom with the wheel and trackpad pinch
  // (a native non-passive listener, so the page doesn't scroll).
  $effect(() => {
    const editor = loaded?.editor
    const element = frame

    if (!editor || !element) return

    const measure = () => editor.setContainer(element.clientWidth, element.clientHeight)
    measure()

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)

    const onWheel = (event: WheelEvent) => {
      const rect = element.getBoundingClientRect()

      if (editor.wheel(event, { x: event.clientX - rect.left, y: event.clientY - rect.top })) {
        event.preventDefault()
      }
    }

    element.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      observer?.disconnect()
      element.removeEventListener('wheel', onWheel)
    }
  })

  const data = $derived.by(() => {
    void editorState

    return loaded?.editor.getData() ?? null
  })

  // Numeric inputs apply on change (blur, Enter, spinner); invalid values snap back.
  const commit = (key: keyof ImageEditorData) => (event: Event) => {
    const editor = loaded?.editor
    const target = event.currentTarget as HTMLInputElement | null

    if (!editor || !target) return

    const value = target.value.trim() === '' ? Number.NaN : Number(target.value)
    editor.setData({ [key]: value })
    target.value = String(editor.getData()[key])
  }

  const box = $derived.by(() => {
    void editorState

    return loaded?.editor.cropBox() ?? null
  })

  const finish = (file: File | null) => {
    request?.resolve(file)
  }

  const save = async () => {
    if (!request || !loaded) return

    saving = true

    try {
      finish(await loaded.editor.export(loaded.bitmap, request.file))
    } catch {
      finish(request.file)
    } finally {
      saving = false
    }
  }

  const start = (mode: ImageEditorDragMode) => (event: PointerEvent) => {
    const editor = loaded?.editor

    if (!editor || !editorState) return

    event.preventDefault()
    event.stopPropagation()
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
    editor.startDrag(mode, event.clientX, event.clientY, undefined, event.pointerId ?? 0)
  }

  const ratioLabel = (ratio: string | null) => ratio ?? t('image_editor.free', {}, 'Free')

  const tools = $derived<
    Array<{ label: string; icon: LucideIconComponent; run: () => void; disabled?: boolean }>
  >([
    {
      label: t('image_editor.zoom_out', {}, 'Zoom out'),
      icon: ZoomOutIcon,
      run: () => loaded?.editor.zoomOut(),
      disabled: !(editorState && loaded?.editor.canZoomOut),
    },
    {
      label: t('image_editor.zoom_in', {}, 'Zoom in'),
      icon: ZoomInIcon,
      run: () => loaded?.editor.zoomIn(),
      disabled: !(editorState && loaded?.editor.canZoomIn),
    },
    {
      label: t('image_editor.rotate_left', {}, 'Rotate left'),
      icon: RotateCcwIcon,
      run: () => loaded?.editor.rotate(-1),
    },
    {
      label: t('image_editor.rotate_right', {}, 'Rotate right'),
      icon: RotateCwIcon,
      run: () => loaded?.editor.rotate(1),
    },
    {
      label: t('image_editor.flip_horizontal', {}, 'Flip horizontally'),
      icon: FlipHorizontal2Icon,
      run: () => loaded?.editor.flip('x'),
    },
    {
      label: t('image_editor.flip_vertical', {}, 'Flip vertically'),
      icon: FlipVertical2Icon,
      run: () => loaded?.editor.flip('y'),
    },
    {
      label: t('image_editor.reset', {}, 'Reset'),
      icon: Undo2Icon,
      run: () => loaded?.editor.reset(),
    },
  ])
</script>

<Dialog open={request !== null} onOpenChange={(open) => !open && finish(null)}>
  <DialogContent class="sm:max-w-3xl" data-slot="image-editor">
    <DialogHeader>
      <DialogTitle>{t('image_editor.title', {}, 'Edit image')}</DialogTitle>
      <DialogDescription id={hintId} class="sr-only">
        {t(
          'image_editor.keyboard_hint',
          {},
          'Arrow keys move the crop area. Shift and arrow keys resize it.',
        )}
        {t('image_editor.zoom_hint', {}, 'Plus and minus keys zoom the image.')}
      </DialogDescription>
    </DialogHeader>
    {#if loaded && editorState && box && data}
      {@const editor = loaded.editor}
      <div class="flex flex-col gap-4 md:flex-row">
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <!-- Image space: left is the image's left in every reading direction. -->
          <div
            bind:this={frame}
            dir="ltr"
            data-slot="image-editor-viewport"
            class="bg-muted/40 relative h-72 w-full cursor-grab touch-none overflow-hidden rounded-md select-none sm:h-96"
            role="presentation"
            onpointerdown={start('pan')}
            onpointermove={(event) =>
              editor.dragTo(event.clientX, event.clientY, event.pointerId ?? 0)}
            onpointerup={(event) => editor.endDrag(event.pointerId ?? 0)}
            onpointercancel={(event) => editor.endDrag(event.pointerId ?? 0)}
          >
            <canvas bind:this={canvas} class="pointer-events-none absolute inset-0 block size-full"
            ></canvas>
            <!-- Runtime geometry: no Tailwind class can hold these values. -->
            <!-- The crop area is a focusable group moved with the arrow keys and the pointer. -->
            <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
            <div
              role="group"
              tabindex="0"
              aria-label={t('image_editor.crop_area', {}, 'Crop area')}
              aria-describedby={hintId}
              data-slot="image-editor-crop"
              class={cn(
                'ring-ring/50 absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.5)] outline-none focus-visible:ring-[3px]',
                editor.circle && 'rounded-full',
              )}
              style:left={`${box.left}%`}
              style:top={`${box.top}%`}
              style:width={`${box.width}%`}
              style:height={`${box.height}%`}
              onpointerdown={start('move')}
              onkeydown={(event) => {
                if (editor.handleKey(event)) event.preventDefault()
              }}
            >
              {#each HANDLES as handle (handle)}
                <span
                  data-handle={handle}
                  aria-hidden="true"
                  class="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/40 bg-white"
                  style:left={handle.endsWith('w') ? '0%' : '100%'}
                  style:top={handle.startsWith('n') ? '0%' : '100%'}
                  style:cursor={handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize'}
                  onpointerdown={start(handle)}
                ></span>
              {/each}
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            {#if editor.aspectRatios.length > 1}
              <div
                role="group"
                aria-label={t('image_editor.aspect_ratio', {}, 'Aspect ratio')}
                class="flex flex-wrap gap-1"
              >
                {#each editor.aspectRatios as ratio (ratio ?? 'free')}
                  <Button
                    type="button"
                    size="sm"
                    variant={editorState.aspectRatio === ratio ? 'default' : 'outline'}
                    aria-pressed={editorState.aspectRatio === ratio}
                    onclick={() => editor.setAspectRatio(ratio)}
                  >
                    {ratioLabel(ratio)}
                  </Button>
                {/each}
              </div>
            {:else}
              <span></span>
            {/if}
            <div class="flex flex-wrap gap-1">
              {#each tools as tool (tool.label)}
                {@const ToolIcon = tool.icon}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={tool.label}
                  title={tool.label}
                  disabled={tool.disabled}
                  onclick={tool.run}
                >
                  <ToolIcon />
                </Button>
              {/each}
            </div>
          </div>
        </div>
        <!-- Numeric inputs: beside the image from md up, under it on phones. -->
        <div
          role="group"
          aria-label={t('image_editor.inputs', {}, 'Position and size')}
          data-slot="image-editor-inputs"
          class="grid grid-cols-2 content-start gap-x-3 gap-y-2 sm:grid-cols-4 md:w-40 md:shrink-0 md:grid-cols-1"
        >
          {#each NUMERIC_FIELDS as [key, labelKey, fallback] (key)}
            <div class="flex flex-col gap-1">
              <label for={`${inputsId}-${key}`} class="text-muted-foreground text-xs">
                {t(labelKey, {}, fallback)}
              </label>
              <Input
                id={`${inputsId}-${key}`}
                type="number"
                inputmode="decimal"
                step="1"
                data-field={key}
                class="h-8 tabular-nums"
                value={data[key]}
                onchange={commit(key)}
                onkeydown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commit(key)(event)
                  }
                }}
              />
            </div>
          {/each}
          <div class="col-span-2 flex gap-1 sm:col-span-4 md:col-span-1">
            {#each SCALES as [axis, labelKey, fallback] (axis)}
              {@const flipped = axis === 'x' ? editorState.flipX : editorState.flipY}
              <Button
                type="button"
                size="sm"
                variant={flipped ? 'default' : 'outline'}
                aria-pressed={flipped}
                data-field={`scale${axis.toUpperCase()}`}
                class="flex-1"
                onclick={() => editor.flip(axis)}
              >
                {t(labelKey, {}, fallback)}
              </Button>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <div class="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    {/if}
    <DialogFooter>
      <Button type="button" variant="outline" onclick={() => finish(null)}>
        {t('image_editor.cancel', {}, 'Cancel')}
      </Button>
      <Button type="button" disabled={!loaded || saving} onclick={() => void save()}>
        {#if saving}<Spinner />{/if}
        {t('image_editor.save', {}, 'Apply')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
