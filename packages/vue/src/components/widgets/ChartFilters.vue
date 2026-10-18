<script setup lang="ts">
import type { ChartFiltersFormSchema } from '@alfakit/core'
import { FormStore, chartFiltersUrl, resolvePartialProps, triggerButtonView } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { FilterIcon } from '@lucide/vue'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useStore } from '../../composables/use-store'
import { useT } from '../../context'
import { Icon } from '../../lib/icons'
import { provideForm } from '../form/form-context'
import SchemaRenderer from '../schema/SchemaRenderer.vue'
import Button from '../ui/Button.vue'
import Popover from '../ui/Popover.vue'
import PopoverContent from '../ui/PopoverContent.vue'
import PopoverTrigger from '../ui/PopoverTrigger.vue'
import TableTriggerButton from '../table/TableTriggerButton.vue'

/**
 * The `filtersSchema()` form of a chart widget, in a popover. Values live in the query
 * string; the chart reloads on every change, or on "Apply" with deferred filters. The
 * parent re-mounts it (by key) when the server sends new filter state.
 */
const props = defineProps<{ form: ChartFiltersFormSchema; widgetId: string }>()
const t = useT()
const open = ref(false)
const store = new FormStore(props.form, { token: '', component: `chartFilters:${props.widgetId}` })
const state = useStore(store.store)
let applied = JSON.stringify(props.form.state)

provideForm(store)
onScopeDispose(() => store.destroy())

const apply = (values: Record<string, unknown> | null) => {
  if (typeof window === 'undefined') return

  applied = JSON.stringify(values ?? {})
  router.visit(chartFiltersUrl(window.location.href, props.form.queryKey, props.widgetId, values), {
    only: resolvePartialProps(['page']),
    preserveScroll: true,
    preserveState: true,
    replace: true,
  })
}

// Live filters apply as the user changes them.
watch(
  () => state.value.values,
  (values) => {
    if (!props.form.deferred && JSON.stringify(values) !== applied) apply(values)
  },
)

const reset = () => {
  apply(null)
  open.value = false
}

const submit = () => {
  apply(state.value.values)
  open.value = false
}

// `filtersResetAction()` / `filtersApplyAction()` restyle the buttons.
const resetView = computed(() =>
  triggerButtonView(props.form, 'filtersReset', {
    label: t('table.reset_filters', {}, 'Reset'),
    variant: 'ghost',
  }),
)
const applyView = computed(() =>
  triggerButtonView(props.form, 'filtersApply', {
    label: t('table_filters.apply', {}, 'Apply'),
    variant: 'default',
  }),
)
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="chart-filters-trigger"
        :aria-label="t('table.filters', {}, 'Filters')"
        ><Icon name="alfakit::widgets.chart.filter" :fallback="FilterIcon"
      /></Button>
    </PopoverTrigger>
    <PopoverContent align="end" class="flex w-80 flex-col gap-4" data-slot="chart-filters">
      <SchemaRenderer :components="state.components" :columns="state.columns" />
      <div class="flex items-center justify-between gap-2">
        <TableTriggerButton
          v-if="resetView"
          :view="resetView"
          data-slot="chart-filters-reset"
          @click="reset"
        />
        <span v-else />
        <TableTriggerButton
          v-if="props.form.deferred && applyView"
          :view="applyView"
          data-slot="chart-filters-apply"
          @click="submit"
        />
      </div>
    </PopoverContent>
  </Popover>
</template>
