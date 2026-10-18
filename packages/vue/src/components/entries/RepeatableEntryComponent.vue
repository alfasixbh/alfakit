<script setup lang="ts">
import type { RepeatableEntrySchema } from '@alfakit/core'
import { gridColumnsClasses } from '@alfakit/core'
import { cn } from '../../lib/utils'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'
import RepeatableEntryTable from './RepeatableEntryTable.vue'

const props = defineProps<{ component: RepeatableEntrySchema }>()
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryPlaceholder v-if="props.component.items.length === 0" :entry="props.component" />
    <RepeatableEntryTable
      v-else-if="props.component.table?.length"
      :columns="props.component.table"
      :items="props.component.items"
    />
    <div
      v-else
      :class="cn('grid gap-3', props.component.grid && gridColumnsClasses(props.component.grid))"
    >
      <div
        v-for="(item, index) in props.component.items"
        :key="index"
        :class="cn(props.component.contained && 'bg-card rounded-lg border p-4 shadow-xs')"
      >
        <div class="contents">
          <SchemaRenderer
            :components="item"
            :columns="props.component.columns ?? { default: 1, lg: 2 }"
            class="gap-4"
          />
        </div>
      </div>
    </div>
  </EntryWrapper>
</template>
