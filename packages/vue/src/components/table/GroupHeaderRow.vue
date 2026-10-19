<script setup lang="ts">
import type { TableRecordGroupSchema } from '@alfakit/core'
import { ChevronDownIcon, ChevronRightIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { colorClass, textColorClasses } from '../../lib/colors'
import { Icon } from '../../lib/icons'
import Checkbox from '../ui/Checkbox.vue'
import TableCell from '../ui/TableCell.vue'
import TableRow from '../ui/TableRow.vue'

/** A group heading row (`data-slot="table-group"`), with a collapse toggle when collapsible. */
const props = defineProps<{
  group: TableRecordGroupSchema
  collapsed: boolean
  collapsible: boolean
  colSpan: number
  /** `selectGroupsOnly()`: a checkbox selecting the group's records on the page. */
  selection?: { checked: boolean | 'indeterminate'; onChange: (checked: boolean) => void }
}>()
const emit = defineEmits<{ toggle: [] }>()
const t = useT()

// An enum group shows its `HasIcon` icon, in its `HasColor` colour, before the title.
const groupIconClass = computed(
  () => `size-4 shrink-0 ${colorClass(textColorClasses, props.group.color, 'gray')}`,
)

const toggleLabel = computed(
  () =>
    `${props.collapsed ? t('table_grouping.expand', {}, 'Expand group') : t('table_grouping.collapse', {}, 'Collapse group')}: ${props.group.title}`,
)
</script>

<template>
  <TableRow data-slot="table-group" class="bg-muted/50 hover:bg-muted/50">
    <TableCell :colspan="props.colSpan" class="py-2">
      <span class="flex items-center gap-3">
        <Checkbox
          v-if="props.selection"
          :model-value="props.selection.checked"
          :aria-label="t('table.select_group', { group: props.group.title }, 'Select group :group')"
          @update:model-value="props.selection.onChange($event === true)"
        />
        <button
          v-if="props.collapsible"
          type="button"
          class="focus-visible:ring-ring/50 flex items-center gap-2 rounded-sm text-start outline-none focus-visible:ring-[3px]"
          :aria-expanded="!props.collapsed"
          :aria-label="toggleLabel"
          @click="emit('toggle')"
        >
          <ChevronRightIcon
            v-if="props.collapsed"
            class="size-4 shrink-0 rtl:rotate-180"
            aria-hidden="true"
          />
          <Icon
            v-else
            name="alfakit::tables.grouping.collapse-button"
            :fallback="ChevronDownIcon"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          <Icon
            v-if="props.group.icon"
            :name="props.group.icon"
            :class="groupIconClass"
            aria-hidden="true"
          />
          <span class="flex flex-col items-start">
            <span class="font-medium">{{ props.group.title }}</span>
            <span
              v-if="props.group.description"
              class="text-muted-foreground text-xs font-normal"
              >{{ props.group.description }}</span
            >
          </span>
        </button>
        <span
          v-else-if="props.group.icon"
          data-slot="table-group-title"
          class="flex items-center gap-2"
        >
          <Icon :name="props.group.icon" :class="groupIconClass" aria-hidden="true" />
          <span class="flex flex-col items-start">
            <span class="font-medium">{{ props.group.title }}</span>
            <span
              v-if="props.group.description"
              class="text-muted-foreground text-xs font-normal"
              >{{ props.group.description }}</span
            >
          </span>
        </span>
        <span v-else class="flex flex-col items-start">
          <span class="font-medium">{{ props.group.title }}</span>
          <span v-if="props.group.description" class="text-muted-foreground text-xs font-normal">{{
            props.group.description
          }}</span>
        </span>
      </span>
    </TableCell>
  </TableRow>
</template>
