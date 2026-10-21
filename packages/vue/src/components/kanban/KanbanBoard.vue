<script setup lang="ts">
import type { KanbanEnvironment, KanbanSchema } from '@alfakit/core'
import {
  KanbanController,
  attachKanbanPointer,
  clientErrorNotification,
  createKanbanFiltersStore,
  kanbanActiveFilters,
  kanbanCardsIn,
  kanbanInitials,
} from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { ChevronRightIcon, SearchIcon } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, useId, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useActionRunner, useDirection, usePanel, useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import { usePageActionContext } from '../actions/action-context'
import { showToast } from '../notifications/flash-toasts'
import Avatar from '../ui/Avatar.vue'
import AvatarFallback from '../ui/AvatarFallback.vue'
import AvatarImage from '../ui/AvatarImage.vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Card from '../ui/Card.vue'
import CardTitle from '../ui/CardTitle.vue'
import Input from '../ui/Input.vue'
import Spinner from '../ui/Spinner.vue'
import KanbanCard from './KanbanCard.vue'
import KanbanColumnHeader from './KanbanColumnHeader.vue'
import KanbanFilters from './KanbanFilters.vue'

/**
 * Cards move by dragging (mouse, pen, touch) or with the keyboard, and every move is
 * saved in one request.
 */
const props = defineProps<{ board: KanbanSchema }>()

const runner = useActionRunner()
const page = usePageActionContext()
const panel = usePanel()
const t = useT()
const direction = useDirection()
const labelId = useId()
const instructionsId = useId()

const environment = (): KanbanEnvironment => ({
  runner,
  token: page.token,
  t,
  notify: (notifications) => notifications.forEach((notification) => showToast(notification)),
  error: (message) => showToast(clientErrorNotification('kanban', message)),
  visit: (url) => router.visit(url),
})

const controller = new KanbanController(toRaw(props.board), environment())
const filters = createKanbanFiltersStore(
  toRaw(props.board),
  page.token,
  panel.value.endpoints.schemaOptions,
)
const state = useStore(controller.store)
const root = ref<{ $el: HTMLElement } | null>(null)
const cards = new Map<string, HTMLElement>()
const focused = ref<string | null>(null)
const search = ref(state.value.search)
let detach: (() => void) | null = null
let stopPolling: (() => void) | null = null

watch(
  () => props.board,
  (board) => controller.setBoard(toRaw(board)),
)
watch(
  () => state.value.search,
  (value) => {
    if (value !== search.value) search.value = value
  },
)

onMounted(() => {
  const element = root.value?.$el

  if (element instanceof HTMLElement) detach = attachKanbanPointer(element, controller)

  stopPolling = controller.startPolling()
})

onBeforeUnmount(() => {
  detach?.()
  stopPolling?.()
  controller.destroy()
  filters?.destroy()
})

const schema = computed(() => {
  // Re-read when the state changes (the controller swaps its schema with the board).
  void state.value.columns

  return controller.schema
})
const lanes = computed(() => {
  void state.value.columns

  return controller.lanes()
})
const filtered = computed(
  () => state.value.search !== '' || kanbanActiveFilters(state.value.filters) > 0,
)
const keys = computed(() =>
  state.value.columns.flatMap((column) => column.cards.map((card) => card.key)),
)
const current = computed(() =>
  focused.value !== null && keys.value.includes(focused.value)
    ? focused.value
    : (keys.value[0] ?? null),
)
const template = computed(() =>
  state.value.columns
    .map((column) => (state.value.collapsed.has(column.key) ? '3.25rem' : 'minmax(16rem, 20rem)'))
    .join(' '),
)

// A card moved to another column is mounted there before its old element is unmounted, so
// an unmount only forgets the element it registered itself (else the moved card would lose
// its entry and the keyboard focus).
const setCard = (key: string) => {
  let own: HTMLElement | null = null

  return (element: unknown) => {
    if (element instanceof HTMLElement) {
      own = element
      cards.set(key, element)
    } else if (own !== null) {
      if (cards.get(key) === own) cards.delete(key)
      own = null
    }
  }
}

const focus = (key: string | undefined) => {
  if (!key) return
  focused.value = key
  void nextTick(() => cards.get(key)?.focus())
}

// A card picked up with the keyboard moves to another list: keep the focus on it.
watch(
  () => state.value.picked,
  (picked) => {
    if (picked?.via !== 'keyboard') return

    void nextTick(() => {
      const element = cards.get(picked.key)

      if (element && document.activeElement !== element) element.focus()
    })
  },
)

const onKeyDown = (key: string, event: KeyboardEvent) => {
  if (event.target !== event.currentTarget) return

  const result = controller.handleKey(key, event, direction.value)

  if (!result.handled) return

  event.preventDefault()

  if (result.open) controller.open(key)
  else focus(result.focus)
}

const onSearch = (value: string) => {
  search.value = value
  controller.setSearch(value)
}

const laneCount = (lane: string) =>
  state.value.columns.reduce((sum, column) => sum + kanbanCardsIn(column, lane).length, 0)
</script>

<template>
  <Card ref="root" role="region" :aria-labelledby="labelId" class="gap-3 py-4" data-slot="kanban">
    <div class="flex flex-wrap items-center gap-2 px-4" data-slot="kanban-toolbar">
      <CardTitle v-if="schema.heading" :id="labelId" class="text-base">{{
        schema.heading
      }}</CardTitle>
      <span v-else :id="labelId" class="sr-only">{{ t('kanban.label', {}, 'Kanban board') }}</span>
      <div class="ms-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <Spinner v-if="state.loading" class="size-4" />
        <div v-if="schema.searchable" class="relative w-full sm:w-64">
          <SearchIcon
            class="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            :model-value="search"
            class="h-8 ps-8"
            :placeholder="t('kanban.search_placeholder', {}, 'Search…')"
            :aria-label="t('kanban.search', {}, 'Search cards')"
            @update:model-value="onSearch"
          />
        </div>
        <KanbanFilters v-if="filters" :controller="controller" :store="filters" />
      </div>
    </div>
    <p :id="instructionsId" class="sr-only">
      {{
        t(
          'kanban.instructions',
          {},
          'Press Space to pick up a card. While it is picked up, use the arrow keys to move it, Space to drop it and Escape to cancel.',
        )
      }}
    </p>
    <div
      class="relative overflow-x-auto overscroll-x-contain px-4 pb-2"
      data-slot="kanban-scroller"
    >
      <div class="grid w-max min-w-full snap-x gap-3" :style="{ gridTemplateColumns: template }">
        <KanbanColumnHeader
          v-for="column in state.columns"
          :id="`${labelId}-column-${column.key}`"
          :key="column.key"
          :column="column"
          :collapsed="state.collapsed.has(column.key)"
          :creatable="Boolean(column.creatable && schema.createAction)"
          :filtered="filtered"
          @toggle="controller.toggleColumn(column.key)"
          @create="controller.create(column.key)"
        />
        <template v-for="lane in lanes" :key="lane?.key ?? '__board'">
          <div
            v-if="lane"
            class="flex items-center gap-2 pt-2"
            style="grid-column: 1 / -1"
            data-slot="kanban-lane"
            :data-lane="lane.key"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :aria-expanded="!state.collapsedLanes.has(lane.key)"
              :aria-label="
                state.collapsedLanes.has(lane.key)
                  ? t('kanban.expand_lane', { lane: lane.label }, 'Expand row :lane')
                  : t('kanban.collapse_lane', { lane: lane.label }, 'Collapse row :lane')
              "
              @click="controller.toggleLane(lane.key)"
            >
              <ChevronRightIcon
                :class="
                  cn(
                    'transition-transform rtl:rotate-180',
                    !state.collapsedLanes.has(lane.key) && 'rotate-90 rtl:rotate-90',
                  )
                "
                aria-hidden="true"
              />
            </Button>
            <Avatar v-if="lane.avatar" class="size-6">
              <AvatarImage :src="lane.avatar" alt="" />
              <AvatarFallback>{{ kanbanInitials(lane.label) }}</AvatarFallback>
            </Avatar>
            <Icon v-else-if="lane.icon" :name="lane.icon" class="text-muted-foreground size-4" />
            <span :id="`${labelId}-lane-${lane.key}`" class="text-sm font-semibold">{{
              lane.label
            }}</span>
            <Badge variant="secondary" class="h-5 px-1.5 tabular-nums">{{
              laneCount(lane.key)
            }}</Badge>
          </div>
          <template v-if="!lane || !state.collapsedLanes.has(lane.key)">
            <ul
              v-for="column in state.columns"
              :key="column.key"
              role="list"
              :aria-labelledby="
                [
                  `${labelId}-column-${column.key}`,
                  lane ? `${labelId}-lane-${lane.key}` : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')
              "
              data-slot="kanban-dropzone"
              :data-column="column.key"
              :data-lane="lane?.key"
              :data-refused="state.picked && state.refused?.column === column.key ? '' : undefined"
              :class="
                cn(
                  'bg-muted/40 flex min-h-24 flex-col gap-2 rounded-lg p-2',
                  lane === null && 'max-h-[70vh] overflow-y-auto',
                )
              "
            >
              <template v-if="!state.collapsed.has(column.key)">
                <KanbanCard
                  v-for="card in kanbanCardsIn(column, lane?.key ?? null)"
                  :key="card.key"
                  :card="card"
                  :board="schema"
                  :token="page.token"
                  :current="current === card.key"
                  :picked="state.picked?.key === card.key ? state.picked.via : undefined"
                  :saving="state.saving.has(card.key)"
                  :described-by="instructionsId"
                  :set-ref="setCard(card.key)"
                  @focus="focused = card.key"
                  @keydown="onKeyDown(card.key, $event)"
                  @open="controller.open(card.key)"
                />
                <li
                  v-if="kanbanCardsIn(column, lane?.key ?? null).length === 0"
                  class="text-muted-foreground rounded-md border border-dashed px-2 py-6 text-center text-xs"
                  data-slot="kanban-empty"
                >
                  {{
                    filtered
                      ? t('kanban.no_results', {}, 'No cards match')
                      : (column.emptyState ?? t('kanban.empty', {}, 'No cards'))
                  }}
                </li>
                <li
                  v-if="lane === null && column.total > column.cards.length"
                  class="text-muted-foreground px-2 text-center text-xs"
                >
                  {{
                    t(
                      'kanban.more_cards',
                      { count: column.total - column.cards.length },
                      '+:count more',
                    )
                  }}
                </li>
              </template>
            </ul>
          </template>
        </template>
      </div>
    </div>
    <div class="sr-only" role="status" aria-live="polite">{{ state.announcement }}</div>
  </Card>
</template>
