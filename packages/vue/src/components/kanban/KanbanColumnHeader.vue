<script setup lang="ts">
import type { KanbanColumnSchema } from '@alfakit/core'
import { kanbanWipState } from '@alfakit/core'
import { ChevronsLeftRightIcon, ChevronsRightLeftIcon, PlusIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { cssColor } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'

const props = defineProps<{
  column: KanbanColumnSchema
  id: string
  collapsed: boolean
  creatable: boolean
  filtered: boolean
}>()
const emit = defineEmits<{ toggle: []; create: [] }>()
const t = useT()

const wip = computed(() => kanbanWipState(props.column))
const shown = computed(() =>
  props.column.wipLimit !== undefined
    ? props.column.count
    : props.filtered
      ? props.column.total
      : props.column.count,
)
const countLabel = computed(() => {
  const column = props.column

  if (column.wipLimit !== undefined) {
    return t('kanban.wip', { count: column.count, limit: column.wipLimit }, ':count of :limit')
  }

  return props.filtered && column.total !== column.count
    ? t(
        'kanban.count_filtered',
        { shown: column.total, count: column.count },
        ':shown of :count cards',
      )
    : t('kanban.count', { count: column.count }, ':count cards')
})
const style = computed(() =>
  props.column.color ? { borderTopColor: cssColor(props.column.color) } : undefined,
)
const toggleLabel = computed(() =>
  props.collapsed
    ? t('kanban.expand', { column: props.column.label }, 'Expand :column')
    : t('kanban.collapse', { column: props.column.label }, 'Collapse :column'),
)
const addLabel = computed(() =>
  t('kanban.add_card', { column: props.column.label }, 'Add a card to :column'),
)
</script>

<template>
  <div
    v-if="props.collapsed"
    class="bg-muted/60 flex snap-start flex-col items-center gap-2 rounded-lg border border-t-4 px-1 py-2"
    :style="style"
    data-slot="kanban-column-header"
    :data-column="props.column.key"
    data-collapsed=""
    :data-wip="wip ?? undefined"
  >
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      :aria-label="toggleLabel"
      :aria-expanded="false"
      @click="emit('toggle')"
    >
      <ChevronsLeftRightIcon aria-hidden="true" />
    </Button>
    <span class="text-muted-foreground text-xs tabular-nums" :title="countLabel">{{ shown }}</span>
    <h3 :id="props.id" class="text-sm font-medium [writing-mode:vertical-rl]">
      {{ props.column.label }}
    </h3>
  </div>
  <div
    v-else
    class="bg-muted/60 flex snap-start flex-col gap-1 rounded-lg border border-t-4 px-3 py-2"
    :style="style"
    data-slot="kanban-column-header"
    :data-column="props.column.key"
    :data-wip="wip ?? undefined"
  >
    <div class="flex items-center gap-2">
      <Icon
        v-if="props.column.icon"
        :name="props.column.icon"
        class="text-muted-foreground size-4"
      />
      <h3 :id="props.id" class="min-w-0 truncate text-sm font-semibold">
        {{ props.column.label }}
      </h3>
      <Badge
        variant="secondary"
        :class="
          cn(
            'h-5 px-1.5 tabular-nums',
            wip === 'over' && 'bg-destructive/15 text-destructive',
            wip === 'full' && 'bg-warning/15 text-warning',
          )
        "
        :title="countLabel"
      >
        <span aria-hidden="true">{{
          props.column.wipLimit !== undefined
            ? `${props.column.count}/${props.column.wipLimit}`
            : shown
        }}</span>
        <span class="sr-only">{{ countLabel }}</span>
      </Badge>
      <div class="ms-auto flex items-center">
        <Button
          v-if="props.creatable"
          type="button"
          variant="ghost"
          size="icon-xs"
          :aria-label="addLabel"
          :title="addLabel"
          @click="emit('create')"
        >
          <PlusIcon aria-hidden="true" />
        </Button>
        <Button
          v-if="props.column.collapsible"
          type="button"
          variant="ghost"
          size="icon-xs"
          :aria-label="toggleLabel"
          :title="toggleLabel"
          :aria-expanded="true"
          @click="emit('toggle')"
        >
          <ChevronsRightLeftIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
    <p v-if="props.column.description" class="text-muted-foreground line-clamp-2 text-xs">
      {{ props.column.description }}
    </p>
    <p v-if="wip === 'over'" class="text-destructive text-xs">
      {{
        t(
          'kanban.wip_over',
          { limit: props.column.wipLimit ?? 0 },
          'Over the limit of :limit cards',
        )
      }}
    </p>
    <p v-if="wip === 'full' && props.column.wipStrict" class="text-muted-foreground text-xs">
      {{ t('kanban.wip_full', {}, 'This column is full') }}
    </p>
  </div>
</template>
