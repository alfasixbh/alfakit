<script setup lang="ts">
import type { FormStore, KanbanController } from '@alfakit/core'
import { kanbanActiveFilters } from '@alfakit/core'
import { FilterIcon } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useT } from '../../context'
import { provideForm } from '../form/form-context'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Badge from '../ui/Badge.vue'
import Button from '../ui/Button.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'

const props = defineProps<{ controller: KanbanController; store: FormStore }>()
const t = useT()

// The store is created by the board and never replaced.
const store = props.store

provideForm(store)

const form = useStore(store.store)
const initial = {
  components: store.state.components,
  state: store.state.values,
  columns: store.state.columns,
}
const active = computed(() => kanbanActiveFilters(form.value.values))

watch(
  () => form.value.values,
  (values) => {
    if (form.value.dirty.size > 0) props.controller.setFilters(values)
  },
)

const reset = () => {
  store.fill(initial)
  props.controller.setFilters(null, 0)
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" size="sm" data-slot="kanban-filters">
        <FilterIcon aria-hidden="true" />
        {{ t('kanban.filters', {}, 'Filters') }}
        <Badge v-if="active > 0" class="h-5 min-w-5 px-1">{{ active }}</Badge>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="w-80 sm:w-96">
      <div class="flex flex-col gap-4">
        <SchemaRenderer :components="form.components" :columns="form.columns" class="gap-4" />
        <div v-if="active > 0" class="flex justify-end">
          <Button type="button" variant="link" size="sm" @click="reset">
            {{ t('kanban.reset_filters', {}, 'Reset') }}
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
