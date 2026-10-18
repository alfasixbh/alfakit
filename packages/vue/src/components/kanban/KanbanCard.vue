<script setup lang="ts">
import type { KanbanCardSchema, KanbanSchema } from '@alfakit/core'
import { kanbanInitials } from '@alfakit/core'
import { CalendarIcon } from '@lucide/vue'
import { computed, useId } from 'vue'
import { useFormatter, useT } from '../../context'
import { badgeColorClasses, colorClass, cssColor } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import ActionList from '../actions/ActionList.vue'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Avatar from '../ui/Avatar.vue'
import AvatarFallback from '../ui/AvatarFallback.vue'
import AvatarImage from '../ui/AvatarImage.vue'
import Badge from '../ui/Badge.vue'

const props = defineProps<{
  card: KanbanCardSchema
  board: KanbanSchema
  token: string
  current: boolean
  picked?: 'keyboard' | 'pointer'
  saving: boolean
  describedBy: string
  setRef: (element: unknown) => void
}>()
const emit = defineEmits<{ focus: []; keydown: [event: KeyboardEvent]; open: [] }>()
const t = useT()
const formatter = useFormatter()
const titleId = useId()

const opens = computed(
  () => props.card.clickable !== false && Boolean(props.card.url || props.board.cardAction),
)
const assignees = computed(() => props.card.assignees ?? [])
const shownAssignees = computed(() => assignees.value.slice(0, 3))
const dueDate = computed(() => (props.card.dueDate ? formatter.value.date(props.card.dueDate) : ''))
</script>

<template>
  <li
    class="relative"
    data-slot="kanban-card"
    :data-key="props.card.key"
    :data-movable="props.board.movable && props.card.movable !== false ? undefined : 'false'"
    :data-picked="props.picked"
    :data-saving="props.saving ? '' : undefined"
  >
    <div
      :ref="props.setRef"
      role="button"
      :tabindex="props.current ? 0 : -1"
      :aria-labelledby="titleId"
      :aria-describedby="props.describedBy"
      :aria-disabled="opens ? undefined : true"
      data-slot="kanban-card-body"
      :class="
        cn(
          'bg-card text-card-foreground focus-visible:ring-ring/50 flex touch-manipulation flex-col gap-2 overflow-hidden rounded-lg border p-3 text-start shadow-xs outline-none select-none focus-visible:ring-[3px]',
          opens && 'hover:border-ring/60 cursor-pointer',
          props.card.color && 'border-s-4',
        )
      "
      :style="props.card.color ? { borderInlineStartColor: cssColor(props.card.color) } : undefined"
      @focus="(event: FocusEvent) => event.target === event.currentTarget && emit('focus')"
      @keydown="emit('keydown', $event)"
      @click="opens && emit('open')"
    >
      <img
        v-if="props.card.coverImage"
        :src="props.card.coverImage"
        :alt="props.card.coverImageAlt ?? ''"
        loading="lazy"
        draggable="false"
        class="-mx-3 -mt-3 h-32 w-[calc(100%+1.5rem)] max-w-none object-cover"
      />
      <span
        :id="titleId"
        :class="cn('text-sm leading-snug font-medium', props.card.actions && 'pe-7')"
        >{{ props.card.title }}</span
      >
      <p v-if="props.card.description" class="text-muted-foreground line-clamp-3 text-xs">
        {{ props.card.description }}
      </p>
      <div v-if="props.card.badges?.length" class="flex flex-wrap gap-1">
        <Badge
          v-for="(badge, index) in props.card.badges"
          :key="index"
          variant="outline"
          :title="badge.tooltip"
          :class="colorClass(badgeColorClasses, badge.color, 'gray')"
        >
          <Icon v-if="badge.icon" :name="badge.icon" />
          {{ badge.label }}
        </Badge>
      </div>
      <SchemaRenderer
        v-if="props.card.schema?.length"
        :components="props.card.schema"
        class="gap-2 text-xs"
      />
      <div
        v-if="props.card.progress !== undefined"
        role="progressbar"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="Math.round(props.card.progress)"
        :aria-label="
          t(
            'kanban.progress',
            { percent: formatter.percent(props.card.progress / 100) },
            ':percent complete',
          )
        "
        class="bg-muted h-1.5 overflow-hidden rounded-full"
      >
        <div class="bg-primary h-full rounded-full" :style="{ width: `${props.card.progress}%` }" />
      </div>
      <div
        v-if="props.card.dueDate || assignees.length > 0"
        class="flex items-center gap-2 text-xs"
      >
        <span
          v-if="props.card.dueDate"
          :class="
            cn(
              'inline-flex items-center gap-1',
              props.card.overdue ? 'text-destructive font-medium' : 'text-muted-foreground',
            )
          "
        >
          <CalendarIcon class="size-3.5" aria-hidden="true" />
          <span class="sr-only">{{ t('kanban.due', { date: dueDate }, 'Due :date') }}</span>
          <time :datetime="props.card.dueDate" aria-hidden="true">{{ dueDate }}</time>
          <span v-if="props.card.overdue" class="sr-only">{{
            t('kanban.overdue', {}, 'Overdue')
          }}</span>
        </span>
        <div v-if="assignees.length > 0" class="ms-auto flex items-center">
          <span class="sr-only">{{
            t(
              'kanban.assignees',
              { names: formatter.list(assignees.map((assignee) => assignee.name)) },
              'Assigned to :names',
            )
          }}</span>
          <div class="flex -space-x-1.5 rtl:space-x-reverse" aria-hidden="true">
            <Avatar
              v-for="(assignee, index) in shownAssignees"
              :key="index"
              class="ring-card size-6 ring-2"
              :title="assignee.name"
            >
              <AvatarImage v-if="assignee.avatar" :src="assignee.avatar" alt="" />
              <AvatarFallback class="text-[0.625rem]">{{
                kanbanInitials(assignee.name)
              }}</AvatarFallback>
            </Avatar>
            <span
              v-if="assignees.length > shownAssignees.length"
              class="bg-muted ring-card flex size-6 items-center justify-center rounded-full text-[0.625rem] font-medium ring-2"
              >{{
                t(
                  'kanban.more_assignees',
                  { count: assignees.length - shownAssignees.length },
                  '+:count',
                )
              }}</span
            >
          </div>
        </div>
      </div>
    </div>
    <div v-if="props.card.actions?.length" class="absolute end-1.5 top-1.5" data-kanban-no-drag="">
      <ActionList
        :actions="props.card.actions"
        :context="{
          token: props.token,
          component: props.board.actionComponent,
          record: props.card.key,
        }"
        size="xs"
      />
    </div>
  </li>
</template>
