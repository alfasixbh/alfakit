<script setup lang="ts">
import type { TreeDropPosition, TreeEnvironment, TreeRow, TreeSchema } from '@alfakit/core'
import { TreeController, clientErrorNotification, visibleTreeRows } from '@alfakit/core'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  GripVerticalIcon,
  ListIndentDecreaseIcon,
  ListIndentIncreaseIcon,
} from '@lucide/vue'
import { computed, nextTick, ref, toRaw, useId, watch } from 'vue'
import { useActionRunner, useDirection, useT } from '../../context'
import { useStore } from '../../composables/use-store'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import ActionList from '../actions/ActionList.vue'
import { showToast } from '../notifications/flash-toasts'
import Button from '../ui/Button.vue'
import Card from '../ui/Card.vue'
import CardContent from '../ui/CardContent.vue'
import CardHeader from '../ui/CardHeader.vue'
import CardTitle from '../ui/CardTitle.vue'

/**
 * Nodes are rearranged with native drag and drop, the move buttons or Alt + arrow keys,
 * and the new structure is saved in one request.
 */
const props = defineProps<{ tree: TreeSchema }>()

const DRAG_TYPE = 'application/x-alfakit-tree-node'
const runner = useActionRunner()
const page = usePageActionContext()
const t = useT()
const direction = useDirection()
const labelId = useId()

const environment = (): TreeEnvironment => ({
  runner,
  token: page.token,
  t,
  notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
  error: (message) => showToast(clientErrorNotification('tree', message)),
})

const controller = new TreeController(toRaw(props.tree), environment())
const state = useStore(controller.store)
const rows = computed(() => visibleTreeRows(state.value.nodes, state.value.expanded))
const hasParents = computed(() => state.value.nodes.some((node) => node.children.length > 0))
const focused = ref<string | null>(null)
const drop = ref<{ key: string; position: TreeDropPosition } | null>(null)
const items = new Map<string, HTMLElement>()
const current = computed(() =>
  focused.value !== null && rows.value.some((row) => row.node.key === focused.value)
    ? focused.value
    : (rows.value[0]?.node.key ?? null),
)

watch(
  () => props.tree,
  (tree) => controller.setTree(toRaw(tree)),
)

const setItem = (key: string) => (element: unknown) => {
  if (element instanceof HTMLElement) items.set(key, element)
  else items.delete(key)
}

const focus = (key: string | undefined) => {
  if (!key) return
  focused.value = key
  void nextTick(() => items.get(key)?.focus())
}

const onKeyDown = (row: TreeRow, event: KeyboardEvent) => {
  if (event.target !== event.currentTarget) return

  const result = controller.handleKey(row.node.key, event, direction.value)

  if (result.handled) {
    event.preventDefault()
    focus(result.focus)
  }
}

const position = (event: DragEvent): TreeDropPosition => {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const offset = box.height > 0 ? (event.clientY - box.top) / box.height : 0.5

  return offset < 0.25 ? 'before' : offset > 0.75 ? 'after' : 'inside'
}

const onDragStart = (key: string, event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(DRAG_TYPE, key)
  }
  controller.startDrag(key)
}

const onDragEnd = () => {
  controller.endDrag()
  drop.value = null
}

const onDragOver = (key: string, event: DragEvent) => {
  const dragging = controller.state.dragging

  if (!dragging) return

  const at = position(event)

  if (controller.canDrop(dragging, key, at)) {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    drop.value = { key, position: at }
  } else if (drop.value?.key === key) {
    drop.value = null
  }
}

const onDragLeave = (key: string, event: DragEvent) => {
  const target = event.currentTarget as HTMLElement

  if (!target.contains(event.relatedTarget as Node | null) && drop.value?.key === key) {
    drop.value = null
  }
}

const onDrop = (key: string, event: DragEvent) => {
  event.preventDefault()
  const dragging = controller.state.dragging

  if (dragging) controller.drop(dragging, key, position(event))
  onDragEnd()
}
</script>

<template>
  <Card class="gap-4 py-4" data-slot="tree-widget">
    <CardHeader class="px-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <CardTitle v-if="props.tree.heading" :id="labelId" class="text-base">{{
          props.tree.heading
        }}</CardTitle>
        <span v-else :id="labelId" class="sr-only">{{ t('tree.label', {}, 'Tree') }}</span>
        <div class="ms-auto flex flex-wrap items-center gap-1">
          <template v-if="hasParents">
            <Button type="button" variant="ghost" size="sm" @click="controller.expandAll()">
              <ChevronsUpDownIcon aria-hidden="true" />
              {{ t('tree.expand_all', {}, 'Expand all') }}
            </Button>
            <Button type="button" variant="ghost" size="sm" @click="controller.collapseAll()">
              <ChevronsDownUpIcon aria-hidden="true" />
              {{ t('tree.collapse_all', {}, 'Collapse all') }}
            </Button>
          </template>
          <template v-if="state.dirty">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="state.saving"
              @click="controller.reset()"
            >
              {{ t('tree.discard', {}, 'Discard changes') }}
            </Button>
            <Button type="button" size="sm" :disabled="state.saving" @click="controller.save()">
              {{
                state.saving ? t('tree.saving', {}, 'Saving…') : t('tree.save', {}, 'Save order')
              }}
            </Button>
          </template>
        </div>
      </div>
      <p v-if="state.dirty" class="text-muted-foreground text-sm">
        {{ t('tree.unsaved', {}, 'You have unsaved changes to the order.') }}
      </p>
    </CardHeader>
    <CardContent class="px-5">
      <p v-if="rows.length === 0" class="text-muted-foreground py-6 text-center text-sm">
        {{ t('tree.empty', {}, 'No records yet') }}
      </p>
      <ul
        v-else
        role="tree"
        :aria-labelledby="labelId"
        class="flex flex-col gap-1"
        data-slot="tree"
      >
        <li
          v-for="row in rows"
          :key="row.node.key"
          :ref="setItem(row.node.key)"
          role="treeitem"
          :aria-level="row.level"
          :aria-setsize="row.siblings"
          :aria-posinset="row.index + 1"
          :aria-expanded="row.hasChildren ? row.expanded : undefined"
          :aria-selected="current === row.node.key"
          :aria-label="row.node.title"
          :tabindex="current === row.node.key ? 0 : -1"
          data-slot="tree-item"
          :data-key="row.node.key"
          :data-drop="drop?.key === row.node.key ? drop.position : undefined"
          :data-dragging="state.dragging === row.node.key ? '' : undefined"
          :draggable="props.tree.reorderable"
          :class="
            cn(
              'hover:bg-accent/50 focus-visible:ring-ring/50 flex items-center gap-2 rounded-md border px-2 py-1.5 outline-none focus-visible:ring-[3px]',
              state.dragging === row.node.key && 'opacity-50',
            )
          "
          :style="{ marginInlineStart: `${(row.level - 1) * 1.5}rem` }"
          @focus="
            (event: FocusEvent) => event.target === event.currentTarget && (focused = row.node.key)
          "
          @keydown="onKeyDown(row, $event)"
          @dragstart="onDragStart(row.node.key, $event)"
          @dragend="onDragEnd"
          @dragover="onDragOver(row.node.key, $event)"
          @dragleave="onDragLeave(row.node.key, $event)"
          @drop="onDrop(row.node.key, $event)"
        >
          <GripVerticalIcon
            v-if="props.tree.reorderable"
            class="text-muted-foreground size-4 shrink-0 cursor-grab"
            aria-hidden="true"
          />
          <Button
            v-if="row.hasChildren"
            type="button"
            variant="ghost"
            size="icon-xs"
            :tabindex="-1"
            :aria-label="
              row.expanded
                ? t('tree.collapse', { title: row.node.title }, 'Collapse :title')
                : t('tree.expand', { title: row.node.title }, 'Expand :title')
            "
            @click="controller.toggle(row.node.key)"
          >
            <ChevronRightIcon
              :class="
                cn('transition-transform rtl:rotate-180', row.expanded && 'rotate-90 rtl:rotate-90')
              "
              aria-hidden="true"
            />
          </Button>
          <span v-else class="size-6 shrink-0" aria-hidden="true" />
          <Icon
            v-if="row.node.icon"
            :name="row.node.icon"
            class="text-muted-foreground size-4 shrink-0"
          />
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ row.node.title }}</span>
          <div
            v-if="props.tree.reorderable"
            class="flex shrink-0 items-center"
            data-slot="tree-move-buttons"
          >
            <Button
              v-for="move in [
                {
                  name: 'up',
                  label: t('tree.move_up', { title: row.node.title }, 'Move :title up'),
                },
                {
                  name: 'down',
                  label: t('tree.move_down', { title: row.node.title }, 'Move :title down'),
                },
                {
                  name: 'outdent',
                  label: t(
                    'tree.outdent',
                    { title: row.node.title },
                    'Move :title out of its parent',
                  ),
                },
                {
                  name: 'indent',
                  label: t(
                    'tree.indent',
                    { title: row.node.title },
                    'Move :title into the item above',
                  ),
                },
              ] as const"
              :key="move.name"
              type="button"
              variant="ghost"
              size="icon-xs"
              :aria-label="move.label"
              :title="move.label"
              :disabled="!controller.canMove(row.node.key, move.name)"
              @click="controller.move(row.node.key, move.name)"
            >
              <ArrowUpIcon v-if="move.name === 'up'" aria-hidden="true" />
              <ArrowDownIcon v-else-if="move.name === 'down'" aria-hidden="true" />
              <ListIndentDecreaseIcon
                v-else-if="move.name === 'outdent'"
                class="rtl:rotate-180"
                aria-hidden="true"
              />
              <ListIndentIncreaseIcon v-else class="rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
          <ActionList
            v-if="row.node.actions?.length"
            :actions="row.node.actions"
            :context="{
              token: page.token,
              component: props.tree.actionComponent,
              record: row.node.key,
            }"
            size="xs"
            class="shrink-0 gap-1"
          />
        </li>
      </ul>
      <div class="sr-only" role="status" aria-live="polite">{{ state.announcement }}</div>
    </CardContent>
  </Card>
</template>
