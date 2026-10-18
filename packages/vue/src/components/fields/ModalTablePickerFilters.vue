<script setup lang="ts">
import type { TableSchema } from '@alfakit/core'
import { FormStore, filterFormComponents, pickerFilterFormOptions } from '@alfakit/core'
import { computed, onScopeDispose, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useT } from '../../context'
import { provideForm } from '../form/form-context'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Button from '../ui/Button.vue'

/**
 * The picker's filters: a small form whose state becomes the table's `filters`. Searchable
 * selects among them load options through the owning form's endpoint (`pickerFilters`).
 */
const props = defineProps<{ table: TableSchema; owner: FormStore; path: string }>()
const emit = defineEmits<{ change: [filters: Record<string, Record<string, unknown>> | null] }>()
const t = useT()
const components = computed(() => filterFormComponents(props.table.filters ?? []))
const store = new FormStore(
  {
    components: components.value,
    state: props.table.filterState ?? {},
    columns: props.table.filtersFormColumns ?? { default: 1, sm: 2 },
  },
  pickerFilterFormOptions(props.owner, props.path),
)

provideForm(store)

const state = useStore(store.store)
let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => [state.value.values, state.value.dirty] as const,
  ([values, dirty]) => {
    if (timer) clearTimeout(timer)
    if (!dirty.size) return

    timer = setTimeout(() => emit('change', values as Record<string, Record<string, unknown>>), 400)
  },
)

const reset = () => {
  store.fill({ components: components.value, state: {}, columns: state.value.columns })
  emit('change', null)
}

onScopeDispose(() => {
  if (timer) clearTimeout(timer)
  store.destroy()
})
</script>

<template>
  <div class="bg-muted/30 flex flex-col gap-2 rounded-lg border p-3">
    <SchemaRenderer :components="state.components" :columns="state.columns" class="gap-3" />
    <Button
      v-if="(props.table.filterIndicators?.length ?? 0) > 0"
      type="button"
      variant="link"
      size="sm"
      class="self-end"
      @click="reset"
      >{{ t('table.reset_filters', {}, 'Reset') }}</Button
    >
  </div>
</template>
