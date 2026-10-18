<script setup lang="ts">
import type { ActionSchema, ItemActionName, ItemActionSchema } from '@alfakit/core'
import { EllipsisIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import Button from '../ui/Button.vue'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuItem from '../ui/DropdownMenuItem.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'

/**
 * `blockActionsMenu()`: an item's actions in one compact menu (move up / down, duplicate,
 * extra item actions, delete). Built-in actions run in the browser unless customised.
 */
const props = defineProps<{
  label: string
  resolve: (name: ItemActionName) => ItemActionSchema | null
  canMoveUp: boolean
  canMoveDown: boolean
  canClone: boolean
  canDelete: boolean
  extraActions?: ActionSchema[]
}>()
const emit = defineEmits<{
  action: [name: ItemActionName]
  extra: [action: ActionSchema]
}>()
const t = useT()

const entries = computed(() =>
  (
    [
      ['moveUp', props.canMoveUp],
      ['moveDown', props.canMoveDown],
      ['clone', props.canClone],
    ] as const
  )
    .map(([name, enabled]) => ({ name, enabled, action: props.resolve(name) }))
    .filter((entry) => entry.enabled && entry.action !== null),
)
const deleteAction = computed(() => (props.canDelete ? props.resolve('delete') : null))
const extras = computed(() => props.extraActions ?? [])
const hasMain = computed(() => entries.value.length > 0 || extras.value.length > 0)
</script>

<template>
  <DropdownMenu v-if="hasMain || deleteAction">
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        data-slot="builder-item-menu"
        :aria-label="t('builder.block_actions', { block: props.label }, 'Actions for :block')"
      >
        <EllipsisIcon aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-44">
      <DropdownMenuItem
        v-for="entry in entries"
        :key="entry.name"
        :disabled="entry.action?.disabled"
        @select="emit('action', entry.name)"
      >
        <Icon v-if="entry.action?.icon" :name="entry.action.icon" />
        {{
          entry.name === 'clone'
            ? t('builder.duplicate_block', {}, 'Duplicate')
            : entry.action?.label
        }}
      </DropdownMenuItem>
      <DropdownMenuItem
        v-for="action in extras"
        :key="action.name"
        :disabled="action.disabled"
        @select="emit('extra', action)"
      >
        <Icon v-if="action.icon" :name="action.icon" />
        {{ action.label }}
      </DropdownMenuItem>
      <DropdownMenuSeparator v-if="deleteAction && hasMain" />
      <DropdownMenuItem
        v-if="deleteAction"
        variant="destructive"
        :disabled="deleteAction.disabled"
        @select="emit('action', 'delete')"
      >
        <Icon v-if="deleteAction.icon" :name="deleteAction.icon" />
        {{ deleteAction.label }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
