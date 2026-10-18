<script setup lang="ts">
/**
 * `FileUpload::imageEditor()`: crop, zoom, rotate and flip an image before it is uploaded
 * (or to replace an uploaded one). Resolves the request with the edited file, or null
 * when cancelled.
 */
import type {
  CropHandle,
  FileUploadImageEditorSchema,
  ImageEditorData,
  ImageEditorDragMode,
  ImageEditorState,
} from '@alfakit/core'
import { ImageEditor, loadEditorImage } from '@alfakit/core'
import {
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@lucide/vue'
import { computed, onScopeDispose, ref, shallowRef, useId, watch, type Component } from 'vue'
import { useT } from '../../context'
import { cn } from '../../lib/utils'
import Button from '../ui/Button.vue'
import Dialog from '../ui/Dialog.vue'
import DialogContent from '../ui/DialogContent.vue'
import DialogDescription from '../ui/DialogDescription.vue'
import DialogFooter from '../ui/DialogFooter.vue'
import DialogHeader from '../ui/DialogHeader.vue'
import DialogTitle from '../ui/DialogTitle.vue'
import Input from '../ui/Input.vue'
import Spinner from '../ui/Spinner.vue'

export interface ImageEditRequest {
  file: File
  resolve: (file: File | null) => void
}

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

const props = defineProps<{
  request: ImageEditRequest | null
  options: FileUploadImageEditorSchema
}>()

const t = useT()
const loaded = shallowRef<{ bitmap: ImageBitmap; editor: ImageEditor } | null>(null)
const state = shallowRef<ImageEditorState | null>(null)
const saving = ref(false)
const hintId = useId()
const inputsId = useId()
const canvas = ref<HTMLCanvasElement | null>(null)
const frame = ref<HTMLDivElement | null>(null)
let unsubscribe: (() => void) | null = null
let stopObserving: (() => void) | null = null

const release = () => {
  unsubscribe?.()
  unsubscribe = null
  stopObserving?.()
  stopObserving = null
  loaded.value?.bitmap.close()
  loaded.value = null
  state.value = null
}

watch(
  () => [props.request, props.options] as const,
  ([request, options], _previous, onCleanup) => {
    if (!request) return

    let cancelled = false

    loadEditorImage(request.file)
      .then((bitmap) => {
        if (cancelled) return bitmap.close()

        const editor = new ImageEditor({
          width: bitmap.width,
          height: bitmap.height,
          aspectRatios: options.aspectRatios,
          circle: options.circle,
          mode: options.mode,
          emptyFillColor: options.emptyFillColor,
          viewportWidth: options.viewportWidth,
          viewportHeight: options.viewportHeight,
        })

        loaded.value = { bitmap, editor }
        state.value = editor.store.get()
        unsubscribe = editor.store.subscribe((next) => {
          state.value = next
        })
      })
      // Undecodable: upload the file as it is.
      .catch(() => !cancelled && request.resolve(request.file))

    onCleanup(() => {
      cancelled = true
      release()
    })
  },
  { immediate: true },
)

onScopeDispose(release)

// Redraw on every change (crop, zoom, rotation, flips, container size).
watch(
  () => [canvas.value, state.value] as const,
  ([element]) => {
    if (element && loaded.value) {
      loaded.value.editor.drawPreview(
        element,
        loaded.value.bitmap,
        globalThis.devicePixelRatio || 1,
      )
    }
  },
  { flush: 'post' },
)

// Measure the container and follow its size; zoom with the wheel and trackpad pinch.
watch(
  () => [frame.value, loaded.value?.editor] as const,
  ([element, editor]) => {
    stopObserving?.()
    stopObserving = null

    if (!element || !editor) return

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

    stopObserving = () => {
      observer?.disconnect()
      element.removeEventListener('wheel', onWheel)
    }
  },
  { flush: 'post' },
)

const data = computed<ImageEditorData | null>(() => {
  void state.value

  return loaded.value?.editor.getData() ?? null
})

// Numeric inputs apply on change (blur, Enter, spinner); invalid values snap back.
const commit = (field: keyof ImageEditorData, event: Event) => {
  const editor = loaded.value?.editor
  const input = event.target as HTMLInputElement | null

  if (!editor || !input) return

  const value = input.value.trim() === '' ? Number.NaN : Number(input.value)
  editor.setData({ [field]: value })
  input.value = String(editor.getData()[field])
}

const box = computed(() => {
  void state.value

  return loaded.value?.editor.cropBox() ?? { left: 0, top: 0, width: 0, height: 0 }
})

const finish = (file: File | null) => {
  props.request?.resolve(file)
}

const save = async () => {
  const request = props.request
  const current = loaded.value

  if (!request || !current) return

  saving.value = true

  try {
    finish(await current.editor.export(current.bitmap, request.file))
  } catch {
    finish(request.file)
  } finally {
    saving.value = false
  }
}

const start = (mode: ImageEditorDragMode, event: PointerEvent) => {
  const editor = loaded.value?.editor

  if (!editor) return

  event.preventDefault()
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  editor.startDrag(mode, event.clientX, event.clientY, undefined, event.pointerId ?? 0)
}

const onKeydown = (event: KeyboardEvent) => {
  if (loaded.value?.editor.handleKey(event)) event.preventDefault()
}

const ratioLabel = (ratio: string | null) => ratio ?? t('image_editor.free', {}, 'Free')

const tools = computed<
  Array<{ label: string; icon: Component; run: () => void; disabled?: boolean }>
>(() => [
  {
    label: t('image_editor.zoom_out', {}, 'Zoom out'),
    icon: ZoomOutIcon,
    run: () => loaded.value?.editor.zoomOut(),
    disabled: !(state.value && loaded.value?.editor.canZoomOut),
  },
  {
    label: t('image_editor.zoom_in', {}, 'Zoom in'),
    icon: ZoomInIcon,
    run: () => loaded.value?.editor.zoomIn(),
    disabled: !(state.value && loaded.value?.editor.canZoomIn),
  },
  {
    label: t('image_editor.rotate_left', {}, 'Rotate left'),
    icon: RotateCcwIcon,
    run: () => loaded.value?.editor.rotate(-1),
  },
  {
    label: t('image_editor.rotate_right', {}, 'Rotate right'),
    icon: RotateCwIcon,
    run: () => loaded.value?.editor.rotate(1),
  },
  {
    label: t('image_editor.flip_horizontal', {}, 'Flip horizontally'),
    icon: FlipHorizontal2Icon,
    run: () => loaded.value?.editor.flip('x'),
  },
  {
    label: t('image_editor.flip_vertical', {}, 'Flip vertically'),
    icon: FlipVertical2Icon,
    run: () => loaded.value?.editor.flip('y'),
  },
  {
    label: t('image_editor.reset', {}, 'Reset'),
    icon: Undo2Icon,
    run: () => loaded.value?.editor.reset(),
  },
])
</script>

<template>
  <Dialog :open="props.request !== null" @update:open="(open) => !open && finish(null)">
    <DialogContent class="sm:max-w-3xl" data-slot="image-editor">
      <DialogHeader>
        <DialogTitle>{{ t('image_editor.title', {}, 'Edit image') }}</DialogTitle>
        <DialogDescription class="sr-only">
          <span :id="hintId"
            >{{
              t(
                'image_editor.keyboard_hint',
                {},
                'Arrow keys move the crop area. Shift and arrow keys resize it.',
              )
            }}
            {{ t('image_editor.zoom_hint', {}, 'Plus and minus keys zoom the image.') }}</span
          >
        </DialogDescription>
      </DialogHeader>
      <div v-if="loaded && state && data" class="flex flex-col gap-4 md:flex-row">
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <!-- Image space: left is the image's left in every reading direction. -->
          <div
            ref="frame"
            dir="ltr"
            data-slot="image-editor-viewport"
            class="bg-muted/40 relative h-72 w-full cursor-grab touch-none overflow-hidden rounded-md select-none sm:h-96"
            @pointerdown="start('pan', $event)"
            @pointermove="
              loaded.editor.dragTo($event.clientX, $event.clientY, $event.pointerId ?? 0)
            "
            @pointerup="loaded.editor.endDrag($event.pointerId ?? 0)"
            @pointercancel="loaded.editor.endDrag($event.pointerId ?? 0)"
          >
            <canvas ref="canvas" class="pointer-events-none absolute inset-0 block size-full" />
            <!-- Runtime geometry: no Tailwind class can hold these values. -->
            <div
              role="group"
              tabindex="0"
              :aria-label="t('image_editor.crop_area', {}, 'Crop area')"
              :aria-describedby="hintId"
              data-slot="image-editor-crop"
              :class="
                cn(
                  'ring-ring/50 absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.5)] outline-none focus-visible:ring-[3px]',
                  loaded.editor.circle && 'rounded-full',
                )
              "
              :style="{
                left: `${box.left}%`,
                top: `${box.top}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }"
              @pointerdown="start('move', $event)"
              @keydown="onKeydown"
            >
              <span
                v-for="handle in HANDLES"
                :key="handle"
                :data-handle="handle"
                aria-hidden="true"
                class="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-black/40 bg-white"
                :style="{
                  left: handle.endsWith('w') ? '0%' : '100%',
                  top: handle.startsWith('n') ? '0%' : '100%',
                  cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
                }"
                @pointerdown="start(handle, $event)"
              />
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div
              v-if="loaded.editor.aspectRatios.length > 1"
              role="group"
              :aria-label="t('image_editor.aspect_ratio', {}, 'Aspect ratio')"
              class="flex flex-wrap gap-1"
            >
              <Button
                v-for="ratio in loaded.editor.aspectRatios"
                :key="ratio ?? 'free'"
                type="button"
                size="sm"
                :variant="state.aspectRatio === ratio ? 'default' : 'outline'"
                :aria-pressed="String(state.aspectRatio === ratio)"
                @click="loaded.editor.setAspectRatio(ratio)"
              >
                {{ ratioLabel(ratio) }}
              </Button>
            </div>
            <span v-else />
            <div class="flex flex-wrap gap-1">
              <Button
                v-for="tool in tools"
                :key="tool.label"
                type="button"
                variant="outline"
                size="icon-sm"
                :aria-label="tool.label"
                :title="tool.label"
                :disabled="tool.disabled"
                @click="tool.run()"
              >
                <component :is="tool.icon" />
              </Button>
            </div>
          </div>
        </div>
        <!-- Numeric inputs: beside the image from md up, under it on phones. -->
        <div
          role="group"
          :aria-label="t('image_editor.inputs', {}, 'Position and size')"
          data-slot="image-editor-inputs"
          class="grid grid-cols-2 content-start gap-x-3 gap-y-2 sm:grid-cols-4 md:w-40 md:shrink-0 md:grid-cols-1"
        >
          <div
            v-for="[field, key, fallback] in NUMERIC_FIELDS"
            :key="field"
            class="flex flex-col gap-1"
          >
            <label :for="`${inputsId}-${field}`" class="text-muted-foreground text-xs">
              {{ t(key, {}, fallback) }}
            </label>
            <Input
              :id="`${inputsId}-${field}`"
              type="number"
              inputmode="decimal"
              step="1"
              :data-field="field"
              class="h-8 tabular-nums"
              :model-value="data[field]"
              @change="commit(field, $event)"
              @keydown.enter.prevent="commit(field, $event)"
            />
          </div>
          <div class="col-span-2 flex gap-1 sm:col-span-4 md:col-span-1">
            <Button
              v-for="[axis, key, fallback] in SCALES"
              :key="axis"
              type="button"
              size="sm"
              :variant="(axis === 'x' ? state.flipX : state.flipY) ? 'default' : 'outline'"
              :aria-pressed="String(axis === 'x' ? state.flipX : state.flipY)"
              :data-field="`scale${axis.toUpperCase()}`"
              class="flex-1"
              @click="loaded.editor.flip(axis)"
            >
              {{ t(key, {}, fallback) }}
            </Button>
          </div>
        </div>
      </div>
      <div v-else class="flex h-48 items-center justify-center">
        <Spinner />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="finish(null)">
          {{ t('image_editor.cancel', {}, 'Cancel') }}
        </Button>
        <Button type="button" :disabled="!loaded || saving" @click="void save()">
          <Spinner v-if="saving" />
          {{ t('image_editor.save', {}, 'Apply') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
