<script lang="ts">
  import type { ChartFiltersFormSchema } from '@alfakit/core'
  import { FormStore, chartFiltersUrl, resolvePartialProps, triggerButtonView } from '@alfakit/core'
  import { router } from '@inertiajs/svelte'
  import FilterIcon from '@lucide/svelte/icons/filter'
  import { onDestroy, untrack } from 'svelte'
  import { useT } from '../../context.svelte'
  import { useStore } from '../../hooks/store.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { provideForm } from '../form/form-context.svelte'
  import SchemaRenderer from '../schema/SchemaRenderer.svelte'
  import { Button } from '../ui/button'
  import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
  import TableTriggerButton from '../table/TableTriggerButton.svelte'

  /**
   * The `filtersSchema()` form of a chart widget, in a popover. Values live in the query
   * string; the chart reloads on every change, or on "Apply" with deferred filters. The
   * parent re-mounts it (`{#key}`) when the server sends new filter state.
   */
  let { form, widgetId }: { form: ChartFiltersFormSchema; widgetId: string } = $props()

  const t = useT()
  let open = $state(false)
  const store = provideForm(
    untrack(() => new FormStore(form, { token: '', component: `chartFilters:${widgetId}` })),
  )
  const formState = useStore(store.store)
  let applied = untrack(() => JSON.stringify(form.state))

  onDestroy(() => store.destroy())

  const apply = (values: Record<string, unknown> | null) => {
    if (typeof window === 'undefined') return

    applied = JSON.stringify(values ?? {})
    router.visit(chartFiltersUrl(window.location.href, form.queryKey, widgetId, values), {
      only: resolvePartialProps(['page']),
      preserveScroll: true,
      preserveState: true,
      replace: true,
    })
  }

  // `filtersResetAction()` / `filtersApplyAction()` restyle the buttons.
  const resetView = $derived(
    triggerButtonView(form, 'filtersReset', {
      label: t('table.reset_filters', {}, 'Reset'),
      variant: 'ghost',
    }),
  )
  const applyView = $derived(
    triggerButtonView(form, 'filtersApply', {
      label: t('table_filters.apply', {}, 'Apply'),
      variant: 'default',
    }),
  )

  // Live filters apply as the user changes them.
  $effect(() => {
    const values = formState.current.values

    untrack(() => {
      if (!form.deferred && JSON.stringify(values) !== applied) apply(values)
    })
  })
</script>

<Popover bind:open>
  <PopoverTrigger>
    {#snippet child({ props })}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-slot="chart-filters-trigger"
        aria-label={t('table.filters', {}, 'Filters')}
        {...props}><Icon name="alfakit::widgets.chart.filter" fallback={FilterIcon} /></Button
      >
    {/snippet}
  </PopoverTrigger>
  <PopoverContent align="end" class="flex w-80 flex-col gap-4" data-slot="chart-filters">
    <SchemaRenderer components={formState.current.components} columns={formState.current.columns} />
    <div class="flex items-center justify-between gap-2">
      {#if resetView}
        <TableTriggerButton
          view={resetView}
          data-slot="chart-filters-reset"
          onclick={() => {
            apply(null)
            open = false
          }}
        />
      {:else}
        <span></span>
      {/if}
      {#if form.deferred && applyView}
        <TableTriggerButton
          view={applyView}
          data-slot="chart-filters-apply"
          onclick={() => {
            apply(formState.current.values)
            open = false
          }}
        />
      {/if}
    </div>
  </PopoverContent>
</Popover>
