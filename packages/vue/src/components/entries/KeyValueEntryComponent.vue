<script setup lang="ts">
import type { KeyValueEntrySchema } from '@alfakit/core'
import { computed } from 'vue'
import EntryPlaceholder from './EntryPlaceholder.vue'
import EntryWrapper from './EntryWrapper.vue'

const props = defineProps<{ component: KeyValueEntrySchema }>()
const entries = computed(() => Object.entries(props.component.state ?? {}))
</script>

<template>
  <EntryWrapper :entry="props.component">
    <EntryPlaceholder v-if="entries.length === 0" :entry="props.component" />
    <div v-else class="overflow-hidden rounded-md border">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-muted-foreground text-xs">
          <tr>
            <th class="px-3 py-1.5 text-start font-medium">{{ props.component.keyLabel }}</th>
            <th class="px-3 py-1.5 text-start font-medium">{{ props.component.valueLabel }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[key, value] in entries" :key="key" class="border-t">
            <td class="px-3 py-1.5 font-medium">{{ key }}</td>
            <td class="px-3 py-1.5">
              {{ typeof value === 'object' ? JSON.stringify(value) : String(value) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </EntryWrapper>
</template>
