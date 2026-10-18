<script setup lang="ts">
import type { TableSchema } from '@alfakit/core'
import { triggerButtonView, visitTable } from '@alfakit/core'
import { LayersIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { cn } from '../../lib/utils'
import DropdownMenu from '../ui/DropdownMenu.vue'
import DropdownMenuContent from '../ui/DropdownMenuContent.vue'
import DropdownMenuLabel from '../ui/DropdownMenuLabel.vue'
import DropdownMenuRadioGroup from '../ui/DropdownMenuRadioGroup.vue'
import DropdownMenuRadioItem from '../ui/DropdownMenuRadioItem.vue'
import DropdownMenuSeparator from '../ui/DropdownMenuSeparator.vue'
import DropdownMenuTrigger from '../ui/DropdownMenuTrigger.vue'
import TableTriggerButton from './TableTriggerButton.vue'

/**
 * The "group by" settings: one of the table's groups (or none) and the direction. Inline
 * in the toolbar on desktop (unless `groupingSettingsInDropdownOnDesktop()`), in a
 * dropdown on phones.
 */
const props = defineProps<{ table: TableSchema }>()
const t = useT()

const active = computed(() => props.table.grouping?.group ?? '')
// `groupRecordsTriggerAction()`.
const trigger = computed(() =>
  triggerButtonView(props.table, 'groupRecords', {
    label: t('table_grouping.group_by', {}, 'Group by'),
  }),
)
const inDropdownOnly = computed(() => Boolean(props.table.groupingSettingsInDropdownOnDesktop))

const setGroup = (group: unknown) =>
  visitTable(props.table.identifier, { group: String(group ?? '') }, ['page'])
const setDirection = (direction: unknown) =>
  visitTable(props.table.identifier, { groupDirection: direction === 'desc' ? 'desc' : 'asc' }, [
    'page',
  ])
</script>

<template>
  <template v-if="props.table.groups && props.table.groups.length > 0">
    <!-- Desktop default: the settings inline in the toolbar (the dropdown is for phones). -->
    <div
      v-if="!inDropdownOnly"
      data-slot="table-grouping-inline"
      class="hidden items-center gap-2 text-sm sm:flex"
    >
      <label class="flex items-center gap-2">
        <span class="text-muted-foreground">{{
          t('table_grouping.group_by', {}, 'Group by')
        }}</span>
        <select
          :value="active"
          class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
          @change="setGroup(($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t('table_grouping.none', {}, 'No grouping') }}</option>
          <option v-for="group in props.table.groups" :key="group.id" :value="group.id">
            {{ group.label }}
          </option>
        </select>
      </label>
      <label
        v-if="props.table.grouping && !props.table.groupingDirectionSettingHidden"
        class="flex items-center"
      >
        <span class="sr-only">{{ t('table_grouping.direction', {}, 'Group direction') }}</span>
        <select
          :value="props.table.grouping.direction"
          class="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
          @change="setDirection(($event.target as HTMLSelectElement).value)"
        >
          <option value="asc">{{ t('table_grouping.ascending', {}, 'Ascending') }}</option>
          <option value="desc">{{ t('table_grouping.descending', {}, 'Descending') }}</option>
        </select>
      </label>
    </div>
    <div v-if="trigger" :class="cn(!inDropdownOnly && 'sm:hidden')">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <TableTriggerButton
            :view="trigger"
            :responsive-label="!props.table.triggerActions?.groupRecords"
            :active="Boolean(props.table.grouping)"
          >
            <template #icon
              ><Icon name="alfakit::tables.actions.group" :fallback="LayersIcon"
            /></template>
          </TableTriggerButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="min-w-48">
          <DropdownMenuLabel>{{ t('table_grouping.group_by', {}, 'Group by') }}</DropdownMenuLabel>
          <DropdownMenuRadioGroup :model-value="active" @update:model-value="setGroup">
            <DropdownMenuRadioItem value="">{{
              t('table_grouping.none', {}, 'No grouping')
            }}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              v-for="group in props.table.groups"
              :key="group.id"
              :value="group.id"
              >{{ group.label }}</DropdownMenuRadioItem
            >
          </DropdownMenuRadioGroup>
          <template v-if="props.table.grouping && !props.table.groupingDirectionSettingHidden">
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{{
              t('table_grouping.direction', {}, 'Group direction')
            }}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="props.table.grouping.direction"
              @update:model-value="setDirection"
            >
              <DropdownMenuRadioItem value="asc">{{
                t('table_grouping.ascending', {}, 'Ascending')
              }}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">{{
                t('table_grouping.descending', {}, 'Descending')
              }}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </template>
</template>
