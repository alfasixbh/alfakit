<script setup lang="ts">
import type {
  DashboardCustomizeSchema,
  LazyWidgetSchema,
  WidgetsBlock,
  WidgetSchema,
} from '@alfakit/core'
import {
  columnSpanClasses,
  DashboardEditor,
  dashboardMoveForKey,
  gridColumnsClasses,
  isLazyPlaceholder,
} from '@alfakit/core'
import {
  CheckIcon,
  EyeOffIcon,
  GripVerticalIcon,
  LayoutDashboardIcon,
  PlusIcon,
  RotateCcwIcon,
  XIcon,
} from '@lucide/vue'
import { router } from '@inertiajs/vue3'
import { computed, nextTick, useId, watch } from 'vue'
import { useDirection, useT } from '../../context'
import { useStore } from '../../composables/use-store'
import { cn } from '../../lib/utils'
import LazyWidgetPlaceholder from '../panel/LazyWidgetPlaceholder.vue'
import Button from '../ui/Button.vue'
import WidgetRenderer from './WidgetRenderer.vue'

/**
 * A customizable dashboard (`Dashboard::customizable()`): the widget grid plus an "Edit
 * dashboard" mode (drag or arrow keys on the handle to move, resize, hide, add from the
 * library). Mirrors the React renderer.
 */
const props = defineProps<{ block: WidgetsBlock; customize: DashboardCustomizeSchema }>()

const t = useT()
const dir = useDirection()
const helpId = useId()
const editor = new DashboardEditor(props.customize, { t, onSaved: () => router.reload() })

watch(
  () => props.customize,
  (customize) => editor.sync(customize),
)

const state = useStore(editor.store)
const widgets = computed(() => new Map(props.block.widgets.map((widget) => [widget.id, widget])))
const visible = computed(() => state.value.layout.filter((item) => !item.hidden))
const available = computed(() => {
  void state.value

  return editor.available()
})

function cellSpan(id: string) {
  const widget = widgets.value.get(id)
  const library = editor.widget(id)

  if (state.value.editing && library) {
    const span = editor.spanOf(id)

    return library.spans.find((option) => option.value === span)?.columnSpan ?? widget?.columnSpan
  }

  return widget?.columnSpan
}

function onHandleKeydown(event: KeyboardEvent, id: string) {
  const move = dashboardMoveForKey(event.key, dir.value)

  if (move === null) return

  event.preventDefault()
  const target = event.currentTarget as HTMLElement
  editor.move(id, move)
  void nextTick(() => target.focus())
}

function onDragStart(event: DragEvent, id: string) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  editor.dragStart(id)
}

interface Cell {
  id: string
  label: string
  widget: WidgetSchema | null
  lazy: LazyWidgetSchema | null
}

const cells = computed<Cell[]>(() =>
  visible.value.map((entry) => {
    const widget = widgets.value.get(entry.id)
    const lazy = widget && isLazyPlaceholder(widget) ? (widget as LazyWidgetSchema) : null

    return {
      id: entry.id,
      label: editor.label(entry.id),
      widget: widget && !lazy ? (widget as WidgetSchema) : null,
      lazy,
    }
  }),
)
</script>

<template>
  <div
    data-slot="dashboard"
    :data-editing="state.editing ? '' : undefined"
    class="flex flex-col gap-4"
  >
    <div
      data-slot="dashboard-toolbar"
      role="toolbar"
      :aria-label="t('dashboard.customize.toolbar', {}, 'Dashboard layout')"
      class="flex flex-wrap items-center justify-end gap-2"
    >
      <template v-if="state.editing">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :disabled="state.saving"
          @click="editor.resetDraft()"
        >
          <RotateCcwIcon aria-hidden="true" />
          {{ t('dashboard.customize.reset', {}, 'Reset to default') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="state.saving"
          @click="editor.cancel()"
        >
          <XIcon aria-hidden="true" />
          {{ t('dashboard.customize.cancel', {}, 'Cancel') }}
        </Button>
        <Button type="button" size="sm" :disabled="state.saving" @click="editor.save()">
          <CheckIcon aria-hidden="true" />
          {{ t('dashboard.customize.save', {}, 'Save') }}
        </Button>
      </template>
      <Button v-else type="button" variant="outline" size="sm" @click="editor.start()">
        <LayoutDashboardIcon aria-hidden="true" />
        {{ t('dashboard.customize.edit', {}, 'Edit dashboard') }}
      </Button>
    </div>

    <p v-if="state.error" role="alert" class="text-destructive text-sm">{{ state.error }}</p>

    <p v-if="state.editing" :id="helpId" class="sr-only">
      {{
        t(
          'dashboard.customize.move_help',
          {},
          'Use the arrow keys to move the widget, Home or End to move it to the start or end.',
        )
      }}
    </p>

    <p
      v-if="visible.length === 0"
      data-slot="dashboard-empty"
      class="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm"
    >
      {{ t('dashboard.customize.empty', {}, 'No widgets on this dashboard yet.') }}
    </p>
    <div
      v-else
      data-slot="widgets"
      :class="cn('grid gap-6', gridColumnsClasses(props.block.columns))"
    >
      <template v-for="entry in cells" :key="entry.id">
        <div v-if="!state.editing" :class="cn('min-w-0', columnSpanClasses(cellSpan(entry.id)))">
          <WidgetRenderer v-if="entry.widget" :widget="entry.widget" />
          <LazyWidgetPlaceholder v-else-if="entry.lazy" :widget="entry.lazy" />
        </div>
        <div
          v-else
          data-slot="dashboard-widget"
          :data-dragging="state.dragging === entry.id ? '' : undefined"
          role="group"
          :aria-label="entry.label"
          :class="
            cn(
              'relative min-w-0 rounded-xl border-2 border-dashed p-1',
              state.dragging === entry.id && 'opacity-50',
              columnSpanClasses(cellSpan(entry.id)),
            )
          "
          @dragover="state.dragging !== null && $event.preventDefault()"
          @drop.prevent="editor.dropOn(entry.id)"
        >
          <div
            data-slot="dashboard-widget-controls"
            class="bg-background/95 absolute inset-x-2 top-2 z-10 flex items-center gap-1 rounded-md border p-1 shadow-sm"
          >
            <button
              type="button"
              data-slot="dashboard-widget-handle"
              draggable="true"
              :aria-label="t('dashboard.customize.move', { widget: entry.label }, 'Move :widget')"
              :aria-describedby="helpId"
              :aria-roledescription="t('dashboard.customize.sortable', {}, 'sortable')"
              class="hover:bg-accent focus-visible:ring-ring/50 cursor-grab rounded p-1 outline-none focus-visible:ring-[3px] active:cursor-grabbing"
              @dragstart="onDragStart($event, entry.id)"
              @dragend="editor.dragEnd()"
              @keydown="onHandleKeydown($event, entry.id)"
            >
              <GripVerticalIcon class="size-4" aria-hidden="true" />
            </button>
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ entry.label }}</span>
            <select
              v-if="(editor.widget(entry.id)?.spans.length ?? 0) > 1"
              data-slot="dashboard-widget-span"
              :aria-label="
                t('dashboard.customize.size', { widget: entry.label }, 'Size of :widget')
              "
              class="border-input bg-background h-7 rounded-md border px-1 text-xs"
              :value="editor.spanOf(entry.id)"
              @change="editor.setSpan(entry.id, Number(($event.target as HTMLSelectElement).value))"
            >
              <option
                v-for="option in editor.widget(entry.id)!.spans"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              :aria-label="t('dashboard.customize.hide', { widget: entry.label }, 'Hide :widget')"
              @click="editor.hide(entry.id)"
            >
              <EyeOffIcon aria-hidden="true" />
            </Button>
          </div>
          <!-- The widget itself is inert while editing: focus stays on the controls. -->
          <div inert class="pointer-events-none pt-12 select-none" aria-hidden="true">
            <WidgetRenderer v-if="entry.widget" :widget="entry.widget" />
            <LazyWidgetPlaceholder v-else-if="entry.lazy" :widget="entry.lazy" />
            <div
              v-else
              class="bg-card text-muted-foreground flex min-h-24 items-center justify-center rounded-xl border border-dashed p-6 text-sm"
            >
              {{
                t(
                  'dashboard.customize.pending',
                  { widget: entry.label },
                  ':widget appears once you save.',
                )
              }}
            </div>
          </div>
        </div>
      </template>
    </div>

    <section
      v-if="state.editing"
      data-slot="dashboard-library"
      :aria-label="t('dashboard.customize.library', {}, 'Widget library')"
      class="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4"
    >
      <h2 class="text-sm font-medium">{{ t('dashboard.customize.add', {}, 'Add widget') }}</h2>
      <p v-if="available.length === 0" class="text-muted-foreground text-sm">
        {{ t('dashboard.customize.library_empty', {}, 'Every widget is on the dashboard.') }}
      </p>
      <ul v-else class="flex flex-wrap gap-2">
        <li v-for="widget in available" :key="widget.id">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :title="widget.description"
            :aria-label="
              t('dashboard.customize.add_widget', { widget: widget.label }, 'Add :widget')
            "
            @click="editor.add(widget.id)"
          >
            <PlusIcon aria-hidden="true" />
            {{ widget.label }}
          </Button>
        </li>
      </ul>
    </section>

    <div data-slot="dashboard-announcer" role="status" aria-live="polite" class="sr-only">
      {{ state.announcement }}
    </div>
  </div>
</template>
